# PEARL Method - aiResp Response Logic Upgrade (Aug 10, 2026)

## Summary
Integrated the PEARL Method framework (Parse, Extract, Approach, Resolve, Look Back) into the AI response generation pipeline for both Search and Deep Research modes. This is a pure **additive upgrade** — no existing logic was replaced.

---

## Files Modified / Created

### NEW: `lib/prompts/pearlSystemPrompt.js`
- `getPearlSearchInstruction(queryComplexity)` — PEARL task instructions for search, adapts by complexity (simple/medium/complex)
- `getPearlResearchInstruction()` — Full 7-stage PEARL research protocol
- `getVerificationFooter(mode)` — Pre-output self-check checklist for AI
- `getEdgeCaseRules()` — Handles ambiguous queries, outside knowledge, multi-intent, frustrated users
- `getCondensedPearlInstruction()` — Pre-verified fallback (<150 tokens) when budget exceeded

### MODIFIED: `lib/prompts/deepResearchPrompt.js`
- `getDeepResearchBlueprint()`: Added cross-verification mandate, conflict explanation requirement, per-finding confidence grading, and structured output order (overview → sections → table → recommendation)
- `getDeepResearchThinkingInstruction()`: Integrated full 5-stage PEARL reasoning (Parse→Extract→Approach→Resolve→Look Back) within the existing 150-200 word limit

### MODIFIED: `services/Shared.jsx`
- `detectResponseSignals()`: Added `hasComparisonSignals`, `hasDecisionSignals`, `hasResearchDepthSignals`
- `detectResponseIntent()`: Added two new intent types: `comparison` (structured comparison + table), `decision_making` (recommendation-led answer); Added `queryComplexity` field (`simple`/`medium`/`complex`) as single source of truth

### MODIFIED: `lib/reasoning-utils.js`
- Added comparison markers: `vs`, `better`, `best`, `konsa`, `sabse acha`, etc.
- Added decision markers: `should i`, `worth it`, `kya karu`, etc.
- Added research depth markers: `research`, `deep dive`, `comprehensive`, etc.

### MODIFIED: `inngest/functions.js`
- **Imports**: Added `pearlSystemPrompt.js` imports
- **`buildStrictPrompt()`**: PEARL layer appended after existing blueprints; reads flags `ENABLE_PEARL_SEARCH`, `ENABLE_PEARL_RESEARCH`, `ENABLE_PEARL_SIGNALS`; combined token enforcement using `estimateTokenCount()` with 500-token hard limit
- **`refineResearchResp()`**: Honest confidence: appends `✅ FINAL CONFIDENCE LEVEL: Not Assessed` if AI omitted it; Active contradiction remediation: flexible regex detection + safety disclaimer appended to user response
- **`refineAiResp()`**: Passive relevance score telemetry logging (no arbitrary threshold enforcement yet — data collection first)

---

## Feature Flags (in `.env`)
```
ENABLE_PEARL_SEARCH=true        # PEARL for regular search mode
ENABLE_PEARL_RESEARCH=true      # PEARL for deep research mode  
ENABLE_PEARL_SIGNALS=true       # New signals (comparison, decision) in Shared.jsx
```
**Dependency Rule**: `ENABLE_PEARL_SEARCH` or `ENABLE_PEARL_RESEARCH` requires `ENABLE_PEARL_SIGNALS`. If signals is off but others are on, a warning is logged and complexity defaults to `medium` to prevent crashes.

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Additive, not replacing | Zero regression risk on existing working logic |
| Single source of truth for complexity | `queryComplexity` computed in `detectResponseIntent()` and passed through — no duplicate classification in pearlSystemPrompt.js |
| Combined token budget (not per-function) | Prevents individual-OK-but-combined-too-large scenario |
| "Not Assessed" instead of fake confidence | Honest > misleading; source count doesn't equal information quality |
| Active remediation for missing contradiction flag | Regex-based flexible detection → safety disclaimer appended to user output |
| Passive relevance logging | Collect data distribution before setting any threshold |
| No language rule added | `languageMode: 'auto'` in existing system already handles this |

---

## Rollback Strategy
- All features are behind env flags — instant rollback by setting flags to `false`
- Rollback triggers: latency +20%, error rate >2%, token usage >90%, thumbs-down rate +15% vs 7-day average

## Also Fixed in This Session
- `GET /api/research` 401 error: Added `Authorization: Bearer <token>` headers to all 3 `/api/research` fetch calls in `DisplayResult.jsx` (GET usage check + 2× POST research calls)
