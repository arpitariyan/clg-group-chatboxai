# Function Calling (Tools)

Function Calling (also known as Tools) allows you to connect AI models to your own APIs, databases, or external tools. Instead of generating text, the model will output a structured JSON object containing arguments to call a specific function in your code.

---

## 1. How Function Calling Works

1. **You define the tools:** You send an array of available tools (functions) and their expected arguments to the API.
2. **The model decides:** If the user's prompt requires external data (e.g., "What is the weather in London?"), the model pauses generation and returns a `tool_calls` request.
3. **You execute the tool:** Your local application code runs the actual function (e.g., fetches a weather API).
4. **You return the result:** You send the raw data back to the model.
5. **Final answer:** The model synthesizes the data and generates a natural language response.

---

## 2. Defining a Tool

Tools are defined using standard JSON Schema. 

```javascript
const tools = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get the current weather for a specific location.",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city name, e.g., London, UK"
          },
          unit: {
            type: "string",
            enum: ["celsius", "fahrenheit"]
          }
        },
        required: ["location"]
      }
    }
  }
];
```

---

## 3. Complete Function Calling Loop

Here is a complete, production-ready example using the Node.js SDK. Note that we recommend using highly capable models (like `chatboxai/llama-3.3-70b` (Free) or `chatboxai/claude-4.5-sonnet` (Paid)) for complex tool usage.

```javascript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.CHATBOXAI_API_KEY,
  baseURL: "https://chatboxai.co.in/api/v1",
});

// Mock local function
async function fetchWeather(location) {
  // In reality, you would call an external API here
  if (location.toLowerCase().includes("tokyo")) {
    return { temp: 22, condition: "Sunny" };
  }
  return { temp: 15, condition: "Cloudy" };
}

async function runChat() {
  const messages = [{ role: "user", content: "What's the weather like in Tokyo right now?" }];

  // Step 1: Send the initial request with tools
  const response = await client.chat.completions.create({
    model: "chatboxai/llama-3.3-70b", // Free model, excellent at tool usage
    messages: messages,
    tools: tools, // Defined in the previous section
    tool_choice: "auto", // Let the model decide if it needs a tool
  });

  const responseMessage = response.choices[0].message;

  // Step 2: Check if the model wants to call a tool
  if (responseMessage.tool_calls) {
    // Append the model's tool request to the conversation history
    messages.push(responseMessage);

    // Step 3: Execute the tools locally
    for (const toolCall of responseMessage.tool_calls) {
      if (toolCall.function.name === "get_weather") {
        const args = JSON.parse(toolCall.function.arguments);
        
        console.log(`Model requested weather for: ${args.location}`);
        
        // Run your local code
        const weatherData = await fetchWeather(args.location);

        // Step 4: Append the raw tool result to the history
        messages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: toolCall.function.name,
          content: JSON.stringify(weatherData),
        });
      }
    }

    // Step 5: Send the history back to the model for the final response
    const finalResponse = await client.chat.completions.create({
      model: "chatboxai/llama-3.3-70b",
      messages: messages,
    });

    console.log("Final Answer:", finalResponse.choices[0].message.content);
    // Output: "The current weather in Tokyo is sunny with a temperature of 22°C."
  }
}

runChat();
```

---

## 4. Best Practices

- **Write Great Descriptions:** The `description` field is the *only* way the model knows what a tool does. "Get the current weather" is better than "Weather".
- **Handle Errors:** If your local tool fails (e.g., database timeout), send a `{ "error": "Database timeout" }` string back to the model in the `tool` message. A smart model will apologize to the user or try an alternative tool.
- **Forcing Tool Usage:** You can force the model to use a specific tool by changing `tool_choice: "auto"` to `tool_choice: { type: "function", function: { name: "get_weather" } }`.
