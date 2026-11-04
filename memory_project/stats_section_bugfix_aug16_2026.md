# Stats Section & Trust Badges - Visibility Bug Fix
**Date:** August 16, 2026

## Issue
The user reported that the section below the `HowItWorksSection` (which is the `StatsSection`) was completely hidden and not displaying on the page.

## Investigation & Root Cause
After investigating `app/(landing)/_components/StatsSection.jsx`, I found that it suffered from the exact same animation variant mismatch bug that affected the `HowItWorksSection`.

The section's main wrapper used the following animation props:
```jsx
<motion.div
  variants={staggerContainer}
  initial="hidden"
  whileInView="show"
>
```

However, the `staggerContainer` configuration imported from `lib/animations.js` defines its variants as `hidden` and `visible`. Because Framer Motion was instructed to transition to a non-existent `"show"` state when the element scrolled into view, it remained stuck in its `"hidden"` state (`opacity: 0`), rendering the entire section invisible.

After finding this, I ran a global search across the entire `_components` directory and discovered that the `TrustBadgesSection` was also suffering from this identical bug.

## Fix Implemented
1. Replaced `whileInView="show"` with `whileInView="visible"` in `StatsSection.jsx`. This correctly maps to the variants in `lib/animations.js`, allowing the section to fade in properly and the GSAP number-counting animations to execute.
2. Proactively applied the exact same fix to `TrustBadgesSection.jsx` on line 44 to ensure it displays correctly.
