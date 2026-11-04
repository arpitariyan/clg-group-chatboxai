# Skills

Skills are modular, reusable blocks of code that execute securely on ChatboxAI's infrastructure. They allow models to perform complex, multi-step actions without requiring your application to handle the intermediate code execution or network requests.

---

## 1. Skills vs. Tools vs. Connectors

To understand where Skills fit into the ChatboxAI ecosystem, it helps to compare them to our other capability extensions:

- **Tools (Function Calling):** The model asks your server to run code. Your server runs the code and sends the result back to the model.
- **Connectors (MCP):** ChatboxAI connects to a third-party server (like your internal Jira instance) to fetch data.
- **Skills:** ChatboxAI executes custom code *directly on its own secure servers* on behalf of the model.

If you have a workflow that is completely self-contained (e.g., crunching numbers, generating a chart, or pinging an open API), a Skill is the fastest and most efficient way to achieve it.

---

## 2. Using Built-in Skills

ChatboxAI provides several highly optimized built-in skills for common computing tasks. You attach them to a request via the `skills` array.

```bash
POST https://chatboxai.co.in/api/v1/responses
```

```json
{
  "model": "chatboxai/llama-3.3-70b",
  "input": "Calculate the 100th Fibonacci number and generate a bar chart of the first 20.",
  "skills": ["python_interpreter"]
}
```

### Popular Built-in Skills
- `python_interpreter`: Securely runs Python code. Ideal for math, data analysis, and generating visual plots.
- `web_browser`: A headless browser that can scrape dynamic single-page applications (SPAs) and navigate through websites.
- `sql_executor`: Connects to a read-only database replica to query large datasets.

---

## 3. Defining Custom Skills (Serverless Execution)

You can define custom JavaScript/TypeScript skills that execute on ChatboxAI's edge network. This allows you to build serverless workflows directly into your API calls.

### Example: Custom Weather Skill

In this example, the model writes a JavaScript function that fetches weather data. ChatboxAI executes the code, and the model reads the result.

```json
{
  "model": "chatboxai/claude-4.5-sonnet",
  "input": "What's the weather in Tokyo?",
  "skills": [
    {
      "name": "get_weather",
      "description": "Fetches current weather for a location.",
      "code": "async function run(args) { const res = await fetch(`https://api.weatherapi.com/v1/current.json?q=${args.location}&key=YOUR_KEY`); return await res.json(); }"
    }
  ]
}
```

### Security & Sandboxing
All custom skill code is executed inside a heavily restricted WebAssembly (Wasm) sandbox to ensure safety and isolation.
- **Maximum Execution Time:** 10 seconds.
- **Memory Limit:** 128 MB.
- **Allowed Modules:** `fetch`, `URL`, standard JavaScript built-ins.
- **File System:** No local file system access.

---

## 4. Pricing & Limits

Using Skills requires additional compute resources. 

- **Built-in Skills:** Tools like the `python_interpreter` carry a small per-invocation premium. Please check the [Pricing](/docs/pricing) page for details.
- **Custom Skills:** Custom JavaScript skills are currently included at no extra cost beyond standard token billing.
- **Tier Availability:** Custom skills and Built-in skills are available to both Free and Paid plans, though Free plan users are bound by the 300 requests/day global limit.
