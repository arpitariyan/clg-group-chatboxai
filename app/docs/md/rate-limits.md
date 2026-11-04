# Rate Limits

To ensure high availability and fair usage across the platform, ChatboxAI enforces rate limits at the API key and Account level.

---

## 1. Free Tier Limits

The Free tier is designed for hobbyists, students, and developers testing the platform before deploying to production.

- **Global Daily Limit:** Free accounts are strictly limited to **300 requests per day** across all endpoints.
- **Reset Time:** The daily limit resets at midnight UTC.
- **Concurrency:** Free accounts are limited to 2 concurrent requests.
- **Model Restrictions:** Only Free-tier models (e.g., `chatboxai/llama-3.3-70b`, `chatboxai/qwen3-32b`) are accessible.

If you exceed the 300 requests/day limit, the API will return a `429 Too Many Requests` error with a JSON body indicating that the daily quota has been exhausted.

---

## 2. Paid Tier Limits

Paid tier limits are significantly higher and are designed for production workloads. They operate on a Requests Per Minute (RPM) and Tokens Per Minute (TPM) basis rather than a strict daily hardcap.

| Resource | Default Limit |
| :--- | :--- |
| **Requests Per Minute (RPM)** | 500 RPM |
| **Tokens Per Minute (TPM)** | 2,000,000 TPM |
| **Concurrent Requests** | 50 |
| **Image Generation** | 50 Images / Minute |

*Note: Paid limits can be increased by contacting support once your account has established a consistent billing history.*

---

## 3. Handling Rate Limit Errors (HTTP 429)

When a rate limit is exceeded, ChatboxAI returns a `429` status code. You should implement an exponential backoff strategy in your application to handle these gracefully.

### Response Headers

When you receive a `429`, or even on successful `200` responses, check the following headers to monitor your quota:

- `X-RateLimit-Limit-Requests`: The maximum RPM allowed.
- `X-RateLimit-Remaining-Requests`: How many requests you have left in the current minute window.
- `X-RateLimit-Reset-Requests`: Time in seconds until the RPM counter resets.

### Example Retry Logic (Node.js)

```javascript
async function fetchWithRetry(url, options, retries = 3, backoff = 1000) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);
    
    if (res.status === 429) {
      console.warn(`Rate limited. Retrying in ${backoff}ms...`);
      await new Promise(r => setTimeout(r, backoff));
      backoff *= 2; // Exponential backoff (1s -> 2s -> 4s)
      continue;
    }
    
    return res;
  }
  throw new Error("Max retries exceeded");
}
```

---

## 4. Insufficient Credits (HTTP 402)

If you are on the Paid tier and your prepaid credit balance drops to `$0.00`, the API will stop serving requests and return a `402 Payment Required` error. 

To prevent production outages, we highly recommend enabling **Auto-Recharge** in the Billing section of your dashboard.
