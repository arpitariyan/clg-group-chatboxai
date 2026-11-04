# Quickstart: From Zero to Production

This guide will walk you through building your first production-ready API integration using ChatboxAI in under 5 minutes. 

ChatboxAI acts as a unified gateway. Once you integrate it, you have instant access to the world's most powerful AI models without needing to rewrite any code when switching between them.

---

## Step 1: Obtain Your API Key

Before writing code, you need a secure API key to authenticate your requests.

1. Log in to the [ChatboxAI Dashboard](/settings?tab=api-keys).
2. Navigate to **Settings → API Keys**.
3. Click **Create API Key**.
4. Copy the full key (it starts with `cbx_live_`). 
   > [!WARNING]  
   > Treat this key like a password. Never commit it to GitHub or expose it in client-side frontend code.

---

## Step 2: Set Up Your Environment

In a production environment, you should always store your API keys in environment variables securely.

Create a `.env` file in the root of your project:

```bash
# .env
CHATBOXAI_API_KEY="cbx_live_YOUR_ACTUAL_API_KEY"
```

---

## Step 3: Install the SDK

ChatboxAI is fully compatible with the official OpenAI SDKs, meaning you don't need to learn a new library. Choose your preferred language to install the dependencies:

### Node.js / TypeScript
```bash
npm install openai dotenv
```

### Python
```bash
pip install openai python-dotenv
```

---

## Step 4: Quick Test (Postman / Thunder Client)

Before writing any code, it is highly recommended to test your API key and see the response structure using an API client like Postman or Thunder Client (VS Code).

1. **Create a New Request**: Set the method to `POST`.
2. **Enter URL**: `https://chatboxai.co.in/api/v1/chat/completions`
3. **Configure Headers**: Go to the **Headers** tab and add:
   - `Authorization`: `Bearer cbx_live_YOUR_ACTUAL_API_KEY`
   - `Content-Type`: `application/json`
4. **Configure Body**: Go to the **Body** tab, select **JSON**, and paste:
   ```json
   {
     "model": "chatboxai/llama-3.3-70b",
     "messages": [
       { "role": "system", "content": "You are a helpful assistant." },
       { "role": "user", "content": "Say hello!" }
     ]
   }
   ```
5. **Send**: Click Send and verify you receive a `200 OK` status with the AI's response.

---

## Step 5: Write Production-Ready Code

Here is how you securely initialize the client and make an API request with proper error handling.

### JavaScript (Node.js)

Create a file named `index.js`:

```javascript
import OpenAI from "openai";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// 1. Initialize the client securely
const client = new OpenAI({
  apiKey: process.env.CHATBOXAI_API_KEY,
  baseURL: "https://chatboxai.co.in/api/v1", // Must point to ChatboxAI
});

async function generateChatResponse() {
  try {
    console.log("Generating response...");
    
    // 2. Make the API Call
    const response = await client.chat.completions.create({
      model: "chatboxai/llama-3.3-70b",
      messages: [
        { role: "system", content: "You are an expert software architect." },
        { role: "user", content: "Explain the benefits of a unified API gateway." }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    // 3. Print the result
    console.log("\nResponse:\n", response.choices[0].message.content);
    
    // 4. Log the exact cost (Unique to ChatboxAI)
    console.log(`\nCost: $${response.cost_usd}`);

  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error(`API Error [${error.status}]:`, error.message);
    } else {
      console.error("Unknown Error:", error);
    }
  }
}

generateChatResponse();
```

Run the script:
```bash
node index.js
```

### Python

Create a file named `app.py`:

```python
import os
from dotenv import load_dotenv
from openai import OpenAI, APIError

# Load environment variables from .env file
load_dotenv()

# 1. Initialize the client securely
client = OpenAI(
    api_key=os.environ.get("CHATBOXAI_API_KEY"),
    base_url="https://chatboxai.co.in/api/v1", # Must point to ChatboxAI
)

def generate_chat_response():
    try:
        print("Generating response...")
        
        # 2. Make the API Call
        response = client.chat.completions.create(
            model="chatboxai/llama-3.3-70b",
            messages=[
                {"role": "system", "content": "You are an expert software architect."},
                {"role": "user", "content": "Explain the benefits of a unified API gateway."}
            ],
            temperature=0.7,
            max_tokens=150
        )
        
        # 3. Print the result
        print("\nResponse:\n", response.choices[0].message.content)
        
        # 4. Log the exact cost (Unique to ChatboxAI)
        # Note: In Python, custom properties may require accessing the raw JSON dict
        raw_dict = response.model_dump()
        if "cost_usd" in raw_dict:
            print(f"\nCost: ${raw_dict['cost_usd']}")
            
    except APIError as e:
        print(f"API Error [{e.status_code}]: {e.message}")
    except Exception as e:
        print(f"Unknown Error: {e}")

if __name__ == "__main__":
    generate_chat_response()
```

Run the script:
```bash
python app.py
```

---

## Step 6: Understand the Response Structure

ChatboxAI returns a strictly compliant OpenAI JSON response. However, we also inject a highly useful `cost_usd` field so you can track exactly how much your query cost in real-time.

```json
{
  "id": "chatcmpl-8p9abc123",
  "object": "chat.completion",
  "created": 1704067200,
  "model": "chatboxai/llama-3.3-70b",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "A unified API gateway provides a single entry point for routing, rate limiting, and authenticating requests across multiple backend services..."
      },
      "finish_reason": "stop",
      "index": 0
    }
  ],
  "usage": {
    "prompt_tokens": 35,
    "completion_tokens": 42,
    "total_tokens": 77
  },
  "cost_usd": 0.000045
}
```

> [!TIP]
> **Track Your Balance Programmatically:** Every API response header includes an `X-API-Credits-Remaining` header, allowing you to monitor your balance without making a separate billing API call.

---

## Next Steps

Now that you have a production-ready setup, explore the rest of the platform:

- Browse the [Models Catalog](/docs/models) to find the best model for your use case.
- Read about [Authentication](/docs/authentication) best practices.
- Dive into the [Chat API](/docs/chat) to learn about function calling and streaming.
