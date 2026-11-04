'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar, Footer } from '@/app/(landing)/_components/Sections';
import { Shield, Lock, FileCheck, Server, ArrowUpRight } from 'lucide-react';

const sections = [
  { id: 'intro', num: '01', label: 'Introduction', title: 'Platform Introduction & Governance' },
  { id: 'data-collection', num: '02', label: 'Data Collection', title: 'Scope of Personal Data Collection' },
  { id: 'billing-telemetry', num: '03', label: 'Billing Telemetry', title: 'Subscription & Billing Telemetry' },
  { id: 'credit-analytics', num: '04', label: 'Credit Analytics', title: 'Credit Consumption & Rate-Limit Logging' },
  { id: 'ai-safeguards', num: '05', label: 'AI Safeguards', title: 'Zero Model Training & Prompt Safeguards' },
  { id: 'third-parties', num: '06', label: 'Third Parties', title: 'Third-Party Sub-Processors & Data Flows' },
  { id: 'encryption-mfa', num: '07', label: 'Security & MFA', title: 'Encryption Protocols & Access Hardening' },
  { id: 'retention', num: '08', label: 'Data Retention', title: 'Data Retention & Automated Lifespans' },
  { id: 'user-rights', num: '09', label: 'Your Rights', title: 'Your Legal Rights Under DPDP Act & GDPR' },
  { id: 'cookies', num: '10', label: 'Cookies & State', title: 'Session Tracking & Local Storage' },
  { id: 'children', num: '11', label: 'Age Eligibility', title: 'Children\'s Privacy & Account Age Limits' },
  { id: 'international', num: '12', label: 'Data Sovereignty', title: 'Infrastructure Location & Cross-Border Routing' },
  { id: 'updates', num: '13', label: 'Policy Changes', title: 'Modifications & Revision Notices' },
  { id: 'contact', num: '14', label: 'DPO Contact', title: 'Data Protection Officer (DPO) Contact Details' },
];

