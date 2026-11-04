# Pricing & Billing

ChatboxAI uses a unified, real-time **Credit-Based Billing System**. Instead of managing separate bills for text, images, and audio, everything is deducted from a single US Dollar ($) credit balance.

> [!IMPORTANT]  
> **Free Tier Limits:** All models marked as "Free" cost exactly $0.00 to use, but they are strictly limited to **300 requests per day** and **5 requests per minute (RPM)** per account to prevent abuse.

---

## 1. How Credit Billing Works

1. **Purchase Credits**: You purchase API Credits (e.g., $10.00) from the Dashboard.
2. **Make Requests**: Every time you make an API request to a Paid model, ChatboxAI calculates the exact cost in USD based on the model and usage (tokens, images, or characters).
3. **Real-time Deduction**: The calculated cost is instantly deducted from your balance.

Every API response header includes your exact remaining balance:
```http
X-API-Credits-Remaining: 9.9995
```

The response JSON body also explicitly shows the cost of that specific API call:
```json
{
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 400
  },
  "cost_usd": 0.00032
}
```

---

## 2. Text & Chat Pricing

Text generation is priced per **1,000 tokens** (both input and output). 

### Free Models ($0.00)
*Subject to the 300 requests/day limit.*

| Model Name | Model ID | Input / 1K | Output / 1K |
| :--- | :--- | :--- | :--- |
| **Llama 3.3 70B** | `chatboxai/llama-3.3-70b` | $0.000 | $0.000 |
| **Gemini 2.5 Flash** | `chatboxai/gemini-2.5-flash` | $0.000 | $0.000 |
| **Qwen3 32B** | `chatboxai/qwen3-32b` | $0.000 | $0.000 |
| **Qwen 3.6 Plus** | `chatboxai/qwen-3.6-plus` | $0.000 | $0.000 |
| **Kimi K2** | `chatboxai/kimi-k2` | $0.000 | $0.000 |
| **Mistral Small 3.1** | `chatboxai/mistral-small-3.1` | $0.000 | $0.000 |
| **GLM 4.5 Air** | `chatboxai/glm-4.5-air` | $0.000 | $0.000 |
| **Gemma 3 27B** | `chatboxai/gemma-3-27b` | $0.000 | $0.000 |
| *(All other free models)* | | $0.000 | $0.000 |

### Paid Models (Pro Tier)
*Prices vary dynamically based on provider availability. The prices below are typical averages.*

| Model Name | Model ID | Input / 1K | Output / 1K |
| :--- | :--- | :--- | :--- |
| **Claude Opus 4.7** | `chatboxai/claude-opus-4.7` | $0.0150 | $0.0750 |
| **Claude 4.5 Sonnet** | `chatboxai/claude-4.5-sonnet` | $0.0030 | $0.0150 |
| **Gemini 2.5 Pro** | `chatboxai/gemini-2.5-pro` | $0.0012 | $0.0048 |
| **Qwen3 Coder 480B**| `chatboxai/qwen3-coder` | $0.0009 | $0.0025 |
| **Hermes 3 405B** | `chatboxai/hermes-3-405b` | $0.0015 | $0.0030 |
| **NVIDIA Nemotron 3**| `chatboxai/nemotron-3-super`| $0.0010 | $0.0020 |

> [!TIP]
> Call `GET https://chatboxai.co.in/api/v1/models` to view exact, real-time pricing for every model programmatically.

---

## 3. Image Generation Pricing

Images are generated via the `POST /api/v1/images/generations` endpoint and are priced per image.

| Model Name | Model ID | Cost per Image |
| :--- | :--- | :--- |
| **FLUX Schnell** (Free) | `chatboxai/image-flux-schnell` | **$0.00** |
| **FLUX Dev** (Paid) | `chatboxai/image-flux-dev` | **$0.01** |
| **Stable Diffusion 3.5** (Paid) | `chatboxai/image-stable-diffusion-3.5`| **$0.008** |
| **Stable Diffusion XL** (Paid) | `chatboxai/image-sdxl` | **$0.006** |

---

## 4. Audio Generation Pricing (TTS)

Audio is generated via the `POST /api/v1/audio/speech` endpoint and is priced per 1,000 text characters.

| Model Name | Model ID | Cost per 1K Characters |
| :--- | :--- | :--- |
| **TTS-1** (Free) | `tts-1` | **$0.00** |
| **TTS-1 HD** (Paid)| `tts-1-hd` | **$0.015** |

---

## 5. Cost Estimation Examples

### Example A: Chat Completions (Text)
You send 1,000 input tokens and generate 500 output tokens using the paid `chatboxai/claude-4.5-sonnet` model:

```text
Input Cost:   (1000 / 1000) * $0.0030 = $0.0030
Output Cost:  (500 / 1000)  * $0.0150 = $0.0075
------------------------------------------------
Total Request Cost:                     $0.0105
```

### Example B: Image Generation
You request 4 high-quality images of "a futuristic city" via `chatboxai/image-flux-dev`:

```text
Image Cost:   4 images * $0.01      = $0.04
------------------------------------------------
Total Request Cost:                   $0.04
```

---

## 6. Subscriptions vs Credits

Understanding how your Subscription Plan interacts with your API Credits:

*   **Subscription Plan (Free, Pro, Business):** Determines your Rate Limits (Requests per Minute and Tokens per Minute), Priority Support access, and access to premium features.
*   **API Credits:** Acts as your wallet to pay for actual API usage when you use Paid models.

*To upgrade your plan or purchase credits, visit [Settings → Account](/settings?tab=account).*
