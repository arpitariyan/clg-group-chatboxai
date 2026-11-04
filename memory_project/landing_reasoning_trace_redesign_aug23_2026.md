# Landing Page — "Reasoning Trace" Redesign (Aug 23, 2026)

**Current source of truth for the landing page.** Supersedes the per-section visual
descriptions in `landing_animations_aug16_2026.md` and mandate 4 of
`landing_page_redesign_memory_aug13_2026.md` (both files now carry pointers here).

Scope: visual redesign only. All copy, routes, component logic, interaction behaviour
and section ordering intent were preserved. No new pages.

---

## 1. Why the page was broken (root causes, not symptoms)

Three problems compounded into "sections are partially visible or not displayed at all":

1. **Page-wide ScrollTrigger kills.** `HowItWorksSection`, `StatsSection` and
   `TestimonialsSection` each cleaned up with
   `ScrollTrigger.getAll().forEach(t => t.kill())` — which kills *every* trigger on the
   page, not just their own. `MotionAiCapabilitySection` and `DeepResearchSection` had
   hardcoded `opacity-0` in their markup, so once their triggers were wiped (StrictMode
   double-invoke, Fast Refresh, or either of those three sections unmounting) nothing
   ever set them back to visible. They stayed invisible **forever**.
   This anti-pattern was *prescribed* in `landing_animations_aug16_2026.md`; that file
   has been corrected, otherwise the bug returns.
2. **Consistency was applied to the wrong layer.** 16 of 19 sections opened with a
   byte-identical eyebrow (`w-8 h-px bg-[#5a4a7a]` + a `#7a6a9a` uppercase label), so
   they all read the same — while the *structural* layer was arbitrary: 6 different
   container widths and 6 different vertical rhythms. The fix inverts this: **one
   structural spec, a distinct identity per section.**
3. **Four sections had no scroll animation at all** (`AiModelsSection`,
   `WebsiteBuilderSection`, `WhyChatBoxAISection`, and `FileIntelligenceSection` whose
   reveal ran on a CSS `animation-delay` that finished ~2s after *page load* — long
   before anyone scrolled to it). Hence "elements appear statically".

---

## 2. Design direction

The signature device is borrowed from the product's own reasoning UI (see
`thinking_ui_redesign.md`): a ◆ node, a hairline that draws downward, a mono state verb,
and a 2px left rule marking generated content. The landing page speaks the same
vocabulary, so it looks like the product it sells.

### Tokens
- Base `#0c0a09` · panel `#110f14` · hairline `white/6`
- **Purple ramp** (everything below the hero): `#3a2c5a` deep → `#5a4a7a` rail →
  `#7a6a9a` label → `#8a7aaa` icon → `#a855f7` / `#c084fc` highlight
- **`orange-500` is hero-only.** Verified: the only remaining `orange-*` occurrences in
  `app/(landing)/_components/` are in `HeroSection.jsx`.
- **Type**: `font-display` = **Space Grotesk** (added in `app/layout.js`, exposed as
  `--font-display` in the `@theme inline` block of `app/globals.css`) for headings and
  numerals · Geist body · Geist Mono for state labels and data. All numeric data gets
  `tabular-nums`.
- **Scale**: h2 `text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight
  leading-[1.12]` · h3 `text-xl` · body `text-[15px] leading-[1.7]` · caption `text-xs`
  · mono state label `text-[11px] tracking-[0.2em] uppercase`

### Structural layer — one spec for every section
- Container `mx-auto max-w-6xl px-4 sm:px-6 lg:px-8`
- Rhythm `py-24 sm:py-32`
- One top divider: `<div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r
  from-transparent via-white/6 to-transparent" />` — and **no `border-t` as well**, or it
  renders as a 2px rule (this happened in FileIntelligence and WebsiteBuilder).
- Headers left-aligned everywhere.
- Only four deliberate exceptions: Hero and CTA (`max-w-4xl`, centered), TrustBadges
  (full-bleed marquee band, `py-12 sm:py-16`), Testimonials (full-bleed horizontal
  track, `md:min-h-screen md:py-0`).

### Identity layer — `SectionHeader` + a state verb per section
`SectionHeader.jsx` renders ◆ node → hairline that draws down → mono state verb that
types in → h2 with a word stagger. The **verb is what differentiates the sections**:

| Section | `state` | Section | `state` |
|---|---|---|---|
| LiveProductDemo | `observing` | MotionAiCapability | `reasoning` |
| DeepResearch | `analyzing sources` | WebsiteBuilder | `generating` |
| FileIntelligence | `parsing` | Integrations | `connecting` |
| AiModels | `routing` | UseCases | `adapting` |
| WhyChatBoxAI | `comparing` | TrustSecurity | `securing` |
| Features | `capabilities` | HowItWorks | `sequence` |
| Stats | `counting` | Testimonials | `verified` |
| Pricing | `plans` | FAQ | `answering` |
| CTA | `ready` | | |

