# Deprecations & Retirements

As ChatboxAI evolves, we occasionally retire older features, endpoints, or models to focus our infrastructure on providing a faster, more unified experience.

---

## 1. Feature Retirements (Phase 3)

The following advanced networking and state management features have been **permanently removed** from the ChatboxAI API to streamline our architecture for the unified gateway:

### Removed Features
- **Server-Side Conversation State:** Client applications must now manage their own conversation history arrays and pass the full `messages` array in each request.
- **Token Streaming (Server-Sent Events):** The API currently returns full JSON completions upon generation finish. Real-time token streaming has been disabled.
- **Webhooks:** Asynchronous task notifications via Webhooks are no longer supported. All API requests are now synchronous.
- **File Inputs Endpoint:** Direct file uploading via the API for extraction has been deprecated. If you need to analyze files, please pass base64 encoded data (for images) or use an MCP Connector for document retrieval.

*All documentation referencing these features has been removed from `chatboxai.co.in/docs`.*

---

## 2. Model Deprecation Policy

Because ChatboxAI acts as a gateway to external providers (like Google, OpenAI, Anthropic), we are subject to their model lifecycles.

When an upstream provider announces the deprecation of a specific model (e.g., `gemini-1.0-pro`), ChatboxAI will:

1. **Provide Notice:** We will post a notice in the Dashboard and email developers actively using the model at least 30 days prior to the shutdown.
2. **Auto-Routing (Fallback):** If you do not update your application in time, ChatboxAI will automatically route requests for the deprecated model to the closest, most capable equivalent (e.g., automatically routing `gemini-1.0-pro` traffic to `gemini-1.5-flash`).

We highly recommend developers dynamically fetch the available models from the `/api/v1/models` endpoint rather than hardcoding specific model strings if long-term stability is required without maintenance.
