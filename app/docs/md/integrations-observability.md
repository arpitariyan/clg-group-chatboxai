# Integrations & Observability

Monitor, trace, and debug your AI integrations in production.

## Logging Every Request

```javascript
async function trackedCompletion(messages, metadata = {}) {
  const startTime = Date.now();
  
  try {
    const response = await client.chat.completions.create({
      model: "chatboxai/gpt-oss-20b",
      messages,
    });
    
    const latencyMs = Date.now() - startTime;
    
    // Log to your observability platform
    await logger.log({
      type: "ai_request",
      model: "chatboxai/gpt-oss-20b",
      latency_ms: latencyMs,
      input_tokens: response.usage.prompt_tokens,
      output_tokens: response.usage.completion_tokens,
      cost_usd: response.cost_usd,
      status: "success",
      ...metadata,
    });
    
    return response;
  } catch (err) {
    await logger.log({ type: "ai_request", status: "error", error: err.message, ...metadata });
    throw err;
  }
}
```

## LangSmith Integration

```javascript
import { Client } from "langsmith";
import { wrapOpenAI } from "langsmith/wrappers";

const langsmithClient = new Client();

const trackedClient = wrapOpenAI(
  new OpenAI({
    apiKey: process.env.CHATBOXAI_API_KEY,
    baseURL: "https://chatboxai.co.in/v1",
  })
);
```

## Helicone Integration

```javascript
const client = new OpenAI({
  apiKey: process.env.CHATBOXAI_API_KEY,
  baseURL: "https://oai.helicone.ai/v1",
  defaultHeaders: {
    "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
    "Helicone-Target-URL": "https://chatboxai.co.in",
  },
});
```

## Prometheus Metrics

```javascript
import { Counter, Histogram, register } from "prom-client";

const requestCounter = new Counter({
  name: "chatboxai_requests_total",
  help: "Total API requests",
  labelNames: ["model", "status"],
});

const latencyHistogram = new Histogram({
  name: "chatboxai_latency_seconds",
  help: "Request latency",
  labelNames: ["model"],
});
```

## Key Metrics to Track

| Metric | Why it matters |
|--------|---------------|
| **Latency P50/P95/P99** | User experience quality |
| **Error rate** | Reliability indicator |
| **Token usage/request** | Cost efficiency |
| **Cost/active user** | Business sustainability |
| **Cache hit rate** | Optimization opportunity |
| **Fallback rate** | Provider reliability |

## OpenTelemetry Tracing

```javascript
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("chatboxai-client");

async function tracedChat(messages) {
  const span = tracer.startSpan("chatboxai.chat");
  
  try {
    const response = await client.chat.completions.create({ model: "chatboxai/gpt-oss-20b", messages });
    span.setAttributes({
      "ai.model": "chatboxai/gpt-oss-20b",
      "ai.input_tokens": response.usage.prompt_tokens,
      "ai.output_tokens": response.usage.completion_tokens,
    });
    return response;
  } catch (err) {
    span.recordException(err);
    throw err;
  } finally {
    span.end();
  }
}
```
