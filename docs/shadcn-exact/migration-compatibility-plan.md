# ChatBox AI: Base-Nova & Base UI Compatibility & Migration Architecture

## 1. Architectural Strategy
The objective is to achieve **exact visual parity** with the official shadcn/ui **`base-nova`** design preset without disrupting existing mission-critical features, multi-model streaming, authentication guards, or credit calculations.

### Core Architecture Principles:
1. **Underlying Primitive Engine**:
   - Modern shadcn components specify **Base UI** (`@base-ui/react`) or Radix UI depending on component release maturity.
   - For components with deep application logic (e.g. `Dialog`, `DropdownMenu`, `Popover`), we maintain the established Radix UI contract while applying **exact `base-nova` styling, density, micro-elevations, and `data-slot` attributes**.
   - For content and AI-specific primitives (e.g. `Accordion`, `Reasoning`, `InlineCitation`, `Trace`, `Plan`), we follow the exact Base UI geometry and composition hierarchy.
2. **Component Consumer Preservation**:
   - Every consumer in `/app`, `/settings`, `/library`, `/image-gen`, `/search`, etc., imports through standard alias paths (`@/components/ui/*`).
   - Prop signatures (`value`, `defaultValue`, `open`, `onOpenChange`, `variant`, `size`) remain backward-compatible to prevent runtime regressions.

---

## 2. Tokenization & Styling Contract: `base-nova`
The `base-nova` preset is characterized by:
- **Density**: `py-3.5` (accordion triggers), `h-8.5` (compact action buttons), `p-3` (cards and inputs).
- **Surfaces**: `bg-card/60 backdrop-blur-xs` (subtle elevation), `bg-card/95 backdrop-blur-md shadow-2xl` (floating overlays).
- **Borders**: Thin, subtle `border-border/60` replacing thick or colored outlines.
- **Micro-elevations**: Subtle `shadow-xs` on interactive cards and buttons, eliminating harsh heavy drop-shadows.

---

## 3. Protected Route Isolation Guarantee
The marketing landing page (`app/page.jsx`, `app/(landing)/**`) and authentication screens (`app/(auth)/**`) are isolated:
- Protected routes use scoped styles (`landing.css`, custom auth card containers).
- No global override or style token can alter the layout, animations, or visual identity of protected routes.

---

## 4. Verification & Testing Matrix
- **Type Checking**: `npx tsc --noEmit` verifies strict TypeScript and JSX consistency.
- **Production Build**: `npm run build` verifies static generation across all 158 routes.
- **Visual Inspection**: Development-only harness at `/dev-components` exercises all variants and states.
