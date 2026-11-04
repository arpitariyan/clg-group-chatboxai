# IMAGE GENERATION SYSTEM AUDIT & MIGRATION BLUEPRINT

**Repository:** `chatboxai-renewal`  
**Working Branch:** `feature/image-provider-migration`  
**Backup Branch:** `backup/before-image-provider-migration` (Created at commit `1eca21c`)  
**Audit Date:** October 30, 2026  
**Status:** Phase 0 Complete — Audit and Security Baseline Established  

---

## 1. Executive Summary

This audit establishes the baseline for migrating ChatBox AI's image generation system away from the deprecated Leonardo AI provider to:
1. **Cloudflare Workers AI (`@cf/black-forest-labs/flux-1-schnell`)** as the **PRIMARY** image generation provider.
2. **ModelScope (`Qwen/Qwen-Image-2.1`)** as the **SECONDARY / BACKUP** image generation provider (asynchronous polling lifecycle, initial research-license testing mode).
3. **Hugging Face Inference API** — Preserving all existing models (`black-forest-labs/FLUX.1-schnell`, `stabilityai/stable-diffusion-xl-base-1.0`, `runwayml/stable-diffusion-v1-5`, `ByteDance/Hyper-SD`), multi-key failover, retries, and image-to-image editing.

---

## 2. Security Audit & Secret Exposure Assessment

### 2.1 Compromised Tracked Files Identified
During repository analysis, the following files containing real credentials were found tracked in Git:
- `.env` (Tracked in Git index; contains active third-party credentials)
- `.env.local` (Tracked in Git index; contains active third-party credentials)
- Root workspace files: `d:\All Projects\ChatboxAi_change\.env.txt`, `d:\All Projects\ChatboxAi_change\.env - Copy.txt`

### 2.2 Git History Exposure
Inspection via `git log --oneline -- .env .env.local` shows commits spanning from `c0e736d` to `5b3fdb8` modified tracked `.env` and `.env.local` files.
- **Rule:** Per security protocols, Git history will **not** be rewritten without explicit authorization from repository owners.
- **Immediate Remediation in Phase 0/1:**
  1. Untrack local environment files from the Git index safely: `git rm --cached .env .env.local`.
  2. Update `.gitignore` to ignore `.env*` while explicitly preserving `!.env.example`.
  3. Keep clean placeholders in `.env.example` without real secret keys.

### 2.3 Required Manual Key Rotation Actions
The following services must have their API credentials revoked and rotated immediately via their respective web dashboards:
1. **Leonardo AI:** Revoke all `LEONARDO_API_KEY*` keys. (Decommissioning this provider).
2. **Cloudflare Workers AI:** Create a dedicated Cloudflare API Token scoped with `Workers AI: Read` and `Workers AI: Edit` permissions. Do not use Global API Keys.
3. **ModelScope:** Generate an inference token via `modelscope.cn/my/accesstoken`.
4. **Appwrite:** Rotate `APPWRITE_API_KEY` in the Appwrite NYC cloud project console.
5. **Razorpay:** Rotate `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`.
6. **Hugging Face:** Rotate `HF_API_KEY*` tokens.
7. **Firebase & Google AI:** Rotate Google/Firebase service keys.
8. **Resend / SMTP:** Rotate Resend API keys.

---

## 3. Current Architecture & Image Generation Flow

```
[ User Prompt / Reference Image / Model Selection ]
                       │
                       ▼
       [ Frontend UI: Composer / Image Gen Page ]
                       │
                       ▼
            [ POST /api/generate-image ]
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
[ Authenticate User ]      [ Check Plan Limit: ]
 (Session / withUser)     checkImageGenerationLimit()
         │
         ▼
[ Mode Resolution: text-to-image vs image-to-image ]
         │
         ▼
[ Create Initial Appwrite Record (status: 'generating') ]
         │
         ▼
[ Provider Execution ]
 ├── Leonardo AI (POST /generations -> Poll -> Download) -> [TO BE REMOVED]
 └── Hugging Face (POST /hf-inference -> Buffer) -> [PRESERVED]
         │
         ▼
[ Output Validation & Sharp Image Processing (PNG conversion) ]
         │
         ▼
[ Appwrite Storage: storage.createFile() ]
         │
         ▼
[ Update Appwrite Record: status: 'completed', publicUrl, generatedImagePath ]
         │
         ▼
[ Return Response: publicUrl, displayUrl (/api/generate-image/file) ]
```

