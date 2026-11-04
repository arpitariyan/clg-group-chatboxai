import dns from 'node:dns';
import { getSecurityHeadersArray } from './lib/security-headers.js';
dns.setDefaultResultOrder('ipv4first');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Packages that are dynamically imported at runtime only — exclude from bundle
  serverExternalPackages: ['@anthropic-ai/sdk'],
  // NOTE: Firebase v12+ is fully ESM-compatible, transpilePackages causes Turbopack slowdowns
  // transpilePackages: ['firebase', '@firebase/auth', '@firebase/app'],

  async rewrites() {
    return [
      {
        source: '/.netlify/functions/inngest',
        destination: '/api/inngest',
      },
      {
        source: '/.redwood/functions/inngest',
        destination: '/api/inngest',
      },
      {
        source: '/x/inngest',
        destination: '/api/inngest',
      },
    ];
  },

  async headers() {
    const securityHeaders = getSecurityHeadersArray();

    return [
      // ── Prevent indexing of private app routes ──────────────────────────────
      {
        source: '/app/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/search/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/image-gen/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/library',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/snapshot',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/sign-in',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/sign-up',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },

      // ── Apply security headers to ALL routes ────────────────────────────────
      {
        source: '/(.*)',
        headers: [
          ...securityHeaders,
          // Cross-origin policies (kept from original config)
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
        ],
      },
      // ── Website builder needs stricter isolation for SharedArrayBuffer ───────
      {
        source: '/website-builder/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },

  reactCompiler: false,

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Google services
      { protocol: 'https', hostname: 'encrypted-tbn0.gstatic.com', pathname: '/**' },
      { protocol: 'https', hostname: 'encrypted-tbn1.gstatic.com', pathname: '/**' },
      { protocol: 'https', hostname: 'encrypted-tbn2.gstatic.com', pathname: '/**' },
      { protocol: 'https', hostname: 'encrypted-tbn3.gstatic.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/**' },
      { protocol: 'https', hostname: 'img.youtube.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'www.google.com', pathname: '/**' },
      // WordPress CDN
      { protocol: 'https', hostname: '*.wp.com', pathname: '/**' },
      // AWS / generic CDNs
      { protocol: 'https', hostname: '*.cloudfront.net', pathname: '/**' },
      { protocol: 'https', hostname: '*.amazonaws.com', pathname: '/**' },
      // Appwrite storage
      { protocol: 'https', hostname: '*.appwrite.io', pathname: '/**' },
      { protocol: 'https', hostname: 'nyc.cloud.appwrite.io', pathname: '/**' },
      // User profile pictures from common providers
      { protocol: 'https', hostname: 'avatars.githubusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'pbs.twimg.com', pathname: '/**' },
      { protocol: 'https', hostname: 'platform-lookaside.fbsbx.com', pathname: '/**' },
      // Hugging Face
      { protocol: 'https', hostname: 'huggingface.co', pathname: '/**' },
      { protocol: 'https', hostname: '*.hf.space', pathname: '/**' },
      // Replicate
      { protocol: 'https', hostname: 'replicate.delivery', pathname: '/**' },
      { protocol: 'https', hostname: 'pbxt.replicate.delivery', pathname: '/**' },
      // AI image generation services
      { protocol: 'https', hostname: '*.together.ai', pathname: '/**' },
      { protocol: 'https', hostname: '*.openai.com', pathname: '/**' },
      // NOTE: The wildcard { hostname: '**' } has been intentionally REMOVED.
      // It disabled the security benefit of allowlisting image sources.
      // If you need to add a new image domain, add it explicitly above.
    ],
  },
};

export default nextConfig;
