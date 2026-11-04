# Image Generation Provider Migration Guide

**Repository:** `chatboxai-renewal`  
**Migration Date:** October 30, 2026  
**Status:** Completed & Tested  

---

## 1. Overview & New Architecture

ChatBox AI has migrated its image generation subsystem away from Leonardo AI to a resilient multi-tier provider architecture:

1. **Cloudflare Workers AI (PRIMARY):**
   - **Model:** `@cf/black-forest-labs/flux-1-schnell`
   - **Characteristics:** Ultra-low latency (2–4s), 4-step generation, free daily neuron quota (~173 images/day).
   - **Aspect Ratio:** Fixed 1024×1024 native generation adapted to any user aspect ratio via deterministic Sharp processing (`crop_to_fill` or `contain_pad`).

2. **ModelScope (SECONDARY / BACKUP):**
   - **Model:** `Qwen/Qwen-Image-2.1`
   - **Characteristics:** High-fidelity Chinese/English text-to-image synthesis by Alibaba Qwen team.
   - **Lifecycle:** Asynchronous task creation with bounded polling, timeout enforcement, and SSRF-safe URL downloading.
   - **Licensing:** Default status is `available_for_testing` (research license). Commercial production fallback is gated behind `MODELSCOPE_COMMERCIAL_VERIFIED=true`.

3. **Hugging Face Inference API (PRESERVED):**
   - **Models:** `black-forest-labs/FLUX.1-schnell`, `stabilityai/stable-diffusion-xl-base-1.0`, `runwayml/stable-diffusion-v1-5`, `ByteDance/Hyper-SD`.
   - **Capabilities:** Preserves text-to-image, reference image editing (image-to-image), multi-key rotation, and 503 cold-start retries.

---

## 2. Deprecation & Removal of Leonardo AI

All runtime execution paths, model configurations, and polling mechanisms associated with Leonardo AI have been excised:
- Removed `LEONARDO_API_BASE`, `getLeonardoApiKeysInOrder()`, `generateLeonardoImageWithKey()`, and polling loops from `app/api/generate-image/route.js`.
- Removed `generateViaLeonardo()` from `app/api/v1/images/generations/route.js`.
- Removed `leonardo` provider from `lib/hf-image-config.js` registry.
- Changed default model across composer and image generation page to Cloudflare FLUX Schnell.
- **Historical Records Preserved:** Existing Appwrite records and generated image files in Appwrite Storage remain readable and queryable.

---

## 3. Environment Variables

Add the following variables to `.env.local` (server-side only; never expose with `NEXT_PUBLIC_`):

```bash
# -----------------------------------------------------------------------------
# Cloudflare Workers AI (PRIMARY)
# -----------------------------------------------------------------------------
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token

# -----------------------------------------------------------------------------
# ModelScope (SECONDARY / BACKUP)
# -----------------------------------------------------------------------------
MODELSCOPE_API_TOKEN=your_modelscope_api_token
# Set to 'true' only after verifying commercial licensing requirements:
MODELSCOPE_COMMERCIAL_VERIFIED=false

# -----------------------------------------------------------------------------
# Hugging Face Inference API (PRESERVED)
# -----------------------------------------------------------------------------
HF_API_KEY=hf_your_primary_token
HF_API_KEY_2=hf_your_secondary_token
HF_API_KEY_3=
HF_API_KEY_4=
```

---

## 4. Provider Specifications & Endpoints

| Provider | Endpoint | Auth Header | Model ID | Default Steps |
|----------|----------|-------------|----------|---------------|
| **Cloudflare Workers AI** | `https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell` | `Bearer ${CLOUDFLARE_API_TOKEN}` | `@cf/black-forest-labs/flux-1-schnell` | 4 (bounded 1–8) |
| **ModelScope** | `https://api-inference.modelscope.cn/v1/tasks` | `Bearer ${MODELSCOPE_API_TOKEN}` | `Qwen/Qwen-Image-2.1` | Native hosted |
| **Hugging Face** | `https://router.huggingface.co/hf-inference/models/{modelId}` | `Bearer ${HF_API_KEY}` | `black-forest-labs/FLUX.1-schnell`, etc. | 4–50 |

---

## 5. Aspect Ratio & Dimension Handling

Cloudflare FLUX Schnell outputs square 1024×1024 images natively. To maintain seamless UX across user-chosen aspect ratios:
- The UI exposes:
  - `Square (1:1)` — 1024×1024
  - `Landscape (16:9)` — 1360×768
  - `Portrait (9:16)` — 768×1360
  - `Standard (4:3)` — 1152×896
  - `Wide (3:2)` — 1248×832
  - `Tall (2:3)` — 832×1248
- Sharp executes deterministic framing:
  - **`crop_to_fill` (Default):** Smart centered cover resize to the exact target dimensions.
  - **`contain_pad`:** Letterboxed resize preserving 100% of the generated canvas against a dark neutral backing.

---

## 6. Image-to-Image (Editing) Support

Cloudflare Workers AI and ModelScope hosted APIs currently only support text-to-image.
- When a user uploads a reference image in the ChatBox UI, the system automatically routes the request to Hugging Face's edit-capable model (`stabilityai/stable-diffusion-xl-base-1.0`).
- The reference image is resized, validated against magic bytes (PNG/JPEG/WebP), and passed via multi-variant negotiation to Hugging Face.
- If a user explicitly selected Cloudflare or ModelScope while attaching an image, the backend seamlessly routes to Hugging Face and returns an informative notice to the user.

---

## 7. Automated Fallback Rules

Fallback is orchestrator-controlled in `lib/image-providers/index.js`:
1. **Trigger Condition:** Fallback occurs **only** on quota exhaustion (`429`), temporary timeouts (`504`), or server outages (`503`).
2. **Forbidden Fallback:** The system **never** falls back on:
   - Invalid prompt or malformed input (`ProviderBadRequestError`).
   - Content moderation or NSFW violations (`ProviderContentPolicyError`).
   - Misconfigured API keys (`ProviderAuthError`).
3. **Execution Path:**
   - User requests Cloudflare (Primary).
   - If Cloudflare quota is exhausted, the orchestrator invokes ModelScope (Secondary) if `MODELSCOPE_API_TOKEN` is present and licensing criteria are met.
   - The result accurately tags `fallbackOccurred: true`, `originalProvider: 'cloudflare'`, and `fallbackReason`.

---

## 8. API Gateway Credit Accounting (`/api/v1/images/generations`)

The public OpenAI-compatible gateway supports batch image generation (`n = 1..4`):
- Credits are pre-deducted using `deductApiCreditsWithLock()`.
- **Complete Failure:** If 0 images succeed, 100% of pre-deducted credits are refunded via `addApiCreditsWithLock()`.
- **Partial Success:** If `n = 3` and 2 succeed while 1 fails:
  - The failed image is refunded: `refund = (totalCost / 3) * 1`.
  - The user is billed only for the 2 successful generations.
  - The API returns HTTP 200 with the 2 successful images and updated balance headers.

---

## 9. Testing & Validation

Run the dedicated provider test suite:
```bash
npm run test:images
```

Run all tests (builder + image generation):
```bash
npm test
```

Build production bundle:
```bash
npm run build
```
