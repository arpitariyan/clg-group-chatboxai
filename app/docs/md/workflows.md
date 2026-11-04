# Workflows

Build structured, repeatable pipelines with AI steps, conditions, and human-in-the-loop checkpoints.

## Linear Workflow

Chain steps sequentially where each step's output feeds the next:

```javascript
async function contentPipeline(topic) {
  // Step 1: Research
  const research = await client.chat.completions.create({
    model: "chatboxai/gpt-oss-120b",
    messages: [{ role: "user", content: `Research key facts about: ${topic}` }],
  });

  // Step 2: Outline
  const outline = await client.chat.completions.create({
    model: "chatboxai/gpt-oss-20b",
    messages: [
      { role: "user", content: `Create an article outline based on this research:\n${research.choices[0].message.content}` }
    ],
  });

  // Step 3: Draft
  const draft = await client.chat.completions.create({
    model: "chatboxai/llama-3.3-70b",
    messages: [
      { role: "user", content: `Write a full article based on this outline:\n${outline.choices[0].message.content}` }
    ],
  });

  return draft.choices[0].message.content;
}
```

## Conditional Workflow

Branch based on model decisions:

```javascript
async function triageWorkflow(userQuery) {
  // Classify intent
  const classification = await classify(userQuery);

  switch (classification.intent) {
    case "technical":
      return technicalSupportFlow(userQuery);
    case "billing":
      return billingFlow(userQuery);
    default:
      return generalFlow(userQuery);
  }
}
```

## Human-in-the-Loop

Pause for human approval before proceeding:

```javascript
async function humanApprovalWorkflow(task) {
  const draft = await generateDraft(task);
  
  // Send for human review (e.g. via email, Slack, or UI)
  const approval = await requestHumanApproval(draft);
  
  if (approval.approved) {
    return await publish(draft);
  } else {
    return await revise(draft, approval.feedback);
  }
}
```

## Retry & Recovery

```javascript
async function resilientStep(fn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      await sleep(Math.pow(2, attempt) * 1000); // exponential backoff
    }
  }
}
```

## Progress Tracking

```javascript
async function trackedWorkflow(steps, onProgress) {
  const results = [];
  for (let i = 0; i < steps.length; i++) {
    onProgress({ step: i + 1, total: steps.length, status: "running" });
    const result = await steps[i]();
    results.push(result);
    onProgress({ step: i + 1, total: steps.length, status: "done" });
  }
  return results;
}
```