`SectionHeader` takes an **`align` prop** (`'left'` default, `'center'` for the closing
CTA only). It is a swap, not an appended class — Tailwind cannot reliably override
`items-start` with an `items-center` arriving from a later `className`.

**Sections are not numbered.** Numbering survives only where order genuinely carries
information: DeepResearch steps, HowItWorks 01–03, Features `F01`–`F06` watermarks.
TrustBadges has no `SectionHeader` at all — it is a band, not an argument.

### Distinct form per section (this is what fixed "they all look the same")
sequence spine (DeepResearch) · live telemetry (LiveProductDemo) · **role ledger**
(UseCases — hairline-separated rows with an accent bar drawing down the left edge; it
and Features used to be byte-identical boxed grids) · **secured perimeter**
(TrustSecurity — two corner brackets that draw themselves) · **capability index**
(Features — now the *only* boxed 1px grid on the page) · **price ladder** (Pricing — a
hairline draws across the recommended plan after the cards settle) · **Q&A ledger** (FAQ
— sticky header column, answers behind a 2px left rule) · centered close (CTA).

---

## 3. Motion

Everything routes through **`lib/gsapUtils.js`** (was previously unused by every
section, with 11 hand-rolled GSAP bootstraps instead). GSAP `3.12.7` + ScrollTrigger.

- `useGsapContext(fn, deps)` — lazy import, plugin registration, `cancelled` race guard,
  scoped `ctx.revert()` teardown. Returns the scope ref.
- `revealHeader(api)` · `revealStack(api, targets, opts)` (`y:24`, stagger `0.07`,
  `start: 'top 82%'`, `once: true`) · `revealGrid` (adds `scale: 0.98`) · `revealFrom` ·
  `countUp` · `typeOnScroll` · `splitWords` / `splitChars`.
- **`TraceRail.jsx`** (new) — the one piece of motion that spans the whole page: a 1px
  fixed rail at `left-4 sm:left-6` whose `#5a4a7a → #a855f7` fill scrubs to total scroll
  progress, with a ◆ marker riding the leading edge. `hidden lg:block`, one
  ScrollTrigger, transform-only, `trackHeight` cached in `onRefresh` so the per-frame
  handler does no layout reads.
- **Exactly one pin on the page** — Testimonials' horizontal track. FAQ's sticky header
  is pure CSS `sticky`, deliberately not a pin.
- framer-motion is kept **only** where a subtree remounts per user selection:
  Integrations inspector, LiveProductDemo tab panes, FAQ accordion height.
  `MotionConfig reducedMotion="user"` wraps the page.

### Five rules, learned the hard way (also in the `lib/gsapUtils.js` docblock)
1. **Never hide content in markup.** No `opacity-0` on reveal targets — set it with
   `gsap.set()` inside the context so `ctx.revert()` restores it and content survives a
   GSAP load failure.
2. **Never `ScrollTrigger.getAll().forEach(t => t.kill())`.** See §1.
3. GSAP 3.12.x has **no `SplitText`** (needs 3.13+) — word/char splitting is hand-rolled
   in `gsapUtils`.
4. **Never nest a reveal target inside another reveal target.** Point `revealStack` at
   the blocks *beside or below* a `<SectionHeader>`, never at the column containing it —
   the parent tween overwrites the child's.
5. **GSAP writing `scale`/`x`/`rotate` clobbers Tailwind transforms** like `rotate-45` or
   `-translate-x-1/2`. Fold the CSS transform into the tween (`rotate: 45` in the tween
   itself) or express the offset another way (`-ml-4`).
6. **`IntersectionObserver` → `threshold: 0`, never a fraction.** A `0.3` threshold never
   fires when the observed element is taller than the viewport — that is what left
   WhyChatBoxAI's panel at `opacity: 0` on short screens.

---

## 4. Structural changes

- **Deleted `AiMotionCanvas.jsx`** — 240 frames from a `public/Motion_AI_frames/`
  directory that never existed. Replaced by `TraceRail`.
- **Wired in `LiveProductDemoSection`** (325 lines, previously written but *never
  imported*, rendering nowhere). It now sits directly after `TrustBadgesSection`, so the
  four deep-dive sections below read as elaborations of a workspace already seen rather
  than five separate pitches.