export default function PrivacyClient() {
  const [activeSection, setActiveSection] = useState('intro');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    const elements = document.querySelectorAll('section[id]');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  useEffect(() => {
    if (activeSection) {
      const activeEl = document.getElementById(`mob-pill-${activeSection}`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeSection]);

  return (
    <div className="legal-page">
      <Navbar />

      {/* Hero Header */}
      <header className="legal-hero">
        <p className="legal-eyebrow">01 / Legal & Governance</p>
        <h1 className="legal-title">
          Privacy Policy.
          <br />
          <span className="text-muted-foreground">How we safeguard your digital workspace.</span>
        </h1>
        <p className="legal-lead">
          Detailed transparency on how ChatBox AI processes personal data, isolates conversational telemetry,
          strictly prohibits unauthorized foundation model training, and adheres to India&apos;s Digital Personal Data
          Protection (DPDP) Act alongside international privacy standards.
        </p>

        <div className="legal-chips">
          <span className="legal-chip legal-chip-accent">
            <Shield className="w-3.5 h-3.5" /> DPDP Act Compliant
          </span>
          <span className="legal-chip">
            <Lock className="w-3.5 h-3.5" /> Zero Model Training
          </span>
          <span className="legal-chip">
            <Server className="w-3.5 h-3.5" /> Primary Hosting: India
          </span>
          <span className="legal-chip">
            <FileCheck className="w-3.5 h-3.5" /> Developer: Arpit Ariyan Mahanarana (Student &amp; Creator)
          </span>
          <span className="legal-chip">Updated: October 2026</span>
        </div>
      </header>

      {/* Main Container */}
      <div className="legal-container">
        {/* Mobile Sticky Horizontal Bar */}
        <div className="legal-mobile-bar">
          <div className="legal-mobile-pills">
            {sections.map((s) => (
              <a
                key={s.id}
                id={`mob-pill-${s.id}`}
                href={`#${s.id}`}
                className={`legal-mobile-pill ${activeSection === s.id ? 'active' : ''}`}
              >
                {s.num}. {s.label}
              </a>
            ))}
          </div>
        </div>

        <div className="legal-layout">
          {/* Desktop Sticky Sidebar Navigation */}
          <aside className="legal-sidebar" aria-label="Table of Contents">
            <p className="legal-toc-title">Table of Contents</p>
            <nav className="legal-toc-nav">
              {sections.map((s) => {
                const isActive = activeSection === s.id;
                return (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className={`legal-toc-link ${isActive ? 'active' : ''}`}
                  >
                    <span className="num">{s.num}</span>
                    <span>{s.label}</span>
                  </a>
                );
              })}
            </nav>
          </aside>

          {/* Document Content Column */}
          <main className="legal-content">
            {/* Section 01 */}
            <section id="intro" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">01</span>
                <h2 className="legal-section-title">Introduction & Corporate Governance</h2>
              </header>
              <div className="legal-callout">
                <strong>Core Rule:</strong> ChatBox AI treats all user queries, uploaded files, and generated code as private, sovereign intellectual property. We never monetize, sell, or license user information to third-party data aggregators.
              </div>
              <div className="legal-body">
                <p>
                  At <strong>ChatBox AI</strong> (the &quot;Platform&quot;), developed and operated independently by <strong>Arpit Ariyan Mahanarana</strong> (an independent software developer, creator, and student based in New Delhi, India, whose official developer portfolio is hosted at <a href="https://technon.co.in" target="_blank" rel="noopener noreferrer">technon.co.in</a>), protecting your personal information and ensuring operational confidentiality is fundamental to our architecture. ChatBox AI is an independent software creation and AI workspace engineered by Arpit Ariyan Mahanarana rather than a corporate conglomerate. This Privacy Policy details how we collect, process, manage, and safeguard information across our multi-model chat workspace, AI website builder, deep research agents, image generators, and voice synthesis modules.
                </p>
                <p>
                  Our data management operations are structured to remain fully compliant with the <strong>Digital Personal Data Protection Act (DPDP Act) of India</strong>, alongside global standards of user confidentiality. By accessing or using the Platform, you acknowledge the terms outlined in this Privacy Policy.
                </p>
              </div>
            </section>

            {/* Section 02 */}
            <section id="data-collection" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">02</span>
                <h2 className="legal-section-title">Scope of Personal Data Collection</h2>
              </header>
              <div className="legal-body">
                <p>
                  We collect personal information strictly required to deliver, authenticate, and secure your access to our frontier AI workspace:
                </p>
                <ul>
                  <li>
                    <strong>Account Identity & Credentials:</strong> Valid email address, registered display name, and securely hashed passwords created during signup.
                  </li>
                  <li>
                    <strong>Multi-Factor Authentication (MFA):</strong> Verification emails, temporary OTP records, and secret keys necessary to protect against unauthorized account takeovers.
                  </li>
                  <li>
                    <strong>Interface Preferences:</strong> Local UI settings, dark/light theme choices, selected layout modes, and default AI model preferences (e.g., defaulting to Claude 3.5 Sonnet or GPT-4o).
                  </li>
                  <li>
                    <strong>Diagnostic Telemetry:</strong> Device operating system, browser engine version, screen resolution, and IP address collected strictly for session stability, error logs, and fraud prevention.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 03 */}
            <section id="billing-telemetry" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">03</span>
                <h2 className="legal-section-title">Subscription & Billing Telemetry</h2>
              </header>
              <div className="legal-callout">
                <strong>Zero Card Storage:</strong> ChatBox AI does not store raw credit card numbers, CVV codes, or net-banking PINs on our servers. All transactions are securely offloaded to certified payment partners.
              </div>
              <div className="legal-body">
                <p>
                  Paid subscriptions (Pro and Max plans) require processing billing transactions with verified payment processors:
                </p>
                <ul>
                  <li>
                    <strong>Payment Gateway Tokens:</strong> Transactions are routed through our certified partners, <strong>Razorpay</strong> (for UPI, RuPay, Netbanking, and domestic cards in India) and <strong>Paddle</strong> (for international billing). We store only transaction tokens, status markers (Success, Failed, Pending), and invoice numbers.
                  </li>
                  <li>
                    <strong>Tax & GST Invoicing:</strong> In compliance with Indian commercial and taxation laws, we store registered customer billing addresses, legal business names, and GSTIN numbers where explicitly entered for tax deduction.
                  </li>
                  <li>
                    <strong>Subscription Lifecycles:</strong> We maintain chronological audit logs of active cycles, renewal timestamps, plan upgrades, and downgrade actions to ensure accurate subscription tiering.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 04 */}
            <section id="credit-analytics" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">04</span>
                <h2 className="legal-section-title">Credit Consumption & Rate-Limit Logging</h2>
              </header>
              <div className="legal-body">
                <p>
                  To balance computational load across 56+ integrated foundation models, prevent denial-of-service disruptions, and meter fair usage:
                </p>
                <ul>
                  <li>
                    <strong>Token Deduction Accounting:</strong> Real-time database entries meter prompt token lengths, completion token lengths, and calculate credit deductions based on underlying model tiers.
                  </li>
                  <li>
                    <strong>Rate-Limit Telemetry:</strong> Request frequencies are monitored per IP address and account ID (e.g., enforcing 10 requests/min on Free tiers vs. 60 requests/min on Pro tiers) to block malicious scrapers.
                  </li>
                  <li>
                    <strong>Media Generation Counters:</strong> Separate counters track image synthesis calls and audio synthesis clips to monitor dedicated GPU cluster capacities.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 05 */}
            <section id="ai-safeguards" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">05</span>
                <h2 className="legal-section-title">Zero Model Training & Prompt Safeguards</h2>
              </header>
              <div className="legal-callout">
                <strong>No Public Model Training:</strong> Your conversations, prompts, uploaded code, and website drafts are NEVER used to train, fine-tune, or reinforce public AI foundation models without your explicit opt-in consent.
              </div>
              <div className="legal-body">
                <p>
                  We hold contractual and technical privacy safeguards with our upstream model partners:
                </p>
                <ul>
                  <li>
                    <strong>Commercial API Terms:</strong> Enterprise API agreements with OpenAI, Anthropic, Google AI, Mistral, and Cohere explicitly prohibit the use of API payloads for model training.
                  </li>
                  <li>
                    <strong>Transient Execution:</strong> Prompts are routed in-memory to upstream inference clusters to generate replies, and returned outputs are stored in your private database tables for dashboard display.
                  </li>
                  <li>
                    <strong>Unconditional Erasure:</strong> You retain the technical ability to delete any single message thread, wipe an entire project workspace, or purge your account history at any time from Settings.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 06 */}
            <section id="third-parties" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">06</span>
                <h2 className="legal-section-title">Third-Party Sub-Processors & Data Flows</h2>
              </header>
              <div className="legal-body">
                <p>
                  To provide a seamless multi-model experience, we partner with verified enterprise infrastructure providers:
                </p>
                <div className="legal-table-wrap">
                  <table className="legal-table">
                    <thead>
                      <tr>
                        <th>Provider</th>
                        <th>Role & Purpose</th>
                        <th>Location</th>
                        <th>Safeguards</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Firebase / Google</strong></td>
                        <td>Authentication & JWT Validation</td>
                        <td>India / Global</td>
                        <td>Encrypted Tokens, MFA</td>
                      </tr>
                      <tr>
                        <td><strong>Appwrite & Supabase</strong></td>
                        <td>Encrypted Database & Storage</td>
                        <td>India / Frankfurt</td>
                        <td>AES-256 Storage Volumes</td>
                      </tr>
                      <tr>
                        <td><strong>Razorpay & Paddle</strong></td>
                        <td>Payment Processing</td>
                        <td>India / UK</td>
                        <td>PCI-DSS Level 1 Compliant</td>
                      </tr>
                      <tr>
                        <td><strong>OpenAI, Anthropic, Google</strong></td>
                        <td>Foundation Model Inference</td>
                        <td>US / EU / Global</td>
                        <td>Zero-Training Commercial APIs</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Section 07 */}
            <section id="encryption-mfa" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">07</span>
                <h2 className="legal-section-title">Encryption Protocols & Access Hardening</h2>
              </header>
              <div className="legal-body">
                <p>
                  ChatBox AI implements defense-in-depth engineering practices to prevent data interception and exfiltration:
                </p>
                <ul>
                  <li>
                    <strong>In-Transit Encryption:</strong> All communications between your client device and our servers operate strictly over TLS 1.3 with modern cryptographic cipher suites.
                  </li>
                  <li>
                    <strong>At-Rest Encryption:</strong> Database volumes, file attachments, and user profiles are stored encrypted using AES-256.
                  </li>
                  <li>
                    <strong>Hashed API Keys:</strong> Developer API keys are stored strictly as salted SHA-256 hashes. Even in the event of an internal infrastructure audit, plaintext keys cannot be retrieved.
                  </li>
                  <li>
                    <strong>Multi-Factor Authentication (MFA):</strong> Optional email-based OTP verification blocks credential-stuffing and automated password attacks.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 08 */}
            <section id="retention" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">08</span>
                <h2 className="legal-section-title">Data Retention & Automated Lifespans</h2>
              </header>
              <div className="legal-body">
                <p>
                  We retain personal data only for as long as necessary to provide platform services and satisfy statutory obligations:
                </p>
                <div className="legal-table-wrap">
                  <table className="legal-table">
                    <thead>
                      <tr>
                        <th>Data Classification</th>
                        <th>Retention Period</th>
                        <th>Purge Mechanism</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Account Profile & Credentials</td>
                        <td>Active account lifespan</td>
                        <td>Permanently wiped 30 days after deletion</td>
                      </tr>
                      <tr>
                        <td>Conversation Threads & Code</td>
                        <td>Until manually deleted by user</td>
                        <td>Immediate soft delete, hard purge in 30 days</td>
                      </tr>
                      <tr>
                        <td>Invoices & Tax Records</td>
                        <td>7 Years</td>
                        <td>Statutory retention under Indian Tax Law</td>
                      </tr>
                      <tr>
                        <td>Rate-Limit & Security Logs</td>
                        <td>90 Days</td>
                        <td>Automated rolling log rotation</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Section 09 */}
            <section id="user-rights" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">09</span>
                <h2 className="legal-section-title">Your Legal Rights Under DPDP Act & GDPR</h2>
              </header>
              <div className="legal-body">
                <p>
                  Under India&apos;s Digital Personal Data Protection Act (DPDP Act) and global privacy regulations, you possess enforceable data rights:
                </p>
                <ul>
                  <li>
                    <strong>Right to Access:</strong> You can review your account metadata, credit history, and past invoice records directly in your dashboard.
                  </li>
                  <li>
                    <strong>Right to Correction & Rectification:</strong> You can edit personal information, email addresses, and billing credentials at any time from Settings.
                  </li>
                  <li>
                    <strong>Right to Erasure (Forgotten):</strong> You have the right to permanently delete your account, triggering automatic removal of your identifiers and threads within 30 days.
                  </li>
                  <li>
                    <strong>Right to Grievance Redressal:</strong> You may submit complaints regarding data handling directly to our appointed Data Protection Officer.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 10 */}
            <section id="cookies" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">10</span>
                <h2 className="legal-section-title">Session Tracking & Local Storage</h2>
              </header>
              <div className="legal-body">
                <p>
                  We use cookies and browser local storage strictly for essential platform operation and session continuity:
                </p>
                <ul>
                  <li>
                    <strong>Essential Authentication Tokens:</strong> HttpOnly secure session cookies keep you authenticated across web page transitions without repetitive logins.
                  </li>
                  <li>
                    <strong>Client-Side Storage:</strong> LocalStorage preserves UI state, collapsed sidebar preferences, and recent model selections.
                  </li>
                  <li>
                    <strong>No Third-Party Ad Trackers:</strong> We do not load advertising tracking pixels (such as Meta Pixel or cross-site ad beacons).
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 11 */}
            <section id="children" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">11</span>
                <h2 className="legal-section-title">Children&apos;s Privacy & Account Age Limits</h2>
              </header>
              <div className="legal-body">
                <p>
                  ChatBox AI is designed for professionals, researchers, developers, and adult learners. We do not knowingly market to or solicit accounts from individuals under 13 years of age.
                </p>
                <p>
                  If we determine that an account has been registered by a minor under 13 without verified parental consent, we will immediately suspend the account and permanently delete all associated conversation data and billing profiles.
                </p>
              </div>
            </section>

            {/* Section 12 */}
            <section id="international" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">12</span>
                <h2 className="legal-section-title">Infrastructure Location & Cross-Border Routing</h2>
              </header>
              <div className="legal-body">
                <p>
                  Our primary computational databases, account management clusters, and routing engines are hosted within <strong>India</strong>. When international users connect, data is securely routed over encrypted internet backbones to Indian datacenter regions.
                </p>
                <p>
                  When model inference is delegated to specialized frontier partners (e.g., Anthropic or OpenAI), data packets are protected by Standard Contractual Clauses (SCCs) and commercial zero-retention transit agreements.
                </p>
              </div>
            </section>

            {/* Section 13 */}
            <section id="updates" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">13</span>
                <h2 className="legal-section-title">Modifications & Revision Notices</h2>
              </header>
              <div className="legal-body">
                <p>
                  We may periodically revise this Privacy Policy to reflect platform enhancements, newly added foundation model capabilities, or evolving statutory frameworks.
                </p>
                <p>
                  When material revisions occur, we will notify users via dashboard banner alerts or registered account email announcements prior to the changes taking effect. Continued use of ChatBox AI after notice represents acceptance of updated terms.
                </p>
              </div>
            </section>

            {/* Section 14 */}
            <section id="contact" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">14</span>
                <h2 className="legal-section-title">Data Protection Officer (DPO) Contact Details</h2>
              </header>
              <div className="legal-callout">
                <strong>Grievance Officer:</strong> For statutory DPDP Act inquiries, subject access requests (SAR), or data erasure petitions, contact our Data Protection Officer directly.
              </div>
              <div className="legal-body">
                <div className="legal-table-wrap">
                  <table className="legal-table">
                    <tbody>
                      <tr>
                        <td><strong>Developer &amp; Operator</strong></td>
                        <td>Arpit Ariyan Mahanarana (Student &amp; Independent AI Developer)</td>
                      </tr>
                      <tr>
                        <td><strong>Developer Portfolio</strong></td>
                        <td>
                          <a href="https://technon.co.in" target="_blank" rel="noopener noreferrer">
                            technon.co.in <ArrowUpRight className="inline w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Location &amp; Region</strong></td>
                        <td>Odisha, India</td>
                      </tr>
                      <tr>
                        <td><strong>Data Protection &amp; Inquiries</strong></td>
                        <td>arpitariyanm@gmail.com</td>
                      </tr>
                      <tr>
                        <td><strong>Support &amp; Technical Desk</strong></td>
                        <td>ariyanariyan82361@gmail.com</td>
                      </tr>
                      <tr>
                        <td><strong>Official Platform Domain</strong></td>
                        <td>
                          <Link href="/">
                            chatboxai.co.in <ArrowUpRight className="inline w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
