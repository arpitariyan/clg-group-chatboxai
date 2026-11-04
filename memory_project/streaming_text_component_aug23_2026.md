# StreamingText Component Integration (Aug 23, 2026)

Integration of a third-party `streaming-text` component into `components/ui/`. Scope:
component + demo + design tokens only. **No page was wired up** — nothing in
`app/(landing)/` or `app/(routes)/` was touched, so the reasoning-trace redesign
(`landing_reasoning_trace_redesign_aug23_2026.md`) remains untouched and authoritative.

---

## 1. Files

- **New**: `components/ui/streaming-text.tsx` — the component.
- **New**: `components/streaming-text-demo.tsx` — usage example (top level, matching the
  flat-file convention of `components/`; `ui/` is kept for primitives only).
- **Modified**: `app/globals.css` — token registration, ramp values, 3 keyframes,
  2 helper classes.

### This is the repo's first `.tsx` file

Every other source file is `.js`/`.jsx`; `components.json` declares `"tsx": false`, so
`npx shadcn add` will still emit `.jsx`. The `.tsx` extension was a deliberate call
(confirmed with the user) — TypeScript is fully configured (`tsconfig.json` includes
`**/*.tsx`, `strict: false`) and `next.config.mjs` does **not** set
`typescript.ignoreBuildErrors`, so `next build` type-checks it for real.
`npx tsc --noEmit` reports zero errors for both new files.

If more `.tsx` lands here, flip `"tsx": true` in `components.json` so the CLI stops
disagreeing with the codebase.

---

## 2. The token problem — the reason this needed care

The component's upstream CSS shipped its palette as plain custom properties:

```css
:root { --inset: #f7f8f9; --ink-2: #62656b; --radius-control: 8px; }
```

but the markup consumes them as **Tailwind utilities**: `bg-inset`, `text-ink-2`,
`rounded-control`, `shadow-hairline`, `border-line`, `bg-hover-2`, `bg-surface`.

**In Tailwind v4 a bare `:root` variable generates no utility.** Pasting that CSS as
given would have produced an unstyled component with zero build errors and zero console
warnings — the same silent-failure class as `text-3.75` and `bg-gradient-to-*` recorded in
§5 of the reasoning-trace memo.

### What was actually done

Colours went into the **existing `@theme inline` block** using the established
`--color-x: var(--x)` indirection (same pattern as `--color-background: var(--background)`),
which is what makes them dark-mode-switchable:

```css
@theme inline {
  --color-inset: var(--inset);
  --color-ink-2: var(--ink-2);
  /* …page, canvas, surface, hover, hover-2, ink, ink-3, line, line-strong */
}
```

Radius / shadow / easing went into a **separate non-`inline` `@theme` block**, for two
distinct reasons:

```css
@theme {
  --radius-control: 8px;
  --shadow-hairline: 0 0 0 1px var(--line);
  --ease-link: cubic-bezier(0.16, 1, 0.3, 1);
}
```

1. `@theme inline { --radius-control: var(--radius-control) }` alongside a `:root` var of
   the same name is a **self-referential cycle** — invalid at computed-value time. The
   `--color-*` prefix is what saves the colours from this; `--radius-*` has no such
   prefix, so the literal must live in `@theme` directly.
2. `--shadow-hairline` must stay **non-inline** so Tailwind emits
   `box-shadow: var(--shadow-hairline)` and the nested `var(--line)` resolves against the
   *element*, picking up `.dark`'s `--line`. Inlining it would hard-code the light hairline.

Verified by compiling `app/globals.css` through the real PostCSS pipeline:
`.bg-inset → background-color: var(--inset)`,
`.rounded-control → border-radius: var(--radius-control)` (`8px`, no cycle),
`.shadow-hairline → --tw-shadow: 0 0 0 1px var(--tw-shadow-color, var(--line))`.

### Light + dark ramp

Both sets are defined, so the component is legible in either mode. The dark ramp is
**neutral, not purple** — the `#5a4a7a → #a855f7` ramp is landing-page-only, and this is a
generic `ui/` primitive.

| token | light | dark |
|---|---|---|
| `--page` | `#fafafb` | `#0f0f11` |
| `--canvas` | `#f1f2f3` | `#17171a` |
| `--surface` | `#ffffff` | `#1c1c20` |
| `--inset` | `#f7f8f9` | `#202024` |
| `--hover` | `#f4f5f6` | `#26262b` |
| `--hover-2` | `#e7e9eb` | `#2f2f35` |
| `--ink` | `#1f2124` | `#f2f2f4` |
| `--ink-2` | `#62656b` | `#a4a6ad` |
| `--ink-3` | `#9a9da3` | `#71737a` |
| `--line` | `#ecedef` | `#2a2a30` |
| `--line-strong` | `#e0e2e5` | `#3a3a42` |

These are **global** now. `--ink`, `--surface`, `--line`, `--hover` are generic names —
grep before introducing anything similar.

---

## 3. Utilities that look broken but are fine

Do **not** "fix" these — they were verified to emit real values:

