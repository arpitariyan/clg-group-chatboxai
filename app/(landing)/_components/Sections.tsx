'use client';

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Menu, X, ArrowUpRight, Copy, Check, Code2, FileText, Search, Layers, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Section, Card, Btn, Counter, SIGN_UP, PRICING } from "./ui";

const img = (p: string, _w?: number) => { void _w; return p; };

export function Navbar() {
  const [open, setOpen] = useState(false);
  const progress = useRef<HTMLSpanElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const nav = useRef<HTMLElement>(null);
  const groups: { label: string; items: [string, string, string, "route" | "anchor" | "ext"][] }[] =
    [
      {
        label: "Explore",
        items: [
          ["/ai-models", "AI Models", "The documented model catalog", "route"],
          ["/deep-research", "Deep Research", "Multi-step, sourced answers", "route"],
          ["/security", "Security", "How your data is handled", "route"],
        ],
      },
      {
        label: "For your work",
        items: [
          ["/developers", "Developers", "Code, prototypes and the API", "route"],
          ["/researchers", "Researchers", "From question to draft", "route"],
          ["/creators", "Creators", "Words, images and pages", "route"],
        ],
      },
      {
        label: "Resources",
        items: [
          ["/mobile-app", "Android App", "Download the native APK", "route"],
          ["/docs", "Documentation", "API and guides", "route"],
          ["/#features", "Features", "", "anchor"],
          ["/#pricing", "Pricing", "", "anchor"],
          ["/#faq", "FAQ", "", "anchor"],
        ],
      },
    ];
  useEffect(() => {
    let raf = 0;
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const pct = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      if (progress.current) progress.current.textContent = `${Math.round(pct * 100)}%`;
      if (fill.current) fill.current.style.transform = `scaleX(${pct})`;
      raf = 0;
    };
    const scroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const resize = new ResizeObserver(scroll);
    resize.observe(document.body);
    update();
    addEventListener("scroll", scroll, { passive: true });
    addEventListener("resize", scroll);
    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      removeEventListener("scroll", scroll);
      removeEventListener("resize", scroll);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    const outside = (e: PointerEvent) => {
      if (e.target instanceof Node && !nav.current?.contains(e.target)) setOpen(false);
    };
    const focusOutside = (e: FocusEvent) => {
      if (e.target instanceof Node && !nav.current?.contains(e.target)) setOpen(false);
    };
    addEventListener("keydown", key);
    addEventListener("pointerdown", outside);
    addEventListener("focusin", focusOutside);
    return () => {
      removeEventListener("keydown", key);
      removeEventListener("pointerdown", outside);
      removeEventListener("focusin", focusOutside);
    };
  }, [open]);
  return (
    <header ref={nav} className="landing-nav">
      <nav className="nav-grid" aria-label="Main">
        <Link href="/#top" className="nav-brand">
          <Image
            src="/Chatboxai_logo_main_2.png"
            alt="ChatBox AI"
            width={140}
            height={32}
            className="h-8 w-auto object-contain"
            priority
          />
        </Link>
        <div className="nav-capsule">
          <div className="nav-progress" aria-label="Page scroll progress">
            <div className="progress-track">
              <div ref={fill} className="progress-fill" />
            </div>
            <span ref={progress}>0%</span>
          </div>
          <Button
            ref={menuButton}
            size="sm"
            variant="ghost"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="rounded-full gap-3"
          >
            Menu {open ? <X /> : <Menu />}
          </Button>
        </div>
        <div className="nav-cta">
          <Btn href={SIGN_UP}>Start for Free</Btn>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            className="nav-menu nav-mega"
            initial={{ opacity: 0, y: -10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -8, x: "-50%" }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {groups.map((g) => (
              <div key={g.label} className="nav-mega-col">
                <p className="nav-mega-label">{g.label}</p>
                {g.items.map(([h, l, d, kind]) => {
                  const inner = (
                    <>
                      <span>
                        <span className="nav-mega-title">{l}</span>
                        {d && <span className="nav-mega-desc">{d}</span>}
                      </span>
                      <ArrowUpRight aria-hidden="true" />
                    </>
                  );
                  if (kind === "route")
                    return (
                      <Link key={h} href={h} onClick={() => setOpen(false)}>
                        {inner}
                      </Link>
                    );
                  return (
                    <a
                      key={h}
                      href={h}
                      onClick={() => setOpen(false)}
                      {...(kind === "ext" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {inner}
                    </a>
                  );
                })}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

const providers: [string, string][] = [
  ["OpenAI", "/model icon/Chatgpt.png"],
  ["Anthropic", "/model icon/Claude.png"],
  ["Google AI", "/model icon/Gemini.webp"],
  ["Meta AI", "/model icon/Meta.png"],
  ["Mistral AI", "/model icon/Mistral.png"],
  ["Cohere", "/model icon/cohere.png"],
  ["Groq", "/model icon/groq.png"],
  ["DeepSeek", "/app_logo_connection/deepseek-logo-icon.png"],
];

export function TrustBadges() {
  // 16 items per track ensures single track exceeds ultra-wide displays
  const trackItems = [...providers, ...providers];

  return (
    <section className="border-y border-border py-10">
      <p className="eyebrow mb-6 text-center">Powered by state-of-the-art AI foundation models</p>
      <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="animate-marquee flex w-max hover:[animation-play-state:paused]">
          {/* Primary Track */}
          <div className="flex shrink-0 items-center gap-12 sm:gap-14 pr-12 sm:pr-14">
            {trackItems.map(([n, p], i) => (
              <div
                key={`t1-${i}`}
                className="group flex items-center gap-3 text-muted-foreground transition-colors hover:text-foreground"
              >
                <img
                  src={img(p)}
                  alt={`${n} logo`}
                  className="h-7 w-7 rounded-md object-contain opacity-70 grayscale transition-all duration-200 group-hover:opacity-100 group-hover:grayscale-0"
                  loading="lazy"
                />
                <span className="text-sm font-medium tracking-tight whitespace-nowrap">{n}</span>
              </div>
            ))}
          </div>

          {/* Mirrored Duplicate Track for seamless 100% gapless infinite loop */}
          <div className="flex shrink-0 items-center gap-12 sm:gap-14 pr-12 sm:pr-14" aria-hidden="true">
            {trackItems.map(([n, p], i) => (
              <div
                key={`t2-${i}`}
                className="group flex items-center gap-3 text-muted-foreground transition-colors hover:text-foreground"
              >
                <img
                  src={img(p)}
                  alt=""
                  className="h-7 w-7 rounded-md object-contain opacity-70 grayscale transition-all duration-200 group-hover:opacity-100 group-hover:grayscale-0"
                  loading="lazy"
                />
                <span className="text-sm font-medium tracking-tight whitespace-nowrap">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const modes = [
  ["AI Chat", "56+ Models"],
  ["Deep Research", "24+ Sources"],
  ["Website Builder", "React & Tailwind"],
  ["File Intelligence", "PDF & Data"],
  ["App Connectors", "Live Sync"],
];
const code = `import useSWR from 'swr';

const fetcher = url => fetch(url).then(res => res.json());

export function useFetchData(endpoint) {
  const { data, error, isLoading } = useSWR(endpoint, fetcher);
  return { data, isError: error, isLoading };
}`;

export interface AppIntegrationItem {
  name: string;
  category: string;
  logo: string;
  syncBadge: string;
  recentActivity: string;
  bullets: string[];
  securityNote: string;
}

export const APPS_DATA: AppIntegrationItem[] = [
  {
    name: "Google Drive",
    category: "Cloud Storage",
    logo: "google drive.png",
    syncBadge: "Direct API Sync · Encrypted & Contextual",
    recentActivity: "Indexed Q3-Financial-Report.pdf (12s ago)",
    bullets: [
      "Search & index 10,000+ files",
      "Extract tables & text from PDFs",
      "Real-time document sync",
    ],
    securityNote: "Connected with end-to-end encryption. Revoke permissions anytime.",
  },
  {
    name: "Slack",
    category: "Team Chat",
    logo: "slack.png",
    syncBadge: "Direct API Sync · Bot & Webhooks",
    recentActivity: "Summarized #engineering thread (84 unread, 4m ago)",
    bullets: [
      "Instant summaries of lengthy channel debates & threads",
      "Search team chat history and past shared decisions",
      "Draft thoughtful responses in your team's tone",
    ],
    securityNote: "Connected with encrypted webhooks. Channel-level permissions enforced.",
  },
  {
    name: "Figma",
    category: "Design & Assets",
    logo: "Figma.png",
    syncBadge: "Direct API Sync · Vector & Token-Aware",
    recentActivity: "Extracted tokens from Design-System-v2.fig (1m ago)",
    bullets: [
      "Convert Figma frames into clean React & Tailwind code",
      "Inspect typography hierarchy, colors & auto-layout tokens",
      "Live sync design specs with Website Builder",
    ],
    securityNote: "Connected with read-only Figma personal access token authentication.",
  },
  {
    name: "GitHub",
    category: "Code Repositories",
    logo: "Github.png",
    syncBadge: "Direct API Sync · Octokit & CI/CD",
    recentActivity: "Analyzed PR #142 auth-hardening-refactor (38s ago)",
    bullets: [
      "Full-repo semantic search and architectural mapping",
      "Automated PR code reviews with actionable diff explanations",
      "Generate test suites and safe backward-compatible refactors",
    ],
    securityNote: "Connected with fine-grained PAT. Zero code retained on remote servers.",
  },
  {
    name: "Notion",
    category: "Knowledge Base",
    logo: "NOTION.png",
    syncBadge: "Direct API Sync · Page & Database Engine",
    recentActivity: "Synced Q4-Product-Roadmap database (2m ago)",
    bullets: [
      "Instant semantic Q&A across private Notion databases & wikis",
      "Generate structured PRDs, briefs & meeting action items",
      "Sync rich formatted tables, toggles & task checklists",
    ],
    securityNote: "Official Notion Integration. Access restricted to selected pages only.",
  },
  {
    name: "Canva",
    category: "Visual Content",
    logo: "CANVA.png",
    syncBadge: "Direct API Sync · Canva Connect API",
    recentActivity: "Exported brand palette & social template (5m ago)",
    bullets: [
      "Export generated AI art directly into Canva design files",
      "Extract official brand colors, logos & typography guidelines",
      "Batch-create social media creative variations with AI copy",
    ],
    securityNote: "Connected with secure Canva OAuth 2.0. Permissions revocable anytime.",
  },
  {
    name: "Microsoft 365",
    category: "Enterprise Docs",
    logo: "MICROSOFT.png",
    syncBadge: "Direct API Sync · Microsoft Graph & Entra ID",
    recentActivity: "Parsed Annual-Budget-Forecast.xlsx (8m ago)",
    bullets: [
      "Parse multi-sheet Excel workbooks & calculate trend insights",
      "Summarize 100+ page Word documents into executive briefings",
      "Enterprise OneDrive & SharePoint sync with full audit logging",
    ],
    securityNote: "Enterprise Entra ID OAuth 2.0 with corporate tenant isolation.",
  },
  {
    name: "Atlassian Jira",
    category: "Project Management",
    logo: "ATLASSIAN.png",
    syncBadge: "Direct API Sync · Agile Sprint Sync",
    recentActivity: "Created 6 subtasks under SPRINT-48-API (3m ago)",
    bullets: [
      "Convert user feedback & bug reports into structured Jira issues",
      "Break epics & PRDs into sprint-ready agile user stories",
      "Query sprint blockers, velocity & backlog in plain English",
    ],
    securityNote: "Atlassian Connect API with project-scoped authorization.",
  },
];

const apps: [string, string, string][] = APPS_DATA.map((a) => [a.name, a.category, a.logo]);

export function Steps({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 font-mono text-xs text-muted-foreground">
      {items.map((s) => (
        <li key={s} className="flex gap-2">
          <span className="text-primary">›</span>
          {s}
        </li>
      ))}
    </ul>
  );
}

export function LiveDemo() {
  const [m, setM] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  };
  return (
    <Section
      dark
      id="workspace"
      eyebrow="observing"
      title={
        <>
          See ChatBoxAI in action.
          <br />
          <span className="text-muted-foreground italic">
            One workspace, infinite possibilities.
          </span>
        </>
      }
    >
      <div className="reveal observatory">
        <div className="observatory-selector" role="group" aria-label="Workspace modes">
          {modes.map(([label], i) => (
            <Button
              variant="ghost"
              aria-pressed={m === i}
              aria-controls="workspace-output"
              key={label}
              onClick={() => {
                setM(i);
                setCopied(false);
                setCopyError(false);
              }}
              className="observatory-tab"
            >
              <span className="observatory-tab-number">{String(i + 1).padStart(2, "0")}</span>
              <span>{label}</span>
              <span className="observatory-tab-marker" aria-hidden="true" />
            </Button>
          ))}
        </div>
        <div className="workspace-shell observatory-stage">
          <div className="observatory-instrument">
            <div className="observatory-product">
              <span className="observatory-cross" aria-hidden="true">
                +
              </span>
              <span>
                Live workspace <span className="observatory-address">/ chatboxai.co.in/app</span>
              </span>
            </div>
            <span className="observatory-descriptor">{modes[m]?.[1]}</span>
          </div>
          <div className="observatory-canvas">
            <aside className="observatory-rail" aria-label="Selected workspace mode">
              <span className="observatory-stage-index" aria-hidden="true">
                {String(m + 1).padStart(2, "0")}
              </span>
              <p>{modes[m]?.[0]}</p>
              <div className="observatory-rail-rule" aria-hidden="true" />
              <span className="observatory-model">Claude 3.5 Sonnet · Claude</span>
              <span className="observatory-sync">● Synced</span>
            </aside>
            <div
              id="workspace-output"
              className="workspace-result observatory-output"
              aria-live="polite"
              aria-label={modes[m]?.[0]}
            >
              <div key={m} className={`observatory-view observatory-view-${m}`}>
                {m === 0 && (
                  <>
                    <div className="ml-auto mb-5 max-w-md rounded-md bg-secondary px-4 py-3 text-sm">
                      Write a React hook to fetch and cache API data with SWR.
                    </div>
                    <div className="rounded-md border border-border">
                      <div className="flex items-center justify-between border-b border-border px-4 py-2 font-mono text-xs text-muted-foreground">
                        <span>useFetchCache.js</span>
                        <Button size="sm" variant="ghost" onClick={copy} aria-label="Copy code">
                          {copied ? <Check /> : <Copy />}
                          {copied ? "Copied" : "Copy"}
                        </Button>
                      </div>
                      <pre className="p-5 font-mono text-xs leading-relaxed text-muted-foreground">
                        {code}
                      </pre>
                    </div>
                    {copyError && (
                      <p role="status" className="mt-3 text-xs text-muted-foreground">
                        Copy unavailable. Select the code to copy it manually.
                      </p>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">
                      Generated in 0.42s · Verified clean syntax
                    </p>
                  </>
                )}
                {m === 1 && (
                  <>
                    <Search className="mb-4" />
                    <h3 className="mb-6 text-2xl">Research that thinks, not just searches.</h3>
                    <Steps
                      items={[
                        "Breaking the question into four sub-queries",
                        "Ranking 24 candidate sources by authority and recency",
                        "Discarding 6 sources that fail cross-reference",
                        "Drafting a citation-backed summary",
                      ]}
                    />
                    <p className="mt-8 border-t border-border pt-5 text-sm">
                      Report Ready · Structured Reports
                    </p>
                  </>
                )}
                {m === 2 && (
                  <>
                    <Code2 className="mb-4" />
                    <h3 className="text-2xl">Prompt to Production</h3>
                    <p className="my-5 rounded-md bg-secondary p-4 text-sm">
                      Build a modern SaaS landing page with dark theme, animated hero section, and a
                      pricing table...
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <pre className="border border-border p-4 text-xs text-muted-foreground">{`<main>\n  <Hero />\n  <Features />\n  <Pricing />\n</main>`}</pre>
                      <div className="builder-mini">
                        <span>Describe it.</span>
                        <div className="mini-lines">
                          <i />
                          <i />
                          <i />
                        </div>
                      </div>
                    </div>
                    <p className="mt-5 font-mono text-xs text-muted-foreground">
                      Deployment successful — 3.2s
                    </p>
                  </>
                )}
                {m === 3 && (
                  <>
                    <FileText className="mb-4" />
                    <h3 className="text-2xl">Q3-Financial-Report.pdf</h3>
                    <div className="mt-6 space-y-4">
                      {[
                        ["Key Insight", "Revenue: $4.2M ↑ 23%"],
                        ["Extraction", "3 Tables parsed"],
                        ["Entities", "42 Contacts found"],
                      ].map(([a, b]) => (
                        <div
                          key={a}
                          className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border pb-4 text-sm"
                        >
                          <span className="text-muted-foreground">{a}</span>
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {m === 4 && (
                  <>
                    <Layers className="mb-4" />
                    <h3 className="text-2xl">Connect your apps.</h3>
                    <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {apps.map(([n, c, f]) => (
                        <div key={n} className="border-t border-border py-4">
                          <img
                            src={img(`/app_logo_connection/${f}`)}
                            width={28}
                            height={28}
                            alt={n}
                            loading="lazy"
                          />
                          <p className="mt-3 text-sm">{n}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{c}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="observatory-footer">
          <span>Interactive ChatBoxAI product workspace</span>
          <Btn href={SIGN_UP}>Try ChatBoxAI Free</Btn>
        </div>
      </div>
    </Section>
  );
}

export function Capability() {
  return (
    <Section
      eyebrow="reasoning"
      title={
        <>
          Learn to see
          <br />
          <em>brilliantly.</em>
        </>
      }
      sub="Our multi-model engine interprets context, sharpens details, and delivers action-ready results at every step."
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="reveal space-y-6">
          {[
            ["7+", "Foundation Models"],
            ["4+", "Research Databases"],
            ["18.5%", "Platform Uptime"],
          ].map(([v, l]) => (
            <div key={l} className="border-b border-border pb-4">
              <div className="font-display text-5xl">
                <Counter value={v ?? ""} />
              </div>
              <p className="text-sm text-muted-foreground">{l}</p>
            </div>
          ))}
          <Btn href={SIGN_UP} ghost>
            Explore capabilities
          </Btn>
        </div>
        <Card>
          <p className="mb-3 text-xs text-muted-foreground">
            Observing · Claude 3.5 Sonnet · Claude
          </p>
          <p className="mb-4 text-sm">
            Analyze Q3 revenue trends and identify growth opportunities.
          </p>
          <p className="eyebrow mb-2">Thinking…</p>
          <Steps
            items={[
              "Parsing Q3-Financial.xlsx — 3 sheets, 1,204 rows",
              "Cross-referencing Market-Data.pdf for sector benchmarks",
              "Isolating revenue drivers by customer segment",
              "Testing Q4 pipeline against historical conversion",
            ]}
          />
          <div className="my-4 flex flex-wrap gap-2 text-xs">
            {["Q3-Financial.xlsx", "Market-Data.pdf", "Competitor-Report"].map((f) => (
              <span
                key={f}
                className="rounded-full border border-border px-3 py-1 text-muted-foreground"
              >
                {f}
              </span>
            ))}
          </div>
          <p className="text-sm leading-relaxed">
            Revenue grew 23% quarter over quarter, driven almost entirely by enterprise renewals
            rather than new logos. Q4 has room for a further 8–11% if pipeline conversion holds at
            its trailing average.
          </p>
          <div className="mt-4 flex gap-4 text-xs text-primary">
            <span>↑ 23% Revenue Growth</span>
            <span>→ Q4 Opportunity Identified</span>
          </div>
        </Card>
      </div>
    </Section>
  );
}

export function DeepResearch() {
  const items = [
    [
      "01",
      "24 Sources Found",
      "Multi-Source Discovery",
      "Searches 24+ live web and academic databases simultaneously.",
    ],
    [
      "02",
      "18 Verified",
      "Source Validation",
      "Cross-references facts and verifies authoritativeness before inclusion.",
    ],
    [
      "03",
      "Analysis Complete",
      "Intelligent Synthesis",
      "Extracts key data points and connects insights across diverse documents.",
    ],
    [
      "04",
      "Report Ready",
      "Structured Reports",
      "Delivers clear, citation-backed executive summaries and detailed reports.",
    ],
  ];
  return (
    <Section
      eyebrow="analyzing sources"
      title={
        <>
          Research that thinks, <em>not just searches.</em>
        </>
      }
    >
      <Card className="mb-6">
        <p className="eyebrow mb-3">Planning research…</p>
        <Steps
          items={[
            "Breaking the question into four sub-queries",
            "Ranking 24 candidate sources by authority and recency",
            "Discarding 6 sources that fail cross-reference",
            "Drafting a citation-backed summary",
          ]}
        />
      </Card>
      <div className="research-timeline">
        {items.map(([n, s, t, d]) => (
          <Card key={n}>
            <p className="font-mono text-xs text-muted-foreground">{n}</p>
            <p className="mt-2 text-xs text-primary">{s}</p>
            <h3 className="mt-4 text-lg font-semibold">{t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{d}</p>
          </Card>
        ))}
      </div>
      <div className="mt-8">
        <Btn href={SIGN_UP}>Experience Deep Research</Btn>
      </div>
    </Section>
  );
}

export function WebsiteBuilder() {
  return (
    <Section
      dark
      eyebrow="generating"
      title={
        <>
          Describe it.
          <br />
          <em>ChatBoxAI builds it.</em>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="reveal">
          <h3 className="text-2xl font-semibold">Prompt to Production</h3>
          <p className="mt-3 text-muted-foreground">
            Turn your ideas into fully functional, deployed web applications in seconds. No coding
            required, just describe what you want.
          </p>
          <div className="mt-6 rounded-xl glass p-4 text-sm">
            <p className="eyebrow mb-2">Generate Website</p>Build a modern SaaS landing page with
            dark theme, animated hero section, and a pricing table...
          </div>
        </div>
        <Card>
          <div className="mb-4 flex justify-between font-mono text-xs text-muted-foreground">
            <span>chatboxai.co.in</span>
            <span className="text-primary">Generate UI</span>
          </div>
          <Steps
            items={[
              "Analyzed prompt intent & structured layout",
              "Generated React components & Framer Motion",
              "Applied Tailwind CSS dark mode styling",
              "Deployed to global edge network instantly",
            ]}
          />
          <div className="builder-output mt-6 grid grid-cols-2 gap-3">
            <pre className="overflow-x-auto border border-border p-3 font-mono text-[10px] leading-relaxed text-muted-foreground">{`<main className="dark">\n  <Hero />\n  <Features />\n  <Pricing />\n</main>`}</pre>
            <div className="builder-mini m-0">
              <span>Prompt to Production</span>
              <div className="mini-lines">
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-between rounded-lg bg-secondary px-3 py-2 font-mono text-xs">
            <span>page.jsx</span>
            <span className="text-primary">Deployment successful — 3.2s</span>
          </div>
        </Card>
      </div>
    </Section>
  );
}

export function FileIntelligence() {
  return (
    <Section
      eyebrow="parsing"
      title={
        <>
          Upload any file.
          <br />
          <em>AI understands it all.</em>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card>
          <p className="font-mono text-xs text-primary">PDF</p>
          <p className="mt-1 font-semibold">Q3-Financial-Report.pdf</p>
          <div className="mt-5 space-y-3 text-sm">
            {[
              ["Key Insight", "Revenue: $4.2M ↑ 23%"],
              ["Extraction", "3 Tables parsed"],
              ["Entities", "42 Contacts found"],
            ].map(([a, b]) => (
              <div key={a} className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">{a}</span>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          {[
            [
              "Table & Data Extraction",
              "Automatically identifies and extracts structured tables from complex PDFs, DOCX, and spreadsheets with pixel-perfect accuracy.",
            ],
            [
              "Key Insight Detection",
              "Surfaces critical findings, revenue trends, and generates executive summaries without reading hundreds of pages.",
            ],
            [
              "Entity Recognition",
              "Instantly identifies and links key people, organizations, dates, and financial amounts hidden deep in your files.",
            ],
          ].map(([t, d]) => (
            <div key={t} className="reveal border-l-2 border-primary/50 pl-5">
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
          <div className="reveal pt-2">
            <p className="eyebrow mb-2">Supported Formats</p>
            <div className="flex flex-wrap gap-2">
              {["PDF", "DOCX", "XLSX", "PPTX", "PNG", "JPG"].map((f) => (
                <span
                  key={f}
                  className="rounded-md border border-border px-2 py-1 font-mono text-xs"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

export function Integrations() {
  const [sel, setSel] = useState(0);
  const a = APPS_DATA[sel] ?? APPS_DATA[0];
  return (
    <Section
      eyebrow="connecting"
      title={
        <>
          Connect your apps.
          <br />
          <em>ChatBoxAI works with everything.</em>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="reveal integration-grid">
          {apps.map(([n, c, f], i) => (
            <Button
              key={n}
              variant="ghost"
              onClick={() => setSel(i)}
              aria-pressed={sel === i}
              className="integration-tile"
            >
              <img
                src={img(`/app_logo_connection/${f}`, 48)}
                alt={n}
                className="h-7 w-7 object-contain"
                loading="lazy"
              />
              <span className="text-sm font-semibold">{n}</span>
              <span className="text-[10px] text-muted-foreground">{c}</span>
            </Button>
          ))}
        </div>
        <Card>
          <img
            src={img(`/app_logo_connection/${a.logo}`, 64)}
            alt={a.name}
            className="h-10 w-10 object-contain"
          />
          <h3 className="mt-4 text-2xl font-semibold">{a.name}</h3>
          <p className="text-sm text-muted-foreground">{a.category}</p>
          <p className="mt-4 text-xs text-primary">{a.syncBadge}</p>
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            {a.recentActivity}
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {a.bullets.map((x) => (
              <li key={x}>✓ {x}</li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-muted-foreground">
            {a.securityNote}
          </p>
          <div className="mt-4">
            <Btn href={SIGN_UP} ghost>
              Explore All Integrations
            </Btn>
          </div>
        </Card>
      </div>
    </Section>
  );
}

const routes = [
  [
    "Fast",
    "~0.5s",
    "Blazing responses for live chat, drafting, and real-time Q&A. No waiting, no lag.",
  ],
  [
    "Reasoning",
    "99%",
    "Deep logic chains, complex math, and multi-step problem solving - flawlessly.",
  ],
  [
    "Research",
    "24+",
    "Real-time web access with inline citations. Always factual, always current.",
  ],
  ["Coding", "50+", "Full-stack pair programming with context-aware code generation and review."],
  [
    "Creative",
    "4K",
    "Photorealistic image generation and creative storytelling at studio quality.",
  ],
];

export function AiModels() {
  const [r, setR] = useState(0);
  return (
    <Section
      dark
      id="models"
      eyebrow="routing"
      title={
        <>
          The right model,
          <br />
          <em>for every single task.</em>
        </>
      }
      sub="56+ frontier models, each optimised for a specific job. Switch instantly without leaving your workspace."
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="reveal space-y-2">
          <p className="eyebrow mb-3">Routing options</p>
          {routes.map(([n, v], i) => (
            <Button
              variant="ghost"
              key={n}
              onClick={() => setR(i)}
              aria-pressed={r === i}
              className="model-row w-full"
            >
              <span>{n}</span>
              <span className="font-mono text-sm">{v}</span>
            </Button>
          ))}
        </div>
        <Card>
          <p className="text-xs text-muted-foreground">
            {routes[r]?.[0]} route · {routes[r]?.[1]}
          </p>
          <h3 className="mt-4 font-display text-5xl">{routes[r]?.[0]}</h3>
          {r === 0 && <p className="text-sm text-primary">Time to First Token</p>}
          <p className="mt-3 text-muted-foreground">{routes[r]?.[2]}</p>
          <p className="eyebrow mt-6 mb-2">Available models</p>
          <div className="flex flex-wrap gap-2">
            {["GPT-4o mini", "Gemini Flash", "Claude Fable 5", "Mistral 7B"].map((m) => (
              <span key={m} className="rounded-full border border-border px-3 py-1 text-xs">
                {m}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-primary">Explore all models</p>
          <div className="mt-6 grid grid-cols-2 gap-3 font-mono text-xs sm:grid-cols-4">
            {[
              ["STREAM ACTIVE", "980 tok/s"],
              ["LATENCY", "0.42ms"],
              ["BUFFER", "CLEAR"],
              ["UPTIME", "99.99%"],
            ].map(([a, b]) => (
              <div key={a} className="rounded-lg bg-secondary p-2">
                <p className="text-muted-foreground">{a}</p>
                <p>{b}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="reveal mt-10 grid grid-cols-3 gap-2 border-t border-border pt-8 text-center">
        {[
          ["56+", "Frontier Models"],
          ["<1s", "Avg Response"],
          ["99.9%", "Uptime SLA"],
        ].map(([v, l]) => (
          <div key={l} className="px-1">
            <p className="font-display text-2xl sm:text-3xl md:text-4xl">{v}</p>
            <p className="mt-1 text-[11px] sm:text-xs md:text-sm text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

const roles = [
  [
    "For Students",
    "Transform textbooks into interactive study guides. ChatBoxAI summarizes long papers, solves complex equations step-by-step, and helps you prepare for exams efficiently.",
    "10x Faster Study",
  ],
  [
    "For Developers",
    "Write, debug, and optimize code faster. Ask architectural questions or get instant boilerplate generation.",
    "50+ Languages",
  ],
  [
    "For Designers",
    "Generate high-fidelity mockups, brainstorm visual concepts, and create stunning assets from text prompts.",
    "4K Quality",
  ],
  [
    "For Researchers",
    "Synthesize massive amounts of data, find relevant citations, and analyze complex trends effortlessly.",
    "24+ Sources",
  ],
  [
    "For Creators",
    "Draft scripts, generate fresh ideas, and write engaging copy for all your social media channels.",
    "∞ Content",
  ],
  [
    "For Teams",
    "Collaborate seamlessly with shared knowledge bases. Automate meeting notes and track action items instantly.",
    "24/7 Workspace",
  ],
];

export function UseCases() {
  return (
    <Section
      eyebrow="adapting"
      title={
        <>
          Built for how
          <br />
          <em>you actually work.</em>
        </>
      }
    >
      <div className="usecase-grid">
        {roles.map(([r, d, s], i) => (
          <article key={r} className="reveal usecase-row">
            <div className="flex justify-between font-mono text-xs text-muted-foreground">
              <span>0{i + 1}</span>
              <span>{s}</span>
            </div>
            <h3>{r}</h3>
            <p className="text-muted-foreground">{d}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

export function WhyChatBox() {
  return (
    <Section
      eyebrow="comparing"
      title={
        <>
          One workspace. <em>Every single AI workflow.</em>
        </>
      }
    >
      <div className="comparison-grid grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="text-xl font-semibold text-muted-foreground">Before ChatBoxAI</h3>
          <ul className="mt-5 space-y-3 text-sm">
            {[
              ["5 Separate AI Subscriptions", "$100+/mo"],
              ["No Shared Context", "Isolated"],
              ["Multiple Logins", "Isolated"],
              ["Switching Between Apps", "Isolated"],
              ["Duplicate Payments", "Isolated"],
            ].map(([a, b]) => (
              <li
                key={a}
                className="flex justify-between border-b border-border pb-2 text-muted-foreground"
              >
                <span className="line-through decoration-destructive/60">{a}</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="border-primary/40">
          <p className="eyebrow">All-In-One</p>
          <h3 className="mt-1 text-xl font-semibold">With ChatBoxAI</h3>
          <ul className="mt-5 space-y-3 text-sm">
            {[
              "56+ Frontier AI Models",
              "Shared Memory & Context",
              "One Unified Login",
              "Single Workspace",
              "One Transparent Price",
            ].map((x) => (
              <li key={x} className="border-b border-border pb-2">
                <span className="text-primary">✓</span> {x}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Btn href={SIGN_UP}>Get Started for Free</Btn>
            <span className="text-xs text-muted-foreground">
              Free to start · No credit card required
            </span>
          </div>
        </Card>
      </div>
    </Section>
  );
}

export function TrustSecurity() {
  const items = [
    [
      "Enterprise Grade",
      "Bank-level security infrastructure protecting your data at rest and in transit.",
      "256-bit AES Encrypted",
    ],
    [
      "Secure Access",
      "Robust authentication and identity management for your entire team.",
      "Auth Industry Standard",
    ],
    [
      "Total Privacy",
      "Your data is yours. We never use your conversations or files to train our models.",
      "GDPR Compliant",
    ],
    [
      "Safe Integrations",
      "Connect your favorite tools with confidence using strict permission boundaries.",
      "OAuth 2.0 Secured",
    ],
  ];
  return (
    <Section
      eyebrow="securing"
      title={
        <>
          Your AI workspace.
          <br />
          <em>Your total control.</em>
        </>
      }
      sub="Security isn't an afterthought—it's the foundation of everything we build. ChatBoxAI is engineered to keep your most sensitive data locked down, fully compliant, and entirely in your hands."
    >
      <div className="security-grid">
        {items.map(([t, d, b]) => (
          <Card key={t}>
            <h3 className="font-semibold">{t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            <p className="mt-5 font-mono text-xs text-primary">{b}</p>
          </Card>
        ))}
      </div>
      <p className="reveal mt-8 text-center text-sm text-muted-foreground">
        ChatBoxAI is built with privacy-first architecture. We never train AI models on your private
        data.
      </p>
    </Section>
  );
}

export function Features() {
  const f = [
    ["F01", "15+", "Models", "Advanced AI Chat"],
    ["F02", "4", "Engines", "AI Image Generation"],
    ["F03", "50+", "Languages", "React & Next.js Coding"],
    ["F04", "∞", "Sources", "Deep Web Research"],
    ["F05", "1", "Click", "AI Website Builder"],
    ["F06", "<1s", "Latency", "Real-time Voice AI"],
  ];
  return (
    <Section
      id="features"
      eyebrow="capabilities"
      title={
        <>
          Everything you need, <em>nothing you don't.</em>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-6">
        {f.map(([id, v, u, t], i) => (
          <Card
            key={id}
            className={
              [
                "md:col-span-4 md:min-h-64",
                "md:col-span-2",
                "md:col-span-2",
                "md:col-span-2",
                "md:col-span-2",
                "md:col-span-6",
              ][i] ?? ""
            }
          >
            <p className="font-mono text-xs text-muted-foreground">{id}</p>
            <p className="mt-6 font-display text-5xl">
              {v}
              <span className="ml-2 font-sans text-sm text-muted-foreground">{u}</span>
            </p>
            <h3 className="mt-3 font-semibold">{t}</h3>
          </Card>
        ))}
      </div>
      <div className="reveal mt-6 flex flex-wrap gap-2">
        {[
          "Cross-platform sync",
          "Markdown support",
          "Code highlighting",
          "Conversation folders",
        ].map((x) => (
          <span
            key={x}
            className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
          >
            {x}
          </span>
        ))}
      </div>
    </Section>
  );
}

export function HowItWorks() {
  const s = [
    [
      "01",
      "Choose your AI Model",
      "Select from 56+ frontier models — GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, DeepSeek R1, and more — for any task.",
    ],
    [
      "02",
      "Ask, create, or research",
      "Chat, generate images, build websites, conduct deep research, or analyze files — all in one place.",
    ],
    [
      "03",
      "Get instant results",
      "Receive production-ready code, detailed reports, stunning visuals, or actionable insights in seconds.",
    ],
  ];
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hiw-line",
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: ref.current, start: "top 80%", end: "bottom 50%", scrub: true },
        },
      );
    }, ref);
    return () => ctx.revert();
  }, []);
  return (
    <Section
      dark
      eyebrow="sequence"
      title={
        <>
          Three steps to
          <br />
          <em>AI-powered results.</em>
        </>
      }
    >
      <div ref={ref} className="relative grid gap-10 md:grid-cols-3 md:gap-8">
        <div className="absolute left-0 top-0 hidden h-px w-full bg-border md:block" />
        <div className="hiw-line absolute left-0 top-0 hidden h-px w-full origin-left bg-foreground md:block" />
        {s.map(([n, t, d]) => (
          <div key={n} className="reveal border-t border-border pt-6 md:border-0">
            <p className="font-mono text-6xl text-muted-foreground">{n}</p>
            <p className="mt-3 font-mono text-xs text-muted-foreground">Step {n}</p>
            <h3 className="mt-1 text-xl font-semibold">{t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function Stats() {
  const s = [
    ["models.available", "56+", "Models Available"],
    ["users.active", "2,300+", "Active Users"],
    ["research.sources", "24+", "Research Sources"],
    ["uptime.rolling", "99.9%", "Uptime SLA"],
  ];
  return (
    <Section
      dark
      eyebrow="counting"
      title={
        <>
          Trusted by builders worldwide.
          <br />
          <em>Numbers don't lie.</em>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        {s.map(([k, v, l]) => (
          <div key={k} className="reveal metric">
            <p className="font-mono text-xs text-muted-foreground">{k}</p>
            <p className="metric-value">
              <Counter value={v ?? ""} />
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

const quotes = [
  [
    "ChatBoxAI completely replaced my stack of 5 AI subscriptions. I get GPT-4o, Claude, and Gemini all in one place with shared memory. It's a game changer for my workflow.",
    "Arjun Mehta",
    "Full-Stack Developer",
    "Men-1.png",
  ],
  [
    "The deep research feature alone is worth it. I used to spend hours synthesizing information from multiple sources. Now ChatBoxAI does it in minutes with proper citations.",
    "Priya Sharma",
    "Product Manager",
    "woman-2.png",
  ],
  [
    "I built our marketing landing page using the Website Builder feature. Described what I wanted, and got production-ready Next.js code in seconds. Incredible.",
    "Raj Patel",
    "Indie Maker",
    "Men-3.png",
  ],
  [
    "Our entire research team uses ChatBoxAI now. The file intelligence feature reads through 100-page PDFs and extracts exactly what we need. Saves us days every week.",
    "Divya Krishnan",
    "Research Analyst",
    "woman-4.png",
  ],
  [
    "The AI model switching mid-conversation is something I didn't know I needed. Being able to use Claude for writing and then switch to GPT-4o for code in the same chat is brilliant.",
    "Karan Singh",
    "Content Creator",
    "Men-5.png",
  ],
  [
    "The speed and accuracy of the coding capabilities blew me away. It's like having a senior engineer reviewing my code 24/7. My productivity has doubled.",
    "Sarah Chen",
    "Software Engineer",
    "woman-6.png",
  ],
];

export function Testimonials() {
  return (
    <Section
      eyebrow="verified"
      title={
        <>
          Loved by thousands
          <br />
          <em>of builders & creators.</em>
        </>
      }
    >
      <div className="quotes-grid">
        {quotes.map(([q, n, r, a], i) => (
          <figure key={n} className="reveal quote-item">
            <div className="flex justify-between font-mono text-xs text-muted-foreground">
              <span className="font-display text-5xl leading-none text-muted-foreground">“</span>0
              {i + 1} / 06
            </div>
            <blockquote className="mt-2 font-display text-xl leading-snug">{q}</blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <img
                src={img(`/avatar/${a}`, 96)}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
                loading="lazy"
              />
              <div>
                <p className="text-sm font-semibold">{n}</p>
                <p className="text-xs text-muted-foreground">{r}</p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

export function Pricing() {
  const [livePlans, setLivePlans] = useState<any[] | null>(null);

  useEffect(() => {
    let active = true;
    const loadDynamicPlans = async () => {
      try {
        const res = await fetch('/api/pricing-plans', { cache: 'no-store' });
        const data = await res.json();
        if (active && data.success && Array.isArray(data.plans)) {
          setLivePlans(data.plans);
        }
      } catch {}
    };

    loadDynamicPlans();
    const interval = setInterval(loadDynamicPlans, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const defaultPlans = [
    {
      n: "Free",
      d: "Perfect for getting started",
      p: "₹0",
      f: [
        "5,000 Daily Credits for Free Models",
        "Access to Free-tier models (Llama 3, Gemini Flash, etc.)",
        "Premium & Paid-models are locked",
        "Free credits reset daily at midnight UTC",
        "Standard support",
      ],
      c: "Get Started Free",
      h: SIGN_UP,
    },
    {
      n: "Pro",
      d: "Full power for creators and teams",
      p: "₹499",
      old: "₹999",
      off: "50% OFF",
      pop: true,
      f: [
        "30,000 Paid Credits Monthly",
        "Access to ALL models (including GPT-4, Claude 3.5, & Max-tier)",
        "Uninterrupted Access: Seamless switch to Free models if paid balance is exhausted",
        "Paid credits recharge monthly on your billing date",
        "Unlimited image generation & priority support",
      ],
      c: "Upgrade to Pro",
      h: PRICING,
    },
    {
      n: "Max",
      d: "Highest limits for power users",
      p: "₹1999",
      f: [
        "150,000 Paid Credits Monthly",
        "Access to ALL models (including Claude 3 Opus & GPT-5)",
        "Uninterrupted Access: Seamless switch to Free models if paid balance is exhausted",
        "Paid credits recharge monthly on your billing date",
        "Unlimited image generation & maximum speed limits",
      ],
      c: "Go Max",
      h: PRICING,
    },
  ];

  const plans = livePlans && livePlans.length > 0
    ? livePlans.map((lp) => {
        const monthly = Number(lp.monthly_price ?? 0);
        const original = Number(lp.original_monthly_price ?? 0);
        return {
          n: lp.name || (lp.plan_id === 'free' ? 'Free' : lp.plan_id === 'pro' ? 'Pro' : 'Max'),
          d: lp.description || '',
          p: `₹${monthly}`,
          old: original > monthly ? `₹${original}` : undefined,
          off: lp.discount_badge || (lp.plan_id === 'pro' && original > monthly ? '50% OFF' : undefined),
          pop: Boolean(lp.is_popular),
          f: Array.isArray(lp.features) ? lp.features : [],
          c: lp.button_text || (lp.plan_id === 'free' ? 'Get Started Free' : lp.plan_id === 'pro' ? 'Upgrade to Pro' : 'Go Max'),
          h: lp.plan_id === 'free' ? SIGN_UP : PRICING,
        };
      })
    : defaultPlans;
  return (
    <Section
      id="pricing"
      eyebrow="plans"
      title={
        <>
          Simple pricing,
          <br />
          <em>no surprises.</em>
        </>
      }
    >
      <div className="reveal mb-8 flex items-center gap-5">
        <span className="eyebrow">Monthly</span>
        <Button asChild variant="link" className="h-auto p-0 text-xs text-muted-foreground">
          <a href={PRICING}>
            Annual <ArrowUpRight />
          </a>
        </Button>
      </div>
      <div className="pricing-grid grid gap-5 md:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.n} className={p.pop ? "border-brand/60 bg-secondary" : ""}>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">{p.n}</h3>
              {p.pop && (
                <span className="rounded-md border border-brand/60 px-2 py-0.5 font-mono text-[10px] uppercase text-brand">
                  Popular
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{p.d}</p>
            {p.old && (
              <p className="mt-5 text-sm text-muted-foreground">
                <s>{p.old}</s> <span className="text-primary">{p.off}</span>
              </p>
            )}
            <p className={`${p.old ? "mt-1" : "mt-5"} font-display text-5xl`}>
              {p.p}
              <span className="font-sans text-base text-muted-foreground">/mo</span>
            </p>
            <ul className="my-6 space-y-2 text-sm">
              {p.f.map((x) => (
                <li key={x} className="flex gap-2">
                  <span className="text-primary">✓</span>
                  {x}
                </li>
              ))}
            </ul>
            <Btn href={p.h} ghost={!p.pop}>
              {p.c}
            </Btn>
          </Card>
        ))}
      </div>
    </Section>
  );
}

export function FAQ() {
  const qs = [
    "What is ChatBox AI?",
    "How does the free plan work?",
    "What's included in the Pro plan?",
    "Which AI models do you support?",
    "Is my data secure and private?",
    "How do I cancel my subscription?",
  ];
  return (
    <Section
      id="faq"
      eyebrow="answering"
      title={
        <>
          Common questions,
          <br />
          <em>clear answers.</em>
        </>
      }
      sub={
        <>
          Still have questions?{" "}
          <Link href="/help-center" className="text-primary hover:underline">
            Visit our Help Center →
          </Link>
        </>
      }
    >
      <Accordion type="single" collapsible className="border-t border-border">
        {qs.map((q, i) => (
          <AccordionItem key={q} value={`q${i}`}>
            <AccordionTrigger className="gap-3 sm:gap-4 py-4 sm:py-6 text-sm sm:text-base md:text-lg">
              <span className="flex min-w-0 items-center gap-3 sm:gap-5 text-left">
                <span className="shrink-0 font-mono text-xs text-muted-foreground">Q0{i + 1}</span>
                <span className="leading-snug">{q}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="max-w-3xl pl-7 sm:pl-12 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {
                [
                  "ChatBox AI is a comprehensive AI platform that provides access to multiple advanced AI models including GPT-4o, Claude 3.5, and Gemini Pro. It offers AI chat, image generation, code assistance, website building, voice AI, and more — all in one platform.",
                  "The free plan gives you access to basic AI models with 50 messages per day, 10 image generations per day, and 7-day conversation history. It's perfect for trying out the platform without any cost.",
                  "The Pro plan unlocks unlimited access to all premium AI models, unlimited messages and image generation, advanced features like website builder and voice AI, file upload and analysis, and priority support.",
                  "We support 15+ state-of-the-art AI models: GPT-4o, GPT-4 Turbo, Claude 3.5 Sonnet, Gemini Pro, Llama 3.1, Mistral, and more. You can switch between models based on your needs.",
                  "All conversations are encrypted end-to-end. Your data is stored securely and we never share your information with third parties or train AI models on your private conversations.",
                  "You can cancel anytime from your account settings. You'll continue to have paid-plan access until the end of your billing period, then automatically move to the free plan.",
                ][i]
              }
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  );
}

export function CTA() {
  return (
    <section className="closing-band">
      <div className="closing-content reveal">
        <p className="eyebrow">ready</p>
        <h2>
          Your AI workspace
          <br />
          <em>starts here.</em>
        </h2>
        <p>
          Join thousands of developers, designers, researchers, and teams who use ChatBoxAI as their
          daily AI workspace.
        </p>
        <div className="closing-bottom">
          <Btn href={SIGN_UP}>Start for Free</Btn>
          <Link href={PRICING}>View Pricing ↗</Link>
        </div>
        <p className="mt-6 text-xs">
          No credit card required · Free tier available · Cancel anytime
        </p>
      </div>
    </section>
  );
}
export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="editorial-footer">
      <div className="footer-container">
        <div className="footer-grid">
          {/* Brand & Description Column */}
          <div className="footer-brand">
            <Link href="/#top" className="font-display text-base text-foreground inline-flex items-center gap-2 group">
              <Image
                src="/Chatboxai_logo_main_2.png"
                alt="ChatBox AI"
                width={140}
                height={32}
                className="h-8 w-auto object-contain"
              />
              <span className="text-muted-foreground text-xs group-hover:text-foreground transition-colors">↑</span>
            </Link>
            <p className="footer-desc">
              The Ultimate Multi-Model AI Workspace. Chat, research, generate code, create images, and deploy web applications with 56+ frontier models.
            </p>

          </div>

          {/* Column 1: Explore */}
          <div className="footer-col">
            <h4>Explore</h4>
            <div className="footer-links">
              <Link href="/ai-models">AI Models</Link>
              <Link href="/mobile-app">Android App</Link>
              <Link href="/deep-research">Deep Research</Link>
              <Link href="/security">Security & Privacy</Link>
              <Link href={PRICING}>Pricing Plans</Link>
            </div>
          </div>

          {/* Column 2: Solutions */}
          <div className="footer-col">
            <h4>Solutions</h4>
            <div className="footer-links">
              <Link href="/developers">For Developers</Link>
              <Link href="/researchers">For Researchers</Link>
              <Link href="/creators">For Creators</Link>
              <Link href="/#workspace">Website Builder</Link>
            </div>
          </div>

          {/* Column 3: Resources & Support */}
          <div className="footer-col">
            <h4>Support</h4>
            <div className="footer-links">
              <Link href="/help-center">Help & Support</Link>
              <Link href="/docs">Documentation ↗</Link>
              <Link href="/docs/models">Model API Docs</Link>
              <Link href={SIGN_UP}>Start Free Account</Link>
            </div>
          </div>

          {/* Column 4: Trust & Legal */}
          <div className="footer-col">
            <h4>Legal & Trust</h4>
            <div className="footer-links">
              <Link href="/privacy-policy">Privacy Policy</Link>
              <Link href="/terms-conditions">Terms & Conditions</Link>
              <Link href="/security">Data Protection</Link>
              <Link href="/privacy-policy#cookies">Cookie Choices</Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar with direct buttons and copyright */}
        <div className="footer-bottom">
          <p>© {currentYear} ChatBoxAI · Developed by Arpit Ariyan Mahanarana (Technon). All rights reserved.</p>
          <div className="footer-legal-links">
            <Link href="/privacy-policy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <span>·</span>
            <Link href="/terms-conditions" className="hover:text-foreground transition-colors">
              Terms & Conditions
            </Link>
            <span>·</span>
            <Link href="/help-center" className="hover:text-foreground transition-colors">
              Help & Support
            </Link>
            <span>·</span>
            <Link href="/#top" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
              Back to top ↑
            </Link>
          </div>
        </div>

        <div className="footer-wordmark-container">
          <div className="footer-wordmark scroll-wordmark" aria-hidden="true">
            ChatBox AI
          </div>
        </div>
      </div>
    </footer>
  );
}

// Re-export MobileAppPreview from dedicated component file
export { MobileAppPreview as MobileApp } from './MobileAppSection';
