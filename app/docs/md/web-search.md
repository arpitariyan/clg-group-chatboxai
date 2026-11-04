# Web Search

The ChatboxAI API provides a powerful, built-in Web Search capability that allows AI models to browse the live internet, fetch up-to-date information, and ground their responses in reality. This prevents hallucinations on recent topics and provides verifiable citations.

> [!WARNING]  
> **Paid Plan Exclusive:** The Web Search capability requires substantial backend compute and API resources. It is strictly available to **Paid plan** users. Requests attempting to use web search on the Free tier will return a `403 Forbidden` error.

---

## 1. Using Web Search in Chat Completions

To enable web search, pass `{ type: "web_search" }` into the `tools` array of your `/chat/completions` request. The model will autonomously decide when to execute a search based on the user's prompt.

```bash
POST https://chatboxai.co.in/api/v1/chat/completions
Authorization: Bearer cbx_live_YOUR_KEY
Content-Type: application/json
```

### Request Example

```json
{
  "model": "chatboxai/claude-4.5-sonnet",
  "messages": [
    { "role": "user", "content": "What is the current stock price of Apple?" }
  ],
  "tools": [
    {
      "type": "web_search"
    }
  ]
}
```

### How it Works Internally
1. The model detects that the user is asking about a current event.
2. It pauses the generation and silently queries the ChatboxAI search infrastructure.
3. The server scrapes the top results, extracts the readable text, and injects it back into the model's context window.
4. The model generates a final, grounded response for the user.

---

## 2. Grounded Chat via Responses API

If you want to ensure the model *always* searches the web (instead of leaving it up to the model's discretion), you can use the custom Responses API and enforce it in the instructions.

```javascript
const response = await fetch("https://chatboxai.co.in/api/v1/responses", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.CHATBOXAI_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "chatboxai/claude-4.5-sonnet",
    input: "Who won the Super Bowl in 2025?",
    instructions: "You must use the web_search tool to find the answer. Include citations as [url] at the end of your response.",
    tools: [{ type: "web_search" }]
  })
});
```

---

## 3. Future Roadmap: Dedicated Search API

Currently, Web Search is tightly integrated into the ChatboxAI completion endpoints as a tool. 

**Coming Soon:** We will be releasing a standalone `/api/v1/search` endpoint. This will allow developers to bypass the LLM entirely and use ChatboxAI's high-speed search infrastructure to scrape and extract structured data directly into their applications.

---

## 4. Pricing & Performance

- **Cost:** Using the `web_search` tool deducts a small premium from your USD credit balance per execution, on top of the standard token costs. Please refer to the [Pricing](/docs/pricing) page for exact figures.
- **Latency:** Web search typically adds `500ms - 1500ms` to the overall request latency as our servers fetch and process live web pages.
- **Rate Limits:** Bound by your standard Paid tier request limits.
