'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar, Footer } from '@/app/(landing)/_components/Sections';
import {
  Shield,
  Lock,
  Server,
  FileCheck,
  CreditCard,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Mail,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

const POLICY = '/privacy-policy';
const TERMS = '/terms-conditions';

const PILLARS = [
  {
    num: '01',
    title: 'Zero Public Model Training',
    tag: 'Contractual Policy',
    desc: 'Your prompts, code snippets, project briefs, and generated websites are never used to train, refine, or fine-tune public foundation models. We enforce strict enterprise zero-retention API contracts with OpenAI, Anthropic, and Google AI.',
    bullets: [
      'No prompt data leakage into public foundation weights',
      'No evaluation or reinforcement training on customer inputs',
      'Full intellectual property ownership over generated outputs',
    ],
  },
  {
    num: '02',
    title: 'Cryptographic Data Protection',
    tag: 'End-to-End',
    desc: 'All communications between your browser and our servers run strictly over TLS 1.3 with modern cipher suites. Database volumes, account identifiers, and conversation histories are encrypted at rest using industry-standard AES-256.',
    bullets: [
      'TLS 1.3 transport encryption with Strict Transport Security (HSTS)',
      'AES-256 encrypted storage volumes across databases',
      'Ephemeral memory processing for real-time model inferences',
    ],
  },
  {
    num: '03',
    title: 'Multi-Factor Authentication & Identity',
    tag: 'Access Hardening',
    desc: 'We support email-based One-Time Password (OTP) Multi-Factor Authentication to shield accounts against automated password stuffing and session hijack attempts.',
    bullets: [
      'MFA available directly in Account Settings',
      'Strict JSON Web Token (JWT) session invalidation on logout',
      'Automated rate-limiting and IP throttling against brute-force attacks',
    ],
  },
  {
    num: '04',
    title: 'Hashed API Key Architecture',
    tag: 'Developer Safety',
    desc: 'Developer API keys created for our OpenAI-compatible endpoint are stored strictly as salted SHA-256 hashes. Even in the event of an internal database audit, plaintext keys cannot be decrypted or stolen.',
    bullets: [
      'One-time display of secret keys upon initial creation',
      'Salted SHA-256 cryptographic hashing in database tables',
      'Instant one-click key revocation and rotation in Settings',
    ],
  },
  {
    num: '05',
    title: 'Payment & Financial Isolation',
    tag: 'PCI-DSS Level 1',
    desc: 'ChatBox AI servers never process, collect, or store raw credit card numbers, CVV codes, or net-banking passwords. All payment transactions are securely offloaded to certified payment partners.',
    bullets: [
      'Domestic Indian transactions (UPI, RuPay, Netbanking) via Razorpay',
      'International subscription management via Paddle',
      'Only tokenized transaction identifiers and invoice IDs are saved',
    ],
  },
  {
    num: '06',
    title: 'Data Sovereignty & Right to Erasure',
    tag: 'DPDP Act & GDPR',
    desc: 'In compliance with India’s Digital Personal Data Protection (DPDP) Act, users retain absolute sovereignty over their data. You can delete individual conversation threads or execute a full account purge at any time.',
    bullets: [
      'Primary database clusters hosted in Indian datacenter regions',
      'Permanent wipe of profile records and threads within 30 days of deletion',
      'Invoice records retained for 7 years per Indian corporate taxation laws',
    ],
  },
];

const SUB_PROCESSORS = [
  {
    name: 'Firebase (Google)',
    role: 'Authentication & Session Token Verification',
    region: 'India / Global',
    security: 'Encrypted JWTs, OAuth 2.0',
  },
  {
    name: 'Supabase & Appwrite',
    role: 'Database & Private File Storage',
    region: 'India / Frankfurt',
    security: 'AES-256 Volume Encryption, Row Level Security',
  },
  {
    name: 'Razorpay & Paddle',
    role: 'Payment Processing & Subscription Management',
    region: 'India / UK',
    security: 'PCI-DSS Level 1 Certified, Tokenized Vaults',
  },
  {
    name: 'OpenAI, Anthropic, Google AI',
    role: 'Foundation Model Inference Providers',
    region: 'US / EU / Global',
    security: 'Commercial Zero-Training Enterprise APIs',
  },
];

export default function SecurityClient() {
  return (
    <div className="legal-page">
      <Navbar />

      {/* Hero Header */}
      <header className="legal-hero">
        <p className="legal-eyebrow">04 / Enterprise Trust &amp; Security</p>
        <h1 className="legal-title">
          Security &amp; Privacy Architecture.
          <br />
          <span className="text-muted-foreground">Rigorous safeguards for confidential AI workflows.</span>
        </h1>
        <p className="legal-lead">
          An exhaustive breakdown of ChatBox AI&apos;s defense-in-depth model: contractual zero model training
          guarantees, in-transit and at-rest cryptographic isolation, hashed developer key management, and sovereign
          compliance under the Indian DPDP Act.
        </p>

        <div className="legal-chips">
          <span className="legal-chip legal-chip-accent">
            <Lock className="w-3.5 h-3.5" /> Zero Model Training
          </span>
          <span className="legal-chip">
            <Shield className="w-3.5 h-3.5" /> TLS 1.3 &amp; AES-256
          </span>
          <span className="legal-chip">
            <CreditCard className="w-3.5 h-3.5" /> PCI-DSS Level 1 Isolation
          </span>
          <span className="legal-chip">
            <Server className="w-3.5 h-3.5" /> Primary Hosting: India
          </span>
          <span className="legal-chip">
            <FileCheck className="w-3.5 h-3.5" /> Developer: Arpit Ariyan Mahanarana (technon.co.in)
          </span>
          <span className="legal-chip">DPDP Act &amp; GDPR Aligned</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="legal-container">
        {/* Section 01: Core Architecture Pillars */}
        <section className="mb-20">
          <div className="flex justify-between items-baseline mb-8 pb-3 border-b border-line">
            <h2 className="text-2xl sm:text-3xl font-semibold font-display tracking-tight text-foreground">
              Core Security Pillars
            </h2>
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              6 Architectural Safeguards
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PILLARS.map((p) => (
              <article
                key={p.num}
                className="bg-canvas border border-line-strong p-6 sm:p-8 rounded-lg flex flex-col justify-between transition-all duration-200 hover:border-foreground"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-page border border-line-strong rounded text-muted-foreground">
                      {p.num}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      {p.tag}
                    </span>
                  </div>
                  <h3 className="text-xl font-display font-semibold text-foreground mb-3">
                    {p.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground mb-6">
                    {p.desc}
                  </p>
                </div>
                <ul className="space-y-2 border-t border-line pt-4">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-xs text-muted-foreground leading-normal">
                      <CheckCircle2 className="w-3.5 h-3.5 text-foreground shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* Section 02: Plan-Based Security & Trust Matrix */}
        <section className="mb-20">
          <div className="flex justify-between items-baseline mb-8 pb-3 border-b border-line">
            <h2 className="text-2xl sm:text-3xl font-semibold font-display tracking-tight text-foreground">
              Security &amp; Isolation Matrix
            </h2>
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              Across Tiers
            </span>
          </div>

          <div className="legal-table-wrap">
            <table className="legal-table">
              <thead>
                <tr>
                  <th>Protection Feature</th>
                  <th>Free Plan</th>
                  <th>Pro Plan (₹499/mo)</th>
                  <th>Max Plan (₹1,999/mo)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Zero Public Model Training</strong></td>
                  <td>Included</td>
                  <td>Included</td>
                  <td>Included</td>
                </tr>
                <tr>
                  <td><strong>TLS 1.3 &amp; AES-256 Volume Encryption</strong></td>
                  <td>Included</td>
                  <td>Included</td>
                  <td>Included</td>
                </tr>
                <tr>
                  <td><strong>Multi-Factor Authentication (MFA)</strong></td>
                  <td>Included</td>
                  <td>Included</td>
                  <td>Included</td>
                </tr>
                <tr>
                  <td><strong>Developer API Keys (Hashed SHA-256)</strong></td>
                  <td>No</td>
                  <td>Included (60 req/min)</td>
                  <td>Included (120 req/min)</td>
                </tr>
                <tr>
                  <td><strong>Data Deletion &amp; 30-Day Purge SLA</strong></td>
                  <td>Included</td>
                  <td>Included</td>
                  <td>Included</td>
                </tr>
                <tr>
                  <td><strong>Support Response Priority</strong></td>
                  <td>Standard (48–72h)</td>
                  <td>Priority SLA (&lt; 24h)</td>
                  <td>Dedicated Engineering SLA</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 03: Third-Party Sub-Processors */}
        <section className="mb-20">
          <div className="flex justify-between items-baseline mb-8 pb-3 border-b border-line">
            <h2 className="text-2xl sm:text-3xl font-semibold font-display tracking-tight text-foreground">
              Sub-Processors &amp; Data Sovereignty
            </h2>
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              Verified Partners
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-2xl">
            ChatBox AI strictly limits data transmission to vetted enterprise cloud providers. We never share,
            sell, or syndicate user data with data brokers, ad networks, or telemetry trackers.
          </p>

          <div className="legal-table-wrap">
            <table className="legal-table">
              <thead>
                <tr>
                  <th>Provider Entity</th>
                  <th>Role &amp; Data Processed</th>
                  <th>Datacenter Location</th>
                  <th>Cryptographic Standard</th>
                </tr>
              </thead>
              <tbody>
                {SUB_PROCESSORS.map((s) => (
                  <tr key={s.name}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.role}</td>
                    <td>{s.region}</td>
                    <td>{s.security}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 04: Best Practices for Users */}
        <section className="mb-20">
          <div className="flex justify-between items-baseline mb-8 pb-3 border-b border-line">
            <h2 className="text-2xl sm:text-3xl font-semibold font-display tracking-tight text-foreground">
              Recommended User Security Practices
            </h2>
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              Shared Responsibility
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: KeyRound,
                title: 'Enable MFA',
                desc: 'Turn on email OTP verification in Settings to prevent credential-stuffing attacks.',
              },
              {
                icon: Lock,
                title: 'Protect API Keys',
                desc: 'Never commit developer API keys into public Git repositories or client-side web bundles.',
              },
              {
                icon: Shield,
                title: 'Sanitize Secrets',
                desc: 'Avoid pasting production passwords, live tokens, or confidential PII into prompt text.',
              },
              {
                icon: AlertCircle,
                title: 'Purge Stale Threads',
                desc: 'Regularly delete completed project conversations and website drafts from your dashboard.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-canvas border border-line-strong p-6 rounded-lg transition-all hover:border-foreground"
              >
                <item.icon className="w-5 h-5 text-foreground mb-3" />
                <h3 className="font-display font-semibold text-base text-foreground mb-1">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 05: Vulnerability Disclosure & DPO Contact */}
        <section className="p-8 sm:p-10 border border-line-strong bg-canvas rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-foreground" />
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Responsible Vulnerability Disclosure
              </span>
            </div>
            <h3 className="text-2xl font-display font-semibold text-foreground mb-2">
              Report Security Vulnerabilities
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We welcome reports from independent security researchers. If you identify a potential security vulnerability,
              report it to our Data Protection Officer and security engineering team for prompt investigation and triage.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <a
              href="mailto:arpitariyanm@gmail.com"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background font-mono text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Contact DPO <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
            <Link
              href={POLICY}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-line-strong bg-page text-foreground font-mono text-xs font-semibold hover:border-foreground transition-colors"
            >
              Full Privacy Policy <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
