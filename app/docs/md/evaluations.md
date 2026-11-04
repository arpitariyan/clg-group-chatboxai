# Evaluations

When deploying AI applications to production, measuring response quality is critical. The ChatboxAI platform provides an integrated Evaluations suite to benchmark models against your specific use cases.

---

## 1. Why Evaluate?

Because ChatboxAI provides a unified gateway to 56+ models, evaluations help you objectively determine:
1. Which model is most accurate for your specific prompts.
2. Which model provides the best cost-to-performance ratio.
3. Whether a change to your system prompt improved or degraded output quality.

---

## 2. Creating an Evaluation Dataset

An evaluation dataset consists of **Inputs** (the prompts) and **Expected Outputs** (ground truth).

You can upload datasets in CSV or JSONL format via the Dashboard in the **Evaluations** tab.

### JSONL Example (`dataset.jsonl`)
```json
{"input": "What is the capital of France?", "expected": "Paris"}
{"input": "What is 2 + 2?", "expected": "4"}
{"input": "Classify: 'I hate this product'.", "expected": "Negative"}
```

---

## 3. Running an Evaluation Run

Once your dataset is uploaded, you configure a Run.

1. Select your Dataset.
2. Select 1 to 3 Models to compare (e.g., `chatboxai/llama-3.3-70b`, `chatboxai/gemini-2.5-flash`, `chatboxai/claude-4.5-sonnet`).
3. Select an Evaluation Metric (see below).
4. Start the Run.

ChatboxAI will run every input against every model and grade the responses.

---

## 4. Evaluation Metrics

ChatboxAI uses LLM-as-a-Judge to grade outputs. We use a powerful reasoning model (`chatboxai/claude-3.7-sonnet`) to compare the generated output against your expected output.

| Metric | Description |
|--------|-------------|
| **Exact Match** | Did the model output the exact expected string? |
| **Semantic Similarity** | Does the output mean the same thing as the expected answer, even if phrased differently? |
| **JSON Validity** | Is the output strictly valid JSON conforming to the schema? |
| **Factuality** | Does the output contain the core facts present in the ground truth without hallucinating extra details? |

---

## 5. Analyzing Results

When a run completes, you will see a matrix:

| Model | Avg Score | Cost | Latency |
|-------|-----------|------|---------|
| `chatboxai/claude-4.5-sonnet` | 98% | $0.05 | 1.2s |
| `chatboxai/gemini-2.5-flash` | 94% | $0.01 | 0.8s |
| `chatboxai/llama-3.3-70b` | 82% | $0.02 | 1.0s |

In this scenario, `gemini-2.5-flash` might be chosen for production if 94% accuracy is acceptable, due to its drastically lower cost and latency.

---

## 6. Automated Evaluations (Paid Plan)

You can trigger evaluation runs programmatically via the API in your CI/CD pipelines. This allows you to block deployments if a prompt change degrades performance.

> [!WARNING]  
> Automated API Evaluations consume significant token volume and are restricted to **Paid plan** users. Free tier users can run small manual evaluations via the Dashboard, subject to the global 300 requests/day limit.

```bash
POST https://chatboxai.co.in/api/v1/evaluations/run
Authorization: Bearer cbx_live_YOUR_KEY
Content-Type: application/json
```

```json
{
  "dataset_id": "ds_987654",
  "models": ["chatboxai/llama-3.3-70b", "chatboxai/qwen3-coder"],
  "metric": "semantic_similarity"
}
```