### 3.1 Public Gateway Flow (`POST /api/v1/images/generations`)
- Validates API key using `validateApiRequest()`.
- Calculates cost via `calculateImageCost(imageCount)`.
- Pre-deducts credits via `deductApiCreditsWithLock()`.
- Generates images in a loop:
  - Tries Hugging Face first.
  - On failure, silently falls back to Leonardo AI.
- Logs usage in Appwrite collection `API_USAGE_LOGS_COLLECTION_ID`.
- Returns OpenAI-compatible payload `{ created, data: [{ url, b64_json }] }`.
- **Known Flaw in Old Gateway:** If image generation fails after 1 image succeeds in a multi-image request (`n > 1`), the old code refunded the full cost and threw an exception, or didn't reconcile partial success cleanly.

---

## 4. Complete Inventory of Leonardo AI References

The following files contain active Leonardo references that must be migrated or removed:

| File Path | Nature of Leonardo Reference | Planned Action |
|-----------|------------------------------|----------------|
| `lib/hf-image-config.js` | Provider `leonardo`, `LEONARDO_IMAGE_MODELS`, model `1dd50843-d653-4516-a8e3-f0238ee453ff` | Remove Leonardo provider and model. Register Cloudflare & ModelScope. |
| `app/api/generate-image/route.js` | `LEONARDO_API_BASE`, polling logic, key fallbacks `getLeonardoApiKeysInOrder()`, dimension normalize `normalizeLeonardoDimensions()`, `generateLeonardoImageWithKey()` | Remove Leonardo polling and generator. Route to modular provider adapters. |
| `app/api/v1/images/generations/route.js` | `generateViaLeonardo()`, fallback calls in generation loop | Remove `generateViaLeonardo()`. Route via adapter architecture. |
| `app/(routes)/image-gen/[libId]/page.jsx` | `DEFAULT_IMAGE_MODEL_ID = getDefaultModelForProvider('leonardo')?.id` | Change default to Cloudflare FLUX Schnell `@cf/black-forest-labs/flux-1-schnell`. |
| `app/_components/ChatBoxAiInput.jsx` | `DEFAULT_IMAGE_MODEL_ID = getDefaultModelForProvider('leonardo')?.id` | Change default to Cloudflare FLUX Schnell. |
| `.env` & `.env.local` | `LEONARDO_API_KEY`, `LEONARDO_API_KEY_2..4`, `LEONARDO_API_BASE` | Remove from runtime requirements; document deprecation. |
| `README.md` | Mentions Leonardo AI (FLUX Schnell) | Update documentation to Cloudflare Workers AI & ModelScope. |
| `scripts/test-api-service.mjs` | Comment referencing Leonardo fallback | Update test documentation. |
| `public/llms.txt` | Text reference to Leonardo | Update product description. |

---

## 5. Hugging Face References (MUST BE PRESERVED)

All Hugging Face assets must remain 100% operational:
- **Registry:** `HF_IMAGE_MODELS`, `HF_IMAGE_TO_IMAGE_MODELS` in `lib/hf-image-config.js`.
- **Environment Key Resolution:** `HF_API_KEY`, `HF_API_KEY_2`, `HF_API_KEY_3`, `HF_API_KEY_4`, `HUGGING_FACE_API_KEY`, `HUGGING_FACE_TOKEN`, `HF_TOKEN`.
- **Endpoints:** `https://router.huggingface.co/hf-inference/models` and `https://api-inference.huggingface.co/models`.
- **Capabilities:**
  - Multi-key rotation and failover.
  - 503 loading retries with exponential/fixed backoff (`HF_MAX_RETRIES = 3`, `HF_RETRY_DELAY_MS = 20000`).
  - Image-to-image editing with reference image buffers and payload variant negotiation (`image`, `inputs`, raw buffer).
  - Temporary unavailability caching `markHFImageToImageModelUnavailable()`.
- **Website Builder Asset Fallback:** `generateWithHuggingFace()` in `lib/image-generation.js`.

---

## 6. Target Architecture (New Modular Provider Layer)

