# Accuracy Optimization

Large Language Models (LLMs) can occasionally hallucinate or provide overly generic answers. This guide details how to leverage ChatboxAI's advanced features to maximize the accuracy, relevance, and reliability of model outputs.

---

## 1. Grounding with Web Search (Paid Plan)

The most common cause of inaccuracy is a model lacking knowledge about current events. LLMs are frozen in time based on their training data cutoff.

If your application requires up-to-date facts (e.g., stock prices, news, sports scores, recent API documentation), you should enable the [Web Search](/docs/web-search) tool.

By passing `{ "type": "web_search" }` in the `tools` array, the model will dynamically query the live internet before answering, virtually eliminating hallucinations on recent topics.

*(Note: Web Search is a compute-heavy operation and is only available on Paid plans).*

---

## 2. Context Injection via MCP

If the model is inaccurate because it lacks access to your company's private data, use the [MCP & Connectors](/docs/mcp-connectors) feature.

By connecting an MCP server, you allow the model to search your internal Jira boards, Slack channels, or Notion wikis. Grounding the model in your private, verified data ensures it provides highly accurate, context-aware answers.

---

## 3. Strict Prompting & Personas

Models default to a "helpful, conversational assistant" persona. If you need precise, technical accuracy, you must override this in the system prompt.

**Weak Prompt:**
> "Review this code for errors."

**Optimized Prompt:**
> "You are a Senior Staff Security Engineer specializing in Node.js. Review this code strictly for OWASP Top 10 vulnerabilities. Do not comment on stylistic choices. If no vulnerabilities exist, output 'CLEAN'."

*Tip: Use the [Prompt Optimizer](/docs/prompt-optimizer) API to automatically upgrade your weak prompts into highly accurate system instructions.*

---

## 4. Temperature and Top-P

The `temperature` parameter directly controls how creative (and therefore, how prone to hallucination) the model is.

- **Data Extraction & Logic:** Set `temperature` to `0.0` or `0.1`. The model will return the most statistically probable (and usually most accurate) tokens.
- **Creative Writing:** Set `temperature` to `0.7` to `1.0`. 
- **Coding:** Set `temperature` between `0.1` and `0.3` to prevent the model from inventing non-existent libraries or syntax.

---

## 5. Structured Output (JSON Mode)

If your inaccuracy issues stem from the model ignoring formatting instructions, use [Structured Output](/docs/structured-output). 

By passing `response_format: { type: "json_object" }` (or enforcing a strict JSON Schema), you force the model to adhere to a programmatic structure, making the output 100% predictable for your backend parsers.

---

## 6. Evaluate and Compare

Finally, the best way to optimize accuracy is to measure it. 

Do not guess which model is best for your use case. Use the [Evaluations](/docs/evaluations) suite in the ChatboxAI Dashboard to upload a dataset of 50 test cases, run them against multiple models simultaneously, and let the LLM-as-a-Judge system definitively tell you which model is the most accurate.
