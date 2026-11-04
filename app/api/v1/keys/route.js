/**
 * POST /api/v1/keys
 * Generate a new API key for the authenticated user
 * 
 * Required: Firebase authentication (Bearer token)
 * Body: {
 *   name?: string,
 *   environment?: 'live' | 'test' (default: 'live'),
 *   rate_limit_rpm?: number (default: 60),
 *   rate_limit_tpm?: number (default: 90000)
 * }
 * 
 * Response:
 * {
 *   key: "cbx_live_...",
 *   key_id: "...",
 *   name: "...",
 *   environment: "live",
 *   created_at: "2026-05-04T...",
 *   last_digits: "...abc"
 * }
 * 
 * Note: Key is only returned once. Remind user to store it securely.
 */

import { NextResponse } from 'next/server';
import { databases } from '@/services/appwrite-admin.js';
import { API_KEYS_COLLECTION_ID, APPWRITE_DATABASE_ID, USERS_COLLECTION_ID } from '@/services/appwrite-collections.js';
import { resolveRequestUserEmail } from '@/lib/server-auth.js';
import { generatePlatformApiKey, hashPlatformApiKey, getPlatformKeyLastDigits, encryptPlatformApiKey, decryptPlatformApiKey } from '@/lib/platform-api-key.js';
import { ensureApiKeyStorageReady } from '@/lib/appwrite-api-keys-bootstrap.js';
import { ID } from 'node-appwrite';
import { AuthError, authErrorResponse } from '@/lib/server-auth.js';

export async function POST(request) {
  try {
    await ensureApiKeyStorageReady();

    // Authenticate user
    const email = await resolveRequestUserEmail(request);
    if (!email) {
      return NextResponse.json(
        { error: 'Unauthorized. No valid Firebase token.' },
        { status: 401 }
      );
    }

    // Get user from database
    const { databases: db } = await import('@/services/appwrite-admin.js');
    const { Query } = await import('node-appwrite');
    const { USERS_COLLECTION_ID } = await import('@/services/appwrite-collections.js');

    const usersResponse = await db.listDocuments(
      APPWRITE_DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.equal('email', email.toLowerCase())]
    );

    if (usersResponse.documents.length === 0) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    const user = usersResponse.documents[0];
    const userId = user.$id;

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const {
      name = `Key ${new Date().toLocaleDateString()}`,
      environment = 'live',
      rate_limit_rpm = 60,
      rate_limit_tpm = 90000,
    } = body;

    // Validate environment
    if (!['live', 'test'].includes(environment)) {
      return NextResponse.json(
        { error: 'Invalid environment. Must be "live" or "test".' },
        { status: 400 }
      );
    }

    // Validate rate limits
    if (typeof rate_limit_rpm !== 'number' || rate_limit_rpm < 1) {
      return NextResponse.json(
        { error: 'rate_limit_rpm must be a positive number.' },
        { status: 400 }
      );
    }

    if (typeof rate_limit_tpm !== 'number' || rate_limit_tpm < 1) {
      return NextResponse.json(
        { error: 'rate_limit_tpm must be a positive number.' },
        { status: 400 }
      );
    }

    // Generate API key
    const apiKey = generatePlatformApiKey(environment);
    const keyHash = hashPlatformApiKey(apiKey);
    const lastDigits = getPlatformKeyLastDigits(apiKey);
    const encryptedKey = encryptPlatformApiKey(apiKey);

    // Store in database
    const keyRecord = await databases.createDocument(
      APPWRITE_DATABASE_ID,
      API_KEYS_COLLECTION_ID,
      ID.unique(),
      {
        user_id: userId,
        key_hash: keyHash,
        encrypted_key: encryptedKey.encrypted_key,
        encrypted_key_iv: encryptedKey.encrypted_key_iv,
        encrypted_key_tag: encryptedKey.encrypted_key_tag,
        environment,
        name,
        status: 'active',
        created_at: new Date().toISOString(),
        last_used_at: null,
        revoked_at: null,
        rate_limit_rpm,
        rate_limit_tpm,
        metadata: JSON.stringify({
          description: '',
          ip_whitelist: [],
        }),
      }
    );

    // Return full key (only shown once)
    return NextResponse.json(
      {
        success: true,
        key: apiKey,
        key_id: keyRecord.$id,
        name,
        environment,
        created_at: keyRecord.created_at,
        last_digits: lastDigits,
        message: 'Your key is available anytime from the dashboard.',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error, 'API key generation requires authentication.');
    }

    console.error('Error generating API key:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate API key.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/keys
 * List all API keys for the authenticated user (without showing full keys)
 */
export async function GET(request) {
  try {
    await ensureApiKeyStorageReady();

    const email = await resolveRequestUserEmail(request);
    if (!email) {
      return NextResponse.json(
        { error: 'Unauthorized. No valid Firebase token.' },
        { status: 401 }
      );
    }

    const { databases: db } = await import('@/services/appwrite-admin.js');
    const { Query } = await import('node-appwrite');
    // Get user
    const usersResponse = await db.listDocuments(
      APPWRITE_DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.equal('email', email.toLowerCase())]
    );

    if (usersResponse.documents.length === 0) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const userId = usersResponse.documents[0].$id;

    // Get all API keys for this user
    const keysResponse = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      API_KEYS_COLLECTION_ID,
      [Query.equal('user_id', userId), Query.orderDesc('created_at')]
    );

    // Format response (don't return key_hash)
    const keys = keysResponse.documents.map((key) => {
      let apiKey = null;
      if (key.encrypted_key) {
        try {
          apiKey = decryptPlatformApiKey(key);
        } catch (error) {
          console.warn('Failed to decrypt API key for dashboard display:', error.message);
        }
      }
      return {
      key_id: key.$id,
      name: key.name,
      environment: key.environment,
      status: key.status,
      created_at: key.created_at,
      last_used_at: key.last_used_at,
      revoked_at: key.revoked_at,
      api_key: apiKey,
      last_digits: apiKey ? getPlatformKeyLastDigits(apiKey) : key.key_hash.slice(-8),
      rate_limit_rpm: key.rate_limit_rpm,
      rate_limit_tpm: key.rate_limit_tpm,
      };
    });

    return NextResponse.json(
      {
        success: true,
        keys,
        total: keys.length,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error, 'API key listing requires authentication.');
    }

    console.error('Error listing API keys:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list API keys.' },
      { status: 500 }
    );
  }
}
