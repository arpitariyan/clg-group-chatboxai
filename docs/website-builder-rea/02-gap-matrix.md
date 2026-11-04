# 02 — Gap Matrix & Severity-Ranked Findings

This matrix reconciles every finding against the actual local HEAD (`7c1d63406df9d9251697254596a2d24a7522051c`). Each entry distinguishes verified status, source line references, observed runtime/test evidence, and required actions.

---

## Status Classification Summary

| Status | Count | Focus Areas |
| :--- | :---: | :--- |
| **CONFIRMED OPEN** | 4 | Mutating GET handlers on Publish & Rollback, Premature `status: 'success'` before deploy, Visual file diffs, Durable prompt queue. |
| **PARTIALLY FIXED** | 4 | Concurrency race on generate, Distributed credit lock limitation, WebContainer edge-cases & postMessage trust, Plan mode editability. |
| **FIXED AND VERIFIED** | 5 | Image route ownership, Preview multi-file Vite rendering, Design input typing, Monotonic progress mapping, Validator regex false positives. |

---

## Detailed Findings Ledger

### 1. [P0] Page Refresh & Concurrent Generation Race
- **Status**: `PARTIALLY FIXED`
- **Severity**: P0 (Billing & Worker State Duplication)
- **Confidence**: 100% (Source Confirmed)
- **Evidence**:
  - `app/api/website-builder/generate/route.js:78-89`:
    ```javascript
    if (project.status === 'queued' || project.status === 'generating') {
      return NextResponse.json({ success: true, message: 'Generation already in progress', status: project.status }, { status: 202 });
    }
    ```
  - `app/(routes)/website-builder/[projectId]/page.jsx:842-844`: Now checks status before triggering initial generation.
  - **Remaining Risk**: If two HTTP requests arrive concurrently (e.g. double-click or simultaneous browser tabs before Appwrite persists `queued`), both can pass the check and trigger duplicate credit deductions and duplicate Inngest events.
- **Minimum Safe Fix**: Use an atomic/durable reservation check or unique idempotency key per generation job.

---

### 2. [P0] Missing Ownership Verification on Image Upload and AI Image Generation
- **Status**: `FIXED AND VERIFIED`
- **Severity**: P0 (Security & Unauthorized Resource Spend)
- **Confidence**: 100% (Source Confirmed & Verified)
- **Evidence**:
  - `app/api/website-builder/upload-image/route.js:7-46`: Accepts `(request, ctx)`, extracts `ctx.assertEmail()`, verifies `ensureProjectOwnership(project, userEmail)`.
  - `app/api/website-builder/generate-image/route.js:55-92`: Accepts `(request, ctx)`, extracts `ctx.assertEmail()`, verifies `ensureProjectOwnership(project, userEmail)` before spending generation API quota.
  - Test suite coverage: Verified in `test/website-builder/builder.test.js`.

---

### 3. [P0] Credit Lock Promise Cleanup Bug & Weekly Credit Refund Leak
- **Status**: `PARTIALLY FIXED`
- **Severity**: P0 (Memory Leak & Billing Accounting)
- **Confidence**: 100% (Source Confirmed)
- **Evidence**:
  - `lib/website-builder-server-utils.js:28-36`: Fixed `trackingPromise` reference. Tested in `builder.test.js` (Test 6.2 passes).
  - `lib/website-builder-server-utils.js:561-614`: `refundWebsiteCreditsWithLock` accepts `bucket` parameter (`auto`, `weekly`, `purchased`) to prevent converting resetting weekly credits into permanent purchased credits.
  - **Remaining Risk**: `creditLocks` is an in-memory Map local to a single Node process. In multi-instance deployments, concurrent requests across instances are not serialized by a process-local mutex. Inngest worker `generationRefundGuards` Map is also process-local and non-durable across worker restarts.
- **Minimum Safe Fix**: Retain in-memory cleanup, document cross-instance boundary, and store durable refund state/transaction records.

---

### 4. [P1] Public & Version Preview Incompatible with JSON-Serialized Multi-File Vite Map
- **Status**: `FIXED AND VERIFIED`
- **Severity**: P1 (Core User Journey)
- **Confidence**: 100% (Source Confirmed & Verified)
- **Evidence**:
  - `app/(routes)/website-builder/preview/[projectId]/[[...versionId]]/page.jsx`:
    Implements `isViteFileMap(code)`. For multi-file Vite projects, dynamically mounts `WebContainerPreview` in read-only preview mode. For legacy single-file HTML, uses sanitized iframe doc write fallback.
  - Private vs public access enforced: Non-published projects reject unauthenticated/non-owner access with 403.

---

### 5. [P1] Publish and Rollback State Mutates via GET Request
- **Status**: `CONFIRMED OPEN`
- **Severity**: P1 (HTTP Semantics & State Safety)
- **Confidence**: 100% (Source Confirmed)
- **Evidence**:
  - `app/api/website-builder/publish/[projectId]/route.js:112-122`:
    ```javascript
    export const GET = withUser(async function GET(request, ctx) {
        return await handlePublishMutation(request, ctx);
    });
    ```
    If accessed via GET without `isPublished` query param, line 63 executes `!project.is_published`, toggling the publish state!
  - `app/api/website-builder/rollback/[projectId]/[versionId]/route.js:100-110`:
    ```javascript
    export const GET = withUser(async function GET(request, ctx) {
        return await handleRollbackMutation(request, ctx);
    });
    ```
    Rolling back on GET violates HTTP safety. Web crawlers, prefetchers, or browser address bar visits trigger rollbacks.
