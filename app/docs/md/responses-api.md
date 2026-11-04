# Responses API

The Responses API is a custom, higher-level interface exclusive to ChatboxAI. It simplifies multi-turn interactions, provides a cleaner request format, and introduces `output_text` for instant string access, saving you from parsing deep JSON structures.

---

## 1. Overview

While the standard `chat/completions` endpoint adheres strictly to the OpenAI specification, the Responses API is designed for developers who want a faster, less verbose integration.

| Feature | Chat Completions | Responses API |
|---------|-----------------|---------------|
| **Input Format** | `messages[]` array of objects | `input` (Accepts a simple string OR array) |
| **System Prompt** | `messages[0].role = "system"` | Dedicated `instructions` field |
| **Output Access** | `choices[0].message.content` | `output_text` (Direct string access) |
| **State Tracking** | Client must store history | Server-side memory (Coming in v2) |

---

## 2. Basic Request

```text
POST https://chatboxai.co.in/api/v1/responses
```

Instead of building a `messages` array, you can pass a single string to `input` and define the persona in `instructions`.

### Example (Fetch API)

```javascript
const response = await fetch("https://chatboxai.co.in/api/v1/responses", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.CHATBOXAI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "chatboxai/llama-3.3-70b", // Free tier model
    instructions: "You are a helpful geography assistant. Be highly concise.",
    input: "What is the capital of France?",
  }),
});

const data = await response.json();

// Directly access the generated string!
console.log(data.output_text); 
// Output: "The capital of France is Paris."
```

---

## 3. The Response Object

The Responses API returns a simplified JSON object. The inclusion of `cost_usd` remains standard.

```json
{
  "id": "resp_01abc123",
  "object": "response",
  "created": 1716123456,
  "model": "chatboxai/llama-3.3-70b",
  "output_text": "The capital of France is Paris.",
  "output": [
    {
      "type": "message",
      "role": "assistant",
      "content": "The capital of France is Paris."
    }
  ],
  "usage": {
    "input_tokens": 25,
    "output_tokens": 12,
    "total_tokens": 37
  },
  "cost_usd": 0.000000
}
```

---

## 4. Multi-turn Conversations

For multi-turn chat in v1, you still pass an array to `input`, but the format remains cleaner than standard completions.

```javascript
const response = await fetch("https://chatboxai.co.in/api/v1/responses", {
  method: "POST",
  headers: { 
    "Authorization": `Bearer ${process.env.CHATBOXAI_API_KEY}`, 
    "Content-Type": "application/json" 
  },
  body: JSON.stringify({
    model: "chatboxai/claude-4.5-sonnet", // Paid model
    instructions: "You are a friendly AI.",
    input: [
      { role: "user", content: "My name is Alice." },
      { role: "assistant", content: "Nice to meet you, Alice!" },
      { role: "user", content: "What is my name?" },
    ],
  }),
});

const data = await response.json();
console.log(data.output_text); // "Your name is Alice."
```

---

## 5. Request Parameters Reference

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | **Yes** | The ID of the model (e.g., `chatboxai/qwen3-coder`). |
| `input` | string \| array | **Yes** | A single string (for 1-turn) or an array of message objects. |
| `instructions` | string | No | Sets the model's behavior/persona (System Prompt). |
| `tools` | array | No | Tool definitions for function calling. |
| `temperature` | number | No | Creativity control. Default `0.7`. |
| `max_output_tokens` | integer | No | Maximum generation length. |
