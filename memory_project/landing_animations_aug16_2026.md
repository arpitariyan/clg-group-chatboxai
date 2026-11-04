# Landing Page Animations & Section Redesigns — Aug 16, 2026

> **⚠️ PARTIALLY SUPERSEDED — Aug 23, 2026.**
> The per-section visual descriptions below are the Aug 16 state. Most sections were
> re-cut in the "Reasoning Trace" redesign — read
> `landing_reasoning_trace_redesign_aug23_2026.md` first; it is the current source of
> truth for the design system, container/rhythm spec, and motion utilities.
> The **cleanup pattern originally prescribed in this file was wrong and broke the
> page** — see the corrected rule immediately below.

## Summary
Complete redesign of all 15 landing page sections with:
1. Distinct visual styles per section (no two sections look identical)
2. GSAP ScrollTrigger scroll-driven animations
3. CSS keyframe animations for simpler effects
4. Interactive components with Framer Motion

---

## GSAP Setup
- **Package**: `gsap@3.12.7` installed via npm
- **Utility file**: `lib/gsapUtils.js` — central SSR-safe helpers
- **Usage pattern**: go through `useGsapContext` from `lib/gsapUtils.js`. It does the
  lazy import, registers ScrollTrigger, guards the async race (a cleanup that runs
  before the import resolves), and reverts on unmount. Hand-rolling
  `await import('gsap')` inside `useEffect` is what produced 11 slightly different
  bootstraps, several of them leaking triggers on Fast Refresh.

### ❌ CLEANUP — CORRECTED Aug 23, 2026

This file used to say: *"Always return `() => ScrollTrigger.getAll().forEach(st => st.kill())`"*.
**Never do that.** `getAll()` returns every ScrollTrigger on the page, not just the
ones the component created, so one section's unmount silently destroyed every other
section's triggers.

What it actually broke: `HowItWorksSection`, `StatsSection` and `TestimonialsSection`
all shipped that cleanup. Under React StrictMode / Fast Refresh their effects
re-ran, wiping the triggers belonging to `MotionAiCapabilitySection` and
`DeepResearchSection` — whose reveal targets were also hardcoded `opacity-0` in the
markup. With their triggers gone, nothing ever set them back to `opacity: 1`, so
those sections stayed **permanently invisible**. This was the root cause of the
"some parts of the page are not being displayed at all" report.

✅ Correct cleanup — scoped, and it is already what `useGsapContext` does:

```js
const ctx = gsap.context(fn, scopeRef);
return () => ctx.revert();   // kills only this context's tweens + triggers
```

Two rules that follow from it:
- **Never hide content in markup.** No `opacity-0` / `invisible` classes on reveal
  targets. Set the hidden state with `gsap.set()` *inside* the context, so
  `ctx.revert()` restores it and the content still renders if GSAP fails to load.
- **Never nest a reveal target inside another reveal target** — the parent's tween
  overwrites the child's.

---

## Section Visual Designs (Final State Aug 16 2026)

### 1. TrustBadgesSection
- **Style**: Infinite dual-row CSS marquee ticker
- **Row 1**: scrolls left (`marqueeLeft` keyframe, 40s)
- **Row 2**: scrolls right (`marqueeRight` keyframe, 50s)
- **Pills**: grayscale by default → color on hover
- **No GSAP** — pure CSS animation

### 2. MotionAiCapabilitySection (Insight On Demand)
- **Style**: Horizontal split — stat counters left + animated thinking wireframe right
- **Left**: GSAP count-up for 3 stats (40+ Models, 240 Frames, 24+ Sources)
- **Right**: Simulated AI thinking sequence with CSS stagger animations
- **GSAP**: counter animation on scroll entry

### 3. DeepResearchSection
- **Style**: Vertical center-spine timeline — completely different from 4-col grid
- **Desktop**: steps alternate left/right of center spine line
- **Mobile**: single column with left border
- **GSAP**: Spine line grows top→bottom, step nodes scale in, content slides from side

