'use client';

/**
 * gsapUtils.js — Central GSAP + ScrollTrigger setup (SSR-safe)
 *
 * Design rules for the landing page motion system:
 *
 * 1. NEVER hide content in markup (no `opacity-0` classes). Initial hidden state
 *    is always applied by `gsap.set()` INSIDE a `gsap.context()`. That way, if
 *    GSAP fails to load, the user prefers reduced motion, or the context is
 *    reverted, the content is visible rather than permanently blank.
 *
 * 2. NEVER call `ScrollTrigger.getAll().forEach(t => t.kill())` in a cleanup.
 *    That kills every trigger on the page, not just the caller's, which silently
 *    breaks unrelated sections. `ctx.revert()` already kills exactly the triggers
 *    created inside that context. Use `useGsapContext` and this is handled.
 *
 * 3. GSAP is 3.12.x here, so `SplitText` is NOT available. `splitWords` and
 *    `splitChars` below are the hand-rolled replacements; they walk text nodes
 *    only, so nested markup (`<br />`, coloured `<span>`s) survives intact.
 *
 * 4. NEVER nest a reveal target inside another reveal target. A wrapper faded in
 *    at `top 82%` and an inner element animated at `top 78%` fire in the wrong
 *    order (the inner one first), so the inner choreography plays while the
 *    wrapper is still at `opacity: 0`. In practice: point `revealStack` at the
 *    blocks *beside/below* a `<SectionHeader>`, never at the column containing it.
 *
 * 5. When GSAP animates `scale`/`x`/`rotate` it writes the whole `transform`
 *    property, silently discarding Tailwind's `rotate-45` / `-translate-x-1/2` on
 *    the same element. Either fold the CSS transform into the tween, or express
 *    the offset without a transform (`-ml-4` instead of `-translate-x-1/2`).
 */

import { useEffect, useRef } from 'react';

let gsapRegistered = false;

/**
 * Lazily imports GSAP + ScrollTrigger and registers the plugin exactly once.
 * @returns {Promise<{ gsap: any, ScrollTrigger: any } | null>} null on the server
 */
export async function getGSAP() {
  if (typeof window === 'undefined') return null;

  const { default: gsap } = await import('gsap');
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');

  if (!gsapRegistered) {
    gsap.registerPlugin(ScrollTrigger);
    gsapRegistered = true;
  }

  return { gsap, ScrollTrigger };
}

/** @returns {boolean} true when the OS asks for reduced motion */
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Sections mount independently, so a per-section `ScrollTrigger.refresh()` would
// run N times on load. Debounce into a single refresh once the page settles.
let refreshTimer = null;
function scheduleRefresh(ScrollTrigger) {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    ScrollTrigger.refresh();
  }, 140);
}

/**
 * The one hook every landing section uses to run GSAP.
 *
 * Handles: SSR, the async-import race (cleanup firing before the dynamic import
 * resolves), scoped selector text, and correctly scoped teardown.
 *
 * @param {(api: { gsap: any, ScrollTrigger: any, self: any, root: HTMLElement, reduced: boolean }) => void} setup
 * @param {any[]} [deps]
 * @returns {import('react').RefObject<HTMLElement>} attach to the section root
 */
