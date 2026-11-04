# External Models

ChatboxAI acts as a unified, OpenAI-compatible API gateway. Instead of managing dozens of API keys, billing accounts, and SDKs for different AI providers (Anthropic, Google, Meta, OpenAI, etc.), you route everything through ChatboxAI using a single API key.

---

## 1. Unified Interface

All external models are standardized to accept the standard `messages` array payload. You simply change the `model` parameter string.

```javascript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.CHATBOXAI_API_KEY,
  baseURL: "https://chatboxai.co.in/api/v1",
});

// Using a Google Model
const googleResponse = await client.chat.completions.create({
  model: "chatboxai/gemini-2.5-pro",
  messages: [{ role: "user", content: "Hello" }]
});

// Using an Anthropic Model (No code changes required!)
const anthropicResponse = await client.chat.completions.create({
  model: "chatboxai/claude-4.5-sonnet",
  messages: [{ role: "user", content: "Hello" }]
});
```

---

## 2. Model Routing

When you send a request to `chatboxai.co.in/api/v1`, the following happens internally:

1. **Authentication & Rate Limiting:** We verify your `cbx_live_*` key and check if you have exceeded your plan limits (e.g., the 300 requests/day limit on the Free tier).
2. **Translation:** If the requested model uses a non-OpenAI structure (like Anthropic's specific API requirements), ChatboxAI instantly translates your payload into the provider's native format.
3. **Execution:** The request is securely routed to the model provider.
4. **Formatting:** The provider's response is caught, translated back into standard OpenAI JSON format, and sent back to your application.

---

## 3. Fallback & Redundancy

A major advantage of using ChatboxAI over direct provider integration is high availability. 

If a specific model provider experiences an outage, ChatboxAI can automatically route your request to a comparable fallback model (if enabled in your dashboard settings) to ensure your application does not go offline.

---

## 4. Privacy & Data Security

ChatboxAI acts as a passthrough gateway. 
- We do **not** train our own foundational models on your API inputs or outputs.
- Data sent to external providers (like Google or Anthropic) via ChatboxAI is governed by strict zero-retention enterprise agreements. The providers are not permitted to use your payload for training.

For full details, see our [Terms & Policies](/docs/terms-policies).