### 4. WebsiteBuilderSection
- **Style**: Prompt input mockup left + animated code-typing VS Code editor right
- **Code lines**: Reveal one by one via `useState` + `setInterval` with cursor blink
- **Loop**: Restarts every 8 seconds

### 5. FileIntelligenceSection
- **Style**: Document scan animation — scan line sweeps over PDF mockup
- **Scan line**: CSS `@keyframes scanLine` with purple glow
- **Data rows**: staggered `animation-delay` reveal below document
- **Layout**: 3-col (doc left 3/5, features right 2/5)

### 6. IntegrationsSection
- **Style**: Kept 8-card grid + live inspector
- **NEW**: GSAP ScrollTrigger staggered fly-in (`y: 28, scale: 0.97` → normal)
- **Stagger**: 0.07s between cards

### 7. AiModelsSection
- **Style**: Tab selector with Framer Motion `layoutId` sliding indicator
- **Content panel**: 2-col with stat + visual per category, `AnimatePresence` crossfade

### 8. UseCasesSection
- **Style**: Asymmetric bento grid (6-col CSS grid)
  - Students: col-span-4 (wide)
  - Developers: col-span-2
  - Designers/Researchers/Creators: col-span-2 each
  - Teams: col-span-6 (full width, horizontal layout)
- **GSAP**: directional slide-in per card position

### 9. WhyChatBoxAISection
- **Style**: Animated strikethrough comparison
- **IntersectionObserver**: triggers strikethrough on old items → ChatBoxAI panel slides in
- **Side-by-side**: 2-col on desktop

### 10. TrustSecuritySection
- **Style**: 2×2 centered cards (text/icon centered, NOT top-left)
- **GSAP**: Scale punch (`0.7 → 1.05 → 1.0`) with `back.out(1.7)` on icon shells, 0.12s stagger

### 11. FeaturesSection
- **Style**: Kept 3×2 grid but each card has large watermark number (F01–F06)
- **GSAP**: `y: 40, opacity: 0` → normal with 0.08s stagger

### 12. HowItWorksSection
- **Style**: Horizontal 3-step flex (NOT grid) with oversized decorative background numbers
- **Decorative numbers**: `text-[160px] text-white/[0.02]` absolute positioned
- **GSAP**: Icon shells punch in with `back.out(1.7)`, decorative numbers scale from 1.3→1.0

### 13. StatsSection
- **Style**: 4-col grid with large count-up numbers
- **GSAP**: Numbers count from 0 to target on scroll entry with `power2.out` easing

### 14. TestimonialsSection
- **Style**: Auto-rotating carousel with avatar selector sidebar
- **Auto-advance**: 4s interval, pauses on hover
- **Progress**: sliding width progress dots
- **AnimatePresence**: `opacity + y` crossfade between testimonials

### 15. CTASection
- **Style**: Full-width dramatic centered CTA
- **GSAP**: Word-by-word entrance (`y: 60, opacity: 0` → normal, 0.05s stagger, `power4.out`)
- **Primary CTA**: Orange pill button (`bg-orange-500`)
- **Secondary**: Ghost border pill

---

## Files Modified/Created Aug 16 2026
- `lib/gsapUtils.js` [NEW]
- `app/(landing)/_components/TrustBadgesSection.jsx`
- `app/(landing)/_components/MotionAiCapabilitySection.jsx`
- `app/(landing)/_components/DeepResearchSection.jsx`
- `app/(landing)/_components/WebsiteBuilderSection.jsx`
- `app/(landing)/_components/FileIntelligenceSection.jsx`
- `app/(landing)/_components/IntegrationsSection.jsx`
- `app/(landing)/_components/AiModelsSection.jsx`
- `app/(landing)/_components/UseCasesSection.jsx`
- `app/(landing)/_components/WhyChatBoxAISection.jsx`
- `app/(landing)/_components/TrustSecuritySection.jsx`
- `app/(landing)/_components/FeaturesSection.jsx`
- `app/(landing)/_components/HowItWorksSection.jsx`
- `app/(landing)/_components/StatsSection.jsx`
- `app/(landing)/_components/TestimonialsSection.jsx`
- `app/(landing)/_components/CTASection.jsx`
