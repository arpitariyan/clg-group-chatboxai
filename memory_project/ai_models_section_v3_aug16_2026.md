# AiModelsSection V3 — Ground-Up Redesign
**Date:** August 16, 2026

## Root Cause of Previous Failures
The V2 design was fundamentally broken because it used **invalid Tailwind CSS classes** like `rotateX-[60deg]`, `rotateZ-[45deg]`, `rotateY-[-15deg]`, and `translate-z-[-60px]`. These are NOT valid Tailwind utilities (Tailwind uses inline `style` props or custom plugins for full 3D transforms). As a result:
- The "3D isometric grid" rendered as a completely flat, invisible div
- The "floating 3D documents" stacked on top of each other
- The radar for "Fast" looked empty and minimal
- The section looked broken and unappealing

## V3 Design Strategy
**Abandon broken CSS 3D tricks. Build convincing, realistic UI mockups using normal 2D layout that *look* premium.**

---

## V3 Visual Designs per Tab

### Fast (Quantum Core Dashboard)
- **Concept:** A real-time telemetry dashboard
- **Visuals:**
  - Top live-status bar: "STREAM ACTIVE" with `980 tok/s` metric
  - Central SVG-based rings (actual SVG elements, not CSS border tricks) — outer dashed ring rotates CCW, inner arc sweeps CW with a bright orange gradient arc via `linearGradient`
  - Pulsating solid orange core using `box-shadow` CSS animation
  - Bottom 3-column metric cards: `LATENCY`, `BUFFER`, `UPTIME` — each blinking gently
- **Key fix:** Replaced the broken CSS ring-on-div approach with actual `<svg>` circles with `stroke-dasharray` and `stroke-dashoffset` for proper ring effects

### Reasoning (Logic Chain Card)
- **Concept:** A live AI reasoning chain inspector
- **Visuals:**
  - A card with a proper header ("Reasoning Chain" + ACTIVE badge)
  - 4 sequential steps: "Parse", "Decompose", "Evaluate", "Synthesise"
  - Steps 1–2 are done (strikethrough + `CheckCircle2` icon in orange)
  - Step 3 is `active` — highlighted white text, animated orange progress bar
  - Step 4 is pending — muted gray
  - Bottom: animated confidence meter bar using `framer-motion` that fills from 0→99%
- **Key insight:** This immediately communicates *how* reasoning models work, which helps users understand the product

### Research (Live Source Finder)
- **Concept:** A real-time web research panel with citation tracking
- **Visuals:**
  - Top search bar: "Searching 24+ live sources…" with animated bouncing dots
  - Source list: 3 verified sources with real site names (nature.com, techcrunch.com, arxiv.org), emoji icons, and `CheckCircle2` verification badges
  - A cyan scanning line sweeps vertically over the source list
  - Bottom badge: "3 citations generated" floats with a gentle Y-axis animation

### Coding (Split IDE Panel)
- **Concept:** A realistic code editor window
- **Visuals:**
  - macOS three-dot title bar
  - Proper syntax-highlighted code (TypeScript) rendered as `<span>` elements with token colors matching VS Code's One Dark theme
  - Line numbers with right-border separator
  - Blinking orange cursor on the active line
  - Status bar at the bottom styled like VS Code's blue status bar: shows "TypeScript", pulsing "Generating…" indicator
- **Key fix:** Token-based rendering instead of raw HTML strings prevents JSX escaping issues

### Creative (Generation Studio)
- **Concept:** An AI art generation tool interface
- **Visuals:**
  - Top header bar with "Generation Studio" label + pulsing "Rendering 4K" badge
  - Large `aspect-video` canvas showing an animated sweeping gradient (orange→amber→blue→green) with a `clip-path` sweep-reveal animation to simulate generation happening in real-time
  - Generation prompt floating at the bottom of the canvas
  - Progress bar at the top of the canvas (68% complete)
  - Color palette row: 5 circular swatches + a style dropdown ("Cinematic")

---

## Section-Level Improvements

### Stats Strip
- Added a bottom 3-column stats strip below the main panel: `40+ Frontier Models`, `<1s Avg Response`, `99.9% Uptime SLA`
- Uses the same `gap-px` 1px grid system from the design system

### Model Pills
- Added a subtle orange dot indicator inside each model pill
- Hover state: `bg-white/[0.08]` + `border-white/15` transition

### "Explore All Models" CTA
- Added a text link at the bottom of the info panel with an `ArrowRight` icon that translates right on hover

### Subtle Grid Background
- Right panel gets a `radial-gradient` dot grid at 3% opacity as a subtle texture (NOT a glow blob — compliant with memory rules)

---

## Turbopack Compatibility Rules (Carried Forward)
- All `@keyframes` injected via `dangerouslySetInnerHTML={{ __html: ... }}`
- No escaped backticks or dollar signs inside template strings
- No `rotateX-[...]`, `rotateZ-[...]`, `translate-z-[...]` Tailwind classes (they are invalid)

## Compliance Checklist
- [x] No purple colors
- [x] No background glow circles or blobs
- [x] `#0c0a09` base background
- [x] Orange-500 accent only
- [x] 1px gap-px grid system
- [x] Valid CSS/SVG only — no invalid Tailwind 3D classes
