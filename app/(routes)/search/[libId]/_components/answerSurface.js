/* ─────────────────────────────────────────────────────────────────────────────
   ANSWER SURFACE — shared design vocabulary for the result experience.

   DisplayResult renders DisplaySummery, AnswerDisplay, sourceList, ImageList and
   VideoList side by side inside a single message. They used to carry three
   different palettes — semantic shadcn tokens in the shell, raw `gray-` / `zinc-`
   shades in the answer, and those same shades plus a stray blue accent in the
   media lists — which is why the result read as several stitched-together
   products rather than one surface.

   These constants are the pieces that have to agree *exactly* across files.
   Everything else is expressed with the ink / line / inset / hover colour ramp
   registered in app/globals.css, so dark mode follows automatically.

     text      ink          body + headings (hierarchy = weight & size, not hue)
               ink-2        secondary / reasoning / captions
               ink-3        tertiary / labels / markers / icon rest state
     fill      inset        quiet raised chips, table heads, media wells
               hover        hover for a row sitting on `surface` (i.e. on white)
               hover-2      hover for anything in the message region
     edge      line         internal hairlines (rows, dividers)
               line-strong  outer edges, rails, hover emphasis
     radius    [5px]        inline (code, citation chips)
               control      8px — buttons and small controls
               xl           14px — blocks (code, tables, media tiles)
               2xl          modals and the user's prompt bubble

   On the hover steps specifically: in light mode --hover (#f4f5f6) is *lighter*
   than --canvas (#f1f2f3) and only three values off --inset (#f7f8f9), so
   `bg-inset hover:bg-hover` is a hover you cannot see. --hover only reads against
   --surface (#ffffff). The message region sits on page/canvas and its chips sit on
   inset, so everything here hovers to hover-2, which is darker than page, canvas,
   surface and inset in light mode and lighter than all four in dark.

   Accent policy — neutral by default, colour only where it carries meaning:
     emerald  success / confirmed / high trust
     rose     negative
     amber    in progress
     blue     Deep Research (and nothing else)
   Never colour something for decoration; that is what produced the blue hover
   borders, the blue "Top Image" dot and the sky/indigo one-offs.

   ── Ownership, as of the composer pass ──────────────────────────────────────
   This file is route-private (app/(routes)/search/[libId]/_components/), but the
   home composer and the image-gen composer need the same badges, label and focus
   ring. Copying them into a second file is exactly the per-file-palette problem
   this module was created to end, so the cross-surface subset now lives one level
   up in `components/surface.js` and is re-exported below. Every existing import
   from './answerSurface' keeps working.

     lives in components/surface.js   LABEL · FOCUS_RING · RESEARCH_BADGE ·
                                      CONNECTED_BADGE · PROGRESS_BADGE
     stays here (answer-region only)  MEASURE · ICON_BUTTON · QUIET_BUTTON ·
                                      GHOST_BUTTON · TILE

   Add a new value here only if it is answer-region-only. If it has to agree with
   a composer, it belongs in components/surface.js.
───────────────────────────────────────────────────────────────────────────── */

export {
    /* The one small-caps label treatment: table heads, markdown h6, code-block
       language tags, DisplayResult's attachment section headers. */
    LABEL,
    /* Focus ring for every interactive element. Resolves through the shadcn
       --ring token so [data-accent] keeps working. */
    FOCUS_RING,
    /* Mode badges. One shared geometry, so two sitting side by side in a composer
       row are the same shape and differ only in meaning. */
    RESEARCH_BADGE,
    CONNECTED_BADGE,
    PROGRESS_BADGE,
} from '@/components/surface'

/* Imported separately as well because the three button recipes below compose
   FOCUS_RING into their class strings, and `export … from` creates no local
   binding. */
import { FOCUS_RING } from '@/components/surface'

/* Optical reading measure for long-form answer copy.

   Deliberately a rem cap rather than `ch`: --chat-font-family is user
   configurable (it can be a script face) and `ch` would swing wildly between
   fonts. 39rem ≈ 68 characters at 16px, inside the 65–75 range that long-form
   reading research settles on. Only text blocks are capped — tables, code and
   media deliberately run the full column width. */
export const MEASURE = 'max-w-[39rem]'

/* Icon-only control inside a message (action bar, modal headers, media overlays).
   32px box is above the 24px WCAG 2.2 minimum for pointer targets, and the rows
   that host these keep an 8px gap so adjacent targets stay separable on touch. */
export const ICON_BUTTON =
    `inline-flex size-8 shrink-0 items-center justify-center rounded-control text-ink-3 transition-colors duration-150 hover:bg-hover-2 hover:text-ink ${FOCUS_RING}`

/* A quiet chip or secondary button: reads as raised-but-recessive, and hovers to
   a step that is actually visible in both themes. */
export const QUIET_BUTTON =
    `bg-inset text-ink-2 shadow-hairline transition-colors duration-150 hover:bg-hover-2 hover:text-ink ${FOCUS_RING}`

/* A bare text control with no resting fill — overflow disclosures, "show less". */
export const GHOST_BUTTON =
    `text-ink-3 transition-colors duration-150 hover:bg-hover-2 hover:text-ink ${FOCUS_RING}`

/* A tile that holds media or a source card. */
export const TILE =
    'group relative overflow-hidden rounded-xl bg-inset shadow-hairline transition-shadow duration-200 hover:shadow-[0_0_0_1px_var(--line-strong)]'
