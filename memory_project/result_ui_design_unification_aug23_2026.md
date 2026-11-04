# Result UI Design Unification (August 23, 2026)

## Motivation

The user asked to apply the newly-added design style to `DisplaySummery.jsx` and then
extend it across `DisplayResult.jsx` and everything it renders, because the Search and
Deep Research result "looked like separate interfaces" rather than one product. Target
quality bar: the clean conversational surfaces of Claude and ChatGPT, while staying in
this project's own design language.

## Root cause of the "separate interfaces" feeling

Three competing palettes were being rendered inside a single viewport:

1. `DisplayResult.jsx` shell — semantic shadcn tokens (`muted`, `border`, `foreground`).
2. `DisplaySummery.jsx` — hard-coded `gray-*` / `zinc-*`.
3. `AnswerDisplay` / `sourceList` / `ImageList` / `VideoList` — `gray-*` / `zinc-*` plus
   raw `dark:bg-[oklch(0.3092_0_0)]` and a blue accent that existed nowhere in the shell.

On top of that: 9 different corner radii, 10 accent hues with no assigned meanings, and
the same feature (Deep Research) drawn three different ways — a hand-rolled shield SVG in
the answer, a blue pill in the composer, an **indigo** tile in the plus-menu.

## The mechanism: `answerSurface.js`

**BINDING — do not reintroduce per-file palettes in the result components.**
New file: `app/(routes)/search/[libId]/_components/answerSurface.js`. Every result
component imports its shared vocabulary from here. If a value has to agree across two of
these files, it belongs in this module, not copy-pasted.

Exports: `MEASURE`, `LABEL`, `FOCUS_RING`, `ICON_BUTTON`, `QUIET_BUTTON`, `GHOST_BUTTON`,
`RESEARCH_BADGE`, `CONNECTED_BADGE`, `PROGRESS_BADGE`, `TILE` (plus a private `BADGE`
geometry base). Its docblock is the authoritative record of the ramp and the accent policy
— read it before restyling anything in this folder.

> **Amended Aug 24, 2026:** `LABEL`, `FOCUS_RING`, the `BADGE` base and the three badge
> constants moved up to **`components/surface.js`** and are re-exported from here, because
> this folder is route-private and the home + image-gen composers could not reach it.
> The rule is now: *route-scoped* values (`MEASURE`, `TILE`, `ICON_BUTTON`, `QUIET_BUTTON`,
> `GHOST_BUTTON`) stay here; anything that has to agree across two **surfaces** belongs in
> `components/surface.js`. Every import inside this folder was left working untouched.

### Palette decision

The message region moved onto the `ink` / `line` / `inset` / `hover` ramp in
`app/globals.css`; page chrome stays on shadcn tokens. This is safe because the two ramps
agree at the seams (`--line-strong` ≈ shadcn `--border`, `--ink-2` ≈ `--muted-foreground`,
`--ink` is a slightly softer `--foreground`, and dark shadcn here is already chroma-0
neutral). The new ramp is a finer-grained superset: it adds a third text step and two
hover steps shadcn lacks. Accents still resolve through `--primary` / `--ring` so the
`[data-accent]` switcher keeps working.

### Radius: 9 values → 4

`[5px]` inline · `control` (8px) controls · `xl` (14px) blocks · `2xl` modals and the
prompt bubble · `full` pills only. Retired: `md`, `lg`, `3xl`, `[10px]`, `[18px]`, `[24px]`.

### Accent: 10 hues → 4 with meanings

`emerald` = success/confirmed · `rose` = negative · `amber` = in progress ·
`blue` = **Deep Research and nothing else**. Never colour for decoration.

