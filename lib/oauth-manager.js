/**
 * OAuth Manager - Handles OAuth 2.0 lifecycle for app connections
 * Initiation, callback handling, token refresh, and revocation
 */

import crypto from 'crypto';
import { encrypt, decrypt } from './token-encryption.js';
import { getAppById } from './app-registry.js';
import { databases, ID, Query } from '@/services/appwrite-admin.js';
import { APPWRITE_DATABASE_ID } from '@/services/appwrite-collections.js';

const APP_CONNECTIONS_COLLECTION = 'app_connections';
const OAUTH_STATES_COLLECTION = 'oauth_states';
const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Generate the OAuth redirect URI for callbacks
 */
function getRedirectUri(reqBaseUrl) {
  const isProduction = process.env.NODE_ENV === 'production';
  const defaultBaseUrl = isProduction ? 'https://chatboxai.co.in' : 'http://localhost:3000';
  return `${reqBaseUrl || defaultBaseUrl}/api/apps/callback`;
}

/**
 * Initiate OAuth flow for an app
 * @param {string} appId - App identifier
 * @param {string} userId - User's ID
 * @param {string} userEmail - User's email
 * @returns {{ authUrl: string, state: string }}
 */
export async function initiateOAuth(appId, userId, userEmail, reqBaseUrl) {
  const app = getAppById(appId);
  if (!app) throw new Error(`App not found: ${appId}`);

  // Handle MCP-type connections (no OAuth needed)
  if (app.connectionType === 'mcp') {
    return await initiateMcpConnection(app, userId, userEmail);
  }

  if (!app.oauth?.authUrl) throw new Error(`App ${appId} does not support OAuth`);

  // Generate unique state token for CSRF protection
  const state = crypto.randomBytes(32).toString('hex');

  // Generate PKCE code_verifier for Microsoft and Canva (required for PKCE flow)
  let codeVerifier = null;
  if (appId === 'microsoft_365' || appId === 'canva') {
    codeVerifier = crypto.randomBytes(32).toString('base64url');
  }

  // For Microsoft PKCE, encode the verifier into the state string (state|verifier)
  // This avoids needing a new DB column
  const stateForDb = state;
  const stateForUrl = codeVerifier ? `${state}|${codeVerifier}` : state;

  // Store state in database for validation on callback
  try {
    await databases.createDocument(
      APPWRITE_DATABASE_ID,
      OAUTH_STATES_COLLECTION,
      ID.unique(),
      {
        state: stateForDb,
        appId,
        userId,
        userEmail,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + STATE_EXPIRY_MS).toISOString(),
        used: false,
      }
    );
  } catch (err) {
    console.error('[OAuth] Failed to store state:', err.message);
    throw new Error('Failed to initiate OAuth flow');
  }

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: process.env[app.oauth.clientIdEnv] || '',
    redirect_uri: getRedirectUri(reqBaseUrl),
    response_type: 'code',
    state: stateForUrl,
  });

  // Notion uses different OAuth params than Google/Slack
  if (appId === 'notion') {
    params.set('owner', 'user');
  } else if (appId === 'microsoft_365') {
    // Microsoft uses response_mode and doesn't support access_type
    params.set('response_mode', 'query');
    params.set('prompt', 'consent');
    // PKCE: Add code_challenge
    if (codeVerifier) {
      const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
      params.set('code_challenge', codeChallenge);
      params.set('code_challenge_method', 'S256');
    }
  } else if (appId === 'canva') {
    // Canva uses OAuth 2.0 with PKCE (SHA-256) — no access_type or prompt params
    if (codeVerifier) {
      const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
      params.set('code_challenge', codeChallenge);
      params.set('code_challenge_method', 'S256');
    }
  } else if (appId === 'figma') {
    // Figma only needs the standard params (client_id, redirect_uri, scope, state, response_type)
    // No extra params like access_type or prompt
  } else {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  }

  if (app.oauth.scopes?.length > 0) {
    // Microsoft requires offline_access scope for refresh tokens
    if (appId === 'microsoft_365') {
      const scopes = [...app.oauth.scopes];
      if (!scopes.includes('offline_access')) scopes.push('offline_access');
      if (!scopes.includes('openid')) scopes.push('openid');
      params.set('scope', scopes.join(' '));
    } else {
      params.set('scope', app.oauth.scopes.join(' '));
    }
  }

  const authUrl = `${app.oauth.authUrl}?${params.toString()}`;
  return { authUrl, state };
}

