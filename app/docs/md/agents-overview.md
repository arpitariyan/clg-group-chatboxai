# Agents Overview

Build autonomous AI agents that can plan, use tools, maintain memory, and complete multi-step tasks.

## What is an Agent?

An **agent** is an AI system that:
- Receives a high-level goal from a user
- Plans a sequence of steps to accomplish it
- Uses tools (functions, APIs, search) to gather information
- Maintains state across multiple turns
- Delivers a final result

## Basic Agent Pattern

```javascript
async function runAgent(goal, tools) {
  const messages = [
    { role: "system", content: "You are an autonomous agent. Use tools to accomplish the user's goal." },
    { role: "user", content: goal }
  ];

  while (true) {
    const response = await client.chat.completions.create({
      model: "chatboxai/gpt-oss-120b",
      messages,
      tools,
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    messages.push(choice.message);

    if (choice.finish_reason === "stop") {
      return choice.message.content; // Agent is done
    }

    if (choice.finish_reason === "tool_calls") {
      for (const toolCall of choice.message.tool_calls) {
        const result = await executeTool(toolCall);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }
  }
}
```

## Agent Tools

Agents become powerful when given tools:

```javascript
const agentTools = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for current information",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read contents of a file",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" }
        },
        required: ["path"]
      }
    }
  }
];
```

## Memory Types

| Memory Type | Storage | Scope | Use case |
|------------|---------|-------|----------|
| In-context | Messages array | Single session | Conversation history |
| External | Database | Cross-session | User preferences, facts |
| Semantic | Vector DB | Long-term | Knowledge retrieval |

## Agent Safety

- Always validate tool outputs before passing back to the model
- Set a **maximum iteration limit** to prevent infinite loops
- Log all tool calls and model decisions for debugging
- Use human-in-the-loop for high-stakes actions

## Next Steps

- [Agent Definitions](/docs/agent-definitions) — Define agent roles and personas
- [Orchestration](/docs/orchestration) — Multi-agent coordination
- [Workflows](/docs/workflows) — Structured task pipelines