- **Anchor targets** in `LandingPageClient.jsx` are `<div id=... className="scroll-mt-28">`
  wrappers, not `<section>`s — each component renders its own `<section>` and the old
  wrappers produced nested sectioning elements. `id="pricing"` was **duplicated** (wrapper
  + `PricingSection`'s own section); the wrapper is gone and `scroll-mt-28` moved onto the
  component. `scroll-mt-28` exists so navbar jumps don't land headings under the sticky
  navbar.
- **`AiAtmosphereCanvas`** — it is `fixed inset-0 z-0`, so an IntersectionObserver on the
  canvas itself is useless (always "visible"). Bands that can actually show it opt in with
  **`data-atmosphere-band`**; the rAF loop runs only while one is on screen and is
  genuinely cancelled otherwise (a `running` flag gates the self-scheduling — without it,
  "parking" still cost one callback per frame forever). Currently the only such band is
  `CTASection` (`bg-transparent`). Its orbs were recoloured orange → purple ramp.
- **`WebsiteBuilderSection`'s typing loop** used to `setState` every 150ms for the page's
  whole lifetime; now gated behind an IntersectionObserver on the editor.

Final order: Hero · TrustBadges · LiveProductDemo · MotionAiCapability ·
`#deep-research` · `#website-builder` · FileIntelligence · `#integrations` · `#models` ·
`#use-cases` · WhyChatBoxAI · `#security` · `#features` · HowItWorks · Stats ·
Testimonials · Pricing · FAQ · CTA.

---

## 5. Bugs fixed (keep this list — several are easy to reintroduce)

**Tailwind v4 traps**
- `text-3.75` / `text-3.25` produce **no style at all** (no such theme token exists —
  confirmed: `--text-*` is not defined in `globals.css`). → `text-[15px]` / `text-[13px]`.
  Fixed in `HeroSection` and `FAQSection`. **Still present outside the landing page**:
  `app/(auth)/sign-in`, `sign-up`, `forgot-password`, `app/(routes)/pricing/page.jsx`,
  `app/(routes)/image-gen/[libId]/page.jsx`, `app/_components/ChatBoxAiInput.jsx`,
  `AppSelectorPopover.jsx` — out of scope for this pass.
- `border-white/1` is **1% opacity**, i.e. invisible; almost always meant `border-white/10`.
  Fixed in `HeroSection`; still present in the three auth pages.
- **`bg-gradient-to-*` was renamed to `bg-linear-to-*` in v4** and silently renders no
  gradient. Fixed in `PricingSection` and `AiModelsSection` (3 occurrences).

**Layout / visual**
- Doubled top divider (`border-t` + the gradient hairline) in FileIntelligence and
  WebsiteBuilder → removed the `border-t`.
- TrustBadges marquee hard-cut at the viewport edges → added left/right gradient fade
  masks, plus a `prefers-reduced-motion` branch that stops the marquee.
- Conflicting `md:mt-16` / `md:-mt-16` on the same DeepResearch element; `isEven` was
  inverted relative to its name.
- `truncate` on the Stats count-up clipped `10,000+` in the 2-col mobile grid.
- Duplicate `@keyframes shimmer` in `globals.css` (two definitions) → one.
- Forbidden background glow circles removed from FileIntelligence,
  MotionAiCapability, WebsiteBuilder (mandate 1 of the Aug 13 memory).
- Several `justify-between` rows in LiveProductDemo crowded on mobile → `flex-col
  sm:flex-row`.

**Accessibility**
- Integrations cards were `<div onClick>` → real `<button type="button">`.
- Added `aria-pressed` (Integrations cards, Pricing toggle, LiveProductDemo mode
  buttons) and `aria-expanded` (FAQ accordion). Decorative layers are `aria-hidden` +
  `pointer-events-none`.

**Correctness / performance**
- Async-init race: cleanup could run before `ctx` was assigned, orphaning triggers
  (`cancelled` flag in `useGsapContext`).
- `IntegrationsSection` had **no GSAP cleanup whatsoever** — leaked triggers on every
  Fast Refresh.
- Dead code: `triplicatedProviders` in TrustBadges was computed and never used.

**Deliberately left alone** — real UI mimicry, not stray colour: the macOS traffic
lights in the code-editor and workspace chrome, the syntax-highlighting hues inside the
WebsiteBuilder editor (it renders JSX; recolouring it to purple would stop reading as
code), and the red `PDF` file badge.

---

## 6. Verification status

- `npm run build` → exit 0.
- **Not verified in a browser.** The in-app Browser preview tooling is not enabled on
  this install (a url-only attach config is rejected), so 1440 / 768 / 375, reduced
  motion, keyboard focus and the scroll-to-bottom-and-back regression check were reasoned
  about statically rather than observed. Anyone picking this up should run `npm run dev`
  and confirm, in particular: **scroll to the bottom, back to the top, and trigger a Fast
  Refresh mid-page — nothing should go blank.** That is exactly what the
  `getAll().kill()` cleanup broke.

## 7. Files

- **New**: `app/(landing)/_components/SectionHeader.jsx`, `ThinkingTrace.jsx`,
  `TraceRail.jsx`
- **Deleted**: `app/(landing)/_components/AiMotionCanvas.jsx`
- **Modified**: `app/LandingPageClient.jsx`, `app/layout.js`, `app/globals.css`,
  `lib/gsapUtils.js`, and every section component in `app/(landing)/_components/`
