# MCP & Connectors

The Model Context Protocol (MCP) is an open standard that allows you to securely bridge AI models with third-party SaaS applications, internal databases, and private file systems. 

By using ChatboxAI's MCP Connectors, you don't have to write custom orchestration logic. You simply expose an MCP server on your platform, and ChatboxAI handles the communication seamlessly.

---

## 1. What is an MCP Server?

An MCP Server is a lightweight web service hosted on your infrastructure (or any supported platform) that adheres to the Model Context Protocol. It acts as a secure bridge, exposing your private data and APIs to the AI model as standard "tools".

Instead of writing a custom integration for Jira, GitHub, or Notion within your core app, you run an MCP Server for that specific platform.

---

## 2. Connecting an MCP Server

To allow a ChatboxAI model to pull data from your external MCP server, you pass its configuration into your request via the `connectors` array.

```bash
POST https://chatboxai.co.in/api/v1/responses
Authorization: Bearer cbx_live_YOUR_KEY
Content-Type: application/json
```

### Request Example

```json
{
  "model": "chatboxai/llama-3.3-70b",
  "input": "Summarize the latest tickets assigned to me.",
  "connectors": [
    {
      "type": "mcp",
      "url": "https://mcp.yourdomain.com/jira",
      "headers": {
        "Authorization": "Bearer YOUR_INTERNAL_SECRET"
      }
    }
  ]
}
```

### The Execution Flow

1. **Analysis:** ChatboxAI parses your prompt and reads the capabilities of your connected MCP server.
2. **Decision:** The model decides it needs data to answer the prompt.
3. **Execution:** ChatboxAI securely calls your MCP server at `https://mcp.yourdomain.com/jira`.
4. **Response:** Your platform responds with the requested context.
5. **Synthesis:** The model synthesizes the data and returns the final answer to the user.

> [!CAUTION]
> **Security First:** Never pass sensitive third-party or database tokens through frontend code. Always initiate MCP connector requests from your secure backend server.

---

## 3. Connecting from Any Supported Platform

Because MCP is an open protocol, you can host your MCP server anywhere:
- **Cloud Providers:** AWS Lambda, Vercel, Google Cloud Run.
- **Local Networks:** Use tools like `ngrok` to expose a local MCP server running on your company's intranet.
- **Third-Party SaaS:** Many SaaS platforms are beginning to offer native MCP endpoints that you can plug directly into ChatboxAI.

As long as the URL is accessible to ChatboxAI and adheres to the Model Context Protocol, the AI can interact with it.

---

## 4. Usage Limits

MCP Connector support is available to all developers, but usage is tiered based on your account type:

| Plan | Limit | Behavior |
| :--- | :--- | :--- |
| **Free Plan** | 100 Requests / Day | Once the limit is reached, requests utilizing connectors will return a `429 Too Many Requests` error. |
| **Paid Plan** | Unlimited | No daily limits. Standard API token billing applies to the data passed back and forth. |

*(Note: A "request" is counted every time ChatboxAI has to establish a connection to your external MCP server).*