Consequences: killed the blue hover borders, the blue "Top Image" dot, the blue
Download/Watch CTAs (→ `bg-primary`, so they follow the user's accent), the sky
"medium trust" band, `green-500` → `emerald`, `red-500` → `rose`, and the indigo Deep
Research tile → blue. The plus-menu's "Attach Files" tile was **de**-accented to neutral
`bg-inset`, because it is a file picker and blue is spoken for; that leaves Deep Research
as the one accented item in that menu, which is correct since it is the mode toggle.

### Composer chrome, second pass

> **SUPERSEDED (Aug 24, 2026) — see `composer_redesign_aug24_2026.md`.**
> This section describes a *partial* pass over the search composer only. The three
> composers (home, search, image-gen) have since been unified behind the new
> **`components/surface.js`**, which is now the owner of `FOCUS_RING`, `LABEL` and the
> badge constants; `answerSurface.js` re-exports them from there. The fixes below all
> still hold — they just no longer live in this folder alone, and the composer shell,
> toolbar controls, plus-menu tiles and attachment tray now have shared constants that
> did not exist when this was written. Restyle any input surface from that module, not
> from here.

The composer is page chrome and stays on shadcn tokens, but it was still carrying three
raw one-off hues that the message region no longer has. All three are fixed:

- **Model-selector tier marker** — was `Lock` gray-400/500 · Pro `Zap` **indigo**-500/400 ·
  free `Zap` **emerald**-500. Indigo is retired and "free tier" is not a success state, so
  only Pro is coloured now, with `text-primary` (follows `[data-accent]`); locked and free
  are both `text-muted-foreground` and are told apart by glyph, not hue. The item label
  went `gray-900 dark:gray-100` → `text-foreground`.
- **`getFileIcon`** — was a six-colour rainbow (blue image · red PDF · blue-600 docx ·
  green csv · purple video · pink audio · gray other) rendered inside the attachment chips
  in a region that is otherwise neutral, and two of those blues collided with
  blue = Deep Research. Now one neutral `text-ink-3` and the type reads from the glyph:
  `FileImage` / `FileVideo` / `FileAudio` / `FileSpreadsheet` / `FileText` / `File`
  (three new lucide imports). Safe as a shape-only cue because the filename is always
  rendered next to the icon. `.xlsx` also maps to the spreadsheet glyph now, which it
  did not before.
- **Mic recording state** — `red-500` → `rose-500`, close enough that the universal
  record-is-red convention survives while dropping a fifth hue. Also lost its
  `shadow-red-500/10` glow: tint + text colour + `animate-pulse` were already three
  signals for one state. Gained `type="button"`, `aria-pressed`, `aria-label` and
  `FOCUS_RING` (it had `title` only and no visible focus state).
- Composer container's `dark:border-gray-700/60` dropped — shadcn `--border` is already
  dark-aware, so the override was a raw-shade duplicate of `border-border/60`.

The one raw hue left in the folder is deliberate: `bg-red-600/90` on the YouTube pill in
`VideoList`, which is a brand mark rather than a UI accent.

## The two-hover-step trap (found empirically, worth remembering)

In light mode `--inset: #f7f8f9` and `--hover: #f4f5f6` — three values apart, and `--hover`
is *lighter* than `--canvas: #f1f2f3`. So **`bg-inset hover:bg-hover` is a hover you cannot
see.** `--hover` only reads against `--surface: #ffffff`.

`--hover-2` is darker than page/canvas/surface/inset in light and lighter than all four in
dark, making it the only universally visible hover step. That is why `ICON_BUTTON`,
`QUIET_BUTTON` and `GHOST_BUTTON` all resolve to `hover:bg-hover-2`. I shipped the wrong
pairing into five places on the first pass and had to correct it.

## Typography

Body went 15px → **16px** with `leading-[1.7]`, and text blocks are capped at
`MEASURE = max-w-[39rem]` (≈68 characters), landing inside the 65–75ch window. Tables,
code and media deliberately ignore the cap and run the full column.

`MEASURE` is a **rem** cap, not `ch`, on purpose: `--chat-font-family` is user-configurable
(it can be a script face) and `ch` would swing wildly between fonts. For the same reason
`.chat-font-content` sets only `font-family` and never a font-size, so `text-base` is safe
there.

Heading ramp compressed and given optical tracking: h1 `text-xl`/`-0.011em`,
h2 `text-[1.0625rem]`/`-0.006em`, h3 `text-base`, h4–h5 `text-[0.9375rem]`, h6 = `LABEL`.
All headings get `text-balance`.

## Message layout (`DisplayResult.jsx`)

The user prompt is now the **only** bubble in the conversation (`rounded-2xl bg-inset
shadow-hairline`, border and drop-shadow dropped — the bubble/no-bubble contrast is what
marks who is speaking, so the extra chrome was redundant).

The answer lost its `sm:max-w-[85%]` cap and its horizontal padding: it is now full-width
and flush-left, which is what lets its tables and code blocks use the whole `max-w-3xl`
column instead of being squeezed into 85% of it, while `MEASURE` still governs the prose.
Intra-turn gap `space-y-3 sm:space-y-5` is deliberately smaller than the inter-turn
`space-y-4 sm:space-y-10`, so a prompt groups with the answer below it.

## Removals (deliberate, not oversights)

- **"Top Image" hero card** in `ImageList` — a bordered 16:9 well with a blue dot and
  uppercase label above a 4:3 grid of the same objects. The hierarchy it implied was not
  real: `images[0]` is just the first source that happened to carry an image. One uniform
  grid now, under the "Images" header `DisplayResult` already renders.
- **Fake traffic-light dots** on code blocks in `DisplaySummery`.
- **~100 lines of dead code** in `AnswerDisplay`: `SafeImage`, `CardComponent`,
  `showAll`, `getCardsPerRow`/`cardsPerRow`/`firstRowCards`/`remainingCards`,
  `googleApiUsed`, `qualityStats`, `averageSourceQuality`, `followUpSuggestions`,
  local `processedFiles`.
- **Unused `formatDuration`** in `VideoList`.
- `group-hover:scale-[1.02]` on source cards — it blurred the type mid-transition and
  nudged neighbours. The hairline edge carries the affordance instead.

## Bugs fixed along the way

- **Hydration mismatch**, `sourceList.jsx`: `getCardsPerRow()` read `window.innerWidth`
  during render and never updated on resize. Replaced with a fixed `VISIBLE_CARDS = 4`
  and CSS-owned reflow.
- **Dead animation**, `sourceList.jsx`: the collapsible transitioned `max-h-0` →
  `max-h-none`; `none` is not an interpolatable length, so it snapped open. Now
  `gridTemplateRows: '1fr' | '0fr'`.
- **Unguarded `new URL()`**, `VideoList.jsx` — a malformed result URL threw during render
  and took the whole message down. Wrapped in `hostLabel()`.
- **Silent truncation**: `sourceList` dropped everything past the 8th source with no
  indication. Now a real `+n more` disclosure with `aria-expanded`; `ImageList` got the
  same at `GRID_LIMIT = 8`.
- **Contrast**: the connected-app badge was `text-green-500` on `bg-green-500/10`, which
  does not clear 4.5:1 in light mode. The 600/400 pair does.

## Accessibility added

`FOCUS_RING` on every interactive element · `<div onClick>` → `<button>` in `ImageList`
and `VideoList` (they were keyboard-unreachable and invisible to AT) · Escape handler +
body scroll lock + `role="dialog" aria-modal aria-labelledby` on both lightboxes ·
`role="status" aria-live="polite"` on every loading state · `aria-expanded` on all
disclosures · `aria-pressed` on the TTS and like/dislike toggles · `gap-2` (8px) between
the 32px action-bar targets · reduced-motion opt-out for the typewriter, honouring both
`prefers-reduced-motion` and the repo's `html.reduced-motion` class.

## Mandates honoured

- `thinking_ui_redesign.md` — `ThinkingBlock` / `ThinkingProcess` kept chrome-free: no
  background, no border, no circle behind the Brain icon, 2px left rail, `ChevronDown`
  animating 0/−90. **Only colour tokens changed.** The two were also made structurally
  identical so the reasoning trace does not change shape when the stream starts.
- `decoupled_thinking_animation_logic.md` — the pre-parse-then-two-state
  `displayedThinking` / `displayedFinal` rAF architecture was not touched.

## Verification

`npx tsc --noEmit` clean — **but that proves almost nothing here.** `tsconfig.json` sets
`allowJs` without `checkJs`, so TypeScript suppresses every semantic diagnostic in `.jsx`,
and there is no ESLint in the project. A leftover local `const FOCUS_RING` in
`DisplaySummery.jsx`, shadowing the import of the same name from `answerSurface.js`, passed
tsc twice and then hard-failed the Turbopack build with *"the name `FOCUS_RING` is defined
multiple times"*. It was a duplicate of the extraction, not a behavioural difference — the
two strings were identical — so deleting the local one was the whole fix. The whole folder
was then re-checked for that class of error with a TypeScript-API script run at
`checkJs: true` and filtered to codes 2451 / 2300 / 2440 / 2403: no other shadowed or
duplicated declarations. See `tsc-noemit-does-not-validate-jsx` in user memory for the
recipe; **do not treat `tsc --noEmit` as verification for these files.**

Every new utility confirmed to emit real CSS by compiling `app/globals.css` through the
PostCSS API and grepping the output (see `tailwind-v4-silent-no-op-utilities` in user
memory for the method and the escaping gotcha). The three new lucide imports were confirmed
to exist in `lucide-react@0.548` by requiring the package in Node. A final grep of the
folder for `indigo|sky|violet|purple|pink|green|red|zinc` numeric shades returns exactly one
hit — the YouTube brand pill. **No browser verification was performed** — the dev server was
declined earlier in the session, so the visual result is unconfirmed at runtime.

## Files

- `app/(routes)/search/[libId]/_components/answerSurface.js` — **new**
- `DisplaySummery.jsx`, `AnswerDisplay.jsx`, `sourceList.jsx`, `ImageList.jsx`,
  `VideoList.jsx`, `DisplayResult.jsx` — all converted
