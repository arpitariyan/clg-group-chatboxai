# Composer Redesign — home, search, image-gen (August 24, 2026)

## Motivation

The user supplied a reference `PromptInput` component and asked for the input sections of
`ChatBoxAiInput.jsx` and `DisplayResult.jsx` to be redesigned — deciding per page what
should stay expanded vs collapse — then for `image-gen/[libId]/page.jsx` to be brought
into the same language. Functionality was to be preserved throughout.

Three composers existed and read as three different products:

| file | role | shell |
|---|---|---|
| `app/_components/ChatBoxAiInput.jsx` | home / new chat | static, owns the page |
| `app/(routes)/search/[libId]/_components/DisplayResult.jsx` | search + Deep Research | `fixed`, floats over the answer |
| `app/(routes)/image-gen/[libId]/page.jsx` | image generation | `fixed`, floats over the gallery |

## ⚠ The bug this pass shipped, and the rule that prevents it

**`COMPOSER_CARD` returns a string that begins with `relative`. Never append a position
utility to it at the call site.**

The first version of the search composer did `className={COMPOSER_CARD({fixed: true}) + ' fixed'}`
(`DisplayResult.jsx:3257`). It rendered `position: relative`. The composer dropped out of its
overlay and into normal document flow — landing on top of the last answer's copy/TTS/vote row,
shoved off-centre to the right by the `left: calc(50% + …)` that was still applied, with a large
dead region below it. The user reported it as "completely broken", with a screenshot.

**Why:** class-attribute order is irrelevant to the CSS cascade. Tailwind emits
`.absolute` → `.fixed` → `.relative` → `.sticky`, in that order, in the compiled stylesheet
(verified byte offsets 16533 / 16575 / 16611 / 16691). Equal specificity, so the *later* rule wins
and `.relative` beats `.fixed` no matter how the classes are written. `fixed` in
`COMPOSER_CARD({fixed})` is a **shadow** variant (`shadow-lg` vs `shadow-sm hover:shadow-md`), not
a position — the name misled at the call site.

`relative` cannot simply be removed: the plus-menu panel (`MENU_PANEL`, `absolute bottom-full`) and
the drag overlays need the card as their containing block.

**The fix, now the pattern in both fixed composers:** position the card from a dedicated wrapper
element, so the two `position` values live on two different elements.

```jsx
<div className="fixed bottom-3 z-40 -translate-x-1/2 md:bottom-5"
     style={{ left: inputCenterLeft, width: inputShellWidth, maxWidth: '48rem' }}>
    <div aria-hidden className="pointer-events-none absolute -inset-x-4 -top-7 -bottom-3
         bg-linear-to-t from-background via-background to-transparent md:-bottom-5" />
    <div {...getRootProps()} data-composer className={COMPOSER_CARD({ dragActive, fixed: true })}>
```

The prohibition is now written into the `COMPOSER_CARD` docblock (`components/surface.js:104-112`).
Every `COMPOSER_CARD(` call site was checked: image-gen and home append no position utility.

### Fixed as part of the same repair

- **The composer was the wrong width at every width below ~1100px.** `w-[calc(100%-32px)]`
  resolves against the **viewport**, while `inputCenterLeft` centres on the narrower **content
  column**; the difference is the sidebar. At 900px with the sidebar open that produced an 868px
  bar centred at 578px — running under the sidebar on the left and off-screen on the right.
  `max-w-3xl` was masking it on wide monitors only. New `inputShellWidth` memo subtracts
  `var(--sidebar-width)` / `var(--sidebar-width-icon)` (they resolve on `fixed` descendants because
  SidebarProvider sets them, `components/ui/sidebar.jsx:115-116`) and falls back to
  `calc(100% - 2rem)` on mobile. **`image-gen/[libId]/page.jsx` still has this mismatch**
  (`w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)]`) — it is *not* affected by the cascade bug, since
  its card already sits in a `fixed` wrapper, but the width is still viewport-relative.
- **Gradient scrim added.** A `fixed` opaque card still leaves 16px side margins and a strip below
  it, so answer text scrolled visibly past the rounded corners. The scrim fades out ~28px above
  the card — the treatment Claude and ChatGPT both use to seat a floating composer over scrolling
  content. It needs the wrapper as its positioning parent, which is a second reason the wrapper is
  the right fix.
