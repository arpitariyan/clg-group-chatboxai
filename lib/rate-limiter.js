/**
 * Rate Limiter — Sliding Window In-Memory Rate Limiter
 * 
 * Usage:
 *   import { checkRateLimit } from '@/lib/rate-limiter';
 *   const result = checkRateLimit(identifier, { maxRequests: 5, windowMs: 15 * 60 * 1000 });
 *   if (!result.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 */

// Store: identifier -> array of timestamp (ms)
const store = new Map();

// Auto-cleanup every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of store.entries()) {
    // If all timestamps are older than 1 hour, remove the entry
    if (timestamps.length === 0 || now - timestamps[timestamps.length - 1] > 3600000) {
      store.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Check rate limit using a sliding window algorithm
 * @param {string} identifier - Unique key (e.g., IP address, email, user ID)
 * @param {Object} options
 * @param {number} options.maxRequests - Max requests allowed in the window
 * @param {number} options.windowMs - Window duration in milliseconds
 * @returns {{ allowed: boolean, remaining: number, retryAfterMs: number, retryAfterSec: number }}
 */
export function checkRateLimit(identifier, { maxRequests = 10, windowMs = 60000 } = {}) {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get existing timestamps for this identifier
  let timestamps = store.get(identifier) || [];

  // Remove timestamps outside the current window (sliding window)
  timestamps = timestamps.filter((ts) => ts > windowStart);

  const remaining = Math.max(0, maxRequests - timestamps.length);
  const allowed = timestamps.length < maxRequests;

  if (allowed) {
    // Record this request
    timestamps.push(now);
    store.set(identifier, timestamps);
  }

  // Calculate retry-after: time until the oldest timestamp falls outside the window
  const retryAfterMs = allowed
    ? 0
    : timestamps.length > 0
    ? Math.max(0, timestamps[0] + windowMs - now)
    : 0;

  return {
    allowed,
    remaining,
    retryAfterMs,
    retryAfterSec: Math.ceil(retryAfterMs / 1000),
    limit: maxRequests,
    windowMs,
  };
}

/**
 * Reset the rate limit for an identifier (e.g., after successful OTP verification)
 * @param {string} identifier
 */
export function resetRateLimit(identifier) {
  store.delete(identifier);
}

/**
 * Get IP address from Next.js request headers (works with Vercel, Cloudflare, nginx)
 * @param {Request} request
 * @returns {string}
 */
export function getClientIp(request) {
  return (
    request.headers.get('cf-connecting-ip') ||     // Cloudflare
    request.headers.get('x-real-ip') ||            // nginx
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || // proxy chains
    'unknown'
  );
}

/**
 * Build a rate limit error response object (to use with NextResponse.json)
 * @param {number} retryAfterSec
 * @returns {{ error: string, retryAfter: number }}
 */
export function rateLimitErrorBody(retryAfterSec) {
  return {
    success: false,
    error: 'Too many requests. Please slow down.',
    retryAfter: retryAfterSec,
  };
}
