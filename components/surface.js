/* ─────────────────────────────────────────────────────────────────────────────
   SURFACE — the design vocabulary shared across every input surface.

   Three composers exist and they are the same control wearing three costumes:

     app/_components/ChatBoxAiInput.jsx                  home / new chat
     app/(routes)/search/[libId]/_components/…           search + Deep Research
     app/(routes)/image-gen/[libId]/page.jsx             image generation

   They drifted into eight competing accent hues with no assigned meanings — Deep
   Research drawn blue in one and indigo in another, connected apps `green-500`
   here and emerald there, Attach Files blue (colliding with Deep Research),
   Website Builder emerald (colliding with "success") — plus a set of Tailwind v4
   utilities that silently emit nothing. This module is the single owner of every
   value that has to agree between them.

   `answerSurface.js` (search-route private) re-exports the shared subset from
   here, so the answer region and the composer that sits under it cannot drift
   apart again. If a value has to agree across two surfaces, it belongs here.

   ── Accent policy — neutral by default, colour only where it means something:
        emerald  success / confirmed / connected
        rose     negative / locked / destructive
        amber    in progress
        blue     Deep Research, and nothing else
      Anything that just needs to read as "on" uses --primary, so it follows the
      [data-accent] switcher instead of adding a ninth hue. `--primary` is a deep
      purple in light mode and white in dark, so both /10 tints and solid fills
      clear contrast in either theme.

   ── Tailwind v4 traps this file exists partly to route around:
        · Utilities resolving through a *named theme namespace* reject bare
          decimals. `text-3.75`, `text-3.25`, `text-2.75`, `text-2.5`, `py-0.2`
          and `rounded-1.25` all compile to nothing. Spacing-scale decimals
          (`px-1.25`, `max-w-25`, `min-h-13`) are fine.
        · `bg-gradient-to-*` is `bg-linear-to-*` in v4; the old name emits nothing.
        · A `:root` custom property is not a utility. It has to be registered as
          `--color-*` in `@theme` — see the ramp block in app/globals.css.
───────────────────────────────────────────────────────────────────────────── */

/* ── Shared with the answer region ─────────────────────────────────────────── */

/* The one small-caps label treatment. Shared by table heads, markdown h6,
   code-block language tags, attachment section headers and mode badges, so
   "small label" means a single thing across the product. */
export const LABEL = 'text-[0.6875rem] font-semibold uppercase tracking-[0.08em]'

/* Focus ring for every interactive element. Uses the shadcn --ring token so the
   [data-accent] theme switcher keeps working.

   Four composer controls previously carried `focus:ring-0` /
   `focus-visible:ring-0`, which removes the only keyboard affordance they had. */
export const FOCUS_RING =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent'

/* One geometry for every badge, so two sitting side by side in a composer row are
   the same shape and differ only in meaning. */
const BADGE = 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1'

/* Deep Research — identical in every composer, its plus-menu tile and the answer
   header, because they all name the same mode. */
export const RESEARCH_BADGE =
    `${BADGE} border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400`

/* An active connected app. Emerald because it reports a confirmed connection.
   Was `green-500` at 500 weight, which does not clear 4.5:1 on its own 10% tint
   in light mode; the 600/400 pair does. */
export const CONNECTED_BADGE =
    `${BADGE} border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400`

/* Work in progress. */
export const PROGRESS_BADGE =
    `${BADGE} border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400`

/* A mode with no reserved hue — Website Builder, Create Image. Neutral fill, and
   the glyph plus label carry the identity. Adding a hue per mode is what produced
   the eight-hue composer in the first place. */
export const NEUTRAL_BADGE =
    `${BADGE} border-border/60 bg-inset text-ink-2`

/* Locked / over-limit. */
export const LOCKED_BADGE =
    `${BADGE} border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400`

/* ── Composer shell ────────────────────────────────────────────────────────── */

/* Structural morph vs typing-driven resize are deliberately two different
   timings. Sharing one token makes the card bounce on every keystroke, because
   the springy overshoot that reads as "the panel opened" reads as jitter when it
   fires 60 times a minute. --ease-composer is registered in app/globals.css. */
