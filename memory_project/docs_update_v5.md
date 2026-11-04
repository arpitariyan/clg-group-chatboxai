# Documentation Update Phase 4: Platform, Practices, Policies & Updates

## Summary of Changes
This document outlines the final set of updates made to the remaining 11 documentation files (Platform, Best Practices, Policies, and Updates). These changes complete the documentation overhaul, ensuring strict consistency across the entire API documentation for ChatboxAI.

### 1. Platform Features Updated
- **`evaluations.md`**: Updated model catalogs (`llama-3.3-70b`, `claude-4.5-sonnet`) and added explicit warnings that Automated API Evaluations are heavily rate-limited for Free tier users and better suited for Paid tier workflows.
- **`prompt-optimizer.md`**: Updated all API endpoints to strictly point to `https://chatboxai.co.in/api/v1` and updated model strings to the current catalog.
- **`external-models.md`**: Simplified the explanation of how ChatboxAI unifies multiple external LLM providers into a single payload format, and clarified data privacy guarantees.

### 2. Best Practices Updated
- **`deployment-checklist.md`**: Created a comprehensive launch checklist that explicitly asks developers to check for Free tier (300 req/day) caps and properly handle 429 and 402 HTTP error codes before going to production.
- **`accuracy-optimization.md`**: Directly linked accuracy improvements to the newly documented `Web Search` (for external facts) and `MCP Connectors` (for internal data) capabilities.

### 3. Policies & Rate Limits Enforced
- **`rate-limits.md`**: Hardcoded the explanation of the Free Tier limits (300 requests/day, 2 concurrent) versus Paid Tier (Usage-based, unlimited access) to completely eliminate ambiguity.
- **`permissions.md`**: Clarified the difference between `cbx_live_` (Production, billed) and `cbx_test_` (Dev, zero-cost, throttled) keys and how to apply IP allowlisting.
- **`terms-policies.md`**: Confirmed all support emails and URLs point to `chatboxai.co.in`. Explicitly stated the zero-retention data policy across providers.

### 4. Updates & Debugging
- **`changelog.md`**: Generated a brand new changelog reflecting the August 2026 launch of the unified Gateway, explicitly stating the new Paid/Free boundaries and listing the retired features.
- **`deprecations.md`**: Permanently documented the removal of legacy features (Conversation State, Streaming, Webhooks, File Inputs) so returning developers understand why they were removed from Phase 3.
- **`developer-mode.md`**: Confirmed the removal of legacy Webhook testing logic and cleaned up the `dev-mock-*` error simulation documentation.

## Result
The ChatboxAI API documentation is now fully standardized, technically accurate, and strictly enforces the business logic (Free vs Paid tier boundaries) defined across all features. Legacy endpoints have been fully scrubbed from the codebase.
