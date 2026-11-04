# 03 — Implementation Plan: Prioritized Vertical Slices

This plan defines the ordered, testable implementation slices to resolve confirmed defects and deliver Lovable-parity user-facing capabilities in ChatBox AI Website Builder.

---

## Slice 1: P0 Security, Safe HTTP Mutations & Lifecycle Correctness

### Objectives
1. **Eliminate Mutating GET Handlers**:
   - Make `GET /api/website-builder/publish/[projectId]` strictly read-only (returns current publish state `{ is_published: boolean, projectId }`).
   - Make `GET /api/website-builder/rollback/[projectId]/[versionId]` strictly read-only (returns version details or 405 Method Not Allowed).
   - Ensure all mutation actions use authenticated `POST` with explicit desired state payload.
2. **Fix Premature `status: 'success'`**:
   - In `lib/website-builder-server-utils.js`, update `updateWebsiteProjectCode` to accept status options (`status = 'success'`, `generation_step = 'Complete'`).
   - In `inngest/functions.js:3533` (Step 7 `save-version`), update project code with `generation_step: 'Code saved'` and `status: 'generating'`, preserving intermediate state until Step 9 `finalize` marks `success`.
3. **Strengthen Generation Idempotency**:
   - Pass unique `generationJobId` in Inngest event and project record to prevent duplicate worker execution.

### Files to Modify
- `app/api/website-builder/publish/[projectId]/route.js`
- `app/api/website-builder/rollback/[projectId]/[versionId]/route.js`
- `lib/website-builder-server-utils.js`
- `inngest/functions.js`
- `test/website-builder/builder.test.js`

---

## Slice 2: WebContainer Runtime Resilience & Message Security

### Objectives
1. **Prevent Fake Ready when Server URL Missing**:
   - In `components/website-builder/WebContainerPreview.jsx`: In the `else` branch (server already running), require `WC.serverUrl` before setting `status('ready')`. If missing, trigger launch.
2. **Validate postMessage Origin & Source**:
   - Verify `event.source === iframeRef.current?.contentWindow` in `window.addEventListener('message')`.
3. **Clean Teardown**:
   - Ensure timeout and error states clean up timers and state properly.

### Files to Modify
- `components/website-builder/WebContainerPreview.jsx`

---

## Slice 3: Lovable Parity — Plan Mode & Requirements Approval

### Objectives
1. **Interactive Plan Mode**:
   - In `BuilderSidebar.jsx`: When Plan Mode is active, generate and display a structured editable plan (Goals, Routes, Components, Dependencies, Implementation Steps, Acceptance Criteria).
   - Require explicit user approval ("Approve Plan & Generate") before invoking code-modifying workers.
2. **Fast Build Mode**:
   - When Plan Mode is disabled, allow direct instant generation for fast prototyping.

### Files to Modify
- `app/_components/builder/BuilderSidebar.jsx`
- `app/(routes)/website-builder/[projectId]/page.jsx`

---

## Slice 4: Lovable Parity — Visual File Diff Viewer

### Objectives
1. **Before/After File Diffing**:
   - In `components/website-builder/CodePanel.jsx`: Add a "Diff" toggle comparing current file content against the previous version snapshot.
   - Highlight additions, deletions, and modified lines with clear visual feedback.

### Files to Modify
- `components/website-builder/CodePanel.jsx`

---

## Slice 5: Bounded Self-Repair & Diagnostics

### Objectives
1. **Strictly Bounded Auto-Fix**:
   - Limit auto-repair loop to a maximum of 3 attempts per issue.
   - Track error fingerprints (`errorType:errorMessage`). If the same error fingerprint repeats, halt auto-repair and notify user with diagnostic advice rather than burning credits.
2. **Preserve Last Known-Good Version**:
   - Always ensure previous version snapshot remains intact and rollback-ready if auto-fix fails.

### Files to Modify
- `app/(routes)/website-builder/[projectId]/page.jsx`
- `lib/error-analyzer.js`

---

## Slice 6: Regression Verification & Acceptance Testing

### Objectives
1. Execute unit and integration tests with `npm run test:builder`.
2. Add new test suites for:
   - Non-mutating GET publish and rollback behavior.
   - Lifecycle state preservation in `updateWebsiteProjectCode`.
   - File diff calculation helper.
   - Bounded auto-repair fingerprint detector.