- **Geometry retuned to one optical left margin.** The prompt row is inset 10px (`px-2.5`) and the
  textarea adds 10px, so text starts 20px from the card edge — exactly where the first toolbar
  pill's glyph lands (8px row inset `px-2` + 12px of `TOOLBAR_PILL` padding). Previously 16px vs
  24px, a visible stagger. Height: `pt-3.5` (14) + 26px line + `pb-1.5` (6) = 46px textarea, plus
  row `pb-2.5` (10) = **56px collapsed card**; the 36px send button's centre lands within 1px of
  the text's centre. Badge and tray rows use `px-5` to sit on the same 20px margin.
- **Scroll-to-bottom button stepped *backwards* at `sm`** — `bottom-32 sm:bottom-24 md:bottom-36`
  decreased at the middle breakpoint, letting the button land on the composer. Now
  `bottom-24 md:bottom-28`, sharing the composer's centring and width so the two stay on one
  vertical axis. Its `slide-in-from-bottom-2 fade-in-0` were inert (those only set `--tw-enter-*`
  custom properties; they need `animate-in`) and are gone.
- **Content bottom padding was ~90px too deep** while the composer was collapsed:
  `pb-40 md:pb-48` → `pb-36 md:pb-44`, which clears the 56px card plus its scrim.
- **`getModelLogo` brand wells** still carried `border-gray-200/60` and a raw
  `gray-100/800 + gray-200/700 + gray-500` fallback stack, which read as a foreign chip inside the
  retokenised model pill → `border-border/60`, `bg-muted`, `text-muted-foreground`.
- **The model trigger had no `group`**, so the `group-hover:opacity-100` /
  `group-hover:text-foreground` already written on its logo were dead. Added.

## The mechanism: `components/surface.js`

**BINDING — the composers must not grow private palettes again.**

`answerSurface.js` is route-private under `app/(routes)/search/[libId]/_components/`, so
home and image-gen cannot import from it, and copying `RESEARCH_BADGE` into a second file
would recreate exactly the per-file-palette problem the Aug 23 note forbids.

So **`components/surface.js` is now the single owner of the cross-surface vocabulary**, and
`answerSurface.js` re-exports the shared subset from it (`answerSurface.js:60-77`). Every
existing import inside the search folder keeps working unchanged.

- Owned by `components/surface.js`: `LABEL`, `FOCUS_RING`, the private `BADGE` geometry,
  `RESEARCH_BADGE`, `CONNECTED_BADGE`, `PROGRESS_BADGE`, `NEUTRAL_BADGE`, `LOCKED_BADGE`,
  `MORPH`, `RESIZE`, `COMPOSER_CARD`, `COMPOSER_TEXTAREA`, `SECONDARY_ROW`,
  `SECONDARY_ROW_INNER`, `TOOLBAR_BUTTON`, `TOOLBAR_PILL`, `TOOLBAR_TOGGLE`,
  `TOOLBAR_RECORDING`, `TOOLBAR_DIVIDER`, `SEND_BUTTON`, `MENU_PANEL`, `MENU_TILE`,
  `MENU_TILE_ICON`, `MENU_TILE_TITLE`, `MENU_TILE_SUB`, `MENU_TILE_COUNT`,
  `TRAY_ITEM`, `TRAY_ITEM_STYLE`.
- Stays route-private in `answerSurface.js`: `MEASURE`, `TILE`, `ICON_BUTTON`,
  `QUIET_BUTTON`, `GHOST_BUTTON`.

Its docblock is the authoritative record of the composer accent policy and the Tailwind v4
traps. Read it before restyling any input surface.

## Layout decision (the rule to keep)

**A composer that floats over content collapses when idle; the composer that *is* the page
does not.**

- **Home — always expanded, no morph.** It is the primary surface, there is nothing for it
  to get out of the way of, and collapsing it would hide the mode affordances that are the
  point of the screen. It therefore renders its toolbar row *unconditionally* and
  deliberately does **not** import `SECONDARY_ROW`. Wrapping it in `SECONDARY_ROW(true)`
  would add a grid layer that can never animate — if a future pass "notices the missing
  wrapper", that is the answer. The intent is recorded in the comment at
  `ChatBoxAiInput.jsx:1431`.
- **Search + image-gen — compact until active.** One row when idle — 56px in search after the
  geometry retune above — with the secondary toolbar row disclosing on activity.

