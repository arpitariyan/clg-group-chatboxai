# Session Memory: ChatboxAI Project Fixes & Optimizations
**Date:** August 10, 2026

## 1. Replicate Model Integration & Registry Overhaul
- **Provider Migration**: Successfully reverted and mapped all intended 23 models to use the `replicate` provider endpoint instead of OpenRouter, matching the exact user requirements.
- **Model Validations**: Validated all 23 Replicate Model IDs (e.g., `openai/gpt-5-nano`, `anthropic/claude-sonnet-5`, etc.) against Replicate's API to ensure 100% validity.
- **Access Tiers Adjusted**:
  - `accessTier` for 5 high-end models (Claude Sonnet 5, Claude Fable 5, GPT-5, GPT-5 Pro, GPT-5.4) was changed from `max` to `pro`, allowing both Pro and Max users to utilize them.
  - Moved **Claude Fable 5** to the absolute TOP of the model registry list (`lib/models-registry.js`) for immediate visibility.
- **Nano & Mini Models**: Kept GPT-5 Nano, GPT-4.1 Nano, and GPT-4o Mini in the `free` accessTier as intended for ChatboxAI users. 

## 2. API Timeout & Hang Fixes (Appwrite Network Issues)
- **The Problem**: The app's Next.js API routes (like `/api/research`, `/api/user/plan`, `/api/library/history`, and `/api/user/subscription-status`) were experiencing massive delays (hanging for 10-11 seconds). This was caused by the `nyc.cloud.appwrite.io` endpoint timing out unpredictably during `databases.listDocuments` calls.
- **The Fix**:
  - Engineered and implemented a custom `withTimeout(5000)` / `withTimeout(3000)` Promise wrapper across multiple backend files.
  - Wrapped `checkUserPlan`, `getSubscriptionDetails`, `getWeeklyResearchCount`, `listUsersByEmail`, and history API `Promise.allSettled` fetches with this timeout.
  - Implemented a fast 30-second **in-memory cache** (`_userCache`) in `lib/planUtils-server.js` to eliminate redundant concurrent DB checks.
  - Result: The Appwrite SDK now "fails fast" on network errors instead of indefinitely hanging the Next.js API routes, keeping the frontend snappy and immediately using fallback defaults.

## 3. Razorpay Webhook & Subscription Logic
- **Appwrite Schema Issue**: The Razorpay webhook was failing with `AppwriteException: Invalid document structure: Unknown attribute: "billing_cycle"` when attempting to log the subscription to the `subscriptions` collection.
  - **Fix**: Removed the `billing_cycle` attribute from the payload passed to `databases.createDocument` around line 235 in `app/api/razorpay/webhook/route.js`.
- **Critical Logic Bug Fixed**:
  - Discovered that the subscription cycle date math was hardcoded to *always* add exactly 1 month (`subscriptionEndDate.setMonth(... + 1)`), even if the user purchased an **annual** plan.
  - **Fix**: Implemented conditional logic to correctly add `+12` months for `billing_cycle === 'annual'` and `+1` month otherwise, ensuring users are credited the correct subscription duration in their `users` profile.

## 4. Budget Router & Model Access Authorization
- **The Problem**: Pro/Max users were being blocked from using Replicate's paid models with the error `[BudgetRouter] Request blocked: This model requires a higher plan.` This happened because frontend network timeouts caused the client to default to the `free` plan and pass `userPlan: 'free'` in the API request, which the backend blindly trusted.
- **The Fix**: 
  - Modified `lib/budget-router.js` (`resolveModelWithBudget`) to be **Server-Authoritative**.
  - The Budget Router now fetches the user's document directly from the Appwrite database (`userDoc = await getUserCreditsDoc(userEmail)`) and strictly overrides any client-provided plan with the true `userDoc.plan`.
  - **Secondary Fallback Fix**: Discovered that `inngest/functions.js` was ALSO performing a hardcoded validation (`validateModelTier`) that was throwing `Model anthropic/claude-fable-5 is Pro-only but user is Free tier. Skipping.` based on the bad client payload. Fixed this by overriding the local `isPro` flag using the authoritative `serverPlan` from the Budget Router before the model execution phase.
  - This ensures that **Free Plan** users can only access free models (like GPT-5 Nano, GPT-4o Mini), while **Pro/Max Plan** users get guaranteed, unblockable access to paid models (Claude Fable 5, GPT-5 Pro) regardless of frontend lag or network timeouts.
- **Gemini Quota Error**: Verified that the `[429 Too Many Requests]` error from `memory-summarizer.js` (Google Generative AI) is harmlessly caught via `try/catch` and doesn't crash the app, safely returning a fallback summary when the free API limits are exceeded.

## 5. Client-Side Plan Caching (Performance Upgrade)
- **The Problem**: Whenever a user closed and reopened the website, the frontend would make a network request to `/api/user/plan` which queried the Appwrite database, resulting in a loading delay and unnecessary backend load.
- **The Fix**: 
  - Implemented a smart **3-hour `localStorage` cache** inside `hooks/useUserPlan.js`.
  - On app load, the system secretly checks `localStorage`. If a valid cache is found (under 3 hours old), it loads instantly, bypassing the network request completely.
  - To ensure accurate credit counts, the cache is forcibly refreshed behind the scenes only when the `creditsUpdated` event fires (i.e., after the user consumes credits by running an AI model).

## Next Steps / Reminders
- Add `REPLICATE_API_KEY` to the `.env.local` file for Replicate-hosted models to work in production.
- Monitor `nyc.cloud.appwrite.io` region latency, as Appwrite infrastructure reliability caused the original fetch timeouts.