- `h-4.5` → `height: calc(var(--spacing) * 4.5)` = 18px
- `max-w-95` → `max-width: calc(var(--spacing) * 95)` = 23.75rem (`max-w-170` already
  existed elsewhere in the codebase)
- `duration-400`, `size-3.5` → fine

The distinction that matters: **spacing-derived utilities** (`h-`, `w-`, `size-`,
`max-w-`, `p-`, `gap-`) accept arbitrary bare numbers *including decimals* in v4, because
they compute off `--spacing`. **`text-*` does not** — it needs a named `--text-*` theme
token, which is why `text-3.75` is dead. Same-looking syntax, opposite outcome.

---

## 4. Deviations from the upstream snippet

1. **Icons → `lucide-react`.** The four hand-rolled action `<svg>` paths were literally
   lucide's `copy`, `rotate-cw`, `thumbs-up`, `thumbs-down`, and the follow-up arrow was
   `corner-down-left`. Swapped for the real components — `components.json` declares
   `"iconLibrary": "lucide"`, the package is already a dependency, and it dropped ~30
   lines of inline path data.
2. **Real `aria-label`s.** All four action buttons shipped with `aria-label="Action"`,
   which tells a screen reader nothing and repeats four times. Now "Copy response",
   "Regenerate response", "Good response", "Bad response".
3. **`10 sources` → `{SOURCES.length} sources`.** The hardcoded label contradicted the
   panel it opens, which lists 3. Derived so it cannot drift.
4. **`type={"button"}` added** to the follow-up buttons — they were bare `<button>`, which
   defaults to `type="submit"` and would submit any enclosing form.
5. **Source avatars kept as inline SVG data URIs.** The integration brief called for
   Unsplash stock photos, but nothing here is a missing asset: these are deliberate
   fake-favicon brand marks rendered at **12–16px**. A photograph at that size is visual
   noise, and it would add three network requests to a decorative element. Data URIs also
   pass the CSP in `lib/security-headers.js` (`img-src 'self' data: blob:`).
6. `sourceImage()` — a one-line passthrough returning `source.image` — was **left in
   place** to keep the diff against upstream small.

---

## 5. Two classes the snippet referenced but never defined

`source-avatar` and `animated-underline` appear in the markup with **no definition
anywhere** in the supplied CSS or in this repo. Both were authored in `globals.css`:

- `.source-avatar` — `object-fit: cover; flex: none`. Sets **no `background-color`** on
  purpose: it is an unlayered class, so it would outrank the `bg-surface` utility the
  markup already applies (unlayered styles beat `@layer utilities`).
- `.animated-underline` — a `background-size: 0% 1px → 100% 1px` underline on
  `a:hover`, eased with `--ease-link` (which is otherwise unused, and is clearly what the
  upstream token was for). Uses `background-size` rather than a pseudo-element so it works
  on inline text.

Keyframes `fade-in`, `pop-in`, `fade-up` were added. Names checked against
`tw-animate-css` (which defines only `enter`, `exit`, `accordion-*`, `collapsible-*`,
`caret-blink`) and against the pre-existing camelCase `fadeIn` — **no collisions.** Do not
add a second definition of any of them; a duplicate silently wins the cascade, which is
exactly the `@keyframes shimmer` bug already fixed once here.

A `prefers-reduced-motion` block scoped to `.streaming-text` snaps animation durations to
`1ms` rather than `animation: none`. Deliberate: these keyframes are `both`-filled, so
snapping lands on the final frame (opacity 1). It also has to be `!important` to beat the
component's inline `style={{ animation: … }}`.

---

## 6. Behaviour notes

- Self-driving demo: a `setTimeout` chain reveals one word per **80ms**, holds **3400ms**
  at the end, then resets to 0 and loops forever. It takes **no props** — copy, sources
  and follow-ups are module-level constants. To make it real, lift `TOKENS`, `SOURCES` and
  `FOLLOW_UPS` to props and drive `count` from the stream instead of the timer.
- The action buttons and follow-ups are **inert** — no `onClick`. Only the "N sources"
  disclosure actually does anything.
- `"use client"` is required (`useState`/`useEffect`).
- Root is `w-full max-w-95` (380px) with `min-h-[13rem]` reserved so the container does
  not reflow as words stream in. It is a fixed-width card, **not** a fluid layout — drop
  `max-w-95` if a full-width column is wanted.

---

## 7. Verification status

- `npx tsc --noEmit` → **zero errors** in both new files.
- `app/globals.css` compiled through the project's actual `@tailwindcss/postcss`
  pipeline → all 19 checked selectors/keyframes emit, with correct resolved values.
- **Not verified in a browser.** The dev server was declined this session, so the streaming
  cadence, the sources-disclosure grid transition, dark mode and reduced motion were
  reasoned about statically. Same gap as §6 of the reasoning-trace memo. Anyone picking
  this up: render `components/streaming-text-demo.tsx`, and check it **inside a `.dark`
  wrapper** as well — that is the path the light-only upstream tokens would have broken.
