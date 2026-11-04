# Tools Usage (Built-in)

While [Function Calling](/docs/function-calling) allows you to define custom tools that run on your own servers, ChatboxAI also provides **Built-in Tools**. These are powerful, pre-configured server-side tools that the model can execute directly on ChatboxAI's infrastructure without you needing to write the implementation.

---

## 1. Web Search Tool

The `web_search` tool grants the model real-time access to the internet. This is essential for queries about recent news, current events, or highly specific technical documentation that wasn't in the model's training data.

To enable it, simply add `{ type: "web_search" }` to the `tools` array.

### Example

```javascript
const response = await client.chat.completions.create({
  model: "chatboxai/llama-3.3-70b", // Free model, excellent at reasoning
  messages: [{ role: "user", content: "What happened in AI news today?" }],
  tools: [
    { type: "web_search" }
  ],
  tool_choice: "auto", // The model decides if a search is necessary
});

console.log(response.choices[0].message.content);
// Output will synthesize real-time data from the web.
```

> [!NOTE]  
> When the model uses the `web_search` tool, it may increase response latency slightly as the server must fetch and read the web pages before generating the final response.

---

## 2. Code Interpreter

The `code_interpreter` tool allows the model to write and execute Python code in a secure, sandboxed environment on ChatboxAI's servers. 

This is incredibly useful for:
- Solving complex mathematical equations.
- Data analysis and manipulation.
- Generating charts and plots.
- File conversions (CSV to JSON, etc.).

### Example

```javascript
const response = await client.chat.completions.create({
  model: "chatboxai/claude-4.5-sonnet", // Paid model, top-tier reasoning
  messages: [
    { 
      role: "user", 
      content: "Calculate the compound interest on $10,000 at 5.5% over 10 years, compounding monthly. Write code to solve this exactly." 
    }
  ],
  tools: [
    { type: "code_interpreter" }
  ],
});

console.log(response.choices[0].message.content);
```

---

## 3. Combining Built-in and Custom Tools

You can freely mix Built-in tools and your own Custom functions in the same request. The model will determine the most appropriate tool to solve the user's prompt.

```javascript
const tools = [
  { type: "web_search" }, // Built-in
  { type: "code_interpreter" }, // Built-in
  {
    type: "function",
    function: {
      name: "get_user_account_balance", // Custom local function
      description: "Get the user's current account balance from our database.",
      parameters: {
        type: "object",
        properties: { user_id: { type: "string" } }
      }
    }
  }
];

const response = await client.chat.completions.create({
  model: "chatboxai/gemini-2.5-pro", // Paid model, large context
  messages: [{ role: "user", content: "Check my balance, and then search the web to tell me how many Apple shares I could buy today." }],
  tools: tools,
});
```

---

## 4. Availability & Cost

- **Free Tier:** Built-in tools are supported on compatible free models (e.g., `llama-3.3-70b`), but count toward your 300 requests/day limit.
- **Paid Tier:** Built-in tools are natively supported. Using `code_interpreter` may incur a small premium per execution. Please check the [Pricing](/docs/pricing) page for details.
