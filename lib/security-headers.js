/**
 * Security Headers — Centralized HTTP Security Headers
 * 
 * These headers are applied globally via middleware.js and next.config.mjs.
 * They implement defense-in-depth against XSS, clickjacking, MIME sniffing,
 * and information leakage attacks.
 */

const isProd = process.env.NODE_ENV === 'production';

/**
 * Content Security Policy directives
 * Adjusted to allow Firebase, Appwrite, Google Fonts, and Razorpay to work correctly.
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  // Scripts: allow self, inline scripts (needed for Next.js), and trusted CDNs
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://api.razorpay.com https://*.firebaseapp.com https://*.googleapis.com https://*.gstatic.com https://accounts.google.com",
  // Styles: allow self, inline styles (needed for CSS-in-JS), and Google Fonts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Fonts: Google Fonts CDN
  "font-src 'self' https://fonts.gstatic.com data:",
  // Images: allow self, data URIs, blob URIs, and common image CDNs
  "img-src 'self' data: blob: https: http:",
  // Media: allow self and blob (for audio/video)
  "media-src 'self' blob: data:",
  // Connections: allow API calls to Firebase, Appwrite, Razorpay, AI providers, and self
  "connect-src 'self' https://*.appwrite.io https://*.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com wss://*.firebaseio.com https://api.razorpay.com https://checkout.razorpay.com https://api.openai.com https://openrouter.ai https://api.a4f.co https://api.anthropic.com https://api.groq.com https://api.replicate.com https://generativelanguage.googleapis.com https://huggingface.co https://*.hf.space wss: ws:",
  // Frames: allow only Razorpay checkout frames and self
  "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.firebaseapp.com https://canva.com https://*.canva.com",
  // Workers: allow blob (for WebContainers, Monaco Editor)
  "worker-src 'self' blob:",
  // Objects: deny plugin content (Flash, etc.)
  "object-src 'none'",
  // Base URI: restrict to self
  "base-uri 'self'",
  // Form action: restrict to self
  "form-action 'self'",
  // Upgrade insecure requests in production
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join('; ');

/**
 * Security headers to apply on all responses.
 * Returns an array of { key, value } objects (compatible with next.config.mjs headers format).
 */
export function getSecurityHeadersArray() {
  return [
    {
      key: 'X-Frame-Options',
      value: 'DENY',
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(self), geolocation=(), browsing-topics=()',
    },
    {
      key: 'X-DNS-Prefetch-Control',
      value: 'on',
    },
    {
      key: 'X-XSS-Protection',
      value: '1; mode=block',
    },
    // {
    //   key: 'Content-Security-Policy',
    //   value: CSP_DIRECTIVES,
    // },
    // HSTS: only in production (breaks localhost dev if applied there)
    ...(isProd
      ? [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ]
      : []),
  ];
}

/**
 * Apply security headers to a NextResponse (for use in middleware.js)
 * @param {import('next/server').NextResponse} response
 * @returns {import('next/server').NextResponse}
 */
export function applySecurityHeaders(response) {
  const headers = getSecurityHeadersArray();
  for (const { key, value } of headers) {
    response.headers.set(key, value);
  }
  return response;
}
