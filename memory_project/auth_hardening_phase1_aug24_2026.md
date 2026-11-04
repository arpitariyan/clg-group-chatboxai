# Phase 1 — Identity Hardening (`withUser` / RequestContext across all trust-the-client routes)

**Date:** 2026-08-24
**Depends on / implements:** `architecture_audit_phase0_aug24_2026.md` §5 (P0 — Unauthenticated
identity, 29 routes) and §7 (Phase 1 proposal). Read that note first.
**User directive:** "build it properly my project step by step."

This note is **binding**. It records the identity pattern every future route must follow, which
routes are deliberately *not* wrapped and why, and the residuals left for later phases.

---

## 1. What was broken (from Phase 0 §5)

29 routes took the acting user's identity from **client-supplied input** (`email` / `userEmail` /
`user_email`, in body or query) with **no token verification**. Given only a victim's email an
attacker could read their history/memories/plan, burn model credits, drain website credits,
read/modify/publish/rollback their projects, and cascade-delete their account. `website-builder/
generate` was *circular*: it 401'd on a missing `userEmail`, then checked ownership against the
attacker's own input.

## 2. The pattern (reused, no new dependency — Rule 2)

Everything was built on primitives that **already existed**; Phase 1 added **zero** dependencies.

- `lib/server-auth.js` — verifies the Firebase ID token (POST to Google
  `identitytoolkit…:lookup`). Already present; the reference-correct route `app/api/llm-model/
  route.js` proved the "authenticate then 403 on email mismatch" approach.
- `lib/request-context.js` — `withUser(handler, { requireVerified = true })`. Verifies the token,
  builds `ctx`, catches `AuthError` → correct HTTP status. Passes `(request, routeContext)`; `ctx`
  spreads `routeContext`, so **`ctx.params` works for dynamic routes** (App Router passes params as
  a Promise → `await ctx.params`).
- `ctx.assertEmail(candidate)` — normalizes `candidate`; if it is non-empty and differs from the
  authenticated (normalized, lowercased) token email → `AuthError(403)`; otherwise returns the
  **authenticated** email. A null/absent candidate returns the authenticated email. **It never
  returns the candidate** — so a route can keep reading `body.userEmail` for compatibility while the
  value actually used is always the token's.
- `resolveRequestUser(request, requireVerified)` — reads **only headers**, never the body; safe to
  call after `request.json()`. Used for the **optional-auth** pattern (derive email from a verified
  token if present; anonymous callers still get the feature; nobody can load another user's data by
  passing their email).

### Client callers — the `authFetch` requirement (Rule 4: don't silently remove functionality)
The axios interceptor in `app/Provider.jsx` (`AxiosAuthBridge`) attaches the Bearer token to
**axios** `/api/*` calls, but **not** to bare `fetch()`. Every website-builder + generate-image
caller used bare `fetch`, so each locked route needed its caller switched to
`authFetch` (`@/lib/auth-fetch`), which attaches the current Firebase token to `fetch`/XHR.

- **Naming trap that matters for greps:** `authFetch` = `auth` + `Fetch` (capital **F**). The
  substring `fetch` (lowercase) does **not** appear in `authFetch`, so a lowercase `fetch(` grep is
  a correct, self-filtering way to find remaining *bare* calls. Verified: only the two public
  endpoints below still match.
- `authFetch` does **not** help `<img src>` requests — those stay capability-URL based.

## 3. `requireVerified` policy (decided, apply consistently)

`requireVerified` defaults **true**: a valid token is required *and* the user must not be
mid-verification (server-auth only blocks on an explicit Appwrite `signup_verified === false`;
undefined/null = legacy allowed).

- **`true` (default):** all data / generation / credit-read / credit-deduct / project routes.
  Matches the library & history precedent; a mid-OTP user is not in these flows.
- **`{ requireVerified: false }`:** only where blocking a real, paying, or in-onboarding user is
  worse than the marginal risk — the **payment** routes (`razorpay/create-order`,
  `website-builder/credits/purchase`, `credits/verify-purchase`) and the two **generate-image**
  reads/writes that legitimately run before verification completes. Still requires a valid token.
- **optional-auth (`resolveRequestUser(request, false)`, anonymous allowed):** `voice-ai` and
  `website-builder/project/[projectId]` (published projects are public; private ones resolve to the
  owner via the token, never via a query param).

## 4. Route inventory & disposition (ground truth: 35 route files now carry the wrapper family)

Verified by grep for `withUser(` | `resolveRequestUser(` across `app/api/**/route.js` on
2026-08-24 → **35 files** (up from the 16 that used `resolveRequestUser*` at audit).

