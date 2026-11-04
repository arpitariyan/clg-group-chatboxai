import { NextResponse } from 'next/server';
import dns from 'node:dns';

// Fix Node 18+ IPv6 timeout issues in Route Handlers
dns.setDefaultResultOrder('ipv4first');

const FIREBASE_LOOKUP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup';

// Minimum token length for a valid Firebase JWT (rough sanity check)
const MIN_TOKEN_LENGTH = 100;

export class AuthError extends Error {
  constructor(message = 'Unauthorized', status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * Get normalized Set of admin emails from ADMIN_EMAILS environment variable.
 * Fails closed if empty.
 */
export function getAdminEmailsSet() {
  const raw = process.env.ADMIN_EMAILS || '';
  const emails = raw
    .split(',')
    .map((e) => normalizeEmail(e))
    .filter(Boolean);
  return new Set(emails);
}

/**
 * Is this email one of the configured admin accounts (ADMIN_EMAILS, comma-separated)?
 * Exported so admin-only route branches can gate on it without re-parsing the env var.
 */
export function isAdminEmail(value) {
  const email = normalizeEmail(value);
  if (!email) return false;
  return getAdminEmailsSet().has(email);
}

/**
 * Authoritatively verifies that the incoming request is from an authenticated admin.
 * Used for admin-only routes in ChatboxAI Renewal (e.g. coupons management, system diagnostics).
 */
export async function verifyAdminRequest(request) {
  let user;
  try {
    user = await resolveRequestUser(request, false);
  } catch (authError) {
    const status = authError?.status || 401;
    return {
      authorized: false,
      user: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: authError?.message || 'Authentication required',
        },
        { status }
      ),
    };
  }

  const adminEmails = getAdminEmailsSet();
  if (adminEmails.size === 0) {
    console.error('[AdminAuth] ADMIN_EMAILS environment variable is not configured. Access is blocked (fail closed).');
    return {
      authorized: false,
      authenticated: false,
      isAdmin: false,
      user: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: 'CONFIGURATION_ERROR',
          message: 'Admin access is not configured on this server',
        },
        { status: 503 }
      ),
    };
  }

  const userEmail = normalizeEmail(user.email);
  if (!adminEmails.has(userEmail)) {
    console.warn(`[AdminAuth] Unauthorized admin access attempt by: ${userEmail}`);
    return {
      authorized: false,
      authenticated: false,
      isAdmin: false,
      user: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'You do not have permission to access this administrative resource',
        },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    authenticated: true,
    isAdmin: true,
    user: {
      ...user,
      email: userEmail,
      isAdmin: true,
    },
  };
}

function getBearerToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  const fallbackToken = request.headers.get('x-firebase-token') || '';
  return String(fallbackToken || '').trim();
}

async function verifyFirebaseIdToken(idToken) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  if (!apiKey) {
    // SECURITY: Do NOT fall back to query parameters. Fail hard with 500.
    throw new AuthError('Firebase auth is not configured on server', 500);
  }

  const response = await fetch(`${FIREBASE_LOOKUP_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AuthError('Invalid authentication token', 401);
  }

  const user = Array.isArray(payload?.users) ? payload.users[0] : null;
  const email = normalizeEmail(user?.email);
  if (!email) {
    throw new AuthError('Authenticated user email is unavailable', 401);
  }

  return {
    email,
    uid: String(user?.localId || '').trim() || null,
    emailVerified: Boolean(user?.emailVerified),
  };
}

export async function resolveRequestUser(request, requireVerified = true) {
  const token = getBearerToken(request);
  if (!token) {
    throw new AuthError('Missing bearer token', 401);
  }

  // Sanity-check token format before making external call
  if (token.length < MIN_TOKEN_LENGTH || !/^[A-Za-z0-9\-_=.]+$/.test(token)) {
    throw new AuthError('Malformed authentication token', 401);
  }

  const user = await verifyFirebaseIdToken(token);

  // Bypass email verification for admin accounts so they don't get locked out
  const isAdmin = isAdminEmail(user.email);

  // Check account blocked status and email verification for non-admin accounts
  if (!isAdmin) {
    const { getCanonicalUserByEmail } = await import('@/lib/user-subscription-server');
    const { user: appwriteUser } = await getCanonicalUserByEmail({ email: user.email, createIfMissing: false });

    if (appwriteUser?.is_blocked === true) {
      throw new AuthError('Your account has been suspended by an administrator. Please contact support.', 403);
    }

    if (requireVerified && !user.emailVerified) {
      // If the profile exists and signup_verified is strictly false, then they are unverified.
      // If it's undefined/null, it's a legacy user (allowed). If true, they completed our OTP.
      if (!appwriteUser || appwriteUser.signup_verified === false) {
        throw new AuthError('Email address is not verified', 403);
      }
    }
  }

  user.isAdmin = isAdmin;
  return user;
}

/**
 * Resolve the authenticated user's email from a request.
 * 
 * SECURITY NOTE: The previous fallback that accepted ?email= from query params
 * has been REMOVED. It was a critical authentication bypass vulnerability.
 * If Firebase is misconfigured, this will throw a 500 error — which is the
 * correct behavior (fail closed, not fail open).
 */
export async function resolveRequestUserEmail(request, requireVerified = true) {
  const user = await resolveRequestUser(request, requireVerified);
  return user.email;
}

export function authErrorResponse(error, fallbackMessage = 'Unauthorized') {
  const status = Number(error?.status) || 401;
  return NextResponse.json(
    {
      success: false,
      error: status === 401 ? 'UNAUTHORIZED' : 'AUTH_ERROR',
      message: error?.message || fallbackMessage,
    },
    { status }
  );
}
