# Documentation Update Phase 3: Capabilities & Cleanup

## Summary of Changes
This document outlines the updates made to the "Capabilities" section of the ChatboxAI documentation, as well as the removal of deprecated pages, in accordance with the project's new feature availability and billing logic.

### 1. Updated Pages

#### **`web-search.md`**
- **Paid Tier Restriction**: Explicitly documented that Web Search is exclusively available to Paid plan users due to infrastructure costs. Free tier users will receive a `403 Forbidden` error.
- **Internal Mechanics**: Explained how the AI pauses generation to fetch real-time data, parse the DOM, and return grounded answers with citations.
- **Future API Roadmap**: Added a new section announcing the upcoming dedicated `/api/v1/search` endpoint that will allow direct search capability without an LLM.

#### **`mcp-connectors.md`**
- **Tier Limits Applied**: Clearly defined that Free plan users are limited to 100 MCP connection requests per day, while Paid users have unlimited access.
- **Protocol Explanation**: Simplified the explanation of the Model Context Protocol (MCP) as an open standard for bridging third-party SaaS apps to ChatboxAI.
- **Security Best Practices**: Added clear warnings to trigger MCP connections from secure backend servers rather than frontend clients.

#### **`skills.md`**
- **Clear Differentiation**: Restructured the top of the page to definitively explain the difference between Tools (local), Connectors (remote data fetch), and Skills (serverless code execution on ChatboxAI edge).
- **Custom Sandbox details**: Documented the Wasm sandbox limitations for custom JS/TS skills (10s timeout, 128 MB RAM).
- **Pricing**: Maintained accurate cost descriptions for running built-in skills vs custom JavaScript logic.

### 2. Cleanup & Deletions
The following documentation pages representing services that are no longer offered directly via the API provider were permanently deleted from the codebase:
- `conversation-state.md`
- `streaming-websocket.md`
- `webhooks.md`
- `file-inputs.md`

#### **References Removed**
- Removed all corresponding sidebar links from `components/docs/Sidebar.jsx`.
- Removed the "Streaming" feature card from the main `app/docs/page.jsx` overview page.
- Removed the "Validating Webhook Signatures Locally" section from `app/docs/md/developer-mode.md`.
- Removed the `webhooks` reference from the main `README.md`.

## Result
The capabilities documentation is now highly accurate, reflecting the true limits of the Free vs Paid tiers for MCP and Web Search. Furthermore, all obsolete features have been scrubbed from the project to avoid developer confusion.
