# Credit System Separation Fix — v1

**Date:** July 28, 2026

---

## Problem

The subscription credit system (used for ChatboxAI Search & Deep Research) and the API key service credit system (used by external developers with `cbx_live_*` / `cbx_test_*` API keys) were entangled in 4 places, causing incorrect behavior across both systems.

---

## Architecture Reference (Correct State After This Fix)

### System A — Subscription Credits (Search & Deep Research)
Stored in the **`users` collection** as two internal wallets:

| Field | Type | Amount | Resets |
|---|---|---|---|
| `users.credits` | Daily Free Credits | 5,000 (all plans) | Every midnight UTC |
| `users.paid_credits` | Monthly Paid Credits | Free: 0 / Pro: 30,000 / Max: 150,000 | On billing date |

- Free models → deduct from `credits` ONLY
- Paid models → deduct from `paid_credits` ONLY
- When `paid_credits` → 0, paid models become locked until billing reset

### System B — API Key Service Credits
Stored in the **`api_credits` collection** as `balance_credits` (float):

- Users purchase credits separately from the Settings → API Keys page
- Credits are consumed per request via the `/api/v1/*` endpoints
- Tier determination: `balance_credits > 0` → Paid tier, else → Free tier (300 req/day cap)
- No relationship whatsoever to `users.credits` or `users.paid_credits`

---

## Bugs Fixed

### Bug 1 — `lib/api-gateway.js` (CRITICAL)
**What was wrong:** The API gateway called `getUserCreditDoc(userEmail)` (wrong function — it takes a `userId` not email) and then read `users.paid_credits` to determine if an API key user was on a "paid tier". This meant a user's subscription credits directly affected their API key service access.

**Fix:** Replaced with `getApiCreditsDoc(userEmail)` from `lib/api-credits.js`. The `accountTier` is now determined solely by `api_credits.balance_credits`.

### Bug 2 — `app/api/v1/credits/route.js`
**What was wrong:** The `/api/v1/credits` endpoint (used by API key holders to check their credit balance) was returning data from the subscription dual-wallet system (`getDualWalletBalance`) — showing subscription credits to external developers.

**Fix:** Replaced with `getApiCreditsDoc` + `getApiCreditTransactions`. The endpoint now returns only API credit balance and API credit transaction history.

### Bug 3 — `contexts/UserContext.jsx`
**What was wrong:** The context only exposed `credits` (daily free wallet). The `paid_credits` field was never surfaced, so the UI had no way to display the Pro/Max monthly credit allocation correctly.

**Fix:** Added `paidCredits: userData?.paid_credits ?? 0` to the context value. Also fixed `checkMonthlyReset()` — it was resetting `credits` (free wallet) for Pro/Max users; now it correctly resets `paid_credits` for Pro/Max plans.

### Bug 4 — `app/(routes)/settings/_components/AccountSettings.jsx`
**What was wrong:** The Subscription section displayed `userData.credits` (the 5,000 daily free wallet) and labeled it "credits remaining **this month**" — even for Pro/Max users. The correct number to show for paid plans is `paid_credits`.

**Fix:** Added plan-aware credit display:
- **Free plan:** Shows `credits` (daily free wallet) with label "daily free credits remaining" and "5,000 free credits reset daily"
- **Pro/Max plan:** Shows `paid_credits` with label "paid-model credits remaining" and "Resets to 30,000/150,000 next billing cycle"

---

## Files Modified

| File | Change |
|---|---|
| `lib/api-gateway.js` | Import `getApiCreditsDoc` instead of `getUserCreditDoc`; read `api_credits.balance_credits` for tier detection |
| `app/api/v1/credits/route.js` | Return API credits from `api_credits` collection; full rewrite of handler |
| `contexts/UserContext.jsx` | Expose `paidCredits`; fix `checkMonthlyReset` for Pro/Max plans |
| `app/(routes)/settings/_components/AccountSettings.jsx` | Plan-aware credit display; correct labels per plan type |

---

## Invariant (Must Never Be Violated)
> The `users.paid_credits` / `users.credits` fields belong exclusively to the Subscription system.
> The `api_credits.balance_credits` field belongs exclusively to the API Key Service.
> These two systems must never read from or write to each other's data stores.
