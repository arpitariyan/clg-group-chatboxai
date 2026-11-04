# Code Generation

ChatboxAI provides access to specialized models that have been heavily fine-tuned on programming languages. You can use these models to generate entire scripts, debug errors, refactor legacy code, and write unit tests.

---

## 1. Selecting a Coding Model

While general models can write code, using a specialized model yields significantly fewer syntax errors and better architectural decisions.

| Tier | Model ID | Best For |
| :--- | :--- | :--- |
| **Free** | `chatboxai/qwen3-32b` | Quick snippets, simple algorithms, and small UI components. (Limited to 300 req/day). |
| **Paid** | `chatboxai/qwen3-coder` | Heavy-duty code generation, building full apps, and complex debugging. |
| **Paid** | `chatboxai/claude-3.7-sonnet` | Excellent reasoning for React, TypeScript, and modern web frameworks. |

---

## 2. Basic Code Generation

When asking for code, always use a **System Prompt** to define the programming language, framework, and expected output format.

### Test via Postman / Thunder Client (Quick Test)

To generate code using an API client, you should use the standard chat completions endpoint with a specialized coding model and a low temperature.

- **Method**: `POST`
- **URL**: `https://chatboxai.co.in/api/v1/chat/completions`
- **Headers**:
  - `Authorization`: `Bearer cbx_live_YOUR_API_KEY`
  - `Content-Type`: `application/json`
- **Body (JSON)**:
  ```json
  {
    "model": "chatboxai/qwen3-32b",
    "messages": [
      {
        "role": "system",
        "content": "You are a Senior Python Developer. Write clean code and return ONLY the code without any markdown or explanations."
      },
      {
        "role": "user",
        "content": "Write a python function to generate the Fibonacci sequence up to n numbers."
      }
    ],
    "temperature": 0.1
  }
  ```
  *(Note: A low temperature like `0.1` is highly recommended for coding to prevent the AI from hallucinating syntax.)*

### Example (Python)

```python
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("CHATBOXAI_API_KEY"),
    base_url="https://chatboxai.co.in/api/v1",
)

response = client.chat.completions.create(
    model="chatboxai/qwen3-coder", # Paid heavy-duty coding model
    messages=[
        {
            "role": "system",
            "content": "You are a Senior Data Engineer. Write clean Python code. Return ONLY the code block without markdown wrapping if possible."
        },
        {
            "role": "user",
            "content": "Write a Python script using pandas to load a CSV, drop rows with null values, and group by the 'department' column to find the average 'salary'."
        }
    ],
    temperature=0.1 # Low temperature prevents hallucinations in code
)

print(response.choices[0].message.content)
```

---

## 3. Code Review & Debugging

You can pass buggy code to the model and ask it to find errors or suggest optimizations.

```javascript
const buggyCode = `
function calculateAverage(numbers) {
  let total = 0;
  for (let i = 1; i <= numbers.length; i++) { // Bug: Off-by-one error
    total += numbers[i];
  }
  return total / numbers.length;
}
`;

const response = await client.chat.completions.create({
  model: "chatboxai/claude-3.7-sonnet",
  messages: [
    { role: "system", content: "You are a strict code reviewer. Identify bugs and provide the corrected code." },
    { role: "user", content: `Review this JavaScript code:\n\n${buggyCode}` },
  ],
  temperature: 0.2,
});
```

---

## 4. Writing Unit Tests

Models are excellent at generating boilerplate unit tests. Pass your function to the model and specify your testing framework (e.g., Jest, PyTest).

```javascript
const response = await client.chat.completions.create({
  model: "chatboxai/qwen3-32b", // Free model is usually sufficient for tests
  messages: [
    { role: "system", content: "You are a QA engineer. Write robust Jest tests covering edge cases." },
    { role: "user", content: `Write Jest tests for this function:\n\n${myFunctionString}` },
  ],
});
```

---

## 5. Best Practices for Code Generation

1. **Use Low Temperature:** Set `temperature` between `0.0` and `0.3`. High temperatures cause the model to hallucinate non-existent libraries or invent incorrect syntax.
2. **Provide Context:** If your code relies on a specific database schema or custom types, paste those interfaces into the prompt.
3. **Specify Versions:** Frameworks change fast. Specify the version in your prompt (e.g., "Write this using React 18 and Next.js 14 App Router").
4. **Test Before Production:** **Never** deploy AI-generated code directly to production without testing it locally or running it through your CI/CD pipeline.
