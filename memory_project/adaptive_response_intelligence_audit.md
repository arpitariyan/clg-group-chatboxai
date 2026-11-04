# Architecture Audit: AI Response Pipeline & Current-to-Target Map

**Date:** 2026-10-25  
**System:** ChatBox AI (Renewal)  
**Role:** Senior AI Systems Architect, Full-Stack Engineer, AI Evaluation Engineer  

---

## 1. Executive Summary & Repository Audit

ChatBox AI is a full-stack Next.js 16 web application providing multi-model AI chat, deep research, file analysis, image generation, and third-party application automation.

### Current Tech Stack
- **Frontend Framework:** Next.js 16 (App Router, Turbopack, React 18.3.1, Tailwind CSS v4, Lucide React, Framer Motion)
- **API & Server Architecture:** Next.js Serverless Route Handlers (`app/api/`)
- **Backend Job Execution Substrate:** Inngest (`inngest/functions.js`, client id `chatbox-ai`)
- **Primary Database & Storage:** Appwrite (37 collections, file storage)
- **Identity & Auth:** Firebase Client Auth + Server verification (`lib/server-auth.js` via Google Identity Toolkit)
- **LLM Providers Supported:** Groq, Google Gemini, OpenRouter, NVIDIA, Replicate, Anthropic, OpenAI
- **Key Pools & Failover:** Multi-key rotation with automatic provider fallback chains (`lib/models-registry.js`, `inngest/functions.js`, `lib/ai-client.js`)
- **Current Streaming & Delivery Model:** Asynchronous execution in Inngest background jobs. `DisplayResult.jsx` polls Appwrite every 1.5s until `chat.aiResp` is populated, followed by rich client rendering (`StreamingText`, Typewriter, Markdown, Tool Call Cards).

---

## 2. End-to-End Request-to-Response Tracing

```
[User Input in ChatBoxAiInput / DisplayResult]
         │
         ▼
[POST /api/llm-model]
   ├─ resolveRequestUserEmail(req) -> 403 on session mismatch
   ├─ classifyRequest(searchInput) -> RequestClass & Token Budget
   ├─ resolveModel(selectedModel) -> Initial model candidate
   └─ inngest.send({ name: "llm-model", data: {...} }) -> returns inngestRunId
         │
         ▼
[Inngest Background Job: llmModel (inngest/functions.js)]
   ├─ Step 1: check-incognito (Appwrite Library check)
   ├─ Step 2: resolve-model-with-budget (BudgetRouter & credit reservation)
   ├─ Step 3: Context Assembly (recentConversationContext with reverse token budget + memoryContext)
   ├─ Step 4: MCP Tool Context (prepareMCPContext & tool-router)
   ├─ Step 5: buildStrictPrompt (Intent guidance + PEARL protocol if enabled)
   ├─ Step 6: generate-ai-response (executeModelWithFallback across Groq/Gemini/OpenRouter/Replicate/NVIDIA)
   ├─ Step 7: settle-budget-usage (settle credit reservation against actual tokens)
   ├─ Step 8: refine-ai-response (MCP tool execution + refineAiResp / refineResearchResp + relevance score)
   └─ Step 9: saveToDb (Write final aiResp, usedModel, modelApi to Appwrite chats collection)
         │
         ▼
[Client Polling in DisplayResult.jsx]
   └─ Polls Appwrite /api/search/chats every 1500ms -> detects aiResp -> renders to user
```

---

## 3. Existing Foundations — Reuse vs. Gaps

| Component / Subsystem | Current State | Target Enhancement |
|---|---|---|
| **Intent Understanding** | `lib/user-intent.js` + `services/Shared.jsx` | Unify heuristic signals, add explicit ambiguity detection, format expectations, and intent contracts |
| **Complexity Intelligence** | Rudimentary `queryComplexity` ('simple', 'medium', 'complex') | Introduce formal 4-tier complexity (LOW, MEDIUM, HIGH, CRITICAL) controlling pipeline compute depth |
| **Answer Contract** | Informal instructions in prompt string | First-class Answer Contract: depth, structure, tone, format constraints, citation rules |
| **Deterministic Verification** | Basic fence check in `lib/evaluation-engine.js` | Full deterministic validator: balanced code blocks, JSON schema/Zod, hallucination check, citations |
| **Quality Evaluation** | Basic 4-point check in `evaluation-engine.js` | Multi-dimensional task-aware Critic (correctness, relevance, completeness, hallucination risk) |
| **Adaptive Refinement** | Static `refineAiResp` text trimmer | Adaptive closed-loop refinement (Generate -> Critic -> Refine -> Verify, max 2 passes) |
| **Confidence Engine** | Static string in prompt | Calculated confidence score (HIGH, MEDIUM, LOW) based on evidence grounding & evaluator agreement |
| **Hallucination & Contradiction** | Informal prompt instructions | Explicit Claim Grounding against retrieved sources & contradiction detector for conversation history |
| **Memory System** | `lib/memory-context.js` keyword search | Structured memory tiers (conversation, user preferences, failure patterns, success patterns) |
| **Evaluation Dataset & Benchmark** | 7 scenarios in `lib/eval-benchmark.js` | Comprehensive golden evaluation dataset with baseline vs candidate regression metrics |

---

## 4. Phase Plan

1. **Phase 1:** Install & configure `.agents/skills/adaptive-response-intelligence/` with full specifications, scripts, and references.
2. **Phase 2–8:** Build the core response intelligence modules (Intent, Complexity, Context, Contract, Tool Routing, Model Selection).
3. **Phase 9–16:** Build Response Generation, Multi-Dimensional Critic, Deterministic Verification, Adaptive Refinement, Confidence Engine, Hallucination Defense, and Contradiction Detection.
4. **Phase 17–20:** Build Structured Memory (Conversation, Preferences, Failure Memory, Success Memory, Feedback).
5. **Phase 21–28:** Golden Evaluation Dataset, Regression Suite, Prompt Compiler, Model Adapters, Adaptive Compute & Stopping.
6. **Phase 29–37:** Offline Improvement Pipeline, Semantic Cache, Observability/Telemetry, Resilience & Circuit Breaker, Security & UX.
7. **Phase 38–43:** Comprehensive Test Suite, Baseline vs. Candidate Quality Benchmarks, Production Integration & Final Report.
