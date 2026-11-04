# Orchestration

Coordinate multiple AI agents to solve complex tasks that require collaboration and specialization.

## Multi-Agent Architecture

```javascript
class Orchestrator {
  constructor(agents) {
    this.agents = agents;
  }

  async run(task) {
    // Route task to appropriate specialist
    const agent = this.selectAgent(task);
    const result = await agent.execute(task);
    
    // If agent needs help, hand off to another
    if (result.needsHandoff) {
      const handoffAgent = this.agents[result.handoffTo];
      return handoffAgent.execute({ ...task, context: result.context });
    }
    
    return result;
  }

  selectAgent(task) {
    if (task.type === "code") return this.agents.codeAgent;
    if (task.type === "search") return this.agents.researchAgent;
    return this.agents.generalAgent;
  }
}
```

## Handoffs

Pass context between agents cleanly:

```javascript
async function handoff(fromAgent, toAgent, context, task) {
  const summary = await fromAgent.summarizeProgress(context);
  return toAgent.execute({ task, priorContext: summary });
}
```

## Parallel Execution

Run multiple agents simultaneously for independent subtasks:

```javascript
async function parallelAgents(tasks) {
  const results = await Promise.all(
    tasks.map((task) => agents[task.type].execute(task))
  );
  return combineResults(results);
}
```

## Error Recovery

```javascript
async function runWithFallback(primaryAgent, fallbackAgent, task) {
  try {
    return await primaryAgent.execute(task);
  } catch (err) {
    console.warn("Primary agent failed, trying fallback:", err.message);
    return fallbackAgent.execute(task);
  }
}
```
