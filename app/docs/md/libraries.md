# Libraries & SDKs

ChatboxAI is built to be a seamless, drop-in replacement for OpenAI. Because our API perfectly matches the OpenAI specification, **you do not need to install a custom, proprietary library.** 

You can use the official tools, SDKs, and frameworks you already know and love. All you need to do is change two variables: the `baseURL` and the `apiKey`.

---

## 1. Official OpenAI SDKs

The most robust and heavily supported way to interact with ChatboxAI is by using the official OpenAI client libraries. 

### Node.js / TypeScript

The official Node.js library provides full type safety and supports modern features like streaming and tool calling.

**Installation:**
```bash
npm install openai
```

**Implementation:**
```javascript
import OpenAI from "openai";

// Initialize the client pointing to ChatboxAI
const client = new OpenAI({
  apiKey: process.env.CHATBOXAI_API_KEY,
  baseURL: "https://chatboxai.co.in/api/v1", // <-- Required
});

async function generateChat() {
  const response = await client.chat.completions.create({
    model: "chatboxai/llama-3.3-70b",
    messages: [{ role: "user", content: "Explain quantum computing in simple terms." }],
  });
  
  console.log(response.choices[0].message.content);
}

generateChat();
```

### Python

The official Python library is perfect for data science workflows, scripting, and backend development.

**Installation:**
```bash
pip install openai
```

**Implementation:**
```python
import os
from openai import OpenAI

# Initialize the client pointing to ChatboxAI
client = OpenAI(
    api_key=os.environ.get("CHATBOXAI_API_KEY"),
    base_url="https://chatboxai.co.in/api/v1", # <-- Required
)

response = client.chat.completions.create(
    model="chatboxai/llama-3.3-70b",
    messages=[{"role": "user", "content": "Explain quantum computing in simple terms."}],
)

print(response.choices[0].message.content)
```

### Go

If you are building high-performance backend systems in Go, the `sashabaranov/go-openai` community package is fully compatible.

**Installation:**
```bash
go get github.com/sashabaranov/go-openai
```

**Implementation:**
```go
package main

import (
    "context"
    "fmt"
    openai "github.com/sashabaranov/go-openai"
)

func main() {
    config := openai.DefaultConfig("cbx_live_YOUR_KEY")
    config.BaseURL = "https://chatboxai.co.in/api/v1" // <-- Required
    
    client := openai.NewClientWithConfig(config)
    
    resp, err := client.CreateChatCompletion(
        context.Background(),
        openai.ChatCompletionRequest{
            Model: "chatboxai/llama-3.3-70b",
            Messages: []openai.ChatCompletionMessage{
                {Role: openai.ChatMessageRoleUser, Content: "Hello!"},
            },
        },
    )
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }
    fmt.Println(resp.Choices[0].Message.Content)
}
```

---

## 2. AI Framework Integrations

ChatboxAI drops seamlessly into popular orchestration and agent frameworks, allowing you to use advanced reasoning models like `chatboxai/claude-opus-4.7` within complex pipelines.

### Vercel AI SDK

The Vercel AI SDK is the standard for building AI-powered React/Next.js applications.

```javascript
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

// Create a custom provider pointing to ChatboxAI
const chatboxai = createOpenAI({
  baseURL: "https://chatboxai.co.in/api/v1",
  apiKey: process.env.CHATBOXAI_API_KEY,
});

async function run() {
  const { text } = await generateText({
    model: chatboxai("chatboxai/llama-3.3-70b"),
    prompt: "Write a short story about a robot.",
  });
  
  console.log(text);
}
```

### LangChain (JavaScript / TypeScript)

```javascript
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  apiKey: process.env.CHATBOXAI_API_KEY,
  configuration: {
    baseURL: "https://chatboxai.co.in/api/v1",
  },
  modelName: "chatboxai/gpt-oss-120b",
});

const res = await model.invoke("What is the speed of light?");
console.log(res.content);
```

### LangChain (Python)

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="chatboxai/gpt-oss-120b",
    api_key=os.environ.get("CHATBOXAI_API_KEY"),
    base_url="https://chatboxai.co.in/api/v1",
)

res = llm.invoke("What is the speed of light?")
print(res.content)
```

---

## 3. Raw REST API (No SDK)

If you prefer not to use an SDK, or you are building in a constrained environment (like edge workers or embedded devices), you can interact with the API directly using standard HTTP clients.

### Fetch (JavaScript)

```javascript
const response = await fetch("https://chatboxai.co.in/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.CHATBOXAI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "chatboxai/llama-3.3-70b",
    messages: [{ role: "user", content: "Hello!" }],
  }),
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

### cURL

```bash
curl -X POST https://chatboxai.co.in/api/v1/chat/completions \
  -H "Authorization: Bearer cbx_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "chatboxai/llama-3.3-70b",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```
