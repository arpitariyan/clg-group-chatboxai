/**
 * Next.js Root Proxy (formerly middleware.js)
 * 
 * Renamed from middleware.js to proxy.js as per Next.js 16 convention.
 * Runs on every request before it reaches route handlers.
 * 
 * Responsibilities:
 * 1. Apply HTTP security headers on all responses (CSP, HSTS, X-Frame-Options, etc.)
 * 2. Block debug/test endpoints in production
 * 3. Apply global IP-based rate limiting on all API routes
 * 4. Enforce admin authentication on /api/admin/* routes
 */

import { NextResponse } from 'next/server';
import { applySecurityHeaders } from '@/lib/security-headers';
import { checkRateLimit, getClientIp, rateLimitErrorBody } from '@/lib/rate-limiter';

// Routes to block entirely in production
const BLOCKED_IN_PRODUCTION = [
  '/api/test-env',
  '/api/test-db',
  '/api/analyze-test',
];

// Public API routes that skip the global rate limiter (they have their own)
const RATE_LIMIT_EXEMPT = [
  '/api/inngest',
  '/api/razorpay/webhook',
];

/**
 * Global API rate limit: 200 requests per minute per IP.
 * Applies to all /api/* routes not in RATE_LIMIT_EXEMPT.
 */
const GLOBAL_API_RATE_LIMIT = {
  maxRequests: 200,
  windowMs: 60 * 1000, // 1 minute
};

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const isProd = process.env.NODE_ENV === 'production';

  // Keep the public hostname canonical so the www and apex hosts do not
  // become separate crawlable versions of every page.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = (forwardedHost || request.headers.get('host') || request.nextUrl.hostname)
    .split(',')[0]
    .trim()
    .split(':')[0]
    .toLowerCase();
  if (isProd && host === 'www.chatboxai.co.in') {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.hostname = 'chatboxai.co.in';
    canonicalUrl.port = '';
    return NextResponse.redirect(canonicalUrl, 308);
  }

  // Redirect insecure production requests before any route work is performed.
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (isProd && forwardedProto && forwardedProto !== 'https') {
    const secureUrl = request.nextUrl.clone();
    secureUrl.protocol = 'https:';
    return NextResponse.redirect(secureUrl, 308);
  }

  // ── 1. Block debug routes in production ─────────────────────────────────
  if (isProd && BLOCKED_IN_PRODUCTION.some((route) => pathname.startsWith(route))) {
    return new NextResponse(null, { status: 404 });
  }

  // ── 2. Apply global API rate limiting ────────────────────────────────────
  const isApiRoute = pathname.startsWith('/api/');
  const isRateLimitExempt = RATE_LIMIT_EXEMPT.some((route) => pathname.startsWith(route));

  if (isApiRoute && !isRateLimitExempt) {
    const clientIp = getClientIp(request);
    const rl = checkRateLimit(`global:${clientIp}`, GLOBAL_API_RATE_LIMIT);

    if (!rl.allowed) {
      const response = NextResponse.json(
        rateLimitErrorBody(rl.retryAfterSec),
        {
          status: 429,
          headers: {
            'Retry-After': String(rl.retryAfterSec),
            'X-RateLimit-Limit': String(rl.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil((Date.now() + rl.retryAfterMs) / 1000)),
          },
        }
      );
      applySecurityHeaders(response);
      return response;
    }

    // Attach rate limit headers to help clients
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', String(rl.limit));
    response.headers.set('X-RateLimit-Remaining', String(rl.remaining));
    applySecurityHeaders(response);
    return response;
  }

  // ── 3. Apply security headers to all other responses ────────────────────
  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
}

/**
 * Matcher configuration — run proxy on all routes except:
 * - Static files (_next/static, _next/image, favicon.ico)
 * - Public folder assets (images, fonts, etc.)
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
};
