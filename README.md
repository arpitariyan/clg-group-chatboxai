# ChatBox AI - The Ultimate Full-Stack AI Platform

![ChatBox AI](public/favicon.ico) <!-- Placeholder for actual banner/logo -->

**ChatBox AI** is an advanced, enterprise-grade, feature-rich platform built with **Next.js (App Router)**. It serves as a unified ecosystem that connects users with world-class Large Language Models (LLMs), AI image generators, an autonomous AI-powered website builder, Voice AI interactions, and comprehensive multi-modal data analysis tools.

Designed with resilience and scale in mind, ChatBox AI incorporates automated credit economies, robust API key failover mechanisms, distributed background jobs, and a sleek, highly animated user interface.

---

## 🌟 Executive Summary of Capabilities

1. **Omni-Model AI Hub:** Access over 20+ cutting-edge models interchangeably (GPT-4o, Gemini 2.5/3 Pro, DeepSeek V3, Llama 3.2/4, Qwen3) without needing separate subscriptions.
2. **Multi-Modal Document & Image Analysis:** Upload PDFs, Word documents (`mammoth`), Excel files (`xlsx`), and images for native, AI-driven context extraction.
3. **Autonomous Website Builder:** Generate complete, responsive web applications via text prompts. Modify, rollback, and deploy them automatically.
4. **Rich Media Processing:** Native image generation, in-browser background removal (`@imgly/background-removal`), image cropping (`react-easy-crop`), and dynamic image optimization (`sharp`).
5. **Interactive UI/UX:** Powered by `framer-motion`, `three.js`, `simplex-noise`, and `typewriter-effect` for a highly engaging, modern feel.
6. **Automated Economy:** Built-in subscriptions and token economies driven by Razorpay and Inngest chron jobs.

---

## 🚀 Deep Dive: Core Features & Workflows

### 🤖 1. Advanced Multi-Model AI Chat Interface

Provide users with the best model for their specific task. The platform intelligently routes queries and maintains conversational history.

- **Tiered Access Control:** Models are strictly categorized into Free and Pro tiers.
- **Supported AI Providers:**
  - **Google:** Gemini 3 Flash, Gemini 3 Pro, Gemini 2.5 Flash, Gemini 2.5 Pro (and Thinking variants), Gemini 2.0 Flash.
  - **OpenAI:** GPT-4o Mini, GPT-5 (Compact via API routing).
  - **DeepSeek:** DeepSeek V3, DeepSeek Terminus.
  - **Meta:** Llama 4 Scout, Llama 3.2 3B.
  - **Alibaba:** Qwen3, Qwen3 Pro, Qwen3 32B.
  - **Kimi:** Kimi K2.
- **"Auto" Routing:** A smart selection feature that dynamically picks the most efficient available model from the user's allowed tier.

### 📄 2. Multi-Modal Vision & Document Parsing

Users are not limited to text. ChatBox AI features a highly advanced data extraction workflow:

- **PDFs & Documents:** Leverages `pdf-parse` and `mammoth` to seamlessly extract raw text from uploaded `.pdf` and `.docx` files, injecting them into the LLM context limits.
- **Spreadsheets:** Uses `xlsx` to parse spreadsheet data for financial or tabular AI analysis.
- **Vision & Image Understanding:** Utilizing Google Gemini's multimodal SDK (`@google/generative-ai`), users can upload images alongside text prompts. The system converts images to inline byte-data arrays, structures a composite prompt, and returns detailed visual analyses.

### 🌐 3. Autonomous AI Website Builder

A flagship workspace where users can generate, iterate, and deploy websites:

- **Generative UI:** Describe a website, and the AI generates the HTML, Tailwind CSS, and React logic.
- **Revision System:** Dedicated endpoints allow users to save iterations, preview drafts, roll back to previous versions, and push to production.
- **Dedicated Credit Economy:** Website generations utilize a separate or heavily weighted credit system, tracked natively via Supabase migrations (`website_credits_migration.sql`).