**Wrapped `withUser` (requireVerified true unless noted):**
`account/delete` · `ai/consume` · `auth/login-activity` · `library/delete` · `library/update` ·
`library/history` · `memory/all` · `memory/list` · `memory/save` · `memory/import` ·
`memory/import/preview` · `memory/[memoryId]` (the 6th memory route — dynamic) · `user/plan` ·
`user/subscription-status` · `support` · `support/bug` · `upload-file` ·
`generate-image` *(requireVerified:false; also closed an IDOR — the ownership query now **always**
includes `Query.equal('userEmail', userEmail)`, previously conditional)* ·
`razorpay/create-order` *(requireVerified:false)* ·
`website-builder/`: `create` · `credits` (GET) · `credits/deduct` *(the most dangerous — drained
another user's credits)* · `projects` · `status` · `generate` *(fixed the circular-ownership bug)* ·
`publish/[projectId]` · `revision/[projectId]` · `rollback/[projectId]/[versionId]` ·
`update/[projectId]` · `credits/purchase` *(rv:false)* · `credits/verify-purchase` *(rv:false)* ·
`generate-image` *(no `ctx` — no email in body; protects paid A4F quota)* ·
`upload-image` *(no `ctx`; protects the storage bucket)*.

**Optional-auth (`resolveRequestUser(request, false)`):** `voice-ai` ·
`website-builder/project/[projectId]`.

**Deliberately NOT wrapped — do not "fix" these (they are authenticated by other means):**
- `generate-image/file` (GET) — image bytes served through `<img src>`; the random Appwrite
  `fileId` is the capability/secret. A bearer token is impossible here. The `userEmail` query param
  is a harmless secondary filter (wrong value → 404).
- `razorpay/webhook` (POST) — HMAC-authenticated. Server-to-server webhook branch verifies
  `X-Razorpay-Signature` with `RAZORPAY_WEBHOOK_SECRET`; the frontend "manual verification" branch
  verifies `order|payment` with `RAZORPAY_KEY_SECRET`. **Razorpay's own servers carry no Firebase
  token**, so `withUser` would break the webhook. See residual in §7.

**Left public (correct per Rule 7 — no identity needed):**
`website-builder/credits/packages` (public catalog) · `website-builder/published` (public list).
Their callers (`CreditPurchaseModal.jsx:47`, `snapshot/page.jsx:47`) correctly stay bare `fetch`.

## 5. Client callers converted to `authFetch` (this batch — website-builder)

`ChatBoxAiInput.jsx` (create) · `hooks/useCreditManager.js` (credits GET + deduct) ·
`CreditPurchaseModal.jsx` (purchase + verify-purchase; **packages left bare**) ·
`BuilderNavbar.jsx` (update ×2 + publish) · `BuilderSidebar.jsx` (rollback) ·
`EditorPanel.jsx` (upload-image + generate-image) ·
`website-builder/[projectId]/page.jsx` (project · status · update · revision · generate ×2) ·
`website-builder/preview/[projectId]/[[...versionId]]/page.jsx` (project — optional-auth: token
attached if logged in, else anonymous → published-only). The `?userEmail=` query strings on the
optional-auth calls are now vestigial (server derives email from the token) but harmless; left in
place to minimize churn (Rule 3). The generate-image cluster callers were converted in the prior
batch.

## 6. Regression avoided (Rule 4 / Rule 9): case-insensitive ownership

`assertEmail` returns the **normalized (lowercased)** token email, but older project docs stored
`user_email` in raw client casing. A strict `===` in `ensureProjectOwnership` would then **403 a
legitimate owner** whose stored email had mixed case. Fixed proactively in
`lib/website-builder-server-utils.js` — both sides normalized via `normalizeEmail` before compare.
Case-insensitive compare never breaks a true match nor creates a false one; new docs store the
normalized email (from `assertEmail`) going forward.

## 7. Residuals / deferred (not regressions introduced here)

- **`razorpay/webhook` manual-verify branch** trusts `user_email` from the body. The HMAC proves
  the *payment* is real but does **not** bind it to that email — so a payer could upgrade a
  *different* account (self-harm: they give away their own money; `order_id` is recorded). Low
  severity. A future refinement could route the frontend's manual verification through a
  `withUser`-wrapped endpoint while the true S2S webhook stays tokenless; not done now to avoid
  reworking a working payment path.
- **generate-image / website-builder upload-image residual:** an *authenticated* user could still
  attach an image record to another user's `projectId` (the write is scoped to the caller's email,
  not cross-checked against project ownership). Low severity; noted, not fixed.
- **Dead route:** `/api/delete-file` is still fetched at `image-gen/[libId]/page.jsx` (~830) and
  does not exist (Phase 0 §5). Removing a reference image 404s silently. Untouched here.

## 8. Validation performed

- `node --check` on all 16 edited `.js` server routes + `lib/website-builder-server-utils.js` →
  all OK. (`.jsx` cannot be `node --check`ed; `tsc --noEmit` does **not** validate `.jsx` here —
  see the `tsc-noemit-does-not-validate-jsx` gotcha.)
- Repo-wide sweep of every `/api/website-builder` reference (non-`app/api`, non-`.md`): every
  locked-route caller uses `authFetch`; only `credits/packages` + `published` remain bare `fetch`;
  no indirect (variable-built URL) bare-fetch caller exists.

## 9. Corrections to earlier notes

None are contradicted. This **updates the status** of `architecture_audit_phase0_aug24_2026.md` §5:
the "P0 — 29 routes" finding is now resolved — 27 wrapped (or optional-auth), 2 authenticated by
other means (`generate-image/file`, `razorpay/webhook`) and correctly left alone. Phase 0 §7's
remaining phases (2: unify the four classifiers; 3: consolidate the two auth verifiers + move
module-scope Maps to Appwrite; 4: artifact generation; 5: structured logging; 6: streaming) are
still the proposed sequence.
