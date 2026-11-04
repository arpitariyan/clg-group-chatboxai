# Deployment Checklist

Before moving your ChatboxAI integration from local development into production, review this checklist to ensure your application is secure, reliable, and optimized for cost.

---

## 1. Security & Authentication
- [ ] **Rotate Keys:** Have you created a fresh `cbx_live_` production key specifically for this deployment, rather than using your local development key?
- [ ] **Environment Variables:** Is the `CHATBOXAI_API_KEY` securely stored in your server's environment variables (e.g., AWS Secrets Manager, Vercel Env) and NOT hardcoded or exposed to the frontend?
- [ ] **CORS & Origin Checks:** If calling the API from a browser, are you routing requests through your own secure backend rather than exposing the API key to the client?

## 2. Limits & Billing
- [ ] **Tier Check:** If you are on the **Free tier**, have you handled the 300 requests/day limit gracefully in your UI? (e.g., "Daily limit reached. Please try again tomorrow").
- [ ] **Paid Migration:** If your app requires more volume, Web Search, or premium models, have you upgraded to a Paid plan and added a credit balance?
- [ ] **Budget Caps:** Have you configured auto-recharge limits or spend alerts in the ChatboxAI dashboard to prevent unexpected billing overages?

## 3. Error Handling
- [ ] **Timeouts:** Are you handling 504 Gateway Timeouts gracefully? (LLMs can occasionally take longer than standard HTTP connections allow).
- [ ] **Rate Limits (429):** Have you implemented exponential backoff retries when encountering `429 Too Many Requests` responses?
- [ ] **JSON Parsing:** When using [Structured Output](/docs/structured-output), are you wrapping `JSON.parse()` in a `try/catch` block to handle potentially malformed generation strings?

## 4. Performance & Cost
- [ ] **Token Limits:** Are you setting appropriate `max_tokens` values to prevent run-away generations that consume excess credits?
- [ ] **Model Selection:** Have you evaluated if a cheaper/faster model (like `gemini-2.5-flash`) can perform the task just as well as an expensive model (like `claude-4.5-sonnet`)? See [Evaluations](/docs/evaluations).
- [ ] **Context Window Optimization:** Are you trimming old conversation history before sending the `messages` array to the API, rather than sending infinite chat logs?

## 5. Advanced Capabilities
- [ ] **Web Search:** If using the Web Search capability (Paid plans only), is your system prompt strict enough to prevent the model from doing unnecessary searches?
- [ ] **MCP Connectors:** If pulling internal data via [MCP & Connectors](/docs/mcp-connectors), is your MCP server secured behind proper authentication headers?
