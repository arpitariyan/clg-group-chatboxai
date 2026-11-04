# Latest Updates

Stay up to date with new features, model additions, and API infrastructure improvements.

---

## 🚀 v1.1.0 — Multimodal & Unified Billing Expansion

**May 2025**

The ChatboxAI API has been significantly upgraded to support multimodal operations natively, all unified under our real-time credit billing system.

### New Features:
- **Images & Vision Endpoint (`POST /api/v1/images/generations`)**: Generate images programmatically using FLUX (Schnell/Dev) and Stable Diffusion models. Supports multiple sizes, quality settings, and dynamic provider fallbacks.
- **Audio & Speech Endpoint (`POST /api/v1/audio/speech`)**: Convert text to natural-sounding speech using Google TTS REST API (with automatic fallback to OpenAI TTS). Features 9 high-quality voices and multi-language support.
- **Responses API (`POST /api/v1/responses`)**: A new, streamlined endpoint that wraps chat completions. It simplifies requests (`input`, `instructions`) and returns a cleaner, structured response format. Perfect for standard interactions where raw OpenAI message arrays feel too heavy.

### Infrastructure:
- **Credit-Based Billing**: Replaced isolated token tracking with a unified USD credit system. Text, Image, and Audio generations now smoothly deduct from a single balance. Real-time cost is exposed in all API responses.
- **Documentation Overhaul**: The developer portal has been entirely restructured. We've added comprehensive quickstarts, deep-dive guides into prompting, and exact pricing breakdowns.

---

## v1.0.1 — Usage Analytics & Rate Limiting

**April 2025**

### Improvements:
- **Usage Analytics Dashboard**: Track your API consumption with detailed analytics in the dashboard. View token usage, cost breakdowns by model, and endpoint usage distribution.
- **Rate Limit Headers**: All API responses now include detailed standard rate limit information so you can handle backoff programmatically:
  - `X-RateLimit-Limit-Requests`
  - `X-RateLimit-Remaining-Requests`
  - `X-RateLimit-Limit-Tokens`
  - `X-RateLimit-Remaining-Tokens`
  - `X-RateLimit-Reset-In`

---

## v1.0.0 — Platform Launch

**March 2025**

### Initial Release:
- **Universal Gateway**: Launched the `POST /api/v1/chat/completions` endpoint with 100% OpenAI SDK compatibility.
- **Provider Agnostic**: Automatic routing and fallback between Groq, OpenRouter, Google, and OpenAI based on health and latency.
- **Search & Embeddings**: Released `POST /api/v1/search` for grounded search capabilities and `POST /api/v1/embeddings` for semantic vector representations.
- **API Key Management**: Dashboard capabilities for creating, naming, and rotating secure `cbx_live_*` API keys.
