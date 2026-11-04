# Text Generation

Text generation is the core functionality of the ChatboxAI API. Whether you are building conversational agents, summarizing long documents, or extracting structured data, text generation models allow you to process and synthesize language at scale.

ChatboxAI offers a unified interface for all text models. You can seamlessly switch between **Free** tier models (like Llama 3) and **Paid** flagship models (like Claude 4.5 Sonnet) by simply changing the `model` parameter.

---

## 1. Basic Text Generation

To generate text, send a list of conversation `messages` to the `chat/completions` endpoint. 

### Example (Node.js)

```javascript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.CHATBOXAI_API_KEY,
  baseURL: "https://chatboxai.co.in/api/v1",
});

async function summarize() {
  try {
    const response = await client.chat.completions.create({
      model: "chatboxai/llama-3.3-70b", // Free model (300 req/day limit)
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Summarize the theory of relativity in 2 sentences." }
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    console.log("Summary:", response.choices[0].message.content);
    console.log("Cost USD:", response.cost_usd); // Track exact cost
  } catch (error) {
    console.error("Error:", error);
  }
}

summarize();
```

---

## 2. Multi-turn Conversations

Models do not have memory. To maintain an ongoing conversation, you must pass the entire history of messages (User and Assistant) in every request.

```javascript
const history = [
  { role: "system", content: "You are a polite customer support agent." }
];

async function chat(userMessage) {
  // 1. Add the user's new message to the history array
  history.push({ role: "user", content: userMessage });
  
  // 2. Send the entire array to the API
  const response = await client.chat.completions.create({
    model: "chatboxai/claude-4.5-sonnet", // Paid flagship model
    messages: history,
  });
  
  const reply = response.choices[0].message;
  
  // 3. Append the assistant's reply to the history array for the next turn
  history.push(reply);
  
  return reply.content;
}

await chat("Hi, my order #1234 hasn't arrived yet.");
await chat("Can you give me the tracking number for it?"); // Model understands "it" refers to order #1234
```

---

## 3. Controlling the Output

You can fine-tune how the model generates text using parameters in the request body.

### Temperature (`temperature`)
Controls the randomness of the output. 
- **`0.0 - 0.2`**: Deterministic, strict, factual (Best for JSON/data extraction).
- **`0.5 - 0.7`**: Balanced (Best for general chat and Q&A).
- **`0.8 - 1.2`**: Highly creative, varied (Best for storytelling and brainstorming).

```javascript
{ temperature: 0.2 } // Factual
```

### Maximum Tokens (`max_tokens`)
Sets a strict hard-limit on how long the generated response can be. 
- A token is roughly equivalent to 4 characters in English.
- If the model hits this limit before it finishes its thought, the `finish_reason` in the response will be `"length"`.

```javascript
{ max_tokens: 250 } // Limits response to roughly ~180 words
```

### Top-P (`top_p`)
An alternative to temperature (Nucleus Sampling). It restricts the model to only consider the tokens comprising the top `P` probability mass.
*Note: We recommend altering either `temperature` OR `top_p`, but not both.*

```javascript
{ top_p: 0.9 } // Consider the top 90% most likely words
```

---

## 4. Selecting the Right Model

Choosing the right model depends on your budget, latency requirements, and task complexity. 

| Task Type | Recommended Free Model | Recommended Paid Model |
| :--- | :--- | :--- |
| **General Chat & Q&A** | `chatboxai/llama-3.3-70b` | `chatboxai/claude-4.5-sonnet` |
| **High-Speed / Low Latency** | `chatboxai/gemini-2.5-flash`| `chatboxai/gemini-2.5-flash` |
| **Deep Reasoning & Logic** | `chatboxai/kimi-k2` | `chatboxai/claude-opus-4.7` |

> [!NOTE]  
> Free models are strictly limited to **300 requests per day**. If you exceed this, you will receive a `429 Too Many Requests` error. Paid models deduct real USD credits per token based on your current balance.

See the complete [Models Catalog](/docs/models) and [Pricing](/docs/pricing) for exact details.