### 🎨 4. Image Generation & Processing Workspace

- **Generation Engine:** Dedicated text-to-image prompt interfaces.
- **Client-Side Background Removal:** Features an integrated `@imgly/background-removal` tool that isolates subjects from backgrounds without costing server-side compute.
- **Editing Suite:** Includes `react-easy-crop` and `sharp` to modify, resize, and format images down to exact user specifications before saving or exporting.

### 🗣️ 5. Voice AI & Real-time Interactivity

- **Speech-to-Text (STT):** Voice dictation for hands-free prompting.
- **Text-to-Speech (TTS):** Auditory playback of generated responses for accessibility and multitasking.

### 🔍 6. Discover, Search, & Personal Library

- **Live Web Search:** Integrates the Google Search API to fetch real-time internet context to augment LLM answers.
- **Community Discover:** A social feed where users can share their best prompts, generated images, or website templates.
- **Personal Library:** An organized vault of all historical user interactions, categorized by generation type (Chats, Images, Websites).

---

## 💎 The Engineering: Resiliency & Architecture

ChatBox AI is architected differently than a standard wrapper. It incorporates enterprise-level resiliency algorithms natively in the codebase.

### 🔄 Multi-Tier API Key Failover Mechanism

Relying on a single API key for OpenRouter, A4F, or Google is a single point of failure. ChatBox AI utilizes a custom **Key Waterfall Algorithm** within `inngest/functions.js`:

- The system loads arrays of up to 5 API keys per service (`KEY_1`, `KEY_2`, `KEY_3`, etc.).
- If a primary key experiences an `HTTP 429 (Rate Limit)`, `HTTP 403 (Out of Credits)`, or `HTTP 524 (Timeout)`, the system catches the exception and _immediately_ retries the exact payload on the next available key.
- This ensures virtually **100% uptime** during extreme traffic spikes or unexpected API provider outages.

### 🕒 Asynchronous Event-Driven Jobs (Inngest)

ChatBox AI delegates heavy backend tasks to background queues using **Inngest**.

- **Job: `checkExpiredSubscriptions`:** Runs automatically via a CRON schedule (`0 0 * * *` - everyday at midnight UTC).
- **Workflow:**
  1. Queries Supabase for users whose `subscription_end_date` is in the past.
  2. Protects master/admin accounts from modifications.
  3. Downgrades the plan from `pro` -> `free`.
  4. Resets the user's token/credit allowance to the standard free tier (e.g., 5000 credits).
  5. Inserts an immutable audit log into the `usage_logs` table.
- **Manual Triggers:** Includes `manualSubscriptionCheck` for testing and admin enforcement.

---

## 🛠️ Technology Stack

| Layer                | Technology                    | Purpose                                                    |
| :------------------- | :---------------------------- | :--------------------------------------------------------- |
| **Framework**        | Next.js 16+, React 18         | SSR, App Router, Full-stack API Endpoints                  |
| **Database**         | Supabase (PostgreSQL)         | Real-time DB, Row Level Security (RLS), User Tables        |
| **Authentication**   | Clerk                         | Secure, passwordless, social OAuth login routing           |
| **Payments**         | Razorpay                      | Subscription billing and credit package purchases          |
| **State & UI**       | Tailwind CSS, Radix UI        | Utility-first styling with accessible primitive components |
| **Animations**       | Framer Motion, Three.js       | High-end micro-interactions, 3D canvas, visual flare       |
| **Background Tasks** | Inngest                       | Reliable serverless CRON and event-driven queues           |
| **AI Providers**     | Google GenAI, OpenRouter, A4F | Multi-model routing and LLM text/image streaming           |
| **Data Parsing**     | mammoth, pdf-parse, xlsx      | Native document interrogation in the browser/edge          |

---

## 📁 Comprehensive Project Structure

