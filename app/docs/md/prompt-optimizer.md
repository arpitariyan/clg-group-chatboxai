# Prompt Optimizer

Prompt engineering is an iterative, time-consuming process. The ChatboxAI **Prompt Optimizer** automates this by analyzing your initial prompt and rewriting it to maximize clarity, structure, and model comprehension.

---

## 1. How it Works

The Prompt Optimizer takes a basic, human-written instruction and expands it using proven prompt engineering techniques (like persona assignment, output constraints, and few-shot formatting).

**Original Prompt:**
> "Extract the names and ages from this text."

**Optimized Prompt:**
> "You are an expert data extraction system. Your task is to extract all names and ages from the provided text.
> 
> CRITICAL INSTRUCTIONS:
> 1. Return ONLY a valid JSON array.
> 2. Each object must have the keys 'name' (string) and 'age' (integer).
> 3. If an age is not specified, omit the person.
> 
> OUTPUT FORMAT:
> [{"name": "string", "age": 0}]"

---

## 2. Using the Optimizer API

You can programmatically optimize prompts before saving them to your application. 

*(Note: API access to the Prompt Optimizer is available on the Paid plan. Free tier users can use the visual tool in the Dashboard).*

```bash
POST https://chatboxai.co.in/api/v1/prompts/optimize
Authorization: Bearer cbx_live_YOUR_KEY
Content-Type: application/json
```

### Request

```json
{
  "prompt": "Write a blog post about AI in healthcare.",
  "target_model": "chatboxai/llama-3.3-70b",
  "goal": "I want it to be highly professional, structured with H2 tags, and exactly 500 words."
}
```

### Response

```json
{
  "optimized_prompt": "You are a senior medical technology journalist. Write a highly professional blog post about the impact of Artificial Intelligence in healthcare...\n\nCONSTRAINTS:\n- Use exactly H2 tags for sections.\n- Length MUST be exactly 500 words.",
  "improvements_made": [
    "Added expert persona",
    "Explicitly formatted formatting constraints",
    "Clarified length constraints"
  ]
}
```

---

## 3. Best Practices for Optimization

1. **Provide a Goal:** The optimizer works best when you tell it *why* the original prompt is failing (e.g., "The model keeps rambling" or "It forgets the formatting").
2. **Target Model:** Different models respond differently. An optimized prompt for a small 8B model will be much more explicit and rigid than an optimized prompt for a 70B model. Always specify your `target_model`.
3. **Iterate:** Use the optimized prompt as a baseline. Test it, and if it fails edge cases, feed the failure back into the optimizer.

---

## 4. Dashboard Tool

If you prefer a visual interface, you can access the Prompt Optimizer directly in your ChatboxAI Dashboard under the **Developer Tools** section. There, you can instantly test the optimized prompt against multiple models side-by-side.
