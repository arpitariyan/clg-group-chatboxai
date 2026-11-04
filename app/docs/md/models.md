# Models Catalog

ChatboxAI provides a unified, production-ready model catalog under the `chatboxai/` namespace. By authenticating with your `cbx_live_*` key and passing a `chatboxai/` model ID, you can instantly switch between the world's best models without altering your application code.

## 1. Normal Search & Chat Models

These models are optimized for everyday conversational AI, answering questions, writing text, extracting data, and processing normal queries.

### Free Tier (Normal Chat)
These models are available for free (limited to 300 requests per day) and are great for high-speed, cost-effective tasks.

| Model Name | Model ID | Capabilities & Purpose |
| :--- | :--- | :--- |
| **Llama 3.3 70B** | `chatboxai/llama-3.3-70b` | **Purpose:** Best overall open-source model. Excellent for general chat, creative writing, and robust instruction following. |
| **Gemini 2.5 Flash** | `chatboxai/gemini-2.5-flash` | **Purpose:** Extremely fast, next-generation multimodal model. Best for high-speed text and vision tasks. |
| **Qwen3 32B** | `chatboxai/qwen3-32b` | **Purpose:** Strong coding and logic reasoning. Ideal for general-purpose programming queries. |
| **Qwen 3.6 Plus Preview**| `chatboxai/qwen-3.6-plus` | **Purpose:** Advanced multi-turn conversation and coding logic. |
| **Mistral Small 3.1** | `chatboxai/mistral-small-3.1` | **Purpose:** Fast and lightweight with native function calling support. |
| **GLM 4.5 Air** | `chatboxai/glm-4.5-air` | **Purpose:** Built-in chain-of-thought processing for structured problem solving. |
| **Llama 3.1 8B Turbo** | `chatboxai/llama-3.1-8b` | **Purpose:** Ultra-fast, high-throughput model. Best for simple queries and API fallback. |
| **Gemma 3 27B** | `chatboxai/gemma-3-27b` | **Purpose:** Highly capable, balanced text and vision processing. |

*(Note: Additional lightweight models like `llama-3.2-3b`, `qwen3-next-80b`, `minimax-m2.5`, and `nemotron-3-nano` are also included in the free tier for edge-case tasks).*

### Paid Tier (Normal Chat)
These are flagship models offering state-of-the-art intelligence, massive context windows, and high reliability.

| Model Name | Model ID | Capabilities & Purpose |
| :--- | :--- | :--- |
| **Claude Opus 4.7** | `chatboxai/claude-opus-4.7` | **Purpose:** Flagship reasoning. Best for highly complex problem solving, deep analysis, and high-fidelity content generation. |
| **Claude 4.5 Sonnet** | `chatboxai/claude-4.5-sonnet` | **Purpose:** Perfect balance of speed and top-tier intelligence. Ideal for versatile everyday tasks. |
| **Gemini 2.5 Pro** | `chatboxai/gemini-2.5-pro` | **Purpose:** Premium performance with massive context (up to 2M tokens). Best for analyzing entire codebases or huge document sets. |
| **Qwen3 Coder 480B** | `chatboxai/qwen3-coder` | **Purpose:** Heavy-duty coding. Best for building complex applications and debugging huge codebases. |
| **GPT-OSS 120B** | `chatboxai/gpt-oss-120b` | **Purpose:** Top-tier open-source synthesis and architectural design. |

---

## 2. Deep Research & Agentic Models

These models are explicitly built for multi-step reasoning, autonomous agents, and deep internet research workflows. They excel at using external tools, browsing the web, and synthesizing long-form research.

### Free Tier (Deep Research)
| Model Name | Model ID | Capabilities & Purpose |
| :--- | :--- | :--- |
| **Kimi K2** | `chatboxai/kimi-k2` | **Purpose:** Highly optimized for agentic workflows and tool usage. Capable of handling deep web searches and synthesizing information autonomously. |

### Paid Tier (Deep Research)
| Model Name | Model ID | Capabilities & Purpose |
| :--- | :--- | :--- |
| **NVIDIA Nemotron 3 Super** | `chatboxai/nemotron-3-super` | **Purpose:** Massive 1M context window combined with deep agentic reasoning. Best for orchestrating complex research workflows over massive document libraries. |
| **Hermes 3 405B** | `chatboxai/hermes-3-405b` | **Purpose:** Frontier reasoning and strict tool-use. Best for handling state-of-the-art multi-step logic puzzles and autonomous agents. |
| **Trinity Large Preview** | `chatboxai/trinity-large` | **Purpose:** Massive 400B MoE model. Best for expansive, complex persona adoption during agentic interactions. |

---

## 3. Image Generation Models

Used exclusively with the `POST /api/v1/images/generations` endpoint to generate high-quality visuals from text prompts.

### Free Tier (Image Generation)
| Model Name | Model ID | Capabilities & Purpose |
| :--- | :--- | :--- |
| **FLUX Schnell** | `chatboxai/image-flux-schnell` | **Purpose:** High-speed image generation. Ideal for rapid visual prototyping and quick concept art. |

### Paid Tier (Image Generation)
| Model Name | Model ID | Capabilities & Purpose |
| :--- | :--- | :--- |
| **FLUX Dev** | `chatboxai/image-flux-dev` | **Purpose:** Ultra-high-quality image generation. Best for production-ready artwork, hyper-realistic photos, and detailed visuals. |
| **Stable Diffusion 3.5** | `chatboxai/image-stable-diffusion-3.5` | **Purpose:** Highly flexible generation. Best for complex prompt adherence and highly stylized artistic rendering. |
| **Stable Diffusion XL** | `chatboxai/image-sdxl` | **Purpose:** Cinematic and photographic visuals. Best for highly realistic character portraits and environments. |

---

## 4. Audio & Speech Models (Bonus)

Used exclusively with the `POST /api/v1/audio/speech` endpoint for Text-to-Speech (TTS).

| Tier | Model Name | Model ID | Capabilities & Purpose |
| :--- | :--- | :--- | :--- |
| **Free** | **TTS-1** | `tts-1` | **Purpose:** Standard text-to-speech for everyday voice generation and basic app accessibility features. |
| **Paid** | **TTS-1 HD** | `tts-1-hd` | **Purpose:** High-definition, low-noise audio generation. Best for professional voiceovers, podcasts, and media production. |

---

## Auto Selection

Don't want to choose? Pass `"model": "auto"` to let ChatboxAI pick the best available model for your request dynamically based on latency and availability.

```json
{ "model": "auto", "messages": [...] }
```

## Model ID Stability

`chatboxai/` model IDs are strictly maintained for production reliability. We guarantee:
- The model ID string will never randomly change.
- The behavior and quality tier remain consistent.
- If we upgrade infrastructure internally, your application code requires **zero updates**.

See [Pricing](/docs/pricing) for detailed cost information for each model tier.