`+` and send **stay in the textarea row in both states** — a deliberate deviation from the
reference mock-up, which moved them to the bottom row when expanded. Moving them means
either two send buttons in the DOM (an a11y problem) or a remount that drops focus
mid-interaction. An anchored primary CTA is also what makes WCAG 2.2 `focus-not-obscured`
satisfiable on a `fixed` composer.

### Expansion is forced, not optional

Expanded whenever: the card has focus · there is text · an attachment or an in-flight
upload exists · a request is in flight · **or any Radix menu owned by the card is open**.

**The trap worth remembering:** Radix portals `DropdownMenu` / `Popover` content *outside*
the card, so `onBlurCapture` fires the instant the model menu opens and a naive
implementation collapses the row out from under the menu the user just opened. Both fixed
composers track an `openMenuCount` fed by every `onOpenChange` (`trackMenu`) and suppress
collapse while it is non-zero. `AppSelectorPopover` gained an `onOpenChange` prop purely
for this.

Collapse also requires that focus left the card *entirely* —
`if (e.currentTarget.contains(e.relatedTarget)) return` — so tabbing from the textarea into
the toolbar does not slam it shut.

### Collapsed-row accessibility

The collapsed secondary row stays **mounted and tabbable**: no `aria-hidden` (it would wrap
focusable content) and no unmount. Tabbing into a control fires focusin on the card, which
expands the row before the control can be acted on.

## Animation

Two timings, on purpose:

- `MORPH` = `duration-[260ms] ease-composer` — structural (collapse/expand, card shadow).
  `--ease-composer: cubic-bezier(0.175, 0.885, 0.32, 1.275)` is registered in
  `app/globals.css:111`.
- `RESIZE` = `duration-150 ease-out` — typing-driven height.

Sharing one token makes the card bounce on every keystroke: the springy overshoot that
reads as "the panel opened" reads as jitter when it fires 60 times a minute.

Disclosure uses **`grid-template-rows: 0fr → 1fr`**, not max-height — `max-h-none` is not
an interpolatable length and snaps, the same bug already fixed once in `sourceList.jsx`.
The inner child needs `min-h-0 overflow-hidden` (`SECONDARY_ROW_INNER`) or the row refuses
to collapse below its content height.

Attachment tray staggers 35ms per item, capped at 8 (`TRAY_ITEM_STYLE`).

