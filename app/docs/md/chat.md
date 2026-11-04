# Chat Completions API

The Chat API is the core engine of ChatboxAI. It provides a standard, OpenAI-compatible interface for text generation, advanced reasoning, coding, and vision tasks.

```text
POST https://chatboxai.co.in/api/v1/chat/completions
```

---

## 1. Request Parameters

The request body must be formatted as a JSON object. 

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | **Yes** | The ID of the model to use (e.g., `chatboxai/llama-3.3-70b`). See the [Models Catalog](/docs/models). |
| `messages` | array | **Yes** | An array of message objects representing the conversation history. |
| `temperature` | number | No | Controls randomness (0.0 to 2.0). Lower values are more deterministic. Default is `0.7`. |
| `max_tokens` | integer | No | The maximum number of tokens to generate. If omitted, the model will generate until it naturally stops or hits its context limit. |
| `stream` | boolean | No | If `true`, returns a continuous stream of tokens via Server-Sent Events (SSE). |
| `tools` | array | No | A list of functions the model may call to fetch external data or take actions. |
| `response_format` | object | No | Specify `{ "type": "json_object" }` to force the model to output valid JSON. |

---

## 2. Message Object Structure

The `messages` array forms the context of the conversation. Each object must contain a `role` and `content`.

- **`system`**: Sets the behavior, persona, and rules of the assistant. Usually placed first.
- **`user`**: The input, prompt, or data provided by the human application.
- **`assistant`**: Previous responses from the model. Included to maintain conversation history.

```json
[
  { "role": "system", "content": "You are a senior JavaScript developer." },
  { "role": "user", "content": "How does the event loop work?" },
  { "role": "assistant", "content": "The event loop is a mechanism that allows Node.js to perform non-blocking I/O operations..." },
  { "role": "user", "content": "Can you give me a code example?" }
]
```

---

## 3. Basic Implementation Example

Here is a standard request to generate a completion. 

### cURL

```bash
curl -X POST https://chatboxai.co.in/api/v1/chat/completions \
  -H "Authorization: Bearer cbx_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "chatboxai/llama-3.3-70b",
    "messages": [
      { "role": "system", "content": "You are a highly concise assistant." },
      { "role": "user", "content": "Explain the theory of relativity in one sentence." }
    ],
    "temperature": 0.5,
    "max_tokens": 100
  }'
```

### Node.js (via SDK)

```javascript
const response = await client.chat.completions.create({
  model: "chatboxai/llama-3.3-70b",
  messages: [
    { role: "system", content: "You are a highly concise assistant." },
    { role: "user", content: "Explain the theory of relativity in one sentence." }
  ],
  temperature: 0.5
});

console.log(response.choices[0].message.content);
```

---

## 4. Response Structure

The response perfectly matches the standard OpenAI JSON schema, ensuring out-of-the-box compatibility with existing libraries. 

However, ChatboxAI injects an additional `cost_usd` field so you can effortlessly track your credit deduction per request.

```json
{
  "id": "chatcmpl-123456789",
  "object": "chat.completion",
  "created": 1716123456,
  "model": "chatboxai/llama-3.3-70b",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The theory of relativity states that the laws of physics are the same for all non-accelerating observers, and that the speed of light in a vacuum is independent of the motion of all observers."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 30,
    "completion_tokens": 38,
    "total_tokens": 68
  },
  "cost_usd": 0.000034
}
```

### Finish Reasons (`finish_reason`)

The `finish_reason` indicates why the model stopped generating output:

- **`stop`**: The model successfully finished its complete response.
- **`length`**: The model hit your `max_tokens` limit, or the model's total context limit was exceeded.
- **`tool_calls`**: The model decided to pause generation to request the execution of a tool/function.
- **`content_filter`**: The output was flagged and blocked by provider safety filters.

---

## 5. Streaming Responses

For a faster perceived response time in your UI, set `"stream": true`. The API will return Server-Sent Events (SSE) that chunk the output token-by-token.

### Streaming via Node.js SDK

```javascript
const stream = await client.chat.completions.create({
  model: "chatboxai/llama-3.3-70b",
  messages: [{ role: "user", content: "Write a long poem." }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}
```

---

## 6. Error Handling & Status Codes

If an error occurs, the API returns a standard JSON error object. You should implement proper try/catch blocks in your production code to handle these gracefully.

### Error Object Format
```json
{
  "error": {
    "message": "Insufficient API credits. Please purchase more credits.",
    "type": "payment_required",
    "code": "insufficient_api_credits"
  }
}
```

### Common HTTP Status Codes
| Code | Meaning | Resolution |
| :--- | :--- | :--- |
| `400` | **Bad Request** | You passed invalid JSON, a missing required parameter, or an invalid model ID. |
| `401` | **Unauthorized** | Your API key is missing, invalid, or revoked. |
| `402` | **Payment Required** | Your credit balance has reached `$0.00`. Top up in the dashboard. |
| `429` | **Too Many Requests** | You exceeded your Plan's Rate Limit (RPM/TPM). Implement exponential backoff retries. |
| `500` | **Internal Server Error**| A critical failure occurred in the underlying provider network. ChatboxAI attempts to auto-fallback, but if all fail, this is returned. |
