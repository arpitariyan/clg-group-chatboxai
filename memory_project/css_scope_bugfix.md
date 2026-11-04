# Bug Fix: CSS Scope Leakage from Docs Page

## Issue
The user reported that navigating to the `/docs` page and returning to the landing page broke the landing page's CSS (buttons lost background/padding, text overlapped).

## Cause
The issue was caused by Next.js App Router's client-side navigation behavior combined with global CSS resets inside the `/docs` route's stylesheet. 
When navigating to `/docs`, `styles/docs.css` was dynamically injected into the `<head>`. This file contained an unlayered global CSS reset:
```css
*, *::before, *::after { margin: 0; padding: 0; }
```
Because Tailwind CSS v4 utilizes `@layer` for its utility classes (like `.px-5`), the unlayered `*` selector from `docs.css` had a higher parsing priority in the browser cascade when injected later. When the user navigated back to the home page, Next.js kept `docs.css` active in the DOM, causing the global reset to aggressively strip padding and margins from the Tailwind-styled landing page elements.

## Resolution
Removed the global `*`, `html`, and `body` selectors from `styles/docs.css`. 
The `font-family` declaration was safely moved directly into the `.docs-container` class instead. Since the app already uses Tailwind's built-in preflight reset via `app/globals.css`, the `docs.css` reset was fully redundant and its removal fixes the CSS leakage without breaking the Docs page design.
