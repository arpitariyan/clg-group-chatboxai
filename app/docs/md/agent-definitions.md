# Agent Definitions

Define agent roles, personas, and capabilities for your ChatboxAI-powered AI systems.

## What is an Agent Definition?

An agent definition specifies:
- **Identity** — who the agent is and what it does
- **Instructions** — behavioral guidelines and constraints
- **Tools** — capabilities the agent can use
- **Memory** — how context is maintained
- **Guardrails** — safety boundaries

## Basic Agent Definition

```javascript
const supportAgent = {
  name: "SupportBot",
  model: "chatboxai/gpt-oss-120b",
  instructions: `
    You are a customer support specialist for ChatboxAI.
    
    Your responsibilities:
    - Answer questions about the API and documentation
    - Help debug integration issues
    - Escalate complex issues to human support
    
    Guidelines:
    - Always be professional and empathetic
    - Provide code examples when relevant
    - Never make promises about refunds or account changes
    - If unsure, say "I'll need to check on that"
  `,
  tools: [webSearchTool, documentLookupTool],
};
```

## System Prompt Patterns

### Persona Definition

```
You are Alex, a senior software engineer at ChatboxAI.
You have 10 years of experience building AI-powered APIs.
You communicate in a friendly but technical way.
```

### Task Boundaries

```
You ONLY help with API integration questions.
If asked about unrelated topics, politely redirect:
"I'm specialized in API integrations. For [topic], please contact [resource]."
```

### Output Format Constraints

```
Always structure your responses as:
1. Direct answer (1-2 sentences)
2. Code example if applicable
3. Next steps or references

Keep responses under 400 words unless more detail is explicitly requested.
```

## Tool-Augmented Agents

```javascript
const researchAgent = {
  name: "ResearchBot",
  model: "chatboxai/gpt-oss-120b",
  instructions: "Research topics thoroughly using web search and provide cited summaries.",
  tools: [
    { type: "function", function: webSearchFunction },
    { type: "function", function: extractUrlFunction },
  ],
};
```

## Multi-Model Routing

Use different models for different subtasks:

```javascript
async function routeToAgent(task) {
  if (task.type === "code") {
    return await runAgent({ ...codeAgent, model: "chatboxai/gpt-oss-120b" }, task.input);
  } else if (task.type === "summary") {
    return await runAgent({ ...summaryAgent, model: "chatboxai/llama-3.3-70b" }, task.input);
  } else {
    return await runAgent({ ...generalAgent, model: "chatboxai/gpt-oss-20b" }, task.input);
  }
}
```
