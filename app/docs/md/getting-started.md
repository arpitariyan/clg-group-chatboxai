# Getting Started

Welcome to the ChatboxAI API. Our platform provides a unified, OpenAI-compatible REST interface to the world's leading AI models. Whether you are building web apps, mobile apps, or backend services, you can integrate frontier models in minutes.

---

## 1. Create an Account

To use the API, you first need a ChatboxAI account.
Sign up at [chatboxai.co.in/signup](https://chatboxai.co.in/signup) to get access to all API features, manage billing, and view usage analytics.

---

## 2. Generate Your API Key

Authentication is handled via Bearer tokens. 

1. Go to **Settings → API Keys** in your dashboard.
2. Click **Create API Key**.
3. Give it a descriptive name (e.g., `Production Backend`).
4. Select the environment: `live` for production or `test` for development.

> [!CAUTION]
> Your full API key is shown **only once**. Please store it immediately in a secure password manager or secrets vault.

Your key will look like this: `cbx_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 3. Configure Environment Variables

Never hardcode API keys directly into your application source code. Always use environment variables:

```bash
CHATBOXAI_API_KEY=cbx_live_YOUR_KEY_HERE
CHATBOXAI_BASE_URL=https://chatboxai.co.in/api/v1
```

- **Local Development**: Add these to your `.env` or `.env.local` file.
- **Production**: Configure them in your hosting provider's environment settings (e.g., Vercel, AWS, Render).

---

## 4. Make Your First Request

You can interact with the ChatboxAI API using standard HTTP requests or the official OpenAI SDKs.

### cURL Example

```bash
curl -X POST https://chatboxai.co.in/api/v1/chat/completions \
  -H "Authorization: Bearer cbx_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "chatboxai/llama-3.3-70b",
    "messages": [
      {"role": "user", "content": "Hello, world!"}
    ]
  }'
```

### JavaScript (Node.js) Example

```javascript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.CHATBOXAI_API_KEY,
  baseURL: "https://chatboxai.co.in/api/v1",
});

async function main() {
  const response = await client.chat.completions.create({
    model: "chatboxai/llama-3.3-70b",
    messages: [{ role: "user", content: "Hello, world!" }],
  });

  console.log(response.choices[0].message.content);
}

main();
```

---

## 5. Security & Platform Integration

Depending on where you run your code, follow these best practices:

- **Server-Side Apps (Node.js, Python, Go)**: Keep the API key securely on your server. Call ChatboxAI directly from your backend code.
- **Browser/Frontend Apps (React, Vue)**: **Never expose your API key to the browser.** Create a backend API route in your application that securely forwards requests to ChatboxAI.
- **Mobile Apps (iOS, Android)**: Use a backend proxy to handle requests. Never embed production API keys in your compiled app binaries.

---

## Next Steps

Now that you're set up, explore what you can build:

- Read the [Overview](/docs/overview) to understand the platform capabilities.
- Browse available [Models](/docs/models) to find the right AI for your task.
- Check out [Pricing](/docs/pricing) to understand our credit-based billing.
- Dive into the [Quickstart](/docs/quickstart) for a complete end-to-end tutorial.