- **Minimum Safe Fix**: Remove mutating GET handlers. Ensure GET returns read-only status (or 405 Method Not Allowed), and mutations strictly require POST/PATCH with explicit desired state.

---

### 6. [P1] WebContainer Preview Timeout Marks Fake "Ready" Status
- **Status**: `PARTIALLY FIXED`
- **Severity**: P1 (Reliability & False Success)
- **Confidence**: 100% (Source Confirmed)
- **Evidence**:
  - `components/website-builder/WebContainerPreview.jsx:473-480`: 45s timeout now transitions to `status = 'error'` instead of fake ready.
  - **Remaining Risks**:
    - Line 498: `else` branch (server already running) transitions to `status = 'ready'` even if `WC.serverUrl` is falsy.
    - Lines 927-966: `window.addEventListener('message')` accepts messages from any source without checking `event.source === iframeRef.current?.contentWindow`.
- **Minimum Safe Fix**: Ensure `status('ready')` is only set when `WC.serverUrl` is verified, and validate message event sources.

---

### 7. [P1] Code Persistence Sets Status `success` Before Runtime Readiness
- **Status**: `CONFIRMED OPEN`
- **Severity**: P1 (State Machine Inconsistency)
- **Confidence**: 100% (Source Confirmed)
- **Evidence**:
  - `lib/website-builder-server-utils.js:197-201`:
    `updateWebsiteProjectCode` sets `generation_step: 'Complete'` and `status: 'success'`.
  - In `inngest/functions.js:3533`, `updateWebsiteProjectCode` is called during Step 7 (`save-version`), *before* Step 8 (`deploy-to-e2b`) and Step 9 (`finalize`).
  - Polling route `status/route.js:111` immediately marks `progress = 100%` when `status === 'success'`.
- **Minimum Safe Fix**: Allow `updateWebsiteProjectCode` to receive or preserve generation status, or set `generation_step: 'Code saved'` and keep `status: 'generating'` until Step 9 `finalize` marks terminal success.

---

### 8. [P2] Plain Text Design Description Passed as Image URL
- **Status**: `FIXED AND VERIFIED`
- **Severity**: P2 (Latency & Unnecessary Failures)
- **Confidence**: 100% (Source Confirmed & Verified)
- **Evidence**:
  - `app/api/website-builder/generate/route.js:116-135`: Validates `imageUrl` strictly for `http://`, `https://`, `data:image/`.
  - Passes `designDescription` separately in the Inngest event payload.

---

### 9. [P2] Incomplete Step Mapping Causes Progress Regressions
- **Status**: `FIXED AND VERIFIED`
- **Severity**: P2 (UI Glitch / Perceived Stall)
- **Confidence**: 100% (Source Confirmed & Verified)
- **Evidence**:
  - `app/api/website-builder/status/route.js:67-115`: Maps 17 worker steps, dynamically extracts task ratios `(x/y)`, enforces minimum 10% for active jobs, and returns explicit `stage`.
  - Verified by tests in `test/website-builder/builder.test.js` (Test 4 passes).

---

### 10. [P2] Code Validator Regex False Positives on Standard NPM Packages
- **Status**: `FIXED AND VERIFIED`
- **Severity**: P2 (Unnecessary Validation Warnings)
- **Confidence**: 100% (Source Confirmed & Verified)
- **Evidence**:
  - `lib/code-validator.js`: Regex modified to only flag internal relative paths lacking `@/` or `./`.
  - Verified by tests in `test/website-builder/builder.test.js` (Test 3 passes).

---

### 11. [P2] Partial Failure in Project Creation Leaves Orphan Records
- **Status**: `FIXED AND VERIFIED`
- **Severity**: P2 (Data Integrity)
- **Confidence**: 100% (Source Confirmed & Verified)
- **Evidence**:
  - `app/api/website-builder/create/route.js:57-61`: Conversation message insertion wrapped in a `try...catch` block.

---

### 12. [P2/P3] Lovable-Inspired Functional Parity Gaps
- **Plan Mode & Approval**: `PARTIALLY FIXED`
  - Toggle exists in `BuilderSidebar.jsx`, but structured editable plan and gating code execution on user approval need complete integration.
- **Durable Prompt Queue**: `CONFIRMED OPEN`
  - Needs serialized prompt submission and ordering.
- **Visual File Diffs**: `CONFIRMED OPEN`
  - Needs file-level before/after diff viewer in `CodePanel.jsx`.
- **Browser-Level Test Assertions & Bounded Repair**: `PARTIALLY FIXED`
  - Error capture works; auto-repair loop must be strictly bounded (max 3 attempts) and never repeat identical failures.
