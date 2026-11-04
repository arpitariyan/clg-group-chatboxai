// ---------------------------------------------------------------------------
// motionTokens.js – Centralized motion-design tokens for ChatBoxAI
// Pure utility module – no React / 'use client' dependency.
// ---------------------------------------------------------------------------

// ── Duration tokens (seconds) ───────────────────────────────────────────────
export const MOTION_TOKENS = Object.freeze({
  FAST: 0.16,
  BASE: 0.24,
  MEDIUM: 0.42,
  SLOW: 0.7,
  CINEMATIC: 1.2,
});

// ── Cubic-bezier easing curves ──────────────────────────────────────────────
// Stored as [x1, y1, x2, y2] arrays – directly usable by Framer Motion's
// `transition.ease` and convertible to CSS `cubic-bezier()` via helper below.
export const EASING = Object.freeze({
  /** Material-3 emphasized – dramatic start, soft landing */
  EMPHASIZED: [0.2, 0.0, 0.0, 1.0],
  /** General-purpose smooth curve */
  SMOOTH: [0.4, 0.0, 0.2, 1.0],
  /** Elements entering the viewport – fast start, gentle stop */
  DECELERATE: [0.0, 0.0, 0.2, 1.0],
  /** Elements leaving the viewport – gentle start, fast exit */
  ACCELERATE: [0.4, 0.0, 1.0, 1.0],
});

// ── Spring presets (Framer Motion `transition` objects) ─────────────────────
export const SPRING = Object.freeze({
  /** Soft, low-energy spring – tooltips, subtle shifts */
  GENTLE: { type: "spring", stiffness: 120, damping: 20, mass: 1 },
  /** Snappy, UI-friendly spring – buttons, toggles, cards */
  RESPONSIVE: { type: "spring", stiffness: 300, damping: 24, mass: 0.8 },
  /** Playful overshoot – attention-grabbing entrances */
  BOUNCY: { type: "spring", stiffness: 400, damping: 15, mass: 0.6 },
});

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a Framer Motion `transition` object from a duration token and an
 * easing array.
 *
 * @param {number}   [duration=MOTION_TOKENS.BASE] – seconds
 * @param {number[]} [easing=EASING.SMOOTH]        – cubic-bezier array
 * @returns {{ duration: number, ease: number[] }}
 */
export function createTransition(
  duration = MOTION_TOKENS.BASE,
  easing = EASING.SMOOTH,
) {
  return { duration, ease: easing };
}

/**
 * Return a Framer Motion `transition` with `staggerChildren` and an optional
 * `delayChildren` value.
 *
 * @param {number} [stagger=0.08]  – delay between each child (seconds)
 * @param {number} [delay=0]       – initial delay before staggering starts
 * @returns {{ staggerChildren: number, delayChildren: number }}
 */
export function staggerChildren(stagger = 0.08, delay = 0) {
  return { staggerChildren: stagger, delayChildren: delay };
}

// ── Variant factories ───────────────────────────────────────────────────────
// Each factory returns a Framer Motion `variants` object with `hidden` and
// `visible` keys so they can be used directly:
//   <motion.div variants={fadeInUp()} initial="hidden" animate="visible" />

/**
 * Fade-in while translating upward.
 *
 * @param {number} [duration=MOTION_TOKENS.MEDIUM] – seconds
 * @param {number} [y=24]                          – starting Y offset (px)
 * @returns {import('framer-motion').Variants}
 */
export function fadeInUp(duration = MOTION_TOKENS.MEDIUM, y = 24) {
  return {
    hidden: { opacity: 0, y },
    visible: {
      opacity: 1,
      y: 0,
      transition: createTransition(duration, EASING.DECELERATE),
    },
  };
}

/**
 * Simple opacity fade.
 *
 * @param {number} [duration=MOTION_TOKENS.MEDIUM] – seconds
 * @returns {import('framer-motion').Variants}
 */
export function fadeIn(duration = MOTION_TOKENS.MEDIUM) {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: createTransition(duration, EASING.SMOOTH),
    },
  };
}

/**
 * Scale from a smaller size while fading in.
 *
 * @param {number} [duration=MOTION_TOKENS.MEDIUM] – seconds
 * @param {number} [startScale=0.92]               – initial scale value
 * @returns {import('framer-motion').Variants}
 */
export function scaleIn(duration = MOTION_TOKENS.MEDIUM, startScale = 0.92) {
  return {
    hidden: { opacity: 0, scale: startScale },
    visible: {
      opacity: 1,
      scale: 1,
      transition: createTransition(duration, EASING.EMPHASIZED),
    },
  };
}

// ── CSS custom-property string ──────────────────────────────────────────────
// Inject into a <style> tag or a global stylesheet so plain CSS / Tailwind
// arbitrary values can reference the same tokens:
//   `transition: opacity var(--motion-base) var(--ease-smooth);`

function bezierToCSS(arr) {
  return `cubic-bezier(${arr.join(", ")})`;
}

export const MOTION_CSS_VARS = `
:root {
  /* ── Durations ─────────────────────────────────── */
  --motion-fast:      ${MOTION_TOKENS.FAST}s;
  --motion-base:      ${MOTION_TOKENS.BASE}s;
  --motion-medium:    ${MOTION_TOKENS.MEDIUM}s;
  --motion-slow:      ${MOTION_TOKENS.SLOW}s;
  --motion-cinematic: ${MOTION_TOKENS.CINEMATIC}s;

  /* ── Easing curves ─────────────────────────────── */
  --ease-emphasized: ${bezierToCSS(EASING.EMPHASIZED)};
  --ease-smooth:     ${bezierToCSS(EASING.SMOOTH)};
  --ease-decelerate: ${bezierToCSS(EASING.DECELERATE)};
  --ease-accelerate: ${bezierToCSS(EASING.ACCELERATE)};
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-fast:      0s;
    --motion-base:      0s;
    --motion-medium:    0s;
    --motion-slow:      0s;
    --motion-cinematic: 0s;
  }
}
`.trim();
