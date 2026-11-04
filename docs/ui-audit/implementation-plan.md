# ChatBox AI — UI Standardization Implementation Plan

This sequential plan governs the implementation of UI consistency, alignment fixes, and visual verification across ChatBox AI.

---

## Phase Overview & Progress Tracking

- [ ] **PHASE 1 — Foundation and shared primitives**:
  Audit and align all installed components under `components/ui/` (`button.tsx`, `input.jsx`, `textarea.jsx`, `card.jsx`, `dialog.jsx`, `popover.jsx`, `dropdown-menu.jsx`, `badge.jsx`, `tabs.jsx`, `select.jsx`, `switch.jsx`).
  - *Exit Criteria*: Zero type errors, shared primitives match New York specifications, zero regressions on protected auth/landing screens.

- [ ] **PHASE 2 — Global layout and sidebar**:
  Standardize `app/_components/LayoutContent.jsx`, `app/_components/AppSidebar.jsx`, sticky header geometry, responsive drawer, history group actions, and usage cards.
  - *Exit Criteria*: Header and sidebar transitions are smooth, mobile sheet operates cleanly, no horizontal overflow.

- [ ] **PHASE 3 — /app home and new chat**:
  Standardize `app/(routes)/app/page.js`, `app/_components/ChatBoxAiInput.jsx`, model selector, `AppSelectorPopover`, plus menu, and attachment tray.
  - *Exit Criteria*: Empty-state is centered, toolbar buttons align along centerline, plus menu and apps popover position accurately without layout shift.

- [ ] **PHASE 4 — Search, answers, and deep research**:
  Standardize `app/(routes)/search/[libId]`, `DisplayResult.jsx`, `AnswerDisplay.jsx`, `sourceList.jsx`, `ImageList.jsx`, `VideoList.jsx`, citations, and fixed bottom composer.
  - *Exit Criteria*: Text column conforms to 39rem measure, sources and media cards align cleanly, bottom composer floats gracefully above content.

- [ ] **PHASE 5 — Image generation**:
  Standardize `app/(routes)/image-gen/[libId]/page.jsx`, result container, preview dialog, action bar, aspect ratio tiles, and bottom composer.
  - *Exit Criteria*: Image preview aligns with grid, action buttons share unified toolbar styles, bottom composer matches home/search design language.

- [ ] **PHASE 6 — Settings**:
  Standardize `app/(routes)/settings/page.jsx` and tab panels (`GeneralSettings`, `AccountSettings`, `SecuritySettings`, `MemorySettings`, `HelpSettings`, `ApiKeySettings`).
  - *Exit Criteria*: Unified form-group spacing, consistent switch and select controls, accessible validation messages, responsive layout.

- [ ] **PHASE 7 — Library, Discover, Snapshot**:
  Standardize `library/page.jsx`, `discover/page.jsx`, `snapshot/page.jsx`.
  - *Exit Criteria*: Card grids have uniform spacing, search and filter bars align, empty and skeleton states are visually cohesive.

- [ ] **PHASE 8 — Website Builder and Figma**:
  Standardize `website-builder/[projectId]/page.jsx`, `figma/page.jsx`, and builder panels.
  - *Exit Criteria*: Toolbars, sidebar panels, property forms, and canvas bounds align with design system tokens.

- [ ] **PHASE 9 — Voice AI and remaining routes**:
  Standardize `voice-ai/page.jsx`, `connections/page.jsx`, `support/page.jsx`, and `pricing/page.jsx`.
  - *Exit Criteria*: Canvas and connection cards follow design contract, public routes retain proper visual hierarchy.

- [ ] **PHASE 10 — All dialogs, popovers, dropdowns, and modals**:
  Audit and normalize all modals (Deep Research limit, Logout confirmation, Memory manager, Search chat, Avatar picker, Image crop/edit).
  - *Exit Criteria*: Max-width, padding, header, close button, and footer actions are consistent across every modal.

---

## Phase Gate Protocol
After EVERY phase:
1. Run `npx tsc --noEmit` to verify type safety.
2. Verify browser rendering and check for visual or functional regressions.
3. Check protected landing and auth screens.
4. Record checkpoint results before advancing to the next phase.
