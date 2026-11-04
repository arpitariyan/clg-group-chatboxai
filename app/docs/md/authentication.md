# Authentication

To interact with the ChatboxAI API, you must authenticate all your requests using a secure API key. This guide explains how to generate, use, and secure your API keys in production environments.

---

## 1. Generating an API Key

Before making any requests, you need an API key. 

1. Log in to the [ChatboxAI Dashboard](/settings?tab=api-keys).
2. Navigate to the **Settings** menu and select the **API Keys** tab.
3. Click **Create API Key**.
4. Copy the generated key immediately. For security reasons, **it will only be shown to you once**.

ChatboxAI issues two types of API keys:

| Prefix | Environment | Billing | Rate Limits |
|--------|-------------|---------|-------------|
| `cbx_live_` | Production | Deducts real USD credits | High (Based on Plan) |
| `cbx_test_` | Development | Free (Simulated) | Low (Strict throttling) |

> [!NOTE]  
> Use `cbx_test_` keys during local development or CI/CD pipelines to verify integration logic without spending credits. `cbx_test_` keys may return mocked responses or route to smaller, free-tier models depending on system load.

---

## 2. Using Your API Key

ChatboxAI uses standard **Bearer Token** authentication. Every HTTP request you make to the API must include an `Authorization` header containing your API key.

### HTTP Header Format
```http
Authorization: Bearer cbx_live_YOUR_KEY_HERE
```

### Example via cURL
```bash
curl -X GET https://chatboxai.co.in/api/v1/models \
  -H "Authorization: Bearer cbx_live_abc123def456ghi789"
```

### Example via Official SDK
If you are using an OpenAI-compatible SDK, authentication is handled automatically when you initialize the client:

```javascript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "cbx_live_abc123def456ghi789", // Passed here
  baseURL: "https://chatboxai.co.in/api/v1", 
});
```

---

## 3. Security Best Practices

Your `cbx_live_` API key is directly tied to your billing account and credit balance. It carries financial weight and must be protected like a password.

> [!CAUTION]  
> **Never commit keys to version control (e.g., GitHub, GitLab).** If you accidentally push an API key, delete it immediately from your dashboard and generate a new one.

### 1. Store Keys in Environment Variables
Never hardcode your API key directly in your source code. Instead, use an environment variables file (`.env`).

Create a `.env` file in the root of your project:
```bash
CHATBOXAI_API_KEY="cbx_live_abc123def456ghi789"
```

Ensure your `.env` file is added to your `.gitignore`:
```bash
# .gitignore
node_modules/
.env
```

Load it in your application code:
```javascript
// Node.js example using the 'dotenv' package
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.CHATBOXAI_API_KEY;
```

### 2. Backend Only
**Never** embed your `cbx_live_` key in frontend code (React, Vue, iOS apps, desktop binaries). Malicious users can easily inspect the network traffic or decompile the app to extract your key and drain your credits. All API calls to ChatboxAI must originate from a secure backend server that you control.

### 3. Key Rotation
If you suspect your key has been compromised, follow these steps to rotate it safely without downtime:
1. Generate a new API key in the ChatboxAI dashboard.
2. Update the environment variables on your production servers with the new key.
3. Deploy your application.
4. Return to the dashboard and **Revoke** the old, compromised key.

---

## 4. Handling Authentication Errors

If authentication fails, ChatboxAI will reject the request and return a `401 Unauthorized` HTTP status code.

### Error Response Example
```json
{
  "error": {
    "message": "Unauthorized. Invalid or revoked API key.",
    "type": "authentication_error",
    "code": "invalid_api_key"
  }
}
```

### Common Causes of 401 Errors
- **Missing `Bearer ` prefix:** Ensure your header is `Bearer cbx_live_...` and not just `cbx_live_...`.
- **Typo in the Key:** Check for trailing spaces or missing characters.
- **Revoked Key:** The API key was deleted or regenerated in the dashboard.
- **Environment Mix-up:** You accidentally used a `cbx_test_` key to access a production-only paid model.
