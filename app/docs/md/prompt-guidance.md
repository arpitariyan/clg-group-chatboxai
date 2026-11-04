# Prompt Guidance

Writing excellent prompts is the fastest and most effective way to improve the quality, consistency, and accuracy of AI models. Because ChatboxAI gives you access to a wide variety of models (from ultra-fast edge models to frontier reasoning giants), writing robust prompts ensures consistent behavior regardless of the model serving the request.

This guide covers everything from basic principles to advanced techniques for production use cases.

---

## 1. Core Principles of Prompting

### Be Specific and Constrained
Vague prompts produce vague answers. The model cannot read your mind. Explicitly state the desired format, length, tone, and intended audience.

```text
❌ Bad:  "Explain quantum computing."
✅ Good: "Explain quantum computing to a high school student. Use exactly 3 bullet points, avoid complex jargon, and include a real-world analogy."
```

### Separate Instructions from Content
Always use the `system` role to define the persona, rules, and constraints. Reserve the `user` message for the specific task, question, or data to process. This prevents "prompt injection" and keeps the model focused.

```javascript
// System Instruction (The Rules)
"You are a strict data extraction bot. You only return valid JSON. Do not include any conversational text like 'Here is your JSON'."

// User Content (The Data)
"Extract the name, age, and email from this text: 'John Doe is 34. Contact him at john@example.com'."
```

### Tell the Model What TO Do (Not What NOT To Do)
Models struggle with negative constraints ("Do not write more than..."). Instead, frame instructions positively.

```text
❌ Bad:  "Do not write a long response. Don't use bullet points."
✅ Good: "Keep your response under 50 words. Write exactly one continuous paragraph."
```

---

## 2. Advanced Techniques

### Few-Shot Prompting (Provide Examples)
Showing the model exactly what you want is almost always more effective than trying to describe it. Provide 2-3 examples of input/output pairs in your prompt.

```text
Classify the sentiment of these reviews:

Review: "The product is amazing! It changed my life."
Sentiment: Positive

Review: "Worst purchase ever. Arrived broken."
Sentiment: Negative

Review: "Couldn't be happier with this!"
Sentiment:
```

### Chain of Thought (Reasoning)
For logic, math, coding, or complex data analysis, explicitly ask the model to "show its work." Forcing the model to output its thought process before the final answer drastically reduces hallucinations and improves accuracy.

```text
"Solve this problem step-by-step. 
1. First, break down the variables. 
2. Second, calculate the intermediate steps. 
3. Finally, provide the final answer clearly marked as 'FINAL ANSWER:'"
```

*Note: Models in the [Deep Research](/docs/models#deep-research) category (like `kimi-k2` or `glm-4.5-air`) have built-in chain-of-thought, but prompting for it still helps standard chat models.*

### XML Tag Formatting
When passing large blocks of text or multiple documents in a single prompt, wrap the data in XML-like tags. This helps the model distinguish between instructions and data.

```text
Summarize the following meeting transcript. Only include decisions made.

<transcript>
[Insert massive transcript here]
</transcript>
```

---

## 3. Specialized Prompting

### Image Generation (FLUX, Stable Diffusion)
For the `POST /api/v1/images/generations` endpoint, descriptive keywords are crucial. Structure your prompt to include the Subject, Environment, Lighting, and Camera Style.

```text
❌ Bad:  "A cat in a spaceship."
✅ Good: "A fluffy orange tabby cat sitting in the glowing cockpit of a futuristic spaceship, looking out a massive window at a purple nebula. Cinematic lighting, photorealistic, 8k resolution, highly detailed, shot on 35mm lens."
```

### Code Generation
When asking for code, specify the exact language, framework, dependencies, and constraints. 

```text
❌ Bad:  "Write a login component."
✅ Good: "Write a React login component in TypeScript. Use TailwindCSS for styling and React Hook Form for state management. Ensure it includes error handling for invalid emails and a loading state. Return ONLY the code block, no explanations."
```

### Tool Usage & Function Calling
When using the `tools` parameter, the model decides *when* to call a tool based purely on the tool's `description`.
- **Name tools clearly:** `get_weather_forecast` is much better than `tool_1`.
- **Describe parameters well:** "The city and state abbreviation, e.g., San Francisco, CA" is better than just "Location".

---

## 4. Parameter Tuning Guide

The `temperature` parameter (ranging from 0.0 to 2.0) controls the randomness and creativity of the output. Choosing the right temperature is critical for production apps.

| Use Case | Recommended Temp | Why? |
|----------|------------------|------|
| **Data Extraction / JSON** | `0.0 - 0.1` | Maximizes determinism. The model will almost always return the exact same output for the same input. |
| **Code Generation** | `0.1 - 0.3` | Ensures syntactically correct and highly logical code without taking creative leaps. |
| **General Q&A / Support** | `0.4 - 0.7` | Balances accuracy with natural, conversational flow. |
| **Creative Writing / Ideation** | `0.8 - 1.2` | Increases vocabulary diversity, narrative creativity, and brainstorm variety. |

> [!TIP]  
> If you set a high temperature (e.g., `1.0`), consider adjusting `top_p` slightly downward (e.g., `0.9`) to prevent the model from generating complete gibberish by cutting off the very lowest probability tokens.

---

## 5. Common Anti-Patterns to Avoid

- ❌ **Politeness**: Models don't need "please" or "thank you". It wastes tokens and dilutes the core instruction.
- ❌ **Overloading**: Asking a model to do 10 complex, unrelated steps in one prompt often fails. Break complex tasks down into multiple API calls (a workflow).
- ❌ **Assuming Context**: The model does not know who your users are or what your app does unless you explicitly tell it in the System prompt.