export function useGsapContext(setup, deps = []) {
  const scopeRef = useRef(null);
  const setupRef = useRef(setup);
  setupRef.current = setup;

  useEffect(() => {
    let ctx = null;
    // Guards the race where React unmounts (or Fast Refresh re-runs) before the
    // dynamic import resolves. Without this the context is created after cleanup
    // has already run and its ScrollTriggers leak forever.
    let cancelled = false;

    getGSAP().then((mod) => {
      if (cancelled || !mod || !scopeRef.current) return;
      const { gsap, ScrollTrigger } = mod;
      const reduced = prefersReducedMotion();

      ctx = gsap.context(
        (self) => setupRef.current({ gsap, ScrollTrigger, self, root: scopeRef.current, reduced }),
        scopeRef
      );

      scheduleRefresh(ScrollTrigger);
    });

    return () => {
      cancelled = true;
      // Scoped teardown only — reverts inline styles and kills just the
      // ScrollTriggers created inside this context.
      if (ctx) ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return scopeRef;
}

// ── Text splitting (SplitText replacement for GSAP 3.12) ────────────────────

function splitTextNodes(el, mode) {
  if (!el || el.dataset.splitDone === mode) {
    return Array.from(el?.querySelectorAll?.('[data-split-part]') ?? []);
  }

  const parts = [];
  const pattern = mode === 'chars' ? /(\s)/ : /(\s+)/;

  const walk = (node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) {
        // Text node — replace with per-word/char spans, keeping whitespace as
        // real text nodes so line-breaking and spacing are unchanged.
        const text = child.textContent;
        if (!text || !text.trim()) continue;

        const frag = document.createDocumentFragment();
        const chunks =
          mode === 'chars' ? text.split('') : text.split(pattern);

        for (const chunk of chunks) {
          if (!chunk) continue;
          if (/^\s+$/.test(chunk)) {
            frag.appendChild(document.createTextNode(chunk));
            continue;
          }
          const span = document.createElement('span');
          span.setAttribute('data-split-part', '');
          span.style.display = 'inline-block';
          span.style.willChange = 'transform, opacity';
          span.textContent = chunk;
          frag.appendChild(span);
          parts.push(span);
        }
        node.replaceChild(frag, child);
      } else if (child.nodeType === 1 && child.tagName !== 'BR') {
        // Recurse so nested markup (e.g. the `text-neutral-500` second phrase)
        // keeps its own element and styling.
        walk(child);
      }
    }
  };

  walk(el);
  el.dataset.splitDone = mode;
  return parts;
}

/** Splits an element into per-word spans, preserving `<br />` and nested spans. */
export function splitWords(el) {
  return splitTextNodes(el, 'words');
}

/** Splits an element into per-character spans. Use only on short, plain text. */
export function splitChars(el) {
  return splitTextNodes(el, 'chars');
}

// ── Reveal primitives ───────────────────────────────────────────────────────

const REVEAL_START = 'top 82%';

/**
 * Reveals a "Reasoning Trace" section header: the ◆ node rotates and scales in, its
 * hairline draws left→right, the monospace state verb types in, then the heading
 * staggers in word by word.
 *
 * Expects, anywhere inside `root`:
 *   [data-trace-node]    the ◆ marker
 *   [data-trace-rail]    the hairline that draws
 *   [data-trace-label]   the monospace state verb
 *   [data-trace-heading] the h2
 *   [data-trace-sub]     optional supporting copy
 */
export function revealHeader({ gsap, root, reduced }) {
  const node = root.querySelector('[data-trace-node]');
  const rail = root.querySelector('[data-trace-rail]');
  const label = root.querySelector('[data-trace-label]');
  const heading = root.querySelector('[data-trace-heading]');
  const subs = root.querySelectorAll('[data-trace-sub]');

  if (reduced) return null;

  const chars = label ? splitChars(label) : [];
  const words = heading ? splitWords(heading) : [];

  const tl = gsap.timeline({
    scrollTrigger: { trigger: root, start: REVEAL_START, once: true },
  });

  if (node) {
    // The node carries a Tailwind `rotate-45` (it is a ◆). GSAP writes `scale`
    // into `transform`, which would wipe that rotation out — so the rotation is
    // part of the tween rather than left to CSS.
    gsap.set(node, { scale: 0, opacity: 0, rotate: 0 });
    tl.to(node, { scale: 1, opacity: 1, rotate: 45, duration: 0.45, ease: 'back.out(2)' });
  }
  if (rail) {
    // Horizontal hairline, so it draws left→right. scaleY on a 1px-tall rule is
    // invisible.
    gsap.set(rail, { scaleX: 0, transformOrigin: 'left center' });
    tl.to(rail, { scaleX: 1, duration: 0.5, ease: 'power2.out' }, '-=0.25');
  }
  if (chars.length) {
    gsap.set(chars, { opacity: 0 });
    tl.to(chars, { opacity: 1, duration: 0.02, stagger: 0.022, ease: 'none' }, '-=0.3');
  } else if (label) {
    gsap.set(label, { opacity: 0 });
    tl.to(label, { opacity: 1, duration: 0.35 }, '-=0.3');
  }
  if (words.length) {
    // yPercent 60 rather than a full 110 mask: the h2 has no overflow clip, and
    // adding one risks shaving descenders at these leading values.
    gsap.set(words, { yPercent: 60, opacity: 0 });
    tl.to(
      words,
      { yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.05, ease: 'power3.out' },
      '-=0.15'
    );
  }
  if (subs.length) {
    gsap.set(subs, { y: 18, opacity: 0 });
    tl.to(subs, { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power3.out' }, '-=0.45');
  }

  return tl;
}

/**
 * Vertical stack reveal — content rises into place in reading order.
 * @param {{gsap:any, reduced:boolean}} api
 * @param {Element|Element[]|NodeList|string} targets
 * @param {{trigger?: Element, y?: number, stagger?: number, start?: string, duration?: number}} [opts]
 */
export function revealStack({ gsap, reduced }, targets, opts = {}) {
  const list = normalize(targets);
  if (!list.length || reduced) return null;

  const { trigger, y = 24, stagger = 0.07, start = REVEAL_START, duration = 0.7 } = opts;

  gsap.set(list, { y, opacity: 0 });
  return gsap.to(list, {
    y: 0,
    opacity: 1,
    duration,
    stagger,
    ease: 'power3.out',
    scrollTrigger: { trigger: trigger ?? list[0], start, once: true },
  });
}

/**
 * Grid reveal — same rhythm as `revealStack` plus a slight scale so cards feel
 * like they settle rather than slide.
 */
export function revealGrid({ gsap, reduced }, targets, opts = {}) {
  const list = normalize(targets);
  if (!list.length || reduced) return null;

  const { trigger, y = 28, stagger = 0.05, start = REVEAL_START } = opts;

  gsap.set(list, { y, opacity: 0, scale: 0.98 });
  return gsap.to(list, {
    y: 0,
    opacity: 1,
    scale: 1,
    duration: 0.65,
    stagger,
    ease: 'power3.out',
    scrollTrigger: { trigger: trigger ?? list[0], start, once: true },
  });
}

/**
 * Directional reveal for split (left/right) layouts.
 * @param {'left'|'right'} from
 */
export function revealFrom({ gsap, reduced }, targets, from = 'left', opts = {}) {
  const list = normalize(targets);
  if (!list.length || reduced) return null;

  const { trigger, distance = 32, stagger = 0.1, start = 'top 78%' } = opts;

  gsap.set(list, { x: from === 'left' ? -distance : distance, opacity: 0 });
  return gsap.to(list, {
    x: 0,
    opacity: 1,
    duration: 0.9,
    stagger,
    ease: 'power3.out',
    scrollTrigger: { trigger: trigger ?? list[0], start, once: true },
  });
}

/**
 * Counts a number up on scroll entry. Writes into `el.textContent`.
 * @param {{gsap:any, ScrollTrigger:any, reduced:boolean}} api
 * @param {Element} el
 * @param {number} value
 * @param {{suffix?: string, decimals?: number, duration?: number, separator?: boolean}} [opts]
 */
export function countUp({ gsap, ScrollTrigger, reduced }, el, value, opts = {}) {
  if (!el) return null;
  const { suffix = '', decimals = 0, duration = 2.2, separator = true } = opts;

  const format = (n) => {
    const fixed = decimals > 0 ? Number(n).toFixed(decimals) : String(Math.floor(n));
    if (!separator || decimals > 0) return fixed + suffix;
    return Number(fixed).toLocaleString('en-US') + suffix;
  };

  if (reduced) {
    el.textContent = format(value);
    return null;
  }

  const obj = { val: 0 };
  el.textContent = format(0);

  return ScrollTrigger.create({
    trigger: el,
    start: 'top 88%',
    once: true,
    onEnter: () =>
      gsap.to(obj, {
        val: value,
        duration,
        ease: 'power3.out',
        onUpdate: () => {
          el.textContent = format(obj.val);
        },
      }),
  });
}

/** Types plain text into an element on scroll entry, with a blinking caret. */
export function typeOnScroll({ gsap, reduced }, el, opts = {}) {
  if (!el) return null;
  const { start = 'top 85%', speed = 0.028 } = opts;

  const chars = splitChars(el);
  if (!chars.length || reduced) return null;

  gsap.set(chars, { opacity: 0 });
  return gsap.to(chars, {
    opacity: 1,
    duration: 0.01,
    stagger: speed,
    ease: 'none',
    scrollTrigger: { trigger: el, start, once: true },
  });
}

function normalize(targets) {
  if (!targets) return [];
  if (typeof targets === 'string') return Array.from(document.querySelectorAll(targets));
  if (targets instanceof Element) return [targets];
  return Array.from(targets).filter(Boolean);
}

// ── Legacy helpers (kept for compatibility with existing callers) ───────────

/** @deprecated prefer `revealStack` inside a `useGsapContext` setup */
export async function animateFadeUp(trigger, targets, options = {}) {
  const mod = await getGSAP();
  if (!mod) return null;
  const { gsap } = mod;
  const { stagger = 0.1, delay = 0, y = 32, duration = 0.7 } = options;

  return gsap.fromTo(
    targets,
    { opacity: 0, y },
    {
      opacity: 1,
      y: 0,
      duration,
      stagger,
      delay,
      ease: 'power3.out',
      scrollTrigger: { trigger, start: 'top 85%', once: true },
    }
  );
}

/** @deprecated prefer `countUp` inside a `useGsapContext` setup */
export async function animateCounter(element, target, options = {}) {
  const mod = await getGSAP();
  if (!mod || !element) return;
  const { gsap, ScrollTrigger } = mod;
  const { duration = 1.8, prefix = '', suffix = '', decimals = 0 } = options;
  const obj = { value: 0 };

  ScrollTrigger.create({
    trigger: element,
    start: 'top 85%',
    once: true,
    onEnter: () =>
      gsap.to(obj, {
        value: target,
        duration,
        ease: 'power2.out',
        onUpdate: () => {
          element.textContent = `${prefix}${obj.value.toFixed(decimals)}${suffix}`;
        },
      }),
  });
}

/** Draws an SVG path via stroke-dashoffset, scrubbed to scroll. */
export async function animateDrawPath(pathEl, trigger) {
  const mod = await getGSAP();
  if (!mod || !pathEl) return;
  const { gsap } = mod;

  const length = pathEl.getTotalLength();
  gsap.set(pathEl, { strokeDasharray: length, strokeDashoffset: length });

  gsap.to(pathEl, {
    strokeDashoffset: 0,
    duration: 1.4,
    ease: 'power2.inOut',
    scrollTrigger: { trigger, start: 'top 80%', end: 'bottom 20%', scrub: 0.5 },
  });
}
