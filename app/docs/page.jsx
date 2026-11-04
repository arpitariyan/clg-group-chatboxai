import Link from 'next/link';
import QuickstartBlock from './_components/QuickstartBlock';
import JsonLd from '@/app/_components/JsonLd';

export const metadata = {
  title: 'API Documentation',
  description: 'Official ChatBox AI API documentation. Access 56+ frontier AI models — GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, DeepSeek R1, and Llama 3.3 — through a single OpenAI-compatible endpoint with built-in web search, usage analytics, and rate limiting.',
  alternates: {
    canonical: 'https://chatboxai.co.in/docs',
  },
  openGraph: {
    title: 'API Documentation | ChatBox AI',
    description: 'Official ChatBox AI API documentation. Access 56+ AI models through one OpenAI-compatible endpoint.',
    url: 'https://chatboxai.co.in/docs',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'API Documentation | ChatBox AI',
    description: 'Unified OpenAI-compatible API accessing 56+ frontier AI models.',
  },
};

// SVG icon components
const Icons = {
  Bot: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="11" width="18" height="10" rx="2" /><path d="M12 3v4m-4 0h8M7 15h.01M17 15h.01" />
    </svg>
  ),
  Key: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  ),
  Chat: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Globe: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  BarChart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Zap: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Tool: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  Network: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="5" r="2" /><circle cx="19" cy="19" r="2" /><circle cx="5" cy="19" r="2" />
      <line x1="12" y1="7" x2="12" y2="12" /><line x1="12" y1="12" x2="19" y2="17" /><line x1="12" y1="12" x2="5" y2="17" />
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  ),
};

const CARDS = [
  { Icon: Icons.Bot, title: 'Multi-Model Support', desc: '56+ models including Llama 3.3, Gemini 1.5 Pro, DeepSeek R1 and more — one API.', href: '/docs/models' },
  { Icon: Icons.Key, title: 'API Key Management', desc: 'Generate, rotate, and revoke keys from your dashboard.', href: '/docs/authentication' },
  { Icon: Icons.Chat, title: 'Chat Completions', desc: 'OpenAI-compatible endpoint. Drop-in replacement.', href: '/docs/chat' },
  { Icon: Icons.Globe, title: 'Web Search', desc: 'Grounded answers with real-time citations.', href: '/docs/web-search' },
  { Icon: Icons.BarChart, title: 'Usage Analytics', desc: 'Token usage, cost tracking, and key analytics.', href: '/docs/rate-limits' },
  { Icon: Icons.Tool, title: 'Function Calling', desc: 'Give models tools and structured actions.', href: '/docs/function-calling' },
  { Icon: Icons.Network, title: 'Images & Vision', desc: 'Generate images and analyze visual content via API.', href: '/docs/images-vision' },
];

const MODELS = [
  { name: 'Free models', desc: 'Everyday chat, vision, and lightweight coding with the free tier.', badge: 'Free', cls: 'frontier', badgeCls: 'badge-frontier', href: '/docs/models' },
  { name: 'Paid models', desc: 'High-end reasoning and premium models unlocked by API credits.', badge: 'Paid', cls: 'reasoning', badgeCls: 'badge-reasoning', href: '/docs/models' },
  { name: 'Vision models', desc: 'Image-aware models and image generation endpoints, split by tier.', badge: 'Mixed', cls: 'vision', badgeCls: 'badge-vision', href: '/docs/models' },
];

const BUILD_PATHS = [
  { title: 'Chat & Completions', desc: 'Make direct model requests for text, structured output, tools, and multimodal workflows.', href: '/docs/chat', cta: 'Start with Chat' },
  { title: 'Images & Vision', desc: 'Generate images and analyze visual content via API. Supports FLUX, Stable Diffusion and more.', href: '/docs/images-vision', cta: 'Start with Images' },
];

export default function DocsOverview() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://chatboxai.co.in',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Documentation',
        item: 'https://chatboxai.co.in/docs',
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <div className="docs-overview">
      {/* Hero */}
      <div className="docs-hero">
        <div className="docs-hero-badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          API Platform
        </div>
        <h1>ChatboxAI <span>API</span></h1>
        <p>Access 56+ AI models through a unified OpenAI-compatible API. Built-in usage tracking, rate limiting, web search, and enterprise-ready key management.</p>
        <div className="docs-hero-actions">
          <Link href="/docs/quickstart" className="btn-primary">
            Get started <Icons.ArrowRight />
          </Link>
          <Link href="/settings?tab=api-keys" className="btn-secondary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>
            Create API key
          </Link>
        </div>
      </div>

      {/* Quickstart block */}
      <div style={{ marginBottom: '36px' }}>
        <QuickstartBlock />
      </div>

      {/* Build paths */}
      <div style={{ marginBottom: '36px' }}>
        <div className="docs-section-title">
          Build paths
          <Link href="/docs/getting-started">View all guides</Link>
        </div>
        <div className="docs-build-grid">
          {BUILD_PATHS.map((p) => (
            <Link key={p.href} href={p.href} className="docs-card">
              <div className="docs-card-title">{p.title}</div>
              <div className="docs-card-desc">{p.desc}</div>
              <div style={{ fontSize: '12.5px', color: 'var(--docs-accent-hover)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                {p.cta} <Icons.ArrowRight />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Models */}
      <div style={{ marginBottom: '36px' }}>
        <div className="docs-section-title">
          Models
          <Link href="/docs/models">View all</Link>
        </div>
        <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--docs-text-muted)' }}>
          Free accounts get a smaller model set with request caps. Paid accounts with credits unlock the full catalog and usage-based billing.
        </div>
        <div className="docs-model-grid">
          {MODELS.map((m) => (
            <Link key={m.name} href={m.href} className={`docs-model-card ${m.cls}`}>
              <div className={`docs-model-badge ${m.badgeCls}`}>{m.badge}</div>
              <div className="docs-model-name">{m.name}</div>
              <div className="docs-model-desc">{m.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Feature cards */}
      <div style={{ marginBottom: '36px' }}>
        <div className="docs-section-title">Everything you need</div>
        <div className="docs-cards-grid">
          {CARDS.map((c) => (
            <Link key={c.href} href={c.href} className="docs-card">
              <div className="docs-card-icon"><c.Icon /></div>
              <div className="docs-card-title">{c.title}</div>
              <div className="docs-card-desc">{c.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Support footer */}
      <div style={{
        background: 'var(--docs-surface)',
        border: '1px solid var(--docs-border)',
        borderRadius: '12px',
        padding: '22px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--docs-text)', marginBottom: '4px' }}>Need help?</div>
          <div style={{ fontSize: '13px', color: 'var(--docs-text-muted)' }}>Contact support or browse the full documentation.</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href="mailto:support@chatboxai.co.in" className="btn-secondary" style={{ fontSize: '13px', padding: '7px 14px' }}>Email support</a>
          <Link href="/docs/getting-started" className="btn-primary" style={{ fontSize: '13px', padding: '7px 14px' }}>Read docs</Link>
        </div>
      </div>
    </div>
    </>
  );
}