Instead of monolithic route files embedding provider HTTP logic, create a clean adapter layer:
```
lib/image-providers/
├── index.js                     # Unified orchestrator & dispatcher
├── types.js                     # Standard TypeScript/JSDoc types & contracts
├── cloudflare.js                # Cloudflare Workers AI adapter (FLUX.1 Schnell)
├── modelscope.js                # ModelScope adapter (Qwen/Qwen-Image-2.1 with async task polling)
├── huggingface.js               # Hugging Face adapter (Text-to-Image & Image-to-Image)
├── normalize-image-result.js    # Normalized output contract { buffer, mimeType, width, height, ... }
└── provider-errors.js           # Structured error classes (Quota, Auth, RateLimit, Policy, Timeout)
```

### 6.1 Provider Specifications

#### 1. Cloudflare Workers AI (PRIMARY)
- **Model ID:** `@cf/black-forest-labs/flux-1-schnell`
- **Endpoint:** `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`
- **Auth:** `Authorization: Bearer ${CLOUDFLARE_API_TOKEN}`
- **Parameters:** `{ prompt, num_steps: 4 }` (steps bounded 1..8, default 4).
- **Response Handling:** Decodes returned `result.image` (base64 string) into Buffer.
- **Aspect Ratio Strategy:**
  - The Cloudflare FLUX Schnell endpoint generates fixed 1024x1024 native squares.
  - Sharp processing performs deterministic transformation to requested ratio (e.g., 16:9, 9:16, 4:3, 3:2, 2:3) with containment/letterboxing or centered crop-to-fill, preventing subject distortion.
- **Quota Model:** Free allocation of 10,000 Neurons/day (~173 images/day theoretical maximum).

#### 2. ModelScope (SECONDARY / BACKUP)
- **Model ID:** `Qwen/Qwen-Image-2.1`
- **Endpoint:** Hosted inference API on `api-inference.modelscope.cn` / DashScope-compatible task endpoint.
- **Auth:** `Authorization: Bearer ${MODELSCOPE_API_TOKEN}`
- **Lifecycle:**
  1. Submit generation request -> Receive `task_id`.
  2. Bounded polling with exponential backoff and timeout deadline.
  3. On success, download image with SSRF protections (HTTPS only, valid domain, content-type checks).
- **Aspect Ratio Strategy:** Model-level presets mapped where supported.
- **Licensing & Verification Guard:** Default status `available_for_testing`. Commercial production fallback enabled only when admin-verified.

---

## 7. Migration Steps & Execution Plan

| Phase | Milestone | Acceptance Criteria |
|-------|-----------|---------------------|
| **Phase 0** | Safety & Audit | Backup branch created, Git status clean, audit documented, compromised keys cataloged. |
| **Phase 1** | Existing Architecture | All callers, contracts, and database dependencies mapped. |
| **Phase 2** | Remove Leonardo | Zero runtime calls to Leonardo; obsolete configs removed; historic records intact. |
| **Phase 3** | Cloudflare Workers AI | Working adapter with Base64 decode, Sharp aspect-ratio framing, error classification. |
| **Phase 4** | ModelScope Qwen | Async task submission, polling loop, SSRF-safe download, license guard. |
| **Phase 5** | Preserve Hugging Face | All HF models, multi-key rotation, retries, and image-to-image fully functional. |
| **Phase 6** | Centralized Registry | `lib/hf-image-config.js` updated with Cloudflare primary, ModelScope secondary, HF preserved. |
| **Phase 7** | UI Model Selection | Composer and `/image-gen/[libId]` updated to default to Cloudflare; smooth switching. |
| **Phase 8** | Adapter Layer | Shared adapter architecture implemented and tested across routes. |
| **Phase 9** | Fallback System | Controlled fallback: Cloudflare -> ModelScope (when eligible), no fallback on bad prompts. |
| **Phase 10** | Storage & DB | Appwrite storage uploads, proxy URL generation, and backward-compatible history preserved. |
| **Phase 11** | Image-to-Image UI | Clear capability flags; reference image routing preserved for HF edit models. |
| **Phase 12** | API Gateway | `/api/v1/images/generations` updated; partial success handling for `n > 1` repaired. |
| **Phase 13** | Security Hardening | Key isolation, token sanitization from logs, SSRF guards, rate-limit resilience. |
| **Phase 14** | Test Suite | Unit tests for all adapters, error handling, partial billing, and mock execution. |
| **Phase 15** | Documentation | Complete migration docs, updated `.env.example`. |
| **Phase 16** | Build & Verification | Clean test run and Next.js production build pass. |
| **Phase 17** | Progress Ledger & Checkpoints | `IMAGE_PROVIDER_MIGRATION_PROGRESS.md` maintained throughout. |
