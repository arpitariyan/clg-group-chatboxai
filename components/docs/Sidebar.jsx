'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  {
    group: 'Get Started',
    items: [
      { label: 'Overview', href: '/docs' },
      { label: 'Quickstart', href: '/docs/quickstart' },
      { label: 'Authentication', href: '/docs/authentication' },
      { label: 'Models', href: '/docs/models' },
      { label: 'Pricing', href: '/docs/pricing' },
      { label: 'Libraries', href: '/docs/libraries' },
      { label: 'Prompt guidance', href: '/docs/prompt-guidance' },
      { label: 'Chat API', href: '/docs/chat' },
    ],
  },
  {
    group: 'Core Concepts',
    items: [
      { label: 'Text generation', href: '/docs/text-generation' },
      { label: 'Code generation', href: '/docs/code-generation' },
      { label: 'Images & vision', href: '/docs/images-vision' },
      { label: 'Audio & speech', href: '/docs/audio-speech' },
      { label: 'Structured output', href: '/docs/structured-output' },
      { label: 'Function calling', href: '/docs/function-calling' },
      { label: 'Responses API', href: '/docs/responses-api' },
      { label: 'Tools usage', href: '/docs/tools-usage' },
    ],
  },
  // ── Agents SDK (coming soon — not yet available) ──────────────────────────
  // {
  //   group: 'Agents SDK',
  //   items: [
  //     { label: 'Overview', href: '/docs/agents-overview' },
  //     { label: 'Agent definitions', href: '/docs/agent-definitions' },
  //     { label: 'Orchestration', href: '/docs/orchestration' },
  //     { label: 'Workflows', href: '/docs/workflows' },
  //     { label: 'Integrations & observability', href: '/docs/integrations-observability' },
  //     { label: 'Voice agents', href: '/docs/voice-agents' },
  //   ],
  // },
  {
    group: 'Capabilities',
    items: [
      { label: 'Web search', href: '/docs/web-search' },
      { label: 'MCP & connectors', href: '/docs/mcp-connectors' },
      { label: 'Skills', href: '/docs/skills' },
    ],
  },
  {
    group: 'Platform',
    items: [
      { label: 'Evaluations', href: '/docs/evaluations' },
      { label: 'Prompt optimizer', href: '/docs/prompt-optimizer' },
      { label: 'External models', href: '/docs/external-models' },
    ],
  },
  {
    group: 'Best Practices',
    items: [
      { label: 'Deployment checklist', href: '/docs/deployment-checklist' },
      { label: 'Accuracy optimization', href: '/docs/accuracy-optimization' },
    ],
  },
  {
    group: 'Policies',
    items: [
      { label: 'Terms & policies', href: '/docs/terms-policies' },
      { label: 'Rate limits', href: '/docs/rate-limits' },
      { label: 'Permissions', href: '/docs/permissions' },
      { label: 'Deprecations', href: '/docs/deprecations' },
    ],
  },
  {
    group: 'Updates',
    items: [
      { label: 'Changelog', href: '/docs/changelog' },
    ],
  },
  {
    group: 'Developer Mode',
    items: [
      { label: 'Advanced debugging', href: '/docs/developer-mode' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="docs-sidebar">
      {NAV.map((section) => (
        <div key={section.group} className="docs-sidebar-section">
          <span className="docs-sidebar-group-label">{section.group}</span>
          {section.items.map((item) => {
            const isActive =
              item.href === '/docs'
                ? pathname === '/docs'
                : pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`docs-sidebar-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

export default Sidebar;
