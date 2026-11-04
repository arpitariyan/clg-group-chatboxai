# ChatBoxAI Landing Page 2.0 Redesign - Project Memory (Aug 13, 2026)

## 📌 CRITICAL MANDATES & CONSTRAINTS

### 1. ABSOLUTE FORBIDDEN PATTERN: NO BACKGROUND GLOW CIRCLES
- **Rule**: NEVER add any background circle, oval, radial blob, or `rounded-full` glow div (such as `w-200 h-150`, `blur-30`, `blur-[120px]`, or `bg-[#3a2c5a]/6 rounded-full`) behind landing page sections!
- **Reason**: Invalid blur classes render as giant, ugly dark grey/black circle shapes across sections, ruining the design.
- **Enforcement**: All section background layers must remain clean `#0c0a09` with only subtle top divider lines (`<div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/6 to-transparent" />`).

### 2. HERO SECTION IMMUTABILITY
- **Rule**: The Hero section (`app/(landing)/_components/HeroSection.jsx`) MUST strictly remain the exact original video hero design:
  - Video background (`hero_section.mp4`) with overlays and vignette
  - Heading: `"The Ultimate Multi-Model AI Workspace."` (with `"Multi-Model"` in orange-500)
  - Subtitle: `"Generate Next.js websites, create breathtaking AI art, conduct deep web research, and converse with GPT-5.5, Claude Fable 5, and Gemini—all inside one unified, lightning-fast platform."`
  - ChatBox Input Card (`Ask anything...`) with bottom toolbar (Plus, Paperclip, Image, Model selector *"Claude Fable 5"*, Mic, and orange send button)
  - Quick Action Pills: Code, Create image, Summarize, Research
- **Aug 23, 2026 amendment**: still immutable in structure, copy, video, layout and its
  orange accent (the hero is the *only* place `orange-500` survives — everything below it
  runs on the purple ramp). Typography only was touched: headline on `font-display`
  (Space Grotesk) at `font-semibold tracking-[-0.03em]`, and two utilities that produced
  no style at all were repaired — `text-3.75` → `text-[15px]`, `border-white/1` (1%
  opacity, effectively invisible) → `border-white/10`.

### 3. OFFICIAL DOMAIN NAME
- **Rule**: All browser preview mockups, URL bars, code examples, and links MUST specify **`chatboxai.co.in`** (NOT `chatboxai.app`, `vercel.app`, or `my-ai-site`).

### 4. ~~MOTION AI FRAME SEQUENCE (SCROLL-SCRUBBED CANVAS)~~ — REMOVED Aug 23, 2026
- **This mandate no longer applies.** `AiMotionCanvas.jsx` has been **deleted** and its
  import removed from `LandingPageClient.jsx`.
- **Why**: it preloaded 240 frames from `public/Motion_AI_frames/ezgif-frame-001.jpg …
  -240.jpg`, a directory that **does not exist and was never committed** (`git log --all`
  confirms). Every frame 404'd, so the canvas painted nothing. It was also mounted
  `fixed inset-0 z-0`, i.e. behind 14 opaque `bg-[#0c0a09]` sections, so it would have
  been invisible even with the frames present.
- **Replacement**: the page-wide scroll motion is now `TraceRail.jsx` — a 1px rail at the
  left edge whose fill scrubs to scroll progress, with a ◆ marker on its leading edge.
  One ScrollTrigger, transform-only, `hidden lg:block`. See
  `landing_reasoning_trace_redesign_aug23_2026.md`.
- Do **not** reintroduce a frame-sequence canvas unless the frames are actually committed.

### 5. CINEMATIC NOVA-INSPIRED DESIGN SYSTEM TOKENS
- **Left-Accent Glass Badges**: `border-l-2 border-[#5a4a7a] bg-white/5 border-r border-t border-b border-white/10 px-3.5 py-1.5 rounded-r-xl backdrop-blur-md flex items-center gap-2`.
- **Monospaced Tracking**: `font-mono text-xs text-[#8a7aaa] uppercase tracking-[0.2em]`.
- **Section Headers**: `#5a4a7a` line + `#7a6a9a` uppercase tracking label (`tracking-[0.2em]`).
- **Headlines**: `font-medium` (NOT heavy bold), `leading-[1.08]`, with second phrase in `text-neutral-500`.
- **Frosted Panels**: `bg-white/4 backdrop-blur-xl border border-white/6 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl`.
- **Card Containers**: Signature 1px border grid system: `grid gap-px bg-white/4 rounded-3xl overflow-hidden`.
- **Card Items**: `bg-[#0c0a09] p-7 sm:p-8 relative group hover:bg-[#110f14] transition-colors duration-500`.

---

## 🛠️ WORK ACCOMPLISHED SUMMARY

1. **Integrated Components**:
   - ~~`AiMotionCanvas.jsx` (240-frame scroll-scrubbed HTML5 canvas background from `/Motion_AI_frames/`)~~ — **deleted Aug 23, 2026**, see mandate 4 above; replaced by `TraceRail.jsx`
   - `HeroSection.jsx` (Restored exact original video hero)
   - `TrustBadgesSection.jsx` (Real foundation model icons: ChatGPT, Claude, Gemini, Meta, Mistral, Cohere, Groq)
   - `MotionAiCapabilitySection.jsx` (Nova-inspired glass capability panel with left-accent badge, dual CTAs, and 3 interactive rows)
   - `DeepResearchSection.jsx` (4-step 1px grid pipeline: `01` to `04`)
   - `WebsiteBuilderSection.jsx` (Prompt-to-website with `chatboxai.co.in` URL)
   - `FileIntelligenceSection.jsx` (Document intelligence with PDF, DOCX, XLSX, PPTX pills)
   - `IntegrationsSection.jsx` (8 connected ecosystem apps with real logos from `/app_logo_connection/` and live data inspector)
   - `AiModelsSection.jsx` (5-column capability deck)
   - `UseCasesSection.jsx` (Persona cards for Students, Developers, Designers, Researchers, Creators, Teams)
   - `WhyChatBoxAISection.jsx` (5 separate tools vs 1 unified workspace comparison)
   - `TrustSecuritySection.jsx` (4 privacy pillars)
   - `FeaturesSection.jsx`, `HowItWorksSection.jsx`, `StatsSection.jsx`, `TestimonialsSection.jsx`, `PricingSection.jsx`, `FAQSection.jsx`, `CTASection.jsx`, `LandingFooter.jsx`
   - *(Aug 23, 2026: `TestimonialsSection` no longer renders single-letter initials — it uses
     the real portraits in `public/avatar/` through `next/image` with `quality={70}
     sizes="48px"`. Explicit sizing is required: the source PNGs are 2.8–9.6 MB each.
     `LandingFooter.jsx`/`LandingNavbar.jsx` were replaced by `app/_components/GlobalFooter.jsx`
     and `GlobalNavbar.jsx`.)*

2. **Core Performance Architecture**:
   - Centralized Motion Tokens (`/lib/motionTokens.js`)
   - Device Capability & Reduced-Motion Provider (`PerformanceManager.jsx`)
   - Hybrid `useInView` Hook (`/lib/animations.js`) supporting array & object destructuring with safe SSR fallback.

3. **Master Assembly**:
   - Assembled in [`LandingPageClient.jsx`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/app/LandingPageClient.jsx).
