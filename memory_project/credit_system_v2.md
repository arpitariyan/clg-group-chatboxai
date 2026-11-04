# Credit System v2 — Dual Wallet Architecture

## Summary
The credit system has been completely redesigned and implemented following the ChatboxAI Master Credit System specification.

## Architecture

### Two Internal Wallets (User sees only one number)
| Field in DB | Type | Resets | Plan Amounts |
|---|---|---|---|
| `users.credits` | Daily Free Credits | Every midnight UTC | 5000 (all plans) |
| `users.paid_credits` | Monthly Paid Credits | Billing date monthly | Free: 0, Pro: 30000, Max: 150000 |

**UI always shows:** `creditsRemaining = credits + paid_credits`

### Core Deduction Rules
- **Free Model** → deduct from `credits` (daily free wallet) ONLY
- **Paid Model** → deduct from `paid_credits` (monthly paid wallet) ONLY
- No cross-wallet deduction. Ever.

### Blocking Logic
| Scenario | HTTP Code | Message |
|---|---|---|
| Free user + paid model | 403 | "Upgrade to Pro/Max required" |
| Daily credits = 0 + free model | 429 | "Daily credits exhausted, resets at midnight" |
| Monthly credits = 0 + paid model | 402 | "Monthly credits exhausted, wait for billing cycle" |
| Both = 0 | 402 | "No credits remaining" |

## Files Created/Modified

### New Files
- `lib/model-catalog.js` — DB-driven model rate engine with 5-min TTL cache
- `lib/credit-engine.js` — Dual-wallet credit deduction with per-user mutex
- `app/api/credits/balance/route.js` — Single balance endpoint for UI
- `scripts/seed-model-catalog.js` — Seeds model_catalog Appwrite collection

### Modified Files
- `lib/budget-router.js` — Now uses DB catalog for authoritative category routing
- `inngest/functions.js` — Daily reset now also updates `last_daily_reset` field
- `services/appwrite-collections.js` — Added `model_catalog`, `credit_transactions` collections

## New Appwrite Collections Required

### `model_catalog`
Admin-editable model rates. No code deployment needed to change rates.

| Attribute | Type | Notes |
|---|---|---|
| `public_id` | string | e.g. "chatboxai/gemini-2.5-flash" |
| `name` | string | Display name |
| `category` | string | "free" \| "paid" \| "image" \| "tool" |
| `input_rate` | integer | Credits per 100 input tokens |
| `output_rate` | integer | Credits per 100 output tokens (0 for tools/images) |
| `is_enabled` | boolean | Feature flag |
| `provider` | string | "google" \| "openai" \| "anthropic" etc. |
| `created_at` | string | ISO timestamp |
| `updated_at` | string | ISO timestamp |

Indexes: `public_id` (unique), `category`, `is_enabled`

### `credit_transactions`
Unified transaction log for all wallet deductions.

| Attribute | Type |
|---|---|
| `user_id` | string (indexed) |
| `wallet_type` | string ("free"\|"paid") |
| `model` | string |
| `model_category` | string |
| `tokens_input` | integer |
| `tokens_output` | integer |
| `credits_spent` | integer |
| `endpoint` | string |
| `balance_before` | integer |
| `balance_after` | integer |
| `created_at` | string (indexed) |

## Credit Formula
```
inputUnits  = ceil(prompt_tokens / 100)
outputUnits = ceil(completion_tokens / 100)
creditsUsed = (inputUnits × inputRate) + (outputUnits × outputRate)
```

## Model Rates (Initial Seed)
| Model | Category | Input Rate | Output Rate |
|---|---|---|---|
| Gemini Flash | free | 1 | 2 |
| Llama 70B | free | 2 | 3 |
| DeepSeek R1 | free | 3 | 4 |
| Gemini Pro | paid | 5 | 6 |
| Claude Sonnet | paid | 7 | 9 |
| GPT-4.1 | paid | 8 | 10 |
| GPT-5 | paid | 10 | 12 |
| Claude Opus | paid | 15 | 18 |

## Tool/Image Credits
| Tool/Image | Fixed Credits |
|---|---|
| Deep Search | 100 |
| Website Builder | 250 |
| Code Interpreter | 80 |
| Web Search | 25 |
| Flux (image) | 120 |
| Imagen (image) | 180 |
| GPT Image | 250 |
| DALL-E 3 | 300 |

## Setup Instructions
1. Create `model_catalog` collection in Appwrite Console (schema above)
2. Create `credit_transactions` collection in Appwrite Console
3. Add `last_daily_reset` (string) attribute to `users` collection if not present
4. Run seed script: `node scripts/seed-model-catalog.js`
5. Add env var: `APPWRITE_MODEL_CATALOG_COLLECTION_ID=<your_collection_id>`
6. Deploy app

## New Balance API
`GET /api/credits/balance` returns:
```json
{
  "creditsRemaining": 34280,
  "plan": "pro",
  "breakdown": {
    "dailyFreeCredits": 4280,
    "monthlyPaidCredits": 30000,
    "dailyResetAt": "2026-07-28T00:00:00Z",
    "billingResetAt": "2026-08-15T00:00:00Z"
  }
}
```