/**
 * Initiate MCP connection (no OAuth — connects directly to MCP server)
 * Creates a connection record immediately since MCP handles auth internally
 */
async function initiateMcpConnection(app, userId, userEmail) {
  // For MCP apps, we create the connection directly
  // The MCP server handles its own auth (e.g., Canva shows its own login)
  const existing = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    APP_CONNECTIONS_COLLECTION,
    [Query.equal('userId', userId), Query.equal('appId', app.id)]
  ).catch(() => ({ documents: [] }));

  const connectionData = {
    userId,
    userEmail,
    appId: app.id,
    accessToken: '',
    accessTokenIv: '',
    accessTokenTag: '',
    refreshToken: '',
    refreshTokenIv: '',
    refreshTokenTag: '',
    tokenExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
    grantedScopes: JSON.stringify([]),
    status: 'active',
    connectedAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
  };

  if (existing.documents.length > 0) {
    await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      APP_CONNECTIONS_COLLECTION,
      existing.documents[0].$id,
      connectionData
    );
  } else {
    await databases.createDocument(
      APPWRITE_DATABASE_ID,
      APP_CONNECTIONS_COLLECTION,
      ID.unique(),
      connectionData
    );
  }

  // Return a special response indicating MCP connection (no redirect needed)
  return { authUrl: null, state: null, mcpConnected: true, appId: app.id };
}

/**
 * Handle OAuth callback - validate state, exchange code for tokens, store encrypted
 * @param {string} code - Authorization code from provider
 * @param {string} state - State parameter for CSRF validation
 * @returns {{ appId: string, userId: string, success: boolean }}
 */
