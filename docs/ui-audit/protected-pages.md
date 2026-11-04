# ChatBox AI — Protected Pages Specification

This document details the critical protected pages of ChatBox AI that must NEVER be redesigned, restyled, or modified visually.

## 1. Protected Scope Definition

The protected scope encompasses the existing marketing landing experience, editorial subpages, and all authentication experiences:

### Files:
1. `app/page.jsx` & `app/LandingPageClient.jsx`
2. `app/(landing)/**`:
   - `app/(landing)/_components/HeroSection.jsx`
   - `app/(landing)/_components/Sections.tsx`
   - `app/(landing)/_components/ui.tsx`
   - `app/(landing)/_components/landing.css`
3. `app/(auth)/**`:
   - `app/(auth)/layout.jsx`
   - `app/(auth)/sign-in/page.jsx`
   - `app/(auth)/sign-up/page.jsx`
   - `app/(auth)/forgot-password/page.jsx`
4. Editorial subpages:
   - `app/ai-models/page.tsx`
   - `app/deep-research/page.tsx`
   - `app/security/page.tsx` & `SecurityClient.tsx`
   - `app/developers/page.tsx`
   - `app/researchers/page.tsx`
   - `app/creators/page.tsx`

---

## 2. Forbidden Changes
Under no circumstances should any of the following be modified on protected pages:
- Visual composition and structure
- Margins, paddings, and layout hierarchy
- Typography scales, display faces (`Space Grotesk`, `Barlow Condensed`)
- Color palette (pure dark canvas `#0f0f11`, ink `#f2f2f4`, purple accent gradients)
- Backgrounds, glows, floating elements, or canvas visual effects
- Buttons, input borders, auth cards, or OTP input boxes
- Navbar and footer styling on marketing pages

---

## 3. Shared-File Isolation & Risk Mitigation

Several components are shared between in-scope pages and protected pages:
- `components/ui/button.tsx`: Consumed by `app/(landing)/_components/ui.tsx` (`Btn`) and `app/(auth)/sign-in/page.jsx`.
  - **Protection Strategy**: Maintain the exact visual output of `variant="default"` and `variant="outline"`. Do not change button heights or default radii in a way that shifts landing page CTA button layout.
- `components/ui/input.jsx`: Consumed by `app/(auth)/*`.
  - **Protection Strategy**: The auth screens explicitly override input styles with custom class names (e.g. `bg-transparent border-0 border-b-2 ...`). The standard `input.jsx` default classes will not alter auth styling as long as utility class priority is maintained.
- `app/globals.css`:
  - Contains `:root`, `.dark`, and `@theme` definitions.
  - `@import "./(landing)/_components/landing.css";` is isolated.
  - Dark mode root variables must preserve the contrast and baseline tone used across all screens.

---

## 4. Verification Method
Any change to shared CSS or UI primitives must be verified by checking both:
1. The landing page (`/`)
2. The sign-in page (`/sign-in`)
Confirming that zero visual regressions occurred.
