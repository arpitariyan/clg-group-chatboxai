# ChatBox AI — Official shadcn/ui New York Reference Matrix

This reference matrix compares the active local component implementations in `components/ui/` against the official upstream shadcn/ui New York v4 specifications, documenting differences, required visual treatments, and compatibility guards.

## 1. Upstream Source References
- Official Registry: `https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry.json`
- New York v4 Components: `https://github.com/shadcn-ui/ui/tree/main/apps/v4/registry/new-york-v4/ui`
- Base Color: Slate with CSS Variables enabled (`components.json`)

---

## 2. Component Reference & Comparison Table

| Component | Upstream New York Standard | Current Local Implementation | Deviations & Risk Assessment | Standardization Action |
| :--- | :--- | :--- | :--- | :--- |
| **Button** | `h-9 px-4 py-2`, `rounded-md`, `focus-visible:ring-[3px]`, `focus-visible:border-ring` | Uses `rounded-md`, `h-9`, `focus-visible:ring-0.75` | Local uses `ring-0.75` instead of `ring-[3px]`. Highly compatible. | Keep core variants intact, ensure all icon buttons use standard `size-8` or `size-9`. |
| **Input** | `h-9 rounded-md border-input bg-transparent px-3 py-1 shadow-xs` | Matches standard. Uses `h-9`, `border-input`, `dark:bg-input/30`. | Perfectly matched with New York v4. | Preserve and verify across forms. |
| **Textarea** | `min-h-16 rounded-md border-input bg-transparent px-3 py-2 text-sm` | Local used `min-h-20` and older `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`. | Inconsistent focus ring with Input and Button. | Standardize focus ring and border with `input.jsx`. |
| **Dialog** | `fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 shadow-lg sm:rounded-lg` | Matches standard structure. Has `overflow-hidden` rule in `globals.css`. | Very solid Radix dialog wrapper. | Standardize border and close button styling across all custom modals. |
| **Popover** | `w-72 rounded-md border bg-popover p-4 shadow-md` | Matches standard Radix popover. | In some call sites, popover was missing collision offsets. | Standardize `sideOffset={8}` and clean `border-border/60 bg-popover/95 backdrop-blur-xl`. |
| **Dropdown Menu** | `min-w-32 rounded-md border bg-popover p-1 shadow-md` | Uses Radix dropdown menu. | High visual quality. Ensure icon items have unified gap (`gap-2`) and sizing. | Standardize items, labels, and separators. |
| **Card** | `rounded-xl border bg-card text-card-foreground shadow-sm` | Uses `rounded-lg` with `p-6` header/content. | New York uses `rounded-xl` for cards in v4. | Update `Card` to `rounded-xl` with consistent subtle shadow. |
| **Badge** | `rounded-full border px-2.5 py-0.5 text-xs font-semibold` | Matches standard with `cva`. | In sync. | Preserve and align with `surface.js` badges. |
| **Tabs** | `h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground` | Matches standard Radix tabs. | In sync. | Verify tabs across Settings and Figma. |
| **Select** | `h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm` | Matches standard Radix select. | In sync. | Standardize dropdown viewport and trigger styling. |
| **Switch** | `h-5 w-9 rounded-full bg-input transition-colors data-[state=checked]:bg-primary` | Matches standard Radix switch. | In sync. | Standardize thumb size and track colors. |
| **Tooltip** | `rounded-md bg-popover px-3 py-1.5 text-xs text-popover-foreground` | Matches standard Radix tooltip. | In sync. | Standardize animation and z-index (50). |

---

## 3. Compatibility Rules
1. Never replace local components with copy-pasted upstream code if it drops props or changes DOM node types expected by consumers.
2. Radix UI v1.x primitives are installed and fully functional. Do not force an upgrade of `@radix-ui/*` packages.
3. Keep the Lucide animated icons integration (`@animateicons/react/lucide`) as it provides the project's signature polished micro-interactions.
