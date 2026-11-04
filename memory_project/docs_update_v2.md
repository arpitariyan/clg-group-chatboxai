# Documentation Update v2

## Summary of Changes
This document outlines the major updates made to the ChatboxAI core documentation. The goal of this update was to make the documentation more complete, professional, easier to understand, and structurally aligned with a production-ready API platform.

### Updated Pages

1. **`overview.md`**
   - Completely rewritten to provide a stronger, enterprise-ready introduction.
   - Highlighted core platform value props: unified API, intelligent provider fallbacks, unified billing, and robust security.
   - Categorized capabilities into Text & Code, Multimodal, and Advanced Workflows.

2. **`quickstart.md`**
   - Restructured into a "From Zero to Production" guide.
   - Added explicit warnings about API key security (never commit to GitHub, use `.env`).
   - Provided production-level code examples for Node.js and Python that include error handling (try/catch) and programmatic extraction of the custom `cost_usd` field.

3. **`authentication.md`**
   - Expanded into a detailed security guide.
   - Explained the difference between `cbx_live_` and `cbx_test_` keys.
   - Detailed best practices: storing keys in `.env`, restricting to backend-only use, and how to safely rotate compromised keys.
   - Added a troubleshooting section for handling `401 Unauthorized` errors.

4. **`models.md`**
   - Reorganized the entire model catalog into clear, highly readable tables.
   - Categories created: **Normal Search & Chat**, **Deep Research & Agentic**, **Image Generation**, and **Audio & Speech**.
   - Explicitly separated models into **Free Tier** and **Paid Tier** within each category.
   - Added a "Capabilities & Purpose" column so developers know exactly *why* and *when* to use each model.

5. **`pricing.md`**
   - Added a highly visible `> [!IMPORTANT]` block at the top clearly stating the **300 requests per day** and **5 RPM** limit for Free models.
   - Restructured the pricing tables to show exact costs for Paid models and explicitly $0.00 for Free models.
   - Provided clearer math examples for cost estimation (Text, Images, Audio).
   - Clarified the difference between Subscription Plans (Limits) and API Credits (Billing).

6. **`libraries.md`**
   - Formatted to emphasize that ChatboxAI is a drop-in replacement requiring no proprietary SDKs.
   - Added complete, copy-pasteable implementation examples for Node.js, Python, and Go using the official OpenAI libraries.
   - Added framework examples for Vercel AI SDK and LangChain.

7. **`prompt-guidance.md`**
   - Enhanced with actionable, production-focused techniques.
   - Added sections on "Chain of Thought", "Few-Shot Prompting", and "XML Tag Formatting".
   - Created a detailed "Temperature Selection Guide" table matching use cases (JSON extraction, coding, creative writing) to exact temperature ranges.
   - Listed common anti-patterns (e.g., being polite to the AI).

8. **`chat.md`**
   - Reorganized the API reference to be clean and standard.
   - Clarified the `messages` array structure (`system`, `user`, `assistant`).
   - Highlighted the custom `cost_usd` field in the response JSON.
   - Explained `finish_reason` strings and standard HTTP error codes (`400`, `401`, `402`, `429`, `500`).

## Result
The core documentation now reflects a highly mature, developer-friendly API platform ready for enterprise-scale integration. The structure handles the transition to the new `chatboxai.co.in` domain gracefully while significantly reducing developer friction.