```text
chatboxai-renewal/
├── app/
│   ├── (auth)/             # Clerk authentication layouts (Sign In, Sign Up)
│   ├── (landing)/          # Highly animated marketing pages (Hero, Pricing, Stats, Features)
│   ├── (routes)/           # Authenticated application workspaces
│   │   ├── admin/          # Complex Admin dashboard charting users, models, & financials
│   │   ├── app/            # Main AI conversational interface
│   │   ├── discover/       # Social space for community templates and prompts
│   │   ├── image-gen/      # Turnkey AI Image Generation studio
│   │   ├── library/        # History and asset management for users
│   │   ├── search/         # Web search components
│   │   ├── voice-ai/       # Voice AI text-to-speech interaction rooms
│   │   └── website-builder/# AI Website Creator workspace & site previewer
│   └── api/                # Edge & Node API backend architecture
│       ├── admin/          # Privileged endpoints (migrations, manual overrides)
│       ├── ai/             # Primary LLM and Vision AI generation routes
│       ├── inngest/        # Webhook listener for processing background tasks
│       ├── razorpay/       # Webhooks processing payment verifications and subscriptions
│       ├── website-builder/# Publishing, rollback, and revision APIs
│       ├── google-search/  # Backend fetching for internet context
│       ├── upload-image/   # Safe image ingestion endpoints
│       └── ...             # Analyze, auth, subscriptions, user state management
├── components/             # Radix-UI/shadcn unstyled primitives and global interfaces
├── contexts/               # React Context Providers mapping User Auth, Plans, and Credits globally
├── database/               # Supabase .sql migration arrays (plans, credits, reactions, metrics)
├── hooks/                  # Customized modular React hooks (e.g., useModel, useCredit)
├── inngest/                # Definitive cron-job functions & failover logic (`functions.js`, `client.js`)
├── lib/                    # Core configuration and helpers (Audio effects, formatters)
├── public/                 # Favicons, vector SVGs, and static uncompiled scripts
└── services/               # System configurations: Shared model lists (`Shared.jsx`), Supabase client init
```

---

## 🗄️ Database Schemas Overview

The Supabase PostgreSQL database is constructed using strict SQL Migrations (located in `/database/`). Key tables and interactions include:

- `Users`: Tracks Clerk IDs, emails, current plan (`free` vs `pro`), credit balances, and subscription timelines.
- `usage_logs`: Immutable ledger recording every single token/credit consumed per specific model, used for Admin analytics.
- `subscriptions`: Links Razorpay payment IDs to User states.
- `website_builder`: Heavily relies on version control logic to save DOM strings, custom CSS, block revisions, and deployment URLs.
- **RLS Policies:** Detailed execution of Row-Level Security ensuring users can only fetch/delete their own conversational or image histories (`fix_rls_policies.sql`).

---

## 📦 Detailed Installation & Setup Guide

### 1. System Requirements

- Node.js 18.17.0 or higher
- npm, yarn, or pnpm
- Supabase Project (Free tier covers development)
- Clerk Dashboard Account
- Razorpay Dashboard Account
- API Keys: OpenRouter, Google Gemini, A4F.

### 2. Repository Setup

```bash
git clone https://github.com/arpitariyan/clg-group-chatboxai.git
cd clg-group-chatboxai
npm install
```

### 3. Environment Variables Configuration

Duplicate the `.env.example` file and rename it to `.env`. Fill in tracking, authentication, and database IDs.

**IMPORTANT: The Failover Engine** requires you to define backup keys if you want true resiliency.

