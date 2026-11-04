# Phase 0 — Repository Audit & Current-State Architecture Map

**Date:** 2026-08-24
**Scope:** Read-only audit. No code changed. Commissioned by the "CHATBOX AI — MASTER UPGRADE &
IMPLEMENTATION PROMPT" (§0–§68), whose closing instruction was: audit first, do not implement large
changes, then proceed incrementally from the highest-leverage foundation change.

This note is **binding for all later phases**. It records what exists so no future pass re-derives
it, and — more importantly — it records what must **not** be added.

---

## 1. Measured facts (not estimates)

| Metric | Value |
|---|---|
| Total LOC | 101,112 |
| `app/` files | 226 |
| `lib/` files | 91 |
| `components/` files | 57 |
| `services/` / `contexts/` / `hooks/` | 8 / 8 / 6 |
| API route files | **98** (one is `.jsx` — `app/api/get-inngest-status/route.jsx`) |
| Appwrite collections | **37** |
| App-registry tools | **97** across 8 apps, **31** requiring confirmation |
| `console.*` calls | **1,028** (477 error / 296 warn / 253 log / 2 info) |
| Test files | **0** |
| npm scripts | `dev`, `build`, `start` — **no lint, no test, no typecheck** |
| Streaming primitives in routes | **0** |

## 2. Runtime architecture

```
Next.js 16 (App Router, Turbopack) · React 18.3.1 · Tailwind v4 · type: module
    │
    ├── Identity ......... Firebase Auth (client) + two server verifiers (see §5 Duplicate truth)
    ├── Database ......... Appwrite — the ONLY database. 37 collections.
    ├── File storage ..... Appwrite Storage
    ├── Background jobs .. Inngest (client id "chatbox-ai")
    ├── Payments ......... Razorpay
    ├── Email ............ Resend + nodemailer
    └── LLM providers .... Groq · OpenRouter · Google Gemini · NVIDIA · A4F · Replicate ·
                           Anthropic · OpenAI  — key pools with per-key cooldowns
```

There is **no queue, no vector DB, no state-management library, no observability platform, and no
second database.** Per Rule 2, none may be added; the substrates above already cover §37, §58,
§61 and §62 of the master prompt.

## 3. Request lifecycle — the main answer path (traced end to end)

```
ChatBoxAiInput.jsx / DisplayResult.jsx
  → POST /api/llm-model                                    ← app/api/llm-model/route.js (205 ln)
        resolveRequestUserEmail(request)                    ← lib/server-auth.js
        403 if body email !== authenticated email           ← the CORRECT pattern, see §6
        classifyRequest(searchInput, {responseMode})        ← lib/request-classifier.js
        resolveModel(...) with layered fallbacks            ← lib/budget-router.js
        inngest.send({ name: "llm-model", data: {...} })
        returns inngestRunId.ids[0]
  → Inngest `llmModel`                                     ← inngest/functions.js:2344–2898
        buildConversationMemoryContext()                    ← lib/memory-context.js (keyword-ranked)
        prepareMCPContext → buildMCPSystemPrompt(97 tools)  ← lib/mcp-connector.js
        executeModelWithFallback → provider fan-out
        processMCPResponse → parseToolCalls (REGEX over model text)
                           → tool-executor.execute()       ← lib/tool-executor.js (3699 ln)
                           → formatToolResults → follow-up round
        writes `aiResp` into Appwrite `chats`
  → client polls GET /api/search/chats?chatId=… every 2000 ms
        max 150 checks (600 for Canva), 8 consecutive errors tolerated
        ← DisplayResult.jsx:1630–1740
  → setSearchResult → GetSearchRecords()
```

Four other entry points exist, each with its **own** pipeline: `/api/analyze` (files + homegrown
RAG), `/api/research` (Deep Research, own intent layer), `/api/deep-search` (Tavily + DDG cache),
`/api/v1/*` (public OpenAI-compatible surface, auth via `lib/api-gateway.js`).

## 4. What already satisfies the master prompt — REUSE, DO NOT REBUILD

