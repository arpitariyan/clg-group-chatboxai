# Developer Mode & Advanced Debugging

Developer Mode is an advanced set of workflows and utilities designed to help engineers debug API interactions, inspect raw payloads, and safely test applications without burning production credits.

---

## 1. Using Test Keys

The foundation of Developer Mode is the `cbx_test_` API key. 

When you create a key in the dashboard and set its environment to **Test**, ChatboxAI changes its internal routing behavior:

- **Zero Cost:** Requests made with `cbx_test_` keys do not deduct from your USD credit balance (if you are on a Paid plan) and do not count against your 300 requests/day limit (if you are on a Free plan).
- **Mock Routing:** Depending on the requested model, ChatboxAI may route the request to a smaller, free-tier equivalent (e.g., routing a `chatboxai/llama-3.3-70b` request to `chatboxai/llama-3.1-8b`) to fulfill the request for free.
- **Strict Throttling:** Test keys are hard-capped at 5 Requests Per Minute (RPM) to prevent abuse.

Use `cbx_test_` keys in your local `.env` files and CI/CD pipelines.

---

## 2. Inspecting Raw Requests

Sometimes standard SDKs abstract away too much information. If you need to debug exactly what headers and body payloads are reaching ChatboxAI, you can enable verbose logging in your SDK, or use cURL with the `-v` flag.

### Debugging with cURL
```bash
curl -v -X POST https://chatboxai.co.in/api/v1/chat/completions \
  -H "Authorization: Bearer cbx_test_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "chatboxai/llama-3.1-8b", "messages": [{"role": "user", "content": "Test"}]}'
```

Watch the output for the `X-RateLimit-*` and `X-API-Credits-Remaining` response headers to verify your authentication context.

---

## 3. Simulating Errors

To ensure your application handles edge cases gracefully, you can force the ChatboxAI API to return specific errors by injecting special strings into the `model` parameter using a `cbx_test_` key.

*(Note: This feature is currently in Beta)*

| Inject Model String | Simulated Response | Use Case |
|---------------------|--------------------|----------|
| `dev-mock-429` | HTTP 429 (Rate Limit Exceeded) | Testing exponential backoff logic. |
| `dev-mock-500` | HTTP 500 (Internal Server Error) | Testing retry logic for provider outages. |
| `dev-mock-402` | HTTP 402 (Payment Required) | Testing UI states for empty credit balances. |

### Example

```json
{
  "model": "dev-mock-429",
  "messages": [{"role": "user", "content": "Hello"}]
}
```

If sent with a `cbx_test_` key, this request will instantly return a `429 Too Many Requests` error, allowing you to test if your retry loop works properly before pushing to production.