```env
# ======== CLERK AUTH ========
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# ======== DATABASE (SUPABASE) ========
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...

# ======== AI KEY FAILOVER SETUP ========
# Primary Keys
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSy...
OPENROUTER_API_KEY=sk-or-v1-...
A4F_API_KEY=sk-a4f-...

# Backup Keys (System falls back if rate-limited)
NEXT_PUBLIC_GEMINI_API_KEY_2=
NEXT_PUBLIC_GEMINI_API_KEY_3=
OPENROUTER_API_KEY_2=
OPENROUTER_API_KEY_3=
# ... etc up to 5 keys per service.

# ======== PAYMENTS (RAZORPAY) ========
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

### 4. Database Migrations

Go to your Supabase project dashboard -> SQL Editor.

1. Copy the contents of `/database/safe_migration.sql` to initialize your schemas.
2. Run additional migrations as needed (e.g., `image_generation_table.sql`, `plan_system_migration.sql`, `website_credits_migration.sql`) to layer on Pro functionalities.

### 5. Running the Application Workflows

**Start the Next.js Frontend/Backend Engine:**

```bash
npm run dev
```

The localized App Router and edge functions will now run on `http://localhost:3000`.

**6. ⚙️ Running & Configuring Inngest (Background Jobs)**

[Inngest](https://inngest.com) is the core engine routing the background Cron Jobs (monthly subscription expirations) and AI Key failover operations natively across your Next.js application.

### **Requirements for Inngest**

To run Inngest successfully, you must have the following configuration in your `.env` file for your application to sync with the background workers.

```env
# Required for Next.js to authenticate the local/remote Inngest cluster
INNGEST_EVENT_KEY=local
INNGEST_SIGNING_KEY=local
```

_(In production, replace `local` with your remote Inngest keys obtained from your Inngest Dashboard)._

### **Running Inngest in Development**

Inngest acts as a co-runner during development. It needs the Next.js API server to be active.

1. **Start the Next.js app first** (if you haven't already):

   ```bash
   npm run dev
   # (Runs on http://localhost:3000)
   ```

2. **Start the Inngest Local Dev Server:**
   Open a _second_ terminal window in the project root and run:

   ```bash
   npx inngest-cli@latest dev
   ```

3. **Verify the Sync:**
   By default, the `inngest-cli` will search locally for Next.js instances running on port `3000` and link to your API route created at `app/api/inngest/route.js`.

   Open your browser to the local Inngest Dashboard at **[http://localhost:8288](http://localhost:8288)**. You should immediately see the `Check and Downgrade Expired Subscriptions` and `Manual Subscription Expiry Check` workflows listed.

### **Running Inngest in Production (Vercel/Next.js)**

When deploying to a remote host like Vercel:

1. Ensure your Production `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` are placed in the Vercel Environment Variables UI.
2. In your Inngest production dashboard, set your **Sync URL** to point to your live site webhook API endpoint:
   `https://[YOUR_DOMAIN].com/api/inngest`
3. Hit "Sync" in the Inngest dashboard to lock the Vercel app to your cron scheduling.

---

## 🔧 Extending the Platform (Developer Notes)

### Adding a New AI Model

To add a new model provider or version to the UI dropdown:

1. Open up `/services/Shared.jsx`.
2. Append your new model dictionary to the `AIModelsOption` array.
3. Flag `isPro: true` if you want to lock it behind the Razorpay paywall.
4. Ensure the backend parser inside `/app/api/ai/` routes correctly formats payloads for the new `modelApi` string.

### Modifying Website Builder Blocks

The AI website builder resolves JSON structural data into React layout objects. To modify the tailwind properties of AI-generated sites, look into the specific parser APIs (`/app/api/website-builder/generate/...`) and augment the system instructions.

---

## 🤝 Contributing

Significant functional PRs should be strictly vetted, especially surrounding the API key failover blocks (`inngest/functions.js`) and credit transaction deductibles (`database/fix_credit_functions.sql`). Please branch, lint with `next lint`, and test UI components extensively utilizing the existing `shadcn-ui` design language.

## 📄 License & Legal

[Insert License Here] - Please review `app/privacy-policy/` and `app/terms-conditions/` to adjust your specific legal and GDPR compliance frameworks before pushing out to a Live production deployment.

---

_Architected and developed with ❤️ by the ChatBox AI Engineering Team._
