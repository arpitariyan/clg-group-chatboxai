# Official shadcn/ui base-nova Core Component Audit Matrix

## Specification Target
- **Visual Target**: Official shadcn/ui **`base-nova`** style
- **Underlying Primitive Engine**: **Base UI** (`@base-ui/react`) where officially released, alongside compatible Radix UI primitives
- **Reference URL**: [https://ui.shadcn.com/docs/components](https://ui.shadcn.com/docs/components)
- **Active Canonical Skill**: `.agents/skills/chatbox-shadcn-exact/SKILL.md`

---

## Group A: Foundation, Actions & Content

| Component | Official URL | Primitive / Engine | Local Implementation | Consumers | Status | Visual Parity & Action Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Accordion** | `/docs/components/accordion` | Base UI / Radix | `components/ui/accordion.tsx` | `HelpCenterClient.jsx` | Standardized | Supports `base-nova` density, smooth height collapse, chevron rotation, subtle border-b. |
| **Alert** | `/docs/components/alert` | Native / CVA | `components/ui/alert.jsx` | `ApiKeySettings.jsx`, Auth | Standardized | `rounded-xl border border-border/60 p-3.5 bg-card text-foreground shadow-xs`. |
| **Alert Dialog**| `/docs/components/alert-dialog`| Radix / Base UI | `components/ui/alert-dialog.jsx` | `LogoutConfirmation`, `AppSidebar` | Standardized | `rounded-2xl border-border/60 bg-card/95 backdrop-blur-md shadow-2xl p-6`. |
| **Aspect Ratio**| `/docs/components/aspect-ratio`| Radix / Base UI | `components/ui/aspect-ratio.jsx` | Image Gen, Media | Standardized | Accurate aspect-ratio container with image object-cover containment. |
| **Attachment** | `/docs/components/attachment` | Composed | `components/ui/attachment.jsx` | `ChatBoxAiInput.jsx` | Standardized | File pill with thumbnail preview, file size, status indicator, and remove trigger. |
| **Avatar** | `/docs/components/avatar` | Radix / Base UI | `components/ui/avatar.jsx` | `AppSidebar.jsx`, Header | Standardized | `rounded-full overflow-hidden bg-muted flex items-center justify-center`. |
| **Badge** | `/docs/components/badge` | CVA / Slot | `components/ui/badge.jsx` | Library, Connections, Pricing | Standardized | Nova compact variant: `px-2 py-0.5 text-[11px] font-medium rounded-md shadow-xs`. |
| **Breadcrumb** | `/docs/components/breadcrumb` | Composed | `components/ui/breadcrumb.jsx` | Docs, Workspace | Standardized | Inline navigation with chevron separators and ellipsis dropdown support. |
| **Bubble** | `/docs/components/bubble` | Composed | `components/ui/bubble.jsx` | Chat message bubbles | Standardized | Distinct user (`bg-primary text-primary-foreground`) and assistant (`bg-card border-border/60`) surfaces. |
| **Button** | `/docs/components/button` | CVA / Slot | `components/ui/button.jsx` | App-wide | Standardized | Standardized `h-8.5` (compact), `h-9` (default), `h-10` (lg), `icon` (`size-8.5`). |
| **Button Group**| `/docs/components/button-group`| Composed | `components/ui/button-group.jsx`| Action toolbars | Standardized | Segmented control with connected borders and united corner radii. |
| **Calendar** | `/docs/components/calendar` | React Day Picker | `components/ui/calendar.jsx` | Settings, Date filters | Standardized | Day grid with month header, range selection, and muted outside dates. |
| **Card** | `/docs/components/card` | CVA / Slot | `components/ui/card.jsx` | App-wide | Standardized | `rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs text-card-foreground shadow-xs`. |
| **Carousel** | `/docs/components/carousel` | Embla Carousel | `components/ui/carousel.jsx` | Landing, Discover | Standardized | Touch-friendly carousel with previous/next buttons and dot indicators. |
| **Chart** | `/docs/components/chart` | Recharts / SVG | `components/ui/chart.jsx` | Usage dashboard, Settings | Standardized | CSS variable token-driven tooltips, area curves, and bar charts. |
| **Checkbox** | `/docs/components/checkbox` | Radix / Base UI | `components/ui/checkbox.jsx` | Settings, Selection | Standardized | `rounded-md size-4 border border-border bg-background focus-visible:ring-1`. |
| **Code Block** | `/docs/components/code-block` | SyntaxHighlighter | `components/ui/code-block.jsx` | Answer display, Builder | Standardized | Header with language badge, copy action, line numbers, and formatted token highlights. |
| **Collapsible**| `/docs/components/collapsible` | Radix / Base UI | `components/ui/collapsible.jsx`| Sidebar, Panels | Standardized | Smooth trigger/content animation with persistent state controls. |

---

## Group B: Inputs, Forms & Commands

| Component | Official URL | Primitive / Engine | Local Implementation | Consumers | Status | Visual Parity & Action Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Combobox** | `/docs/components/combobox` | Popover + Command | `components/ui/combobox.jsx` | Model selector, Filters | Standardized | Searchable popover selector with checkmarks and keyboard navigation. |
| **Command** | `/docs/components/command` | cmdk | `components/ui/command.jsx` | Search, Quick palette | Standardized | Command palette dialog with list, groups, items, and shortcut key badges. |
| **Context Menu**| `/docs/components/context-menu`| Radix / Base UI | `components/ui/context-menu.jsx`| File lists, Canvas | Standardized | Right-click overlay with submenus, shortcuts, and divider separators. |
| **Data Table** | `/docs/components/data-table` | TanStack Table | `components/ui/data-table.jsx` | API Keys, Logs | Standardized | Sortable, paginated data grid with column filtering and row selection. |
| **Date Picker**| `/docs/components/date-picker` | Popover + Calendar | `components/ui/date-picker.jsx` | Filters, Settings | Standardized | Popover trigger displaying formatted date with calendar popout. |
| **Dialog** | `/docs/components/dialog` | Radix / Base UI | `components/ui/dialog.jsx` | App-wide modals | Standardized | `rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl p-6`. |
| **Direction** | `/docs/components/direction` | DirectionProvider | `components/ui/direction.jsx` | Layout context | Standardized | LTR / RTL direction support for internationalization. |
| **Drawer** | `/docs/components/drawer` | Vaul | `components/ui/drawer.jsx` | Mobile navigation | Standardized | Mobile bottom-sheet drawer with grab handle and snap points. |
| **Dropdown Menu**| `/docs/components/dropdown-menu`| Radix / Base UI | `components/ui/dropdown-menu.jsx`| Sidebar, Toolbar | Standardized | `rounded-xl border border-border/60 bg-popover/95 p-1 text-popover-foreground shadow-lg backdrop-blur-md`. |
| **Empty** | `/docs/components/empty` | Composed | `components/ui/empty.jsx` | Search, Library | Standardized | Empty state with icon badge, title, description, and primary CTA. |
| **Field** | `/docs/components/field` | Composed | `components/ui/field.jsx` | Form layouts | Standardized | Input container with label, helper description, and inline error validation. |
| **Hover Card** | `/docs/components/hover-card` | Radix / Base UI | `components/ui/hover-card.jsx` | Profile preview, Links | Standardized | Hover-triggered informational card with arrow and collision avoidance. |
| **Input** | `/docs/components/input` | Native / CVA | `components/ui/input.jsx` | App-wide | Standardized | `h-9 px-3 rounded-xl border border-border/60 bg-transparent text-sm shadow-xs`. |
| **Input Group**| `/docs/components/input-group` | Composed | `components/ui/input-group.jsx` | Search, URL inputs | Standardized | Integrated input with leading/trailing icon, button, or text prefix/suffix. |
| **Input OTP** | `/docs/components/input-otp` | input-otp | `components/ui/input-otp.jsx` | MFA, Auth verification | Standardized | Segmented numeric digit inputs with cursor blinking and focus handling. |
| **Item** | `/docs/components/item` | Composed | `components/ui/item.jsx` | Lists, Menus | Standardized | Generic list item primitive with left media, main content, and trailing action. |
| **Kbd** | `/docs/components/kbd` | Native / Slot | `components/ui/kbd.jsx` | Shortcuts, Search | Standardized | Keyboard badge: `px-1.5 py-0.5 text-[10px] font-mono bg-muted border border-border/60 rounded`. |
| **Label** | `/docs/components/label` | Radix / Base UI | `components/ui/label.jsx` | Forms, Settings | Standardized | `text-xs font-medium text-foreground leading-none peer-disabled:opacity-70`. |

---

## Group C: Navigation & Selection

| Component | Official URL | Primitive / Engine | Local Implementation | Consumers | Status | Visual Parity & Action Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Marker** | `/docs/components/marker` | Composed | `components/ui/marker.jsx` | Citations, Maps | Standardized | Numeric citation marker chip with hover popover preview. |
| **Menubar** | `/docs/components/menubar` | Radix / Base UI | `components/ui/menubar.jsx` | Builder editor | Standardized | Top horizontal desktop menu bar with nested dropdown menus. |
| **Message** | `/docs/components/message` | Composed | `components/ui/message.jsx` | Chat thread | Standardized | Structured message row with avatar, role badge, timestamp, body, and actions. |
| **Message Scroller**| `/docs/components/message-scroller`| Composed | `components/ui/message-scroller.jsx`| Chat stream | Standardized | Auto-scrolling container with pinned bottom trigger when scrolled up. |
| **Native Select**| `/docs/components/native-select`| Native | `components/ui/native-select.jsx`| Mobile forms | Standardized | Styled native `<select>` wrapper with custom chevron arrow. |
| **Navigation Menu**| `/docs/components/navigation-menu`| Radix / Base UI | `components/ui/navigation-menu.jsx`| Global navigation | Standardized | Horizontal nav list with animated viewport popover for rich submenus. |
| **Pagination** | `/docs/components/pagination` | Composed | `components/ui/pagination.jsx` | Library, Snapshot | Standardized | Standardized pagination with previous, next, page numbers, and ellipsis. |
| **Popover** | `/docs/components/popover` | Radix / Base UI | `components/ui/popover.jsx` | App selector, Tools | Standardized | `rounded-2xl border border-border/60 bg-popover/95 p-4 text-popover-foreground shadow-2xl backdrop-blur-md`. |
| **Progress** | `/docs/components/progress` | Radix / Base UI | `components/ui/progress.jsx` | Research, Uploads | Standardized | Horizontal progress bar with smooth CSS transition indicator. |
| **Questionnaire**| `/docs/components/questionnaire`| Composed | `components/ui/questionnaire.jsx`| Onboarding, Feedback| Standardized | Step-by-step interactive questionnaire with radio/checkbox choices. |
| **Radio Group**| `/docs/components/radio-group`| Radix / Base UI | `components/ui/radio-group.jsx` | Settings, Options | Standardized | Radio options with circular indicator and accessible keyboard arrow navigation. |
| **Resizable** | `/docs/components/resizable` | react-resizable-panels | `components/ui/resizable.jsx`| Website builder | Standardized | Resizable pane layout with draggable separator handle. |
| **Scroll Area**| `/docs/components/scroll-area`| Radix / Base UI | `components/ui/scroll-area.jsx` | Sidebar, Chat | Standardized | Custom thin scrollbar that automatically hides when idle. |
| **Select** | `/docs/components/select` | Radix / Base UI | `components/ui/select.jsx` | Settings, Models | Standardized | Custom styled select trigger and popup item menu with checkmarks. |
| **Separator** | `/docs/components/separator` | Radix / Base UI | `components/ui/separator.jsx` | Layouts, Cards | Standardized | `h-px w-full bg-border/60` (horizontal) or `h-full w-px` (vertical). |
| **Sheet** | `/docs/components/sheet` | Radix / Base UI | `components/ui/sheet.jsx` | Mobile sidebar, Panels| Standardized | Slide-out sheet panel from left, right, top, or bottom edges with backdrop. |
| **Sidebar** | `/docs/components/sidebar` | Composed | `components/ui/sidebar.jsx` | Application shell | Standardized | Collapsible responsive application sidebar supporting icons, headers, and footer. |
| **Skeleton** | `/docs/components/skeleton` | Native / CVA | `components/ui/skeleton.jsx` | Loading states | Standardized | `animate-pulse rounded-md bg-muted`. |
| **Slider** | `/docs/components/slider` | Radix / Base UI | `components/ui/slider.jsx` | Voice AI volume/pitch | Standardized | Draggable slider track with thumb for numerical adjustment. |
| **Spinner** | `/docs/components/spinner` | SVG / CVA | `components/ui/spinner.jsx` | Loading buttons | Standardized | Lightweight animated SVG spinner matching text color. |

---

## Group D: Remaining UI Primitives

| Component | Official URL | Primitive / Engine | Local Implementation | Consumers | Status | Visual Parity & Action Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Switch** | `/docs/components/switch` | Radix / Base UI | `components/ui/switch.jsx` | Settings toggles | Standardized | Toggle switch with thumb animation: `data-[state=checked]:bg-primary`. |
| **Table** | `/docs/components/table` | Native | `components/ui/table.jsx` | API keys, Usage | Standardized | Standardized `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` with subtle borders. |
| **Tabs** | `/docs/components/tabs` | Radix / Base UI | `components/ui/tabs.jsx` | Settings, Builder | Standardized | Tab list with pill indicators: `bg-muted p-1 rounded-xl text-muted-foreground`. |
| **Textarea** | `/docs/components/textarea` | Native / CVA | `components/ui/textarea.jsx` | Chat composer, Forms| Standardized | `rounded-xl border border-border/60 bg-transparent text-sm shadow-xs`. |
| **Toast** | `/docs/components/sonner` | Sonner | `components/ui/sonner.jsx` | App notifications | Standardized | Rich toast notification system with success, error, and loading states. |
| **Toggle** | `/docs/components/toggle` | Radix / Base UI | `components/ui/toggle.jsx` | Toolbar actions | Standardized | Two-state toggle button for bold, italic, or mode toggles. |
| **Toggle Group**| `/docs/components/toggle-group`| Radix / Base UI | `components/ui/toggle-group.jsx`| View mode toggles | Standardized | Group of mutually exclusive or multi-select toggle buttons. |
| **Tooltip** | `/docs/components/tooltip` | Radix / Base UI | `components/ui/tooltip.jsx` | Icon buttons | Standardized | `rounded-lg bg-popover text-popover-foreground px-2.5 py-1 text-xs shadow-md border border-border/60`. |
| **Trace** | `/docs/components/trace` | Composed | `components/ui/trace.jsx` | Deep Research, Agent | Standardized | Agent execution step line with status icons, elapsed time, and collapsible details. |
| **Typography** | `/docs/components/typography` | Composed | `components/ui/typography.jsx`| Docs, Articles | Standardized | Standardized heading hierarchy (`h1`, `h2`, `h3`, `h4`, `p`, `blockquote`, `code`). |
