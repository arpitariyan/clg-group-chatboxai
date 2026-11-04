/**
 * CORS Utility — Cross-Origin Request Validation
 * 
 * Validates the Origin header against an allowlist and provides helpers
 * for setting CORS response headers on API routes.
 */

import { NextResponse } from 'next/server';

/**
 * Get the list of allowed origins from environment variables.
 * Falls back to localhost in development.
 * @returns {string[]}
 */
function getAllowedOrigins() {
  const envOrigins = process.env.ALLOWED_CORS_ORIGINS || '';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  const origins = envOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Always include the configured app URL
  if (appUrl && !origins.includes(appUrl)) {
    origins.push(appUrl);
  }

  // In development, always allow localhost
  if (process.env.NODE_ENV !== 'production') {
    const devOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
    for (const o of devOrigins) {
      if (!origins.includes(o)) origins.push(o);
    }
  }

  return origins;
}

/**
 * Check if the request's Origin is allowed.
 * @param {Request} request
 * @returns {{ allowed: boolean, origin: string | null }}
 */
export function validateCors(request) {
  const origin = request.headers.get('origin') || null;

  // If no origin header (same-origin or server-to-server), allow
  if (!origin) return { allowed: true, origin: null };

  const allowedOrigins = getAllowedOrigins();

  // If no allowlist is configured and we're not in production, allow all
  if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production') {
    return { allowed: true, origin };
  }

  const isAllowed = allowedOrigins.some((allowed) => {
    // Support wildcard subdomain matching: *.example.com
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      return origin.endsWith(`.${domain}`) || origin === `https://${domain}` || origin === `http://${domain}`;
    }
    return allowed === origin;
  });

  return { allowed: isAllowed, origin };
}

/**
 * Add CORS headers to an existing NextResponse.
 * @param {NextResponse} response
 * @param {string | null} origin - The request's Origin header value
 * @returns {NextResponse}
 */
export function addCorsHeaders(response, origin) {
  const allowedOrigins = getAllowedOrigins();

  // If origin is allowed, reflect it; otherwise use the first allowed origin
  const responseOrigin = origin && allowedOrigins.includes(origin)
    ? origin
    : (allowedOrigins[0] || '*');

  response.headers.set('Access-Control-Allow-Origin', responseOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, X-Firebase-Token'
  );
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours preflight cache
  response.headers.set('Vary', 'Origin');

  return response;
}

/**
 * Handle an OPTIONS preflight request.
 * @param {Request} request
 * @returns {NextResponse}
 */
export function handleCorsPreflight(request) {
  const { origin } = validateCors(request);
  const response = new NextResponse(null, { status: 204 });
  addCorsHeaders(response, origin);
  return response;
}

/**
 * Return a 403 CORS error response.
 * @returns {NextResponse}
 */
export function corsErrorResponse() {
  return NextResponse.json(
    { success: false, error: 'CORS: Origin not allowed' },
    { status: 403 }
  );
}