export const MORPH = 'duration-[260ms] ease-composer'
export const RESIZE = 'duration-150 ease-out'

/* The composer card.

   `focus-within:ring` is not decoration: all three textareas are `outline-none`
   with no replacement, so before this the element you type into had no focus
   indicator at all. Putting the ring on the card rather than the textarea means
   it also covers the toolbar controls nested inside.

   Takes the drag state because react-dropzone's active styling has to win over
   the focus ring.

   ── DO NOT append a position utility to this string at the call site. ──
   It opens with `relative` (absolutely-positioned children — the plus-menu
   panel, drag overlays — need a containing block), and Tailwind emits
   `.relative` *after* `.fixed` in the stylesheet. Same specificity, later rule
   wins, so `${COMPOSER_CARD(…)} fixed` yields `position: relative` and the card
   silently drops into normal document flow. That shipped once and broke the
   search composer completely. `fixed` here is a *shadow* variant, not a
   position: wrap the card in your own `fixed`/`sticky` element instead, the way
   the search and image-gen composers both do. */
export function COMPOSER_CARD({ dragActive = false, fixed = false } = {}) {
    return [
        /* Transition covers both border-color and shadow so the focus state
           eases in rather than snapping. `ring` is not in the list because we
           intentionally have no focus ring — the border brightening is the sole
           focus signal here, matching how Claude and ChatGPT style their
           composers: a border that quietly brightens, no outer glow. */
        'relative rounded-3xl border bg-card transition-[box-shadow,border-color,opacity]',
        MORPH,
        /* Subtle border brightening on focus — no ring, no glow. The border
           goes from border/60 (idle) → border/90 (focused) so it reads as
           "active" without the thick purple ring that looked jarring. */
        'focus-within:border-border/90',
        dragActive
            ? 'border-primary shadow-xl ring-2 ring-primary/15'
            : 'border-border/60',
        fixed
            ? 'shadow-lg shadow-black/5 dark:shadow-black/20'
            : 'shadow-sm hover:shadow-md hover:border-border/80',
    ].join(' ')
}

/* The prompt field.

   `text-base` at every breakpoint, not `text-sm md:…`: under 16px iOS zooms the
   whole page on focus, and a fixed composer that jumps under the keyboard is the
   worst place for that to happen. `.chat-font-content` only sets font-family
   (--chat-font-family is user-configurable and may be a script face), so it never
   fights the size here. */
export const COMPOSER_TEXTAREA =
    'chat-font-content w-full resize-none bg-transparent outline-none text-base leading-relaxed ' +
    'text-foreground placeholder:text-muted-foreground/70 scrollbar-hide overflow-hidden'

/* Secondary toolbar disclosure.

   `grid-template-rows: 0fr → 1fr` rather than max-height: `max-h-none` is not an
   interpolatable length so it snaps open — the same bug that had to be fixed in
   sourceList.jsx. The inner child needs `min-h-0 overflow-hidden` or the row
   refuses to collapse below its content height. */
export function SECONDARY_ROW(expanded) {
    return [
        'grid transition-[grid-template-rows,opacity]',
        MORPH,
        expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
    ].join(' ')
}

export const SECONDARY_ROW_INNER = 'min-h-0 overflow-hidden'

/* ── Controls ──────────────────────────────────────────────────────────────── */

/* 36px box — comfortably over the 24 CSS px WCAG 2.2 pointer minimum, and the
   toolbar keeps a gap so adjacent targets stay separable on touch. */
export const TOOLBAR_BUTTON =
    `inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl ` +
    `text-muted-foreground transition-colors duration-200 hover:bg-muted/60 hover:text-foreground ${FOCUS_RING}`

/* Same box with a label beside the glyph. */
export const TOOLBAR_PILL =
    `inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-xs font-medium ` +
    `text-muted-foreground transition-colors duration-200 hover:bg-muted/60 hover:text-foreground ${FOCUS_RING}`

/* A toggle's "on" state, identical for every toggle in the toolbar regardless of
   which feature it is. Hue is not the signal here — the glyph, the label and
   aria-pressed are — so `--primary` is safe and follows [data-accent]. */
