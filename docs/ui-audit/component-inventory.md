# ChatBox AI — UI Component Inventory & Audit Matrix

This inventory enumerates all components located in `components/ui/`, identifying their underlying primitives, consumers across the application, current state, and standardization decisions.

| Component | File Path | Underlying Primitive | Key Consumers | Decision | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **button** | `button.tsx` (re-exported by `button.jsx`) | `@radix-ui/react-slot` | 47 consumers (App, Sidebar, Result, Auth, Landing, Settings, Modals) | **Standardize** | Core New York variants in place. Ensure `icon`, `icon-sm`, `icon-lg` sizes align across toolbars. |
| **input** | `input.jsx` | Native `<input>` | 16 consumers (Auth, Settings, Library, Modals) | **Standardize** | Height `h-9`, border `border-input`, New York ring on focus. |
| **textarea** | `textarea.jsx` | Native `<textarea>` | Settings, Modals, Composer helper | **Standardize** | Standardize focus rings and sizing with official New York style. |
| **dialog** | `dialog.jsx` | `@radix-ui/react-dialog` | 11 consumers (Modals, Panels, History delete, Settings) | **Standardize** | New York rounded corners, border-border/60, z-index 50. |
| **alert-dialog**| `alert-dialog.jsx` | `@radix-ui/react-alert-dialog` | Sidebar, Logout, Memory Manager | **Standardize** | Standardize actions and overlay with New York guidelines. |
| **popover** | `popover.jsx` | `@radix-ui/react-popover` | `AppSelectorPopover`, Model selectors | **Standardize** | Standardize alignment, sideOffset, and surface styling. |
| **dropdown-menu**| `dropdown-menu.jsx` | `@radix-ui/react-dropdown-menu`| 8 consumers (Sidebar user profile, Composer models, Headers) | **Standardize** | Ensure border, item padding, and icon alignments follow New York specs. |
| **card** | `card.jsx` | Native `<div>` | 14 consumers (Figma panels, Discover, Library) | **Standardize** | `rounded-xl`, `border`, `bg-card`, standard padding. |
| **badge** | `badge.jsx` | `class-variance-authority` | 13 consumers (Discover, Figma, Model badges) | **Standardize** | Aligned with New York variant palette and `components/surface.js`. |
| **sheet** | `sheet.jsx` | `@radix-ui/react-dialog` | `components/ui/sidebar.jsx` (mobile sheet) | **Standardize** | Clean drawer slide with backdrop blur. |
| **sidebar** | `sidebar.jsx` | Context + Sheet + Primitives | LayoutContent, AppSidebar | **Preserve & Align** | Official shadcn sidebar component, handles desktop collapse and mobile drawer. |
| **tabs** | `tabs.jsx` | `@radix-ui/react-tabs` | Settings, Figma design tokens | **Standardize** | `h-9` list, `rounded-lg`, New York active state. |
| **select** | `select.jsx` | `@radix-ui/react-select` | Settings, Memory import | **Standardize** | `h-9`, `rounded-md`, clean dropdown viewport. |
| **switch** | `switch.jsx` | `@radix-ui/react-switch` | Settings (Dark mode, notifications, MFA) | **Standardize** | New York toggle switch dimensions and transitions. |
| **checkbox** | `checkbox.jsx` | `@radix-ui/react-checkbox` | Selection lists, modals | **Standardize** | Standard 16x16px checkbox with checkmark. |
| **radio-group**| `radio-group.jsx` | `@radix-ui/react-radio-group` | Settings forms | **Standardize** | Standard radio circles with indicator. |
| **tooltip** | `tooltip.jsx` | `@radix-ui/react-tooltip` | Sidebar buttons, composer toolbar icons | **Standardize** | `bg-popover text-popover-foreground text-xs shadow-md`. |
| **scroll-area** | `scroll-area.jsx` | `@radix-ui/react-scroll-area` | Figma panels, message scroller | **Preserve** | Clean scrollbar rail. |
| **separator** | `separator.jsx` | `@radix-ui/react-separator` | Sidebar, dropdowns, panels | **Preserve** | `h-px` or `w-px`, `bg-border/60`. |
| **skeleton** | `skeleton.jsx` | Native `<div>` | Discover, loading states | **Standardize** | `animate-pulse rounded-md bg-muted`. |
| **spinner** | `spinner.jsx` | Lucide icon wrapper | Search loading, route loading | **Preserve** | Clean rotating spinner. |
| **progress** | `progress.jsx` | `@radix-ui/react-progress` | Composer uploads, thinking widget | **Standardize** | `h-2 rounded-full bg-secondary overflow-hidden`. |
| **attachment** | `attachment.jsx` | Custom composite | ChatBoxAiInput, DisplayResult, Image-gen | **Preserve & Align** | File attachment tray with thumbnail, title, remove button. |
| **animated-icon**| `animated-icon.jsx` | `@animateicons/react/lucide` | Universal icon supplier (89 consumers) | **Preserve** | Smooth micro-animations on hover. |
| **surface** | `components/surface.js` | Shared style dictionary | All 3 composers + answer surface | **Source of Truth** | Owns `COMPOSER_CARD`, `COMPOSER_TEXTAREA`, badges, toolbar buttons. |

---
## Duplicate File and Extension Audit
- `button.jsx` (26 B) re-exports `button.tsx` (2347 B).
- `accordion.jsx` (29 B) re-exports `accordion.tsx` (2032 B).
- `animated-icon.js` and `animated-icon.jsx` both re-export icons.
- **Rule**: Retain the `.jsx` re-exports for backwards compatibility with any legacy imports while treating `.tsx` as the typed source of truth.
