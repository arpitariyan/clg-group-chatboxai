# How It Works Section - Visibility Bug Fix
**Date:** August 16, 2026

## Issue
The user reported that the section below the `FeaturesSection` (which is the `HowItWorksSection`) was completely hidden and not displaying on the page. 

## Investigation & Root Cause
After inspecting `app/(landing)/_components/HowItWorksSection.jsx`, the issue was traced to a mismatch in Framer Motion variant keys.
The section's main wrapper used the following animation props:
```jsx
<motion.div
  variants={staggerContainer}
  initial="hidden"
  whileInView="show"
>
```

However, the `staggerContainer` animation configuration imported from `lib/animations.js` defines its variants as `hidden` and `visible`:
```javascript
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { ... }
};
```

Because `HowItWorksSection` was instructing Framer Motion to animate to the `show` state when scrolled into view—a state that did not exist in the variants definition—the component remained stuck in its `hidden` state (`opacity: 0`). This caused the entire section to be invisible on the page.

## Fix Implemented
Replaced `whileInView="show"` with the correct key `whileInView="visible"` in `HowItWorksSection.jsx`. This correctly triggers the animation variants defined in the centralized `lib/animations.js` system, restoring visibility to the component and allowing the stagger animations to play normally.
