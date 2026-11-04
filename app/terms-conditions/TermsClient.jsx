'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar, Footer } from '@/app/(landing)/_components/Sections';
import { Scale, CheckCircle2, CreditCard, ShieldCheck, ArrowUpRight } from 'lucide-react';

const sections = [
  { id: 'intro', num: '01', label: 'Introduction', title: 'Platform Introduction & Governance' },
  { id: 'acceptance', num: '02', label: 'Acceptance', title: 'Acceptance of Terms & Eligibility' },
  { id: 'accounts', num: '03', label: 'Accounts & MFA', title: 'User Accounts, Security & MFA Protocols' },
  { id: 'pricing', num: '04', label: 'Pricing Plans', title: 'Pricing Plans & Tier Specifications' },
  { id: 'billing', num: '05', label: 'Billing & Auto-Renewal', title: 'Billing Cycles, Invoicing & Auto-Renewal' },
  { id: 'cancellation', num: '06', label: 'Cancellation', title: 'Self-Service Cancellation & Period-End Access' },
  { id: 'updates-tiers', num: '07', label: 'Upgrades/Downgrades', title: 'Plan Upgrade & Downgrade Mechanics' },
  { id: 'refunds', num: '08', label: 'Refund Policy', title: 'Refund Policy & Payment Error Resolution' },
  { id: 'credits', num: '09', label: 'Credit Logic', title: 'Credit Metering, Token Deduction & Resets' },
  { id: 'models', num: '10', label: 'Model Permissions', title: 'Foundation Model Access & Availability' },
  { id: 'api-keys', num: '11', label: 'API Keys', title: 'Developer API Keys & Programmatic Usage' },
  { id: 'limits', num: '12', label: 'Rate Limits', title: 'Request Rate Limits & Concurrency Caps' },
  { id: 'abuse', num: '13', label: 'Prohibited Use', title: 'Abuse Prevention & Platform Safeguards' },
  { id: 'intellectual', num: '14', label: 'IP & Ownership', title: 'Intellectual Property & Output Commercial Rights' },
  { id: 'liability', num: '15', label: 'Warranties & Liability', title: 'Warranties, Disclaimers & Liability Limits' },
  { id: 'governing-law', num: '16', label: 'Governing Law', title: 'Governing Law & Exclusive Jurisdiction' },
  { id: 'contact', num: '17', label: 'Legal Contact', title: 'Corporate Notices & Support Desk' },
];