**Reduced motion:** `html.reduced-motion *` (the repo's own class) zeroes durations
globally, but the `prefers-reduced-motion` media query was only wired to a few named
animations. A new block at `app/globals.css:376-384` keys off `[data-composer]` and resets
`animation-delay` too, since a stagger with no animation is just dead time. **Every
composer card must carry the `data-composer` attribute** or it opts itself out of that
block — `ChatBoxAiInput.jsx:1439`, `DisplayResult.jsx:3299`, `image-gen/[libId]/page.jsx:912`.
(It goes on the **card**, not on the new positioning wrapper.)

## Behavioural changes (deliberate, user-approved)

1. **Submit key unified on Shift+Enter.** Home and search already sent on
   `Enter && shiftKey`; image-gen sent on bare `Enter`, so the same keystroke did opposite
   things depending on which composer you were looking at and a multi-line image prompt was
   impossible to type. `handlePromptKeyDown` in image-gen is now `Enter && shiftKey`. This
   is the only behavioural change in that file.
2. **The home send button stops changing meaning.** An empty composer used to turn the
   primary CTA into "open /voice-ai" (`AudioLines`). Send is send-only and disabled when
   empty; Voice AI is its own labelled control in the toolbar
   (`ChatBoxAiInput.jsx:1980`). Both entry points survive.

## Defects found and fixed along the way

- **Duplicate attachments in the tray.** `uploadProgress` / `imageUploadProgress` keep a
  finished entry for 2s after the file lands in the uploaded-files array (cleanup is on a
  `setTimeout`), so the new tray rendered every file twice — once `state="done"`, once
  "Uploading… 100%". Fixed in the *view* by filtering progress entries whose id already
  appears in the uploaded array, rather than racing the timer. Both fixed composers.
- **image-gen's upload progress was written and discarded** (`const [, setX]`), so a
  reference-image upload showed nothing until its success toast. It feeds the tray now.
- **Send enabled with attachment-only input** while `handleSendClick` ignores attachments →
  gated on a single derived `canSend`.
- **`ReferenceError` on the research-usage failure path**: `ChatBoxAiInput.jsx` destructured
  `useUserPlan()` without `isMax`, which `fetchResearchUsage` reads at four sites.
  `UserContext.jsx:332` does provide it; added at `ChatBoxAiInput.jsx:207`.
- **image-gen's dropzone wrapped a nested `<button>` with no `type`**, splitting the click
  target from the focusable element. `getImageRootProps({role, tabIndex, aria-label, title,
  className})` makes the root the single control.
- **The image-gen char counter was permanently rendered** reading "0/1500". It now appears
  at 80% of `PROMPT_MAX_LENGTH`, goes amber then rose, uses `tabular-nums`, and only becomes
  a live region (`role="status"`) at the cap.
- **`AttachmentActions` was hover-only** (`opacity-0 group-hover:opacity-100`), so on touch
  there was no visible way to detach a file → `opacity-70` with hover/focus-within raising
  it (`components/ui/attachment.jsx:87`).
- **Four dead Tailwind v4 utilities in `CommandPalette.jsx`**: `backdrop-blur-0.5` (the
  scrim had no blur at all), `text-2.75` and two `text-2.5` (an eyebrow and two uppercase
  pills all inheriting 16px with 0.24em tracking).

Left alone as pre-existing and out of scope: `fileUploadError` / `showFileUpload` in
`DisplayResult.jsx` are set but never read — verified every write is paired with a
`toast.error`, so no user-facing feedback is actually lost.

## Accent resolution (extends the Aug 23 policy to the composers)

Policy unchanged: **emerald** = success/confirmed/connected · **rose** = negative/locked ·
**amber** = in progress · **blue** = Deep Research and nothing else. Anything that just
needs to read as "on" uses `--primary`, so it follows `[data-accent]` instead of adding a
ninth hue.

| was | where | now |
|---|---|---|
| `indigo-500` Deep Research tile + counter | home plus-menu | blue |
| `green-500` connected app | home badge, AppSelectorPopover | emerald 600/400 (500-on-500/10 fails 4.5:1 in light) |
| `emerald-500` Website Builder | home badge + tile | neutral + glyph; active = `--primary` |
| `purple-500` Create Image, image-model dot, `ImagePlus` label | home, image-gen ×2 | neutral / `--primary`; dots → `Check` |
| `blue-500` Attach Files tile | home plus-menu | neutral `bg-inset` |
| `orange-500` Connect Apps | AppSelectorPopover footer | neutral `bg-inset text-ink-2` |
| `red-500` locked / mic / remove-file | home ×5, image-gen | rose |
| `indigo` + `emerald` tier markers | home model list | `text-primary` (Pro) / `text-muted-foreground` |
| `blue` accept / `red` reject | DragDropOverlay | `--primary` / rose |
| `blue` uploading | components/ui/attachment.jsx | amber (it sat beside the amber `processing` state — two hues for two halves of one wait) |

Mode badges keep a hue only where one is already reserved and visible in the answer region
(Deep Research blue, connected app emerald). Website Builder and Create Image are neutral +
glyph. "Active" reads identically across every toggle via `TOOLBAR_TOGGLE`, so nothing
depends on hue alone.

## Accessibility fixes

- **Nothing you typed into had a focus indicator.** All three textareas are `outline-none`
  with no replacement. `COMPOSER_CARD` puts `focus-within:ring-2 focus-within:ring-ring/50`
  on the *card*, so the ring also covers the nested toolbar controls.
- Four dropdown triggers plus the app-search input carried `focus:ring-0` /
  `focus-visible:ring-0`, removing their only keyboard affordance → `FOCUS_RING`.
- Textareas are `text-base` at **every** breakpoint. `text-sm` (14px) means iOS zooms the
  whole page on focus, and a `fixed` composer jumping under the keyboard is the worst place
  for that. `.chat-font-content` only sets `font-family`, so it never fights the size.
- Every icon-only control gained `aria-label`; every toggle gained `aria-pressed`.
- Toolbar controls are 36px (over the 24 CSS px WCAG 2.2 minimum). Badge dismiss buttons are
  20px and pass via the spacing exception (nearest other target ≥8px away), and each mode
  has a second, larger off-switch in the toolbar.

## Tailwind v4 traps confirmed empirically this pass

Extends `tailwind-v4-silent-no-op-utilities` in user memory.

**Utilities resolving through a named theme namespace reject bare decimals** — they compile
to *nothing*, silently. Dead and removed: `text-3.75`, `text-3.25`, `text-2.75`,
`text-2.5`, `rounded-1.25`, `border-l-1.5`, `py-0.2`, `backdrop-blur-0.5`. Alive and used:
arbitrary values (`text-[11px]`, `text-[13px]`, `text-[0.9375rem]`, `rounded-[10px]`) and
**spacing-scale** decimals (`px-1.25`, `min-h-13`, `max-w-25`, `max-h-90`, `w-65`).
Opacity modifiers (`/6`, `/8`, `/15`) are computed, not namespace lookups, so always valid.

Also: **`scrollbar-thin` / `scrollbar-thumb-*` do not exist in this repo** — there is no
scrollbar plugin. The only scrollbar utility that emits CSS is `.scrollbar-hide`
(`app/globals.css` ~463). And `bg-gradient-to-*` is `bg-linear-to-*` in v4.

## Verification — how to do it, and what was NOT done

**`npx tsc --noEmit` is not verification here.** `tsconfig.json` has `allowJs: true` with
`checkJs` off, so every semantic error in a `.jsx` file is suppressed, and there is no
ESLint. That is how a duplicate `const FOCUS_RING` shipped and hard-failed Turbopack
earlier in this same session.

What was run instead:

1. **Redeclaration / undefined-identifier sweep** — throwaway TypeScript-API script from
   the project root (module resolution starts at the script's directory) with
   `checkJs: true`, `JsxEmit.Preserve`, filtered to codes 2451 / 2300 / 2440 / 2403 / 2304
   plus syntax codes 1005 / 1109 / 1128 / 1381 / 1382 / 17002 / 17008, over the ten touched
   files → clean. Script deleted afterwards.
2. **Every new utility emits real CSS** — compiled `app/globals.css` through the PostCSS API
   (432,545 bytes; 433,779 after the layout repair added the scrim and geometry classes) and
   checked each new class.
   **`grep -F` is mandatory here.** The emitted selectors contain literal backslashes
   (`.text-\[11px\]`, `.grid-rows-\[0fr\]`), so BRE `\[` matches a bare `[` and returns a
   false zero. The first sweep reported "missing" utilities that were in fact present.
3. **Dead-utility + accent regression grep** restricted to `class(Name)?=` attribute values
   across the ten files → zero dead utilities and zero unsanctioned hues. Remaining textual
   matches are inside explanatory comments only.

**Not done: any browser verification.** The user declined starting the `chatboxai-dev`
server **twice** — once before implementing, once after the layout repair — so nothing in this
pass has been seen rendered. That is exactly how the `relative`/`fixed` collision shipped:
**every static check above passes on it.** The file parses, the identifiers resolve, every utility
emits real CSS — `fixed` and `relative` are both present and both valid. The defect lives in the
*cascade*, which no grep and no type-check can see. When a change touches `position`, `z-index`,
stacking or overlay geometry, the only real verification is a rendered page; if that is
unavailable, say so plainly rather than reporting the static sweeps as if they covered it.

The state matrix that still wants a runtime walk-through: collapse/expand transitions and the
blur-into-toolbar guard · a Radix menu opened while collapsed · Deep Research on → limit
exhausted → modal · attachment tray stagger and progress · large paste · mic live · in-flight
send · image-gen ratio pills, reference-image auto model switch, counter at 80%, Shift+Enter vs
Enter · 375/768/1280, light + dark, `[data-accent]` switched, sidebar expanded + collapsed (the
`inputCenterLeft` + `inputShellWidth` pair), `html.reduced-motion` on.

## Preserved untouched

Every submit path (`onSearchQuery`, `onImageGeneration`, `GetSearchApiResult`,
`handleNewGeneration`), Deep Research weekly gating + modal
(`deep_research_limits_v1.md`), `canAccessModel(model, plan, paidCredits)` — `paidCredits`
is what unlocks paid models in real time (`credit_rollover_expiration_v1.md`) — the
`searchType` × `isImageGenMode` orthogonality, `OptimizedTextarea`'s debounced
`adjustHeight` + 144px cap + `startTransition` parent update, all upload/progress/delete
flows (`validateImageFile`, `uploadFileToStorage`, `/api/delete-file`, `cleanPublicUrl`,
`getDefaultImageToImageModelForProvider` auto-switch), the `/` command-palette branch in
`handleKeyDown`, and the `inputCenterLeft` sidebar-offset memo in both fixed composers.
