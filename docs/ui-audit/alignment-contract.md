# ChatBox AI — UI Alignment & Spacing Contract

This alignment contract establishes the concrete geometric and visual rules for all in-scope routes, components, surfaces, dialogs, and controls across ChatBox AI.

---

## 1. Dimensional & Sizing System

All component dimensions follow the 4px baseline grid and standard shadcn/ui New York scales:

| Element | Standard Dimension | Permitted Variants | Owner File |
| :--- | :--- | :--- | :--- |
| **Primary Buttons** | Height: 36px (`h-9`), padding: `px-4` | Small: 32px (`h-8 px-3`), Large: 40px (`h-10 px-6`) | `components/ui/button.tsx` |
| **Icon Buttons** | 36x36px (`size-9` or `h-9 w-9`) | Compact: 32x32px (`size-8` or `h-8 w-8`) | `components/ui/button.tsx` & `components/surface.js` |
| **Input Fields** | Height: 36px (`h-9`), padding: `px-3` | Large: 40px (`h-10`) | `components/ui/input.jsx` |
| **Textareas** | Default min-height: 80px (`min-h-20`) | Fixed composer: dynamic (autosizing, max 144px) | `components/ui/textarea.jsx` & `surface.js` |
| **Cards** | Radius: 12px (`rounded-xl` or `rounded-2xl`) | Large modals: 16px (`rounded-2xl` / `rounded-3xl`) | `components/ui/card.jsx` |
| **Badges / Chips** | Height: 24px (`py-0.5 px-2.5` or `py-1 px-2.5`) | Compact tag: 20px (`py-0 px-2 text-[10px]`) | `components/ui/badge.jsx` & `surface.js` |
| **Popover Panels** | Width: 240px–260px (`w-60` to `w-65`) | Max height: 360px (`max-h-90`) | `components/surface.js` (`MENU_PANEL`) |
| **Dialog Modals** | Max width: 448px–512px (`max-w-md` to `max-w-lg`) | Wide modal: 672px (`max-w-2xl`) | `components/ui/dialog.jsx` |
| **Sidebar Desktop** | Width: 256px (`w-64` / `16rem`) | Collapsed: 48px (`w-12` / `3rem`) | `components/ui/sidebar.jsx` |
| **Sidebar Mobile** | Width: 288px (`18rem`), sheet slide from left | Full overlay scrim | `components/ui/sidebar.jsx` & `sheet.jsx` |
| **Global App Header**| Height: 56px (`h-14`) mobile, 64px (`h-16`) desktop | Sticky top, z-40 | `app/_components/LayoutContent.jsx` |

---

## 2. Horizontal Alignment Rules

1. **Content Containers**:
   - Standard app content container uses `max-w-7xl mx-auto w-full px-4 md:px-8`.
   - Long-form AI answer reading column uses `max-w-[39rem]` (65–75 characters per line at 16px body font).
   - Media lists (images, video cards), tables, and code snippets span the full column width (`w-full`).
2. **Centerline Alignment**:
   - Header controls, toolbar buttons, and badges must align along the exact horizontal centerline (`items-center`).
   - Icon-to-label alignment inside buttons and menu items must use `flex items-center gap-2` or `gap-2.5`.
3. **Card & Form Gutters**:
   - Input fields inside cards align with the card's internal header baseline (standard `p-6` card padding).
   - Form label baselines sit 6px (`mb-1.5`) directly above their corresponding control.

---

## 3. Vertical Rhythm & Spacing Scale

1. **Related vs. Unrelated Controls**:
   - Space between related buttons in a toolbar: `gap-1` to `gap-1.5` (4px–6px).
   - Space between separate toolbar functional groups: `gap-3` (12px) with a vertical divider (`h-5 w-px bg-border/60`).
   - Section heading to description: `space-y-1` or `space-y-1.5` (4px–6px).
   - Section to section spacing on settings and library pages: `space-y-6` to `space-y-8` (24px–32px).
2. **Composer to Content Distance**:
   - The fixed bottom composers in search and image generation maintain a clear bottom offset (`bottom-4` / 16px).
   - Scrollable response content includes padding-bottom of 180px (`pb-44` / `pb-48`) to ensure the fixed floating composer never covers the last line of an answer or action buttons.

---

## 4. Layering, Anchoring & Z-Index Hierarchy

| Layer | Z-Index | Purpose |
| :--- | :--- | :--- |
| Normal document flow | `z-0` | Cards, text, canvas, tables |
| Sticky header | `z-40` | Main global navigation header with `backdrop-blur-md` |
| Fixed composer | `z-20` to `z-30` | Floating bottom composer bar |
| Popovers & Dropdowns | `z-50` | Apps popover, plus menu, model picker, profile menu |
| Dialog & Modal backdrops | `z-50` | Radix Dialog overlays (`bg-black/80`) |
| Modals & Sheets | `z-50` | Center dialogs, mobile sidebar sheet |
| Command Palette | `z-50` | Global search modal |
| Drag & Drop Overlay | `z-50` | File dropzone overlay |

### Popover Anchoring Rules:
- When a trigger sits near the bottom or right edge of a card, the popover must anchor upward (`side="top"`) or flip alignment to `end` to prevent off-screen overflow.
- All popover and dropdown contents render via Radix `Portal` to avoid CSS `overflow: hidden` clipping from parent containers.

---

## 5. Visual Rhythm & Surface Consistency

- **Borders & Dividers**:
  - Idle subtle border: `border-border/60` or `border-border`.
  - Focused/active border: `border-border/90` or `border-primary`.
  - Hairline dividers: `border-b border-border/40` or `h-[1px] bg-border/40`.
- **Corner Radii Hierarchy**:
  - Small controls (chips, citation markers, inline code): `rounded-md` (6px) or `rounded-lg` (8px).
  - Standard buttons, inputs, tabs: `rounded-md` (6px) or `rounded-xl` (12px).
  - Cards, panels, dropdowns: `rounded-xl` (12px) or `rounded-2xl` (16px).
  - Composers, large dialogs: `rounded-3xl` (24px).
- **Shadows & Glow**:
  - Remove all unnecessary neon drop shadows, glowing colored halos, and heavy gradient card borders.
  - Retain functional feedback: subtle focus rings (`focus-visible:ring-ring/50`), active press scales (`active:scale-[0.98]`), and elevation shadows (`shadow-sm`, `shadow-md`, `shadow-xl`).
