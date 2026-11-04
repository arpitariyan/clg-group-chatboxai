/**
 * Admin Auth — Authentication & Authorization guard for admin API routes
 * 
 * Uses environment-variable-based admin email list (no DB schema changes needed).
 * Set ADMIN_EMAILS=email1@example.com,email2@example.com in your .env file.
 */

import { NextResponse } from 'next/server';
import { resolveRequestUser } from '@/lib/server-auth';

/**
 * Get the list of admin emails from the environment variable.
 * @returns {Set<string>}
 */
function getAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || '';
  const emails = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return new Set(emails);
}

/**
 * Verify that the incoming request is from an authenticated admin user.
 */
export async function verifyAdminRequest(request) {
  // Step 1: Authenticate the user via Firebase token
  let user;
  try {
    user = await resolveRequestUser(request);
  } catch (authError) {
    const status = authError?.status || 401;
    return {
      authorized: false,
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

  // Step 2: Check if authenticated user is in admin list
  const adminEmails = getAdminEmails();

  if (adminEmails.size === 0) {
    // In development, warn but allow if no admin list is set
    if (process.env.NODE_ENV === 'production') {
      console.error('[AdminAuth] ADMIN_EMAILS environment variable is not set. All admin routes are blocked.');
      return {
        authorized: false,
        errorResponse: NextResponse.json(
          {
            success: false,
            error: 'FORBIDDEN',
            message: 'Admin access is not configured',
          },
          { status: 503 }
        ),
      };
    }
    console.warn('[AdminAuth] ADMIN_EMAILS not set. Admin routes are unprotected in development.');
    return { authorized: true, user };
  }

  if (!adminEmails.has(user.email)) {
    console.warn(`[AdminAuth] Unauthorized admin access attempt by: ${user.email}`);
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'You do not have permission to access this resource',
        },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, user };
}