| Prompt section | Already implemented in | Notes |
|---|---|---|
| §16 capability model, §14 approval gating | `lib/app-registry.js` (1798 ln) | 97 tools, per-tool `requiresConfirmation` + `requiredScopes` + parameter schemas |
| §37 long-running tasks, §62 no new queue | Inngest | already the background substrate |
| §61 no new database | Appwrite, 37 collections | incl. `tool_execution_logs`, `website_task_logs`, `website_versions`, `website_error_logs` |
| §46 artifact quality gates | `lib/task-executor.js` (1765 ln) | the ONLY generate → validate → classify → repair loop in the repo; **the template to copy** |
| RAG without a vector DB | `app/api/analyze/route.js` (1298 ln) | `CHUNK_SIZE=1200`, `CHUNK_OVERLAP=250`, `MAX_RETRIEVED_CHUNKS=6`, keyword ranking |
| §39 cost control, §40 model routing | `lib/budget-router.js` + `lib/credit-engine.js` + `model_catalog` | reserve → settle → refund, dual wallet |
| §33 confirmation-before-act | `requiresConfirmation` on 31 of 97 tools | |
| identity done right | `app/api/llm-model/route.js:34-40` | authenticate, then 403 on email mismatch |

## 5. Weaknesses found (verified, not inferred)

### P0 — Unauthenticated identity, 29 routes
These routes take the acting user's identity from **client-supplied input** (`email` / `userEmail` /
`user_email`, body or query) with **no token verification at all**:

`account/delete` · `ai/consume` · `auth/login-activity` · `generate-image` · `generate-image/file` ·
`library/delete` · `library/history` · `library/update` · `memory/all` · `memory/list` ·
`memory/save` · `memory/import` · `memory/import/preview` · `razorpay/create-order` ·
`razorpay/webhook` · `support` · `support/bug` · `user/plan` · `user/subscription-status` ·
`voice-ai` · `website-builder/create` · `website-builder/credits` · `website-builder/projects` ·
`website-builder/project/[projectId]` · `website-builder/publish/[projectId]` ·
`website-builder/revision/[projectId]` · `website-builder/rollback/[projectId]/[versionId]` ·
`website-builder/status` · `website-builder/update/[projectId]`

Impact, given only a victim's email address: read their chat/library history and memories, read
their plan and subscription, **burn their model credits** (`/api/ai/consume` accepts
`{user_email, model, operation_type, cost}`), spend website credits, read/modify/publish/roll back
their website projects, and **irreversibly cascade-delete their account** — `DELETE
/api/account/delete` guards only with `if (email === 'arpitariyanm@gmail.com')`.

`website-builder/generate` is circular rather than absent: it 401s on a missing `userEmail`, then
calls `ensureProjectOwnership(project, userEmail)` — checking ownership against the attacker's own
input.

Counts: only **16** routes call `resolveRequestUser*`; **20** touch `firebase-admin`.

### Duplicate truth (§56 violation)
Two server-side verification paths: `lib/server-auth.js` (POSTs to Google
`identitytoolkit…:lookup` — **a network round-trip per request**) and `lib/firebase-admin.js`
`adminAuth` (used by `app/api/apps/execute/route.js`). Consolidate; do not add a third.

### Per-instance state that pretends to be global
Module-scope `new Map()` holds credit locks, credit reservations, rate-limit counters, API-key
cooldowns and Canva job state across `lib/budget-router.js`, `lib/credit-engine.js`,
`lib/rate-limiter.js`, `lib/api-credits.js`, `lib/api-key-manager.js`, `lib/canva-connect.js`,
`lib/website-builder-server-utils.js`. On a multi-instance deploy the locks and limits are not
actually enforced, and everything is lost on cold start. Bears on §35 idempotency and §39 cost
control.

### Four uncoordinated classifiers, no unified intent
- `lib/request-classifier.js` → **budget sizing only**
- `lib/tool-router.js` → app/tool routing
- `lib/search-utils.needsSearch` → retrieval decision
- `app/api/research/route.js` `detectQueryIntent` / `analyzeIntentWithLLM` → research planning
- plus `isModelIdentityQuery` / `isCreatorQuery` special cases inside `inngest/functions.js`