export async function handleCallback(code, state, reqBaseUrl) {
  if (!code || !state) throw new Error('Missing code or state parameter');

  // Extract PKCE code_verifier if embedded in state (format: state|verifier)
  let actualState = state;
  let codeVerifier = null;
  if (state.includes('|')) {
    const parts = state.split('|');
    actualState = parts[0];
    codeVerifier = parts[1];
  }

  // Validate state token
  let stateDoc;
  try {
    const stateResults = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      OAUTH_STATES_COLLECTION,
      [Query.equal('state', actualState), Query.equal('used', false)]
    );
    if (stateResults.documents.length === 0) {
      throw new Error('Invalid or expired state token');
    }
    stateDoc = stateResults.documents[0];
  } catch (err) {
    throw new Error(`State validation failed: ${err.message}`);
  }

  // Check expiry
  if (new Date(stateDoc.expiresAt) < new Date()) {
    await databases.updateDocument(APPWRITE_DATABASE_ID, OAUTH_STATES_COLLECTION, stateDoc.$id, { used: true });
    throw new Error('OAuth state token expired');
  }

  // Mark state as used (single-use)
  await databases.updateDocument(APPWRITE_DATABASE_ID, OAUTH_STATES_COLLECTION, stateDoc.$id, { used: true });

  const { appId, userId, userEmail } = stateDoc;
  const app = getAppById(appId);
  if (!app?.oauth?.tokenUrl) throw new Error(`Invalid app configuration for ${appId}`);

  // Exchange authorization code for tokens
  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(reqBaseUrl),
  });

  // Add PKCE code_verifier for Microsoft and Canva
  if ((appId === 'microsoft_365' || appId === 'canva') && codeVerifier) {
    tokenBody.set('code_verifier', codeVerifier);
  }

  // Notion uses Basic auth header for token exchange (not body params)
  const tokenHeaders = { 'Content-Type': 'application/x-www-form-urlencoded' };

  if (appId === 'notion') {
    // Notion requires Basic auth: base64(client_id:client_secret)
    const clientId = process.env[app.oauth.clientIdEnv] || '';
    const clientSecret = process.env[app.oauth.clientSecretEnv] || '';
    tokenHeaders['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
    // Notion also expects JSON content type for token exchange
    tokenHeaders['Content-Type'] = 'application/json';
  } else if (appId === 'canva') {
    // Canva requires Basic auth: base64(client_id:client_secret) — recommended method
    const clientId = process.env[app.oauth.clientIdEnv] || '';
    const clientSecret = process.env[app.oauth.clientSecretEnv] || '';
    tokenHeaders['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  } else if (appId === 'figma') {
    // Figma requires Basic auth: base64(client_id:client_secret)
    const clientId = process.env[app.oauth.clientIdEnv] || '';
    const clientSecret = process.env[app.oauth.clientSecretEnv] || '';
    tokenHeaders['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  } else if (appId === 'microsoft_365') {
    // Microsoft confidential client with PKCE
    tokenBody.set('client_id', process.env[app.oauth.clientIdEnv] || '');
    tokenBody.set('client_secret', process.env[app.oauth.clientSecretEnv] || '');
    if (app.oauth.scopes?.length > 0) {
      const scopes = [...app.oauth.scopes, 'offline_access', 'openid'];
      tokenBody.set('scope', scopes.join(' '));
    }
  } else {
    // Standard OAuth: client_id and client_secret in body
    tokenBody.set('client_id', process.env[app.oauth.clientIdEnv] || '');
    tokenBody.set('client_secret', process.env[app.oauth.clientSecretEnv] || '');
  }

  let tokenData;
  try {
    let requestBody;
    if (appId === 'notion') {
      requestBody = JSON.stringify({ grant_type: 'authorization_code', code, redirect_uri: getRedirectUri(reqBaseUrl) });
    } else if (appId === 'canva') {
      // Canva: Basic auth header handles credentials; body has grant_type, code, code_verifier, redirect_uri
      requestBody = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier || '',
        redirect_uri: getRedirectUri(reqBaseUrl),
      }).toString();
    } else if (appId === 'figma') {
      // Figma: send redirect_uri, code, grant_type in body (no client_id/secret in body)
      requestBody = new URLSearchParams({
        redirect_uri: getRedirectUri(reqBaseUrl),
        code,
        grant_type: 'authorization_code',
      }).toString();
    } else {
      requestBody = tokenBody.toString();
    }

    // Debug: log what's being sent for Microsoft (mask secret)
    if (appId === 'microsoft_365') {
      const clientId = tokenBody.get('client_id');
      const hasSecret = !!tokenBody.get('client_secret');
      const hasVerifier = !!tokenBody.get('code_verifier');
      console.log(`[Microsoft Token Exchange] client_id=${clientId}, has_secret=${hasSecret}, secret_length=${(tokenBody.get('client_secret') || '').length}, has_code_verifier=${hasVerifier}, redirect_uri=${tokenBody.get('redirect_uri')}`);
    }

    const tokenResponse = await fetch(app.oauth.tokenUrl, {
      method: 'POST',
      headers: tokenHeaders,
      body: requestBody,
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errBody}`);
    }
    tokenData = await tokenResponse.json();
  } catch (err) {
    throw new Error(`Token exchange error: ${err.message}`);
  }

  // Notion returns access_token directly (no refresh token, never expires)
  // Normalize the token data
  if (appId === 'notion' && tokenData.access_token && !tokenData.refresh_token) {
    tokenData.refresh_token = ''; // Notion tokens don't expire, no refresh needed
    tokenData.expires_in = 365 * 24 * 60 * 60; // Set 1 year expiry for our system
  }

  // Encrypt tokens
  const accessTokenEnc = encrypt(tokenData.access_token);
  const refreshTokenEnc = tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null;

  // Calculate token expiry
  const expiresIn = tokenData.expires_in || 3600;
  const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Check if connection already exists (update) or create new
  const existing = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    APP_CONNECTIONS_COLLECTION,
    [Query.equal('userId', userId), Query.equal('appId', appId)]
  );

  const connectionData = {
    userId,
    userEmail,
    appId,
    accessToken: accessTokenEnc.ciphertext,
    accessTokenIv: accessTokenEnc.iv,
    accessTokenTag: accessTokenEnc.tag,
    refreshToken: refreshTokenEnc?.ciphertext || '',
    refreshTokenIv: refreshTokenEnc?.iv || '',
    refreshTokenTag: refreshTokenEnc?.tag || '',
    tokenExpiry,
    grantedScopes: JSON.stringify(tokenData.scope ? tokenData.scope.split(' ') : (app.oauth.scopes || [])),
    status: 'active',
    connectedAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
  };

  if (existing.documents.length > 0) {
    await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      APP_CONNECTIONS_COLLECTION,
      existing.documents[0].$id,
      connectionData
    );
  } else {
    await databases.createDocument(
      APPWRITE_DATABASE_ID,
      APP_CONNECTIONS_COLLECTION,
      ID.unique(),
      connectionData
    );
  }

  return { appId, userId, success: true };
}

/**
 * Get a valid access token for a user's app connection (auto-refreshes if expired)
 * @param {string} userId
 * @param {string} appId
 * @returns {string} Valid access token
 */
export async function getValidToken(userId, appId) {
  const connections = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    APP_CONNECTIONS_COLLECTION,
    [Query.equal('userId', userId), Query.equal('appId', appId)]
  );

  if (connections.documents.length === 0) {
    throw new Error(`No connection found for app: ${appId}`);
  }

  const conn = connections.documents[0];
  if (conn.status === 'needs_reauth' || conn.status === 'revoked') {
    throw new Error(`Connection requires re-authorization: ${appId}`);
  }

  // Check if token is expired (with 60s buffer)
  const expiry = new Date(conn.tokenExpiry);
  const now = new Date(Date.now() + 60000);

  if (now >= expiry) {
    // Notion tokens never expire — just return the token and extend expiry
    if (appId === 'notion') {
      const accessTokenPlain = decrypt(conn.accessToken, conn.accessTokenIv, conn.accessTokenTag);
      // Silently extend the expiry so this doesn't trigger again
      await databases.updateDocument(APPWRITE_DATABASE_ID, APP_CONNECTIONS_COLLECTION, conn.$id, {
        tokenExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      }).catch(() => {}); // Non-critical, don't fail if update fails
      return accessTokenPlain;
    }
    // Token expired, attempt refresh
    return await refreshToken(userId, appId);
  }

  // Decrypt and return access token
  return decrypt(conn.accessToken, conn.accessTokenIv, conn.accessTokenTag);
}

/**
 * Refresh an expired access token using the refresh token
 * @param {string} userId
 * @param {string} appId
 * @returns {string} New access token
 */
export async function refreshToken(userId, appId) {
  const connections = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    APP_CONNECTIONS_COLLECTION,
    [Query.equal('userId', userId), Query.equal('appId', appId)]
  );

  if (connections.documents.length === 0) {
    throw new Error(`No connection found for app: ${appId}`);
  }

  const conn = connections.documents[0];

  // Notion tokens are permanent (never expire, no refresh token concept)
  // If we get here, just return the existing token and extend the expiry
  if (appId === 'notion') {
    try {
      const accessTokenPlain = decrypt(conn.accessToken, conn.accessTokenIv, conn.accessTokenTag);
      const newExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      await databases.updateDocument(APPWRITE_DATABASE_ID, APP_CONNECTIONS_COLLECTION, conn.$id, {
        tokenExpiry: newExpiry,
        status: 'active',
      });
      return accessTokenPlain;
    } catch (err) {
      // If decryption fails, the token is corrupted — need reauth
      await databases.updateDocument(APPWRITE_DATABASE_ID, APP_CONNECTIONS_COLLECTION, conn.$id, { status: 'needs_reauth' });
      throw new Error(`Notion token is invalid. Please reconnect Notion.`);
    }
  }

  if (!conn.refreshToken) {
    // No refresh token — mark as needs reauth
    await databases.updateDocument(APPWRITE_DATABASE_ID, APP_CONNECTIONS_COLLECTION, conn.$id, { status: 'needs_reauth' });
    throw new Error(`No refresh token available for ${appId}. Re-authorization required.`);
  }

  const app = getAppById(appId);
  if (!app?.oauth?.tokenUrl) throw new Error(`Invalid app config for ${appId}`);

  // Decrypt refresh token
  const refreshTokenPlain = decrypt(conn.refreshToken, conn.refreshTokenIv, conn.refreshTokenTag);

  // Canva uses Basic Auth for token refresh (same token endpoint, single-use refresh tokens)
  if (appId === 'canva') {
    const clientId = process.env[app.oauth.clientIdEnv] || '';
    const clientSecret = process.env[app.oauth.clientSecretEnv] || '';
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshTokenPlain,
    });

    try {
      const response = await fetch(app.oauth.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        console.error('[Canva Refresh] Failed:', response.status, errBody.slice(0, 200));
        await databases.updateDocument(APPWRITE_DATABASE_ID, APP_CONNECTIONS_COLLECTION, conn.$id, { status: 'needs_reauth' });
        throw new Error(`Canva token refresh failed. Re-authorization required.`);
      }

      const tokenData = await response.json();
      const newAccessTokenEnc = encrypt(tokenData.access_token);
      const newExpiry = new Date(Date.now() + (tokenData.expires_in || 14400) * 1000).toISOString();

      const updateData = {
        accessToken: newAccessTokenEnc.ciphertext,
        accessTokenIv: newAccessTokenEnc.iv,
        accessTokenTag: newAccessTokenEnc.tag,
        tokenExpiry: newExpiry,
        status: 'active',
      };

      // Canva refresh tokens are single-use — always store the new one
      if (tokenData.refresh_token) {
        const newRefreshEnc = encrypt(tokenData.refresh_token);
        updateData.refreshToken = newRefreshEnc.ciphertext;
        updateData.refreshTokenIv = newRefreshEnc.iv;
        updateData.refreshTokenTag = newRefreshEnc.tag;
      }

      await databases.updateDocument(APPWRITE_DATABASE_ID, APP_CONNECTIONS_COLLECTION, conn.$id, updateData);
      return tokenData.access_token;
    } catch (err) {
      if (err.message.includes('Re-authorization required')) throw err;
      await databases.updateDocument(APPWRITE_DATABASE_ID, APP_CONNECTIONS_COLLECTION, conn.$id, { status: 'needs_reauth' });
      throw new Error(`Canva token refresh error: ${err.message}`);
    }
  }

  // Figma uses a separate refresh endpoint and Basic Auth
  if (appId === 'figma') {
    const refreshUrl = app.oauth.refreshUrl || 'https://api.figma.com/v1/oauth/refresh';
    const clientId = process.env[app.oauth.clientIdEnv] || '';
    const clientSecret = process.env[app.oauth.clientSecretEnv] || '';
    const body = new URLSearchParams({ refresh_token: refreshTokenPlain });

    try {
      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: body.toString(),
      });

      if (!response.ok) {
        await databases.updateDocument(APPWRITE_DATABASE_ID, APP_CONNECTIONS_COLLECTION, conn.$id, { status: 'needs_reauth' });
        throw new Error(`Token refresh failed for ${appId}. Re-authorization required.`);
      }

      const tokenData = await response.json();
      const newAccessTokenEnc = encrypt(tokenData.access_token);
      const newExpiry = new Date(Date.now() + (tokenData.expires_in || 7776000) * 1000).toISOString();

      const updateData = {
        accessToken: newAccessTokenEnc.ciphertext,
        accessTokenIv: newAccessTokenEnc.iv,
        accessTokenTag: newAccessTokenEnc.tag,
        tokenExpiry: newExpiry,
        status: 'active',
      };

      if (tokenData.refresh_token) {
        const newRefreshEnc = encrypt(tokenData.refresh_token);
        updateData.refreshToken = newRefreshEnc.ciphertext;
        updateData.refreshTokenIv = newRefreshEnc.iv;
        updateData.refreshTokenTag = newRefreshEnc.tag;
      }

      await databases.updateDocument(APPWRITE_DATABASE_ID, APP_CONNECTIONS_COLLECTION, conn.$id, updateData);
      return tokenData.access_token;
    } catch (err) {
      if (err.message.includes('Re-authorization required')) throw err;
      await databases.updateDocument(APPWRITE_DATABASE_ID, APP_CONNECTIONS_COLLECTION, conn.$id, { status: 'needs_reauth' });
      throw new Error(`Token refresh error for ${appId}: ${err.message}`);
    }
  }

  // Request new access token (standard OAuth flow)
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshTokenPlain,
    client_id: process.env[app.oauth.clientIdEnv] || '',
    client_secret: process.env[app.oauth.clientSecretEnv] || '',
  });

  try {
    const response = await fetch(app.oauth.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      // Refresh failed — mark connection as needs reauth
      await databases.updateDocument(APPWRITE_DATABASE_ID, APP_CONNECTIONS_COLLECTION, conn.$id, { status: 'needs_reauth' });
      throw new Error(`Token refresh failed for ${appId}. Re-authorization required.`);
    }

    const tokenData = await response.json();
    const newAccessTokenEnc = encrypt(tokenData.access_token);
    const newExpiry = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    // Update stored tokens
    const updateData = {
      accessToken: newAccessTokenEnc.ciphertext,
      accessTokenIv: newAccessTokenEnc.iv,
      accessTokenTag: newAccessTokenEnc.tag,
      tokenExpiry: newExpiry,
      status: 'active',
    };

    // If provider returned a new refresh token, update it too
    if (tokenData.refresh_token) {
      const newRefreshEnc = encrypt(tokenData.refresh_token);
      updateData.refreshToken = newRefreshEnc.ciphertext;
      updateData.refreshTokenIv = newRefreshEnc.iv;
      updateData.refreshTokenTag = newRefreshEnc.tag;
    }

    await databases.updateDocument(APPWRITE_DATABASE_ID, APP_CONNECTIONS_COLLECTION, conn.$id, updateData);
    return tokenData.access_token;
  } catch (err) {
    if (err.message.includes('Re-authorization required')) throw err;
    await databases.updateDocument(APPWRITE_DATABASE_ID, APP_CONNECTIONS_COLLECTION, conn.$id, { status: 'needs_reauth' });
    throw new Error(`Token refresh error for ${appId}: ${err.message}`);
  }
}

/**
 * Revoke an app connection - revoke at provider and delete stored tokens
 * @param {string} userId
 * @param {string} appId
 */
export async function revokeConnection(userId, appId) {
  const connections = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    APP_CONNECTIONS_COLLECTION,
    [Query.equal('userId', userId), Query.equal('appId', appId)]
  );

  if (connections.documents.length === 0) {
    // Also try by email
    const byEmail = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APP_CONNECTIONS_COLLECTION,
      [Query.equal('userEmail', userId), Query.equal('appId', appId)]
    ).catch(() => ({ documents: [] }));

    if (byEmail.documents.length === 0) {
      return { success: true, message: 'No connection found' };
    }
    // Use the email-matched document
    const conn = byEmail.documents[0];
    await deleteConnectionAndLogs(conn, appId);
    return { success: true };
  }

  const conn = connections.documents[0];
  await deleteConnectionAndLogs(conn, appId);
  return { success: true };
}

/**
 * Internal: Delete connection document, revoke at provider, and clean up execution logs
 */
async function deleteConnectionAndLogs(conn, appId) {
  const app = getAppById(appId);

  // 1. Attempt to revoke token at provider (best-effort)
  if (app?.oauth?.revokeUrl && conn.accessToken) {
    try {
      const token = decrypt(conn.accessToken, conn.accessTokenIv, conn.accessTokenTag);
      await fetch(app.oauth.revokeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token }).toString(),
      });
    } catch (err) {
      console.warn(`[OAuth] Provider revocation failed for ${appId}:`, err.message);
    }
  }

  // 2. Delete the connection document
  await databases.deleteDocument(APPWRITE_DATABASE_ID, APP_CONNECTIONS_COLLECTION, conn.$id);

  // 3. Delete all tool execution logs for this user + app
  try {
    const TOOL_EXECUTION_LOGS_COLLECTION = 'tool_execution_logs';
    const logs = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      TOOL_EXECUTION_LOGS_COLLECTION,
      [Query.equal('userId', conn.userId), Query.equal('appId', appId), Query.limit(100)]
    );
    for (const log of logs.documents) {
      await databases.deleteDocument(APPWRITE_DATABASE_ID, TOOL_EXECUTION_LOGS_COLLECTION, log.$id);
    }
  } catch (err) {
    // Non-critical — logs collection might not exist yet
    console.warn(`[OAuth] Failed to delete execution logs for ${appId}:`, err.message);
  }

  // 4. Delete any pending oauth_states for this user + app
  try {
    const states = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      OAUTH_STATES_COLLECTION,
      [Query.equal('userId', conn.userId), Query.equal('appId', appId), Query.limit(50)]
    );
    for (const state of states.documents) {
      await databases.deleteDocument(APPWRITE_DATABASE_ID, OAUTH_STATES_COLLECTION, state.$id);
    }
  } catch (err) {
    console.warn(`[OAuth] Failed to delete oauth states for ${appId}:`, err.message);
  }
}

/**
 * Get all connections for a user (by userId or email)
 * @param {string} userIdOrEmail - User's Firebase UID or email
 * @returns {Array} Connection records (without decrypted tokens)
 */
export async function getUserConnections(userIdOrEmail) {
  // Determine if it's an email or userId
  const isEmail = userIdOrEmail && userIdOrEmail.includes('@');
  const queryField = isEmail ? 'userEmail' : 'userId';

  let connections;
  try {
    connections = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APP_CONNECTIONS_COLLECTION,
      [Query.equal(queryField, userIdOrEmail), Query.limit(100)]
    );
  } catch (err) {
    console.warn('[OAuth] getUserConnections query failed:', err.message);
    return [];
  }

  return connections.documents.map(conn => {
    // Parse grantedScopes - could be JSON string or already an array
    let scopes = [];
    if (conn.grantedScopes) {
      if (Array.isArray(conn.grantedScopes)) {
        scopes = conn.grantedScopes;
      } else if (typeof conn.grantedScopes === 'string') {
        try { scopes = JSON.parse(conn.grantedScopes); } catch { scopes = []; }
      }
    }

    return {
      appId: conn.appId,
      status: conn.status || 'active',
      grantedScopes: scopes,
      connectedAt: conn.connectedAt,
      lastUsedAt: conn.lastUsedAt,
      userId: conn.userId,
    };
  });
}

/**
 * Update lastUsedAt timestamp for a connection
 */
export async function markConnectionUsed(userId, appId) {
  const connections = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    APP_CONNECTIONS_COLLECTION,
    [Query.equal('userId', userId), Query.equal('appId', appId)]
  );
  if (connections.documents.length > 0) {
    await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      APP_CONNECTIONS_COLLECTION,
      connections.documents[0].$id,
      { lastUsedAt: new Date().toISOString() }
    );
  }
}