export default function TermsClient() {
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
      const activeEl = document.getElementById(`terms-pill-${activeSection}`);
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
        <p className="legal-eyebrow">02 / Legal & Governance</p>
        <h1 className="legal-title">
          Terms of Service.
          <br />
          <span className="text-muted-foreground">The platform agreement for modern AI workflows.</span>
        </h1>
        <p className="legal-lead">
          Comprehensive agreement governing your access, billing cycles, credit accounting across 56+ frontier
          foundation models, intellectual property ownership of generated outputs, API rate caps, and liability boundaries.
        </p>

        <div className="legal-chips">
          <span className="legal-chip legal-chip-accent">
            <Scale className="w-3.5 h-3.5" /> Developer: Arpit Ariyan Mahanarana (Student &amp; Creator)
          </span>
          <span className="legal-chip">
            <CheckCircle2 className="w-3.5 h-3.5" /> Full Commercial Output Ownership
          </span>
          <span className="legal-chip">
            <CreditCard className="w-3.5 h-3.5" /> Razorpay &amp; Paddle Certified
          </span>
          <span className="legal-chip">
            <ShieldCheck className="w-3.5 h-3.5" /> Jurisdiction: New Delhi, India
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
                id={`terms-pill-${s.id}`}
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
                <strong>Agreement Scope:</strong> These Terms constitute a binding agreement between you (&quot;User&quot; or &quot;Customer&quot;) and Arpit Ariyan Mahanarana (&quot;Developer&quot;, &quot;we&quot;, &quot;us&quot;), the independent creator and operator of ChatBox AI.
              </div>
              <div className="legal-body">
                <p>
                  Welcome to <strong>ChatBox AI</strong>. These Terms &amp; Conditions (&quot;Terms&quot;) govern your access to and use of our platform, services, software, developer endpoints, and tools, developed and operated independently by <strong>Arpit Ariyan Mahanarana</strong> (an independent software developer, creator, and student based in New Delhi, India, whose official developer portfolio is hosted at <a href="https://technon.co.in" target="_blank" rel="noopener noreferrer">technon.co.in</a>). ChatBox AI is an independent software product developed and maintained by Arpit Ariyan Mahanarana rather than a corporate conglomerate.
                </p>
                <p>
                  ChatBox AI delivers a comprehensive multi-model artificial intelligence workspace designed to accelerate workflows across development, research, content design, and automated website deployment:
                </p>
                <ul>
                  <li>
                    <strong>Multi-Model AI Chat:</strong> Unified access to 56+ frontier and specialized models including GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, Llama 3.3, and DeepSeek.
                  </li>
                  <li>
                    <strong>AI Website Builder:</strong> Autonomous generation, live compilation, and styling of React &amp; Tailwind web prototypes with download support.
                  </li>
                  <li>
                    <strong>Deep Research Engine:</strong> Multi-step web query decomposition, verifiable citation synthesis, and comprehensive research brief compilation.
                  </li>
                  <li>
                    <strong>Image &amp; Media Synthesis:</strong> High-fidelity visual creation powered by DALL-E 3 and optimized diffusion models.
                  </li>
                  <li>
                    <strong>Voice AI:</strong> Real-time neural speech synthesis and conversational voice streaming.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 02 */}
            <section id="acceptance" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">02</span>
                <h2 className="legal-section-title">Acceptance of Terms &amp; Eligibility</h2>
              </header>
              <div className="legal-body">
                <p>
                  By creating an account, authenticating via OAuth/credentials, utilizing credit balances, or calling our API endpoints, you represent and warrant that:
                </p>
                <ul>
                  <li>
                    You are at least 18 years of age (or at least 13 with verified parental or legal guardian consent). Under no circumstances may individuals under 13 register or use the Platform.
                  </li>
                  <li>
                    You possess full legal capacity to enter into these binding terms on behalf of yourself or the corporate organization you represent.
                  </li>
                  <li>
                    You are not barred from receiving digital software services under the applicable commercial laws of India or your local jurisdiction.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 03 */}
            <section id="accounts" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">03</span>
                <h2 className="legal-section-title">User Accounts, Security &amp; MFA Protocols</h2>
              </header>
              <div className="legal-body">
                <p>
                  To unlock workspaces, credit allocations, and API provisioning, users must maintain valid account credentials:
                </p>
                <ul>
                  <li>
                    <strong>Credential Confidentiality:</strong> You are strictly responsible for maintaining password security. Any automated queries or charges initiated through your account remain your legal liability.
                  </li>
                  <li>
                    <strong>Multi-Factor Authentication (MFA):</strong> We provide and encourage email-based OTP multi-factor authentication to harden accounts against credential-stuffing attacks.
                  </li>
                  <li>
                    <strong>Account Integrity:</strong> Creating automated bot accounts or utilizing disposable burner emails to systematically harvest free-tier credits constitutes a material breach and triggers automated account bans.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 04 */}
            <section id="pricing" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">04</span>
                <h2 className="legal-section-title">Pricing Plans &amp; Tier Specifications</h2>
              </header>
              <div className="legal-body">
                <p>
                  ChatBox AI provides tiered plans designed for casual exploration, professional production, and power developers:
                </p>
                <div className="legal-table-wrap">
                  <table className="legal-table">
                    <thead>
                      <tr>
                        <th>Plan</th>
                        <th>Price (Monthly)</th>
                        <th>Monthly Paid Credits</th>
                        <th>Model Access</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Free Plan</strong></td>
                        <td>₹0 / month</td>
                        <td>Daily 5,000 Free Credits</td>
                        <td>Standard lightweight models (Gemini Flash, Llama 3)</td>
                      </tr>
                      <tr>
                        <td><strong>Pro Plan</strong></td>
                        <td>₹499 / month</td>
                        <td>30,000 Paid Credits</td>
                        <td>Frontier models (GPT-4o, Claude 3.5, Gemini 1.5 Pro)</td>
                      </tr>
                      <tr>
                        <td><strong>Max Plan</strong></td>
                        <td>₹1,999 / month</td>
                        <td>150,000 Paid Credits</td>
                        <td>Full reasoning models, maximum context, developer APIs</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p>
                  All displayed rates are in Indian Rupees (INR) and are inclusive of local Goods and Services Tax (GST) where applicable.
                </p>
              </div>
            </section>

            {/* Section 05 */}
            <section id="billing" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">05</span>
                <h2 className="legal-section-title">Billing Cycles, Invoicing &amp; Auto-Renewal</h2>
              </header>
              <div className="legal-body">
                <p>
                  Subscription transactions are billed on a recurring basis:
                </p>
                <ul>
                  <li>
                    <strong>Auto-Renewal Mandates:</strong> Subscriptions automatically renew at the beginning of each billing interval (monthly or annual) matching the exact calendar date of your initial subscription, unless cancelled beforehand.
                  </li>
                  <li>
                    <strong>Payment Gateways:</strong> Transactions are routed through verified PCI-DSS compliant providers: <strong>Razorpay</strong> (for UPI, Netbanking, RuPay, and domestic cards in India) and <strong>Paddle</strong> (for international subscribers).
                  </li>
                  <li>
                    <strong>Tax Invoices:</strong> Official GST-compliant tax invoices are dispatched automatically to your registered account email address upon each successful settlement.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 06 */}
            <section id="cancellation" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">06</span>
                <h2 className="legal-section-title">Self-Service Cancellation &amp; Period-End Access</h2>
              </header>
              <div className="legal-callout">
                <strong>Zero Lock-in:</strong> You may cancel your subscription at any time directly through the Settings panel. No support intervention or cancellation fees required.
              </div>
              <div className="legal-body">
                <p>
                  When you cancel your active subscription:
                </p>
                <ul>
                  <li>
                    <strong>Retained Access:</strong> You retain full Pro or Max benefits, including remaining monthly credits and premium model permissions, until the exact expiration date of your current billing period.
                  </li>
                  <li>
                    <strong>No Subsequent Charges:</strong> Cancellation immediately revokes future automated renewal mandates with Razorpay or Paddle.
                  </li>
                  <li>
                    <strong>Graceful Transition:</strong> At the conclusion of your billing cycle, your account automatically transitions to the Free Plan without data loss.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 07 */}
            <section id="updates-tiers" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">07</span>
                <h2 className="legal-section-title">Plan Upgrade &amp; Downgrade Mechanics</h2>
              </header>
              <div className="legal-body">
                <ul>
                  <li>
                    <strong>Upgrading:</strong> Upgrading (e.g., from Free to Pro, or Pro to Max) takes effect immediately. The higher monthly credit allotment is injected into your balance, and your billing cycle resets to the upgrade date.
                  </li>
                  <li>
                    <strong>Downgrading:</strong> Downgrading (e.g., Max to Pro, or Pro to Free) is scheduled to take effect at the conclusion of your prepaid billing period to ensure you receive the full computational value already purchased.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 08 */}
            <section id="refunds" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">08</span>
                <h2 className="legal-section-title">Refund Policy &amp; Payment Error Resolution</h2>
              </header>
              <div className="legal-body">
                <p>
                  Because AI compute power and foundation model token consumption incur real-time upstream infrastructure costs:
                </p>
                <ul>
                  <li>
                    <strong>Non-Refundable Computational Use:</strong> We do not issue partial refunds for active subscription cycles, unused credit balances, or mid-month cancellations.
                  </li>
                  <li>
                    <strong>Duplicate Billing &amp; Transaction Errors:</strong> If a technical gateway failure results in duplicate billing for a single subscription period, notify our billing desk within <strong>48 hours</strong>. Verified duplicate charges will be refunded in full.
                  </li>
                  <li>
                    <strong>Settlement Window:</strong> Approved gateway refunds are processed back to the original source method (UPI, card, or net-banking) within 5–7 banking days via Razorpay.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 09 */}
            <section id="credits" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">09</span>
                <h2 className="legal-section-title">Credit Metering, Token Deduction &amp; Resets</h2>
              </header>
              <div className="legal-body">
                <p>
                  Computational capacity inside ChatBox AI is metered via credits:
                </p>
                <ul>
                  <li>
                    <strong>Daily Free Credits:</strong> Free credits reset every 24 hours at 00:00 UTC. Daily free credits do not accumulate or roll over.
                  </li>
                  <li>
                    <strong>Monthly Paid Credits:</strong> Paid credits renew on your subscription anniversary. Unused monthly paid credits do not roll over to subsequent billing months.
                  </li>
                  <li>
                    <strong>Weighted Deduction:</strong> Deductions reflect token input length, completion token length, and model tier costs. For example, deep reasoning models (e.g., o1/Claude 3.5 Sonnet) consume more credits per query than compact models (e.g., Gemini Flash).
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 10 */}
            <section id="models" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">10</span>
                <h2 className="legal-section-title">Foundation Model Access &amp; Availability</h2>
              </header>
              <div className="legal-body">
                <p>
                  ChatBox AI connects to 56+ state-of-the-art models via enterprise partnerships:
                </p>
                <ul>
                  <li>
                    <strong>Upstream Dependencies:</strong> Model availability depends on upstream provider uptime (OpenAI, Anthropic, Google, Mistral, Groq). Temporary provider downtime does not constitute a breach of these Terms.
                  </li>
                  <li>
                    <strong>Model Catalog Updates:</strong> We continuously add new models and deprecate outdated ones as foundation labs release newer revisions.
                  </li>
                  <li>
                    <strong>Plan Gating:</strong> Frontier models are accessible strictly to Pro and Max subscribers. Bypassing client-side model restrictions is strictly prohibited.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 11 */}
            <section id="api-keys" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">11</span>
                <h2 className="legal-section-title">Developer API Keys &amp; Programmatic Usage</h2>
              </header>
              <div className="legal-body">
                <p>
                  Pro and Max subscribers may generate API keys for OpenAI-compatible client integrations:
                </p>
                <ul>
                  <li>
                    <strong>Confidentiality:</strong> API keys represent direct access to your credit pool. Publishing API keys in public Git repositories or embedding them in unsecured client apps is strictly forbidden.
                  </li>
                  <li>
                    <strong>Metered Balance:</strong> API requests deduct from your active monthly credit pool. If your balance reaches zero, API calls will return standard 429 rate-limit responses until credits refresh.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 12 */}
            <section id="limits" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">12</span>
                <h2 className="legal-section-title">Request Rate Limits &amp; Concurrency Caps</h2>
              </header>
              <div className="legal-body">
                <p>
                  To preserve platform stability and ensure equitable compute distribution across all users:
                </p>
                <div className="legal-table-wrap">
                  <table className="legal-table">
                    <thead>
                      <tr>
                        <th>Subscription Tier</th>
                        <th>Request Rate Limit</th>
                        <th>Daily Image Generation Cap</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Free Plan</td>
                        <td>10 requests / minute</td>
                        <td>Not available</td>
                      </tr>
                      <tr>
                        <td>Pro Plan</td>
                        <td>60 requests / minute</td>
                        <td>50 images / calendar day</td>
                      </tr>
                      <tr>
                        <td>Max Plan</td>
                        <td>120 requests / minute</td>
                        <td>250 images / calendar day</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Section 13 */}
            <section id="abuse" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">13</span>
                <h2 className="legal-section-title">Abuse Prevention &amp; Platform Safeguards</h2>
              </header>
              <div className="legal-body">
                <p>
                  Users must adhere to ethical usage standards. Prohibited activities include:
                </p>
                <ul>
                  <li>
                    Deploying automated scrapers, headless spiders, or scripts to bulk-extract model outputs or proprietary UI components.
                  </li>
                  <li>
                    Attempting to reverse-engineer server-side prompt templates, system instructions, or backend Supabase/Appwrite database endpoints.
                  </li>
                  <li>
                    Generating content intended for malicious software development, denial-of-service orchestration, or illegal activities under Indian or international law.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 14 */}
            <section id="intellectual" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">14</span>
                <h2 className="legal-section-title">Intellectual Property &amp; Output Commercial Rights</h2>
              </header>
              <div className="legal-callout">
                <strong>Your Content Belongs to You:</strong> You own the prompts, documents, and code you input. To the fullest extent permitted by law, you also own the commercial rights to the AI outputs generated for your account.
              </div>
              <div className="legal-body">
                <p>
                  We assert no ownership claims over your intellectual property:
                </p>
                <ul>
                  <li>
                    <strong>Input Ownership:</strong> You retain complete title and intellectual property rights in your prompts, uploaded files, and project requirements.
                  </li>
                  <li>
                    <strong>Commercial Exploitation:</strong> You may freely publish, distribute, monetize, and copyright software components, website prototypes, and research text created using ChatBox AI.
                  </li>
                  <li>
                    <strong>Platform Assets:</strong> The ChatBox AI brand, logos, user interface designs, and proprietary routing code remain the exclusive intellectual property of Arpit Ariyan Mahanarana (creator of Technon).
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 15 */}
            <section id="liability" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">15</span>
                <h2 className="legal-section-title">Warranties, Disclaimers &amp; Liability Limits</h2>
              </header>
              <div className="legal-body">
                <p>
                  ChatBox AI operates under clear commercial limitation standards:
                </p>
                <ul>
                  <li>
                    <strong>&quot;As-Is&quot; Provision:</strong> Services are delivered on an &quot;as-is&quot; and &quot;as-available&quot; operational standard. We make no express or implied warranty regarding uninterrupted uptime or flawless mathematical accuracy.
                  </li>
                  <li>
                    <strong>AI Hallucination Advisory:</strong> Generative AI models can occasionally produce inaccurate, misleading, or hallucinated facts and code. Users must independently verify critical software syntax and factual claims before production deployment.
                  </li>
                  <li>
                    <strong>Liability Cap:</strong> To the maximum extent permitted by applicable law, our aggregate financial liability for any claim arising from these Terms is capped at the total subscription fees you paid to ChatBox AI in the twelve (12) months preceding the dispute.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 16 */}
            <section id="governing-law" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">16</span>
                <h2 className="legal-section-title">Governing Law &amp; Exclusive Jurisdiction</h2>
              </header>
              <div className="legal-body">
                <p>
                  These Terms, subscription contracts, and any disputes arising out of or related to ChatBox AI are governed exclusively by and construed in accordance with the substantive laws of <strong>India</strong>.
                </p>
                <p>
                  The state and federal courts situated in <strong>New Delhi, India</strong> have exclusive territorial and subject-matter jurisdiction to resolve any legal controversy, arbitration, or proceeding arising under these Terms.
                </p>
              </div>
            </section>

            {/* Section 17 */}
            <section id="contact" className="legal-section">
              <header className="legal-section-header">
                <span className="legal-num">17</span>
                <h2 className="legal-section-title">Corporate Notices &amp; Support Desk</h2>
              </header>
              <div className="legal-callout">
                <strong>Legal Notices:</strong> For contractual disputes, legal notices, or compliance inquiries, address our corporate legal desk directly.
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
                        <td><strong>Location &amp; Jurisdiction</strong></td>
                        <td>Odisha, India</td>
                      </tr>
                      <tr>
                        <td><strong>Legal &amp; DPO Desk</strong></td>
                        <td>arpitariyanm@gmail.com</td>
                      </tr>
                      <tr>
                        <td><strong>Billing &amp; Support</strong></td>
                        <td>ariyanariyan82361@gmail.com</td>
                      </tr>
                      <tr>
                        <td><strong>Official Website</strong></td>
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
