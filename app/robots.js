export default function robots() {
  return {
    rules: [
      // Standard web crawlers: allow all public pages, block private app routes
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/app/',
          '/search/',
          '/image-gen/',
          '/library/',
          '/snapshot/',
          '/sign-in/',
          '/sign-up/',
          '/api/',
        ],
      },
      // Explicitly allow Google Extended (used by Gemini / AI Overviews)
      // so generative AI features can cite chatboxai.co.in content
      {
        userAgent: 'Google-Extended',
        allow: '/',
      },
      // Allow major AI research bots for wider AI search engine citations
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot', 'anthropic-ai', 'Applebot-Extended'],
        allow: '/',
      },
    ],
    sitemap: 'https://chatboxai.co.in/sitemap.xml',
    host: 'https://chatboxai.co.in',
  };
}
