# Structured Output (JSON Mode)

When building applications, you often need models to return data in a predictable, parsable format (like JSON) rather than conversational text. ChatboxAI supports strict Structured Output to guarantee the format of the response.

---

## 1. Using JSON Mode

To force a model to output valid JSON, you must do two things:
1. Pass `response_format: { type: "json_object" }` in the request body.
2. Explicitly instruct the model to return JSON in the `messages` array (usually in the system prompt).

### Supported Models
Almost all modern models support JSON mode natively, including:
- `chatboxai/llama-3.3-70b` (Free)
- `chatboxai/gemini-2.5-flash` (Free)
- `chatboxai/claude-4.5-sonnet` (Paid)

> [!WARNING]  
> If you use `{ type: "json_object" }` but fail to explicitly ask the model to generate JSON in your prompt, the request may hang or return an error because the model will not know what keys to generate.

---

## 2. Basic JSON Extraction Example

```javascript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.CHATBOXAI_API_KEY,
  baseURL: "https://chatboxai.co.in/api/v1",
});

async function extractData() {
  const response = await client.chat.completions.create({
    model: "chatboxai/llama-3.3-70b", // Free model
    response_format: { type: "json_object" }, // 1. Enforce JSON
    messages: [
      {
        role: "system",
        // 2. Explicitly define the expected structure
        content: `You are a data extraction bot. Always return JSON.
        The JSON must have this exact structure:
        {
          "name": "string",
          "age": "number",
          "city": "string"
        }`
      },
      {
        role: "user",
        content: "Hi, I'm Sarah. I'm 28 years old and I live in Seattle."
      }
    ],
    temperature: 0.1, // Use low temperature for data extraction
  });

  const jsonString = response.choices[0].message.content;
  const parsedData = JSON.parse(jsonString);
  
  console.log(parsedData.city); // Output: "Seattle"
}

extractData();
```

---

## 3. Advanced: JSON Schema Enforcement

While `json_object` ensures the output is parsable JSON, it does not strictly enforce the exact keys (the model might hallucinate extra keys).

For strict adherence, you can pass a full JSON Schema object inside `response_format`. This guarantees the model will only generate the exact keys you define.

```javascript
const response = await client.chat.completions.create({
  model: "chatboxai/claude-4.5-sonnet", // Paid flagship models are best for strict schema adherence
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "user_profile",
      strict: true,
      schema: {
        type: "object",
        properties: {
          username: { type: "string" },
          is_active: { type: "boolean" },
          tags: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["username", "is_active", "tags"],
        additionalProperties: false
      }
    }
  },
  messages: [
    { role: "system", content: "Extract the user profile." },
    { role: "user", content: "User ghost_rider logged in today. Tag them as VIP and gamer." }
  ]
});
```

---

## 4. Best Practices for Structured Data

1. **Use Low Temperature:** Set `temperature` between `0.0` and `0.2`. You want deterministic extraction, not creative writing.
2. **Handle Parsing Errors:** Always wrap your `JSON.parse()` in a `try/catch` block. While ChatboxAI enforces valid JSON format, network interruptions during streaming could truncate the string.
3. **Use Zod for Validation:** If using TypeScript, we highly recommend using a library like `zod` to validate the parsed output object before using it in your application.
