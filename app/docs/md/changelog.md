# Changelog

Stay up-to-date with the latest features, model additions, and API improvements to the ChatboxAI platform.

---

## August 2026: The Unified Gateway Release

### 🚀 Major Documentation Overhaul
We have completely rewritten and standardized our developer documentation to reflect our new architecture at **chatboxai.co.in**.

- **Unified Interface:** Fully documented how developers can access 56+ models across Google, Anthropic, Meta, and DeepSeek using a single OpenAI-compatible `/v1/chat/completions` endpoint.
- **Free vs Paid Clarity:** Established strict documentation boundaries regarding the Free Tier (300 requests/day, standard models) vs the Paid Tier (Usage-based, unlimited access, premium models).
- **Web Search API:** Web search is now officially documented as a Built-in Tool exclusively for Paid plan users, allowing models to cite real-time internet data.
- **MCP & Connectors:** Launched documentation for integrating private data using the Model Context Protocol.

### 🛑 Feature Retirements
To stabilize our core API gateway, the following features have been permanently deprecated:
- Server-Sent Events (Streaming)
- Asynchronous Webhooks
- Server-side Conversation State
- Direct File Input endpoints

See the [Deprecations](/docs/deprecations) page for more details.

---

## June 2026: Model Catalog Expansion

- **Added:** `chatboxai/claude-4.5-sonnet` (Paid Tier) - Unmatched reasoning and coding capabilities.
- **Added:** `chatboxai/llama-3.3-70b` (Free & Paid Tier) - High-performance open-weights model.
- **Added:** `chatboxai/gemini-2.5-flash` (Free & Paid Tier) - Ultra-fast, low-latency multimodal model.

---

## March 2026: Developer Mode Beta

Launched [Developer Mode](/docs/developer-mode), allowing engineers to use `cbx_test_` API keys to securely test application logic without consuming USD credits. Features include mock routing and forced error simulation.
