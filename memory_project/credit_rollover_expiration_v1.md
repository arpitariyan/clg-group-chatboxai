# Credit System Update — Credit Preservation & Rollover (v1)

**Date:** August 8, 2026

---

## 1. Executive Summary

This update modifies the subscription credit behavior for **Pro** and **Max** plans with two core enhancements:

1. **Credit Preservation on Expiry:** Unused paid credits (`paid_credits`) no longer disappear when a Pro or Max subscription ends. The subscription expires normally (transitioning the account state/plan indicator to `free`), but the remaining paid credit balance is preserved in the database and displayed in the UI until it reaches zero. Paid models remain accessible to spend these preserved credits until the balance is exhausted.
2. **Credit Rollover on Purchase / Renewal:** When a user with remaining unused credits purchases or renews a Pro or Max plan, the new plan's credits are **added on top of** the existing remaining balance instead of replacing it.

---

## 2. Quantitative Examples

### Example A — Renewal / Purchase Rollover (Pro Plan)
- A Pro user receives **30,000** monthly paid credits.
- At the time of subscription expiry or renewal, the user has **378** paid credits remaining.
- Upon purchasing/renewing the Pro plan, **30,000** new credits are added:
  $$\text{New Balance} = 378 + 30,000 = 30,378\text{ credits}$$

### Example B — Plan Purchase Rollover (Max Plan)
- A user has **1,500** paid credits remaining from a previous subscription.
- The user purchases the Max plan (**150,000** monthly paid credits).
- Upon activation, **150,000** new credits are added:
  $$\text{New Balance} = 1,500 + 150,000 = 151,500\text{ credits}$$

---

## 3. Architecture & Data Flow

### A. Dual-Wallet Storage (Unchanged Invariant)
Stored in the Appwrite `users` collection:
- `users.credits` → Daily Free Credits (5,000/day, resets every midnight UTC for all plans).
- `users.paid_credits` → Monthly Paid Credits (Pro: 30,000 | Max: 150,000).

### B. Preservation Mechanics on Expiry
- **Daily Cron (`checkExpiredSubscriptions` in Inngest):** When `subscription_end_date` passes, the user's `plan` is set to `'free'`, but `paid_credits` is left untouched.
- **Server Status Checks (`lib/planUtils-server.js`):** `checkUserPlan` returns actual `paid_credits` from the database (no longer forced to 0 on expired subscriptions).
- **Budget Router & Credit Engine:** Free-plan users with `paid_credits > 0` are permitted to execute paid models, deducting from `paid_credits` until the balance reaches 0.
- **UI Gating & Display (`AccountSettings.jsx`, `AppSidebar.jsx`, `ChatBoxAiInput.jsx`):** Paid credit widgets and model dropdowns remain active whenever `paid_credits > 0`. The Settings page displays `"Preserved from previous subscription (available until balance reaches zero)"` when the plan is free but paid credits remain.

### C. Rollover Mechanics on Purchase & Reset
Whenever a user buys a plan, renews, or undergoes a monthly billing cycle reset:
$$\text{paid\_credits}_{\text{new}} = \text{paid\_credits}_{\text{current}} + \text{plan\_paid\_credits}$$

---

## 4. Key Files Modified

| File | Changes Implemented |
|---|---|
| [`lib/planUtils-server.js`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/lib/planUtils-server.js) | Returned actual `paid_credits` from DB when subscription is expired instead of hardcoding `0`. |
| [`lib/budget-router.js`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/lib/budget-router.js) | Removed code that cleared `paid_credits` for free users; updated monthly reset to additive rollover; allowed free users with `paid_credits > 0` to access paid models. |
| [`app/api/ai/consume/route.js`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/app/api/ai/consume/route.js) | Removed forced clearing of `paid_credits`; implemented additive credit rollover; allowed model access and paid-wallet deduction when `paid_credits > 0`. |
| [`lib/credit-engine.js`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/lib/credit-engine.js) | Updated `canUseModel` to allow paid models when `monthlyPaidCredits > 0`; updated `resetMonthlyPaidCredits` with additive rollover logic. |
| [`app/api/razorpay/webhook/route.js`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/app/api/razorpay/webhook/route.js) | Implemented credit rollover (`existing + new`) in `handlePaymentVerification` and `handleSubscriptionCharged`. |
| [`inngest/functions.js`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/inngest/functions.js) | Updated `checkExpiredSubscriptions` query to include both `pro` and `max` plans; updated `monthlyCreditsReset` with credit rollover. |
| [`contexts/UserContext.jsx`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/contexts/UserContext.jsx) | Updated `checkMonthlyReset` to perform additive credit rollover. |
| [`services/Shared.jsx`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/services/Shared.jsx) | Updated `canAccessModel` so `paidCreditsRemaining > 0` unlocks paid models regardless of plan state. |
| [`hooks/useUserPlan.js`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/hooks/useUserPlan.js) | Set `hasPaidCredits = paidCredits > 0`. |
| [`AccountSettings.jsx`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/app/(routes)/settings/_components/AccountSettings.jsx) | Rendered paid credit section whenever `isPaidPlan || monthlyPaidCredits > 0` with preserved notice for expired plans. |
| [`AppSidebar.jsx`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/app/_components/AppSidebar.jsx) | Rendered Premium Models credit widget in sidebar whenever `isPaidPlan || monthlyPaidCredits > 0`. |
| [`ChatBoxAiInput.jsx`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/app/_components/ChatBoxAiInput.jsx) | Passed `paidCredits` directly to `canAccessModel` to unlock paid models in real time when balance is > 0. |

---

## 5. System Invariants Maintained

> 1. `users.paid_credits` is **never zeroed out** by a plan transition or expiration. It decreases only via model consumption or explicit adjustment.
> 2. Buying or renewing any paid plan **always adds** the new plan's paid credit allocation on top of the existing balance.
> 3. Daily free credits (`users.credits = 5000`) continue to reset every midnight UTC independently of paid credits.