There is **no** `TaskSpec`, `successCriteria`, `desiredOutcome`, `autonomyLevel` or
`acceptanceCriteria` anywhere in the codebase. Phase 2 must **unify these four**, not add a fifth.

### Compensating hacks that mark the real defect
`lib/mcp-connector.js` contains `isHallucinatedAction(aiResponse, originalQuery)` and
`forceToolExecution(...)`. These exist because tool calling is a **regex over model prose**
(`parseToolCalls`) rather than native provider function calling. The hacks are the symptom; the
text protocol is the cause.

### Small confirmed defects
- `/api/delete-file` is fetched at `app/(routes)/image-gen/[libId]/page.jsx:830` — **the route does
  not exist**. Removing an uploaded reference image 404s silently.
- `middleware.js:31` declares `const ADMIN_PREFIX = '/api/admin'` and never uses it; its own
  docblock claims admin-route auth enforcement that is not implemented. No `app/api/admin` exists.
- `@clerk/nextjs` is installed and referenced **nowhere** in `app`, `lib`, `components`, `contexts`
  or `middleware.js`.

## 6. Genuinely missing capabilities (§6 Rule: do not fabricate)

1. **No artifact generation.** No PDF/DOCX/XLSX/PPTX **writer** anywhere. `xlsx`, `pdf-parse`,
   `mammoth`, `pdfjs-dist` are **read-only** ingestion. §30–§32 and §46 describe capabilities that
   do not exist. This is the one gap likely to justify a new package under Rule 63.
2. **No streaming.** Zero `ReadableStream` / `TransformStream` / `text/event-stream` across all 98
   routes. Answers arrive via the 2-second DB poll above. Any "streaming" in the UI is a
   client-side typewriter over an already-complete string.
3. **No unified intent model.** See §5.
4. **No project brain / decision memory.** No `project_brain`, `project_memory`, `project_context`
   or `decision_memory` collection exists. §41–§44 have `conversation_memory` +
   `services/memory-service.js` + `lib/memory-context.js` as their only foundation — keyword
   scoring, no embeddings.
5. **Zero tests, zero lint.** No jest/vitest/playwright config, no ESLint. §52's test strategy has
   no foundation to build on.
6. **No structured logging.** 1,028 `console.*` calls. But `usage_logs`, `model_usage_events`,
   `tool_execution_logs` and `credit_transactions` **already exist** as the §58 substrate — reuse
   them, do not add a platform.

## 7. Phase sequence proposed (highest leverage first)

**Phase 1 — `withUser()` / RequestContext wrapper.** One wrapper over `lib/server-auth.js`
resolving identity once, following the pattern already proven at `app/api/llm-model/route.js:34-40`.
Closes all 29 bypasses **and** creates the §6 Request Context object (taskId / correlationId /
userId / projectId / conversationId) that every later phase needs. Adds **no dependency**. This is
the single highest-leverage change in the repo — one abstraction, two payoffs.

**Phase 2 —** unify the four classifiers into one intent/TaskSpec layer.
**Phase 3 —** consolidate the two auth verifiers; move module-scope Maps into Appwrite.
**Phase 4 —** artifact generation (the only place a new package is likely warranted).
**Phase 5 —** structured logging over the four existing log collections.
**Phase 6 —** streaming, or a token-progress channel, replacing the 2 s poll.

## 8. Explicitly NOT added (Rule 2 record)

No new database (Appwrite's 37 collections suffice) · no new queue (Inngest already runs) · no
vector DB (keyword chunk retrieval already works in `/api/analyze`) · no observability platform
(four log collections already exist) · no state-management library · no new auth provider · no
new AI provider · no workflow engine.

## 9. Corrections to earlier notes

None. This note adds a layer the existing 38 notes in `memory_project/` did not cover
(system-wide architecture); it does not contradict any of them. The composer/UI notes
(`composer_redesign_aug24_2026.md`, `result_ui_design_unification_aug23_2026.md`,
`streaming_text_component_aug23_2026.md`) remain accurate and in force — note that the
"streaming text" component there is a **client-side typewriter**, consistent with §6.2 above.
