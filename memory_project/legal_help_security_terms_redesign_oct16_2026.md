# ChatBoxAI Project Memory: Legal, Support, Security & Terms Editorial Redesign

**Date:** October 16, 2026  
**Scope:** Complete visual and structural redesign of all corporate, legal, trust, and support subpages (`privacy-policy`, `terms-conditions`, `help-center`, `security`) to strictly unify with the ChatBoxAI Dark Editorial design system.  
**Files Modified / Upgraded:**  
- `app/privacy-policy/PrivacyClient.jsx`
- `app/privacy-policy/page.jsx`
- `app/terms-conditions/TermsClient.jsx`
- `app/terms-conditions/page.jsx`
- `app/help-center/HelpCenterClient.jsx`
- `app/help-center/page.jsx`
- `app/security/SecurityClient.tsx`
- `app/security/page.tsx`
- `app/(landing)/_components/landing.css`

---

## 1. Architectural Strategy & Design Language Unification

### Previous State:
- `privacy-policy` and `terms-conditions` were disconnected standalone pages with hardcoded colors (`#0c0a09`, `#5a4a7a`, `border-white/6`), lacking the unified `Navbar` and monumental glass `Footer`.
- `help-center` had static cards, lacked dynamic keyword search, lacked category filtering, and used non-editorial UI elements.
- `security` was a short 3-section placeholder lacking in-depth architecture explanations and trust metrics.

### New Unified Editorial Architecture:
1. **Canonical Chrome:**
   - Every page now integrates the canonical ChatBoxAI `Navbar` at the top (with page scroll indicator capsule and animated mega menu) and the monumental white glass `Footer` at the bottom.
2. **Editorial Tokens:**
   - Structured with `--canvas` (`#0f0f11`), `--page` (`#09090b`), `--line` (`#222227`), `--line-strong` (`#32323a`), `--foreground`, and `--muted-foreground`.
   - Typography scales use `var(--font-display)` for titles/headings, `var(--font-mono)` for eyebrows/numbers/metadata chips, and `var(--font-sans)` for body prose.
3. **Responsive Multi-Device Layout:**
   - **Desktop (>= 1024px):** 2-column layout (`280px minmax(0, 1fr)`) with sticky left Table of Contents navigation featuring active section scroll-spy.
   - **Tablet & Mobile (< 1024px):** Sticky horizontal scrollable chip bar pinned below navbar (`top: 72px`) allowing instant lateral jumping to any section without repetitive scrolling.

---

## 2. Privacy Policy (`app/privacy-policy/`)

### Enhanced Structure:
- **14 Structured Sections:**
  1. Introduction & Developer Identity (Arpit Ariyan Mahanarana, Student & Independent Developer, Portfolio: technon.co.in, DPDP Act & international standards)
  2. Scope of Personal Data Collection (Account identity, credentials, preferences)
  3. Subscription & Billing Telemetry (Razorpay & Paddle, zero raw card storage)
  4. Credit Consumption & Rate-Limit Logging (Token deduction, DOS protection)
  5. Zero Model Training & Prompt Safeguards (Strict contractual prohibition against foundation model training)
  6. Third-Party Sub-Processors & Data Flows (Structured data flow matrix)
  7. Encryption Protocols & Access Hardening (TLS 1.3, AES-256 volumes, SHA-256 hashed API keys, email OTP MFA)
  8. Data Retention & Automated Lifespans (30-day purge SLA, 7-year statutory invoice retention)
  9. Your Legal Rights Under DPDP Act & GDPR (Right to access, correction, erasure, grievance redressal)
  10. Session Tracking & Local Storage (Essential cookies, zero ad trackers)
  11. Children's Privacy & Account Age Limits (13+ restriction)
  12. Infrastructure Location & Cross-Border Routing (Indian datacenter clusters)
  13. Modifications & Revision Notices
  14. Data Protection Officer (DPO) Contact Details (`arpitariyanm@gmail.com`)

---

## 3. Terms of Service (`app/terms-conditions/`)

### Enhanced Structure:
- **17 Structured Sections:**
  1. Platform Introduction & Governance
  2. Acceptance of Terms & Eligibility
  3. User Accounts, Security & MFA Protocols
  4. Pricing Plans & Tier Specifications (Free vs Pro at ₹499/mo vs Max at ₹1,999/mo)
  5. Billing Cycles, Invoicing & Auto-Renewal
  6. Self-Service Cancellation & Period-End Access
  7. Plan Upgrade & Downgrade Mechanics
  8. Refund Policy & Payment Error Resolution (48h reporting window for gateway duplicates)
  9. Credit Metering, Token Deduction & Resets (Daily 00:00 UTC and monthly renewal schedules)
  10. Foundation Model Access & Availability (56+ models, tier gating)
  11. Developer API Keys & Programmatic Usage
  12. Request Rate Limits & Concurrency Caps (10 req/min Free, 60 req/min Pro, 120 req/min Max)
  13. Abuse Prevention & Platform Safeguards
  14. Intellectual Property & Output Commercial Rights (Full user ownership of generated outputs)
  15. Warranties, Disclaimers & Liability Limits (AI hallucination advisory, liability cap)
  16. Governing Law & Exclusive Jurisdiction (New Delhi, India)
  17. Corporate Notices & Support Desk

---

## 4. Help Center & Support (`app/help-center/`)

### Key Upgrades:
- **Live Search Engine:** Real-time query matching across questions, answers, and categories with instant result counts and clear button.
- **8 Category Filter Pills:** All Topics, Getting Started, Pro & Credits, AI Models, Website Builder, Security & Privacy, Billing & Payments, Developer & API.
- **Editorial Accordion Items:** Numbered format (`Q01`, `Q02`, etc.) with animated expand/collapse matching the landing page FAQ pattern.
- **Direct Support Channels:**
  - Email Support Desk (`arpitariyanm@gmail.com` with guaranteed < 24h response time)
  - In-App Bug Reports (direct jump to `/app` settings)
  - Developer Documentation (direct jump to `/docs` & `/docs/models`)
  - Pro Priority SLA Callout banner

---

## 5. Security & Privacy Architecture (`app/security/`)

### Key Upgrades:
- **6 Core Security Pillars:** Zero Public Model Training, Cryptographic Protection, MFA & Identity, Hashed API Keys, Payment Isolation, and Data Sovereignty.
- **Security & Isolation Matrix:** Side-by-side comparison across Free, Pro, and Max tiers.
- **Sub-Processors Transparency Table:** Detailed roles, datacenter locations, and cryptographic standards for Firebase, Supabase/Appwrite, Razorpay/Paddle, and OpenAI/Anthropic/Google AI.
- **Shared Responsibility Guide:** Best practices for users (MFA, secret sanitation, API key hygiene, stale thread purging).
- **Vulnerability Disclosure Channel:** Direct protocol for ethical security researchers.