export function TOOLBAR_TOGGLE(active, { pill = false } = {}) {
    return [
        pill ? TOOLBAR_PILL : TOOLBAR_BUTTON,
        active && 'bg-primary/10 text-primary ring-1 ring-primary/20 hover:bg-primary/15 hover:text-primary',
    ].filter(Boolean).join(' ')
}

/* Live recording. Rose keeps the universal record-is-red convention while staying
   inside the sanctioned four. The pulse carries "live" — tint + text + pulse is
   already three signals, which is why the old glow shadow is gone. */
export const TOOLBAR_RECORDING =
    `${TOOLBAR_BUTTON} border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 ` +
    `hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 motion-safe:animate-pulse`

/* The one primary CTA per composer.

   It always means send. On the home composer an empty field used to turn this
   button into "open Voice AI", so the primary action silently changed meaning
   based on state; Voice AI now has its own labelled control in the toolbar. */
export function SEND_BUTTON(enabled) {
    return [
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
        FOCUS_RING,
        enabled
            ? 'cursor-pointer bg-foreground text-background shadow-sm hover:opacity-90 active:scale-95'
            : 'cursor-not-allowed bg-muted text-muted-foreground/60',
    ].join(' ')
}

/* ── Plus-menu tiles ───────────────────────────────────────────────────────── */

/* The plus-menu panel.

   `align` follows where the trigger sits: the home composer keeps `+` at the left
   end of its toolbar, while the two fixed composers put it in the textarea row
   beside send, ~90px from the card's right edge. A left-anchored 260px panel from
   there overflows the card — and the viewport at 375px — so it has to flip. */
export function MENU_PANEL(align = 'left') {
    return [
        'absolute bottom-full z-50 mb-3 flex w-65 max-h-90 flex-col gap-1',
        'overflow-y-auto rounded-2xl border border-border/60 bg-popover/95 p-1.5 backdrop-blur-xl',
        'shadow-2xl shadow-black/10 dark:shadow-black/40 scrollbar-hide',
        'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200',
        align === 'right' ? 'right-0 origin-bottom-right' : 'left-0 origin-bottom-left',
    ].join(' ')
}

export function MENU_TILE(active) {
    return [
        'group flex w-full cursor-pointer items-center gap-3.5 rounded-xl px-3 py-2.5 text-sm',
        'transition-colors duration-200',
        FOCUS_RING,
        active ? 'bg-muted/70' : 'hover:bg-muted/60',
    ].join(' ')
}

/* The 40px glyph well inside a tile. `state` is 'idle' | 'active' | 'locked', or
   'research' for the one feature that owns a hue. */
export function MENU_TILE_ICON(state) {
    const base =
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-200'
    switch (state) {
        case 'active':
            return `${base} bg-primary text-primary-foreground`
        case 'locked':
            return `${base} bg-rose-500/10 text-rose-600 dark:text-rose-400`
        case 'research':
            return `${base} bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white`
        case 'research-active':
            return `${base} bg-blue-500 text-white`
        default:
            return `${base} bg-inset text-ink-2 shadow-hairline group-hover:bg-hover-2 group-hover:text-ink`
    }
}

export const MENU_TILE_TITLE =
    'text-[13px] font-semibold leading-tight tracking-tight text-foreground'
export const MENU_TILE_SUB = 'mt-0.5 text-[11px] leading-tight text-muted-foreground'

/* Counters use tabular figures so a 5/5 → 4/5 tick does not shift the row. */
export function MENU_TILE_COUNT(exhausted) {
    return [
        'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums',
        exhausted
            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
            : 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    ].join(' ')
}

/* ── Attachment tray ───────────────────────────────────────────────────────── */

/* Staggered entrance, 35ms apart — inside the 30–50ms window that reads as one
   group arriving rather than a queue. `motion-safe:` so the OS preference opts
   out; the repo's own html.reduced-motion class zeroes durations globally too. */
export function TRAY_ITEM_STYLE(index) {
    return { animationDelay: `${Math.min(index, 8) * 35}ms` }
}

export const TRAY_ITEM =
    'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200'

/* Hairline divider between toolbar groups. */
export const TOOLBAR_DIVIDER = 'mx-1.5 h-5 w-px shrink-0 bg-border/60'
