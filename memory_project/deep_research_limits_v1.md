# Deep Research Usage Limit System — Plan Tier Limits & Sunday Reset (v1)

**Date:** August 8, 2026

---

## 1. Executive Summary

This update configures the weekly usage-limit system for the **Deep Research** feature across all user subscription plan tiers:

- **Free Plan:** 5 Deep Research requests / week
- **Pro Plan:** 15 Deep Research requests / week
- **Max Plan:** 25 Deep Research requests / week

The allowance resets automatically every **Sunday at 00:00:00 UTC** for all users.

---

## 2. Plan Limits & Invariants

| Plan Tier | Weekly Deep Research Limit | Reset Frequency |
|---|---|---|
| **Free** | 5 requests | Every Sunday 00:00 UTC |
| **Pro** | 15 requests | Every Sunday 00:00 UTC |
| **Max** | 25 requests | Every Sunday 00:00 UTC |
| **Special Account** (`arpitariyanm@gmail.com`) | Unlimited | N/A |

### Calculation Window Formula
Determined by `getWeekWindowUtc()` in `lib/planUtils-server.js` and `lib/planUtils.js`:
- `start`: Sunday 00:00:00.000 UTC of the current week.
- `end`: Next Sunday 00:00:00.000 UTC - 1 ms.

---

## 3. Limit Enforcement & User Experience Flow

### A. UI Lock State & Popup Modal
1. When a user reaches their weekly limit (`remaining === 0` or `canResearch === false`):
   - The **Deep Research** button in the `+` menu displays a **Lock** icon, a `Locked` badge, and red limit text (e.g. `Limit Reached (5/5)`).
   - Clicking the locked Deep Research button does not switch mode; instead, it triggers the **`DeepResearchLimitModal`** popup.
   - If the user was in Deep Research mode when the limit was hit, the active mode automatically reverts to standard `search`.

2. **`DeepResearchLimitModal` Popup:**
   - Displays the title *"Weekly Deep Research Limit Reached"*.
   - Explains the user's plan tier (Free: 5, Pro: 15, Max: 25) and current usage.
   - Displays the automated reset notice: *"Resets automatically every Sunday"*.
   - Provides an *"Upgrade Plan"* button for Free/Pro users (redirecting to `/pricing`) and a *"Got it"* button.

3. **No Inline Error in `DisplayResult.jsx`:**
   - On limit hit during query submission, `DisplayResult.jsx` stops loading (`setLoadingSearch(false)`), reverts to `search` mode, and opens `DeepResearchLimitModal`. No inline error toast or message is rendered in `DisplayResult.jsx`.

### B. Backend Enforcement
- Endpoint: `POST /api/research` in `app/api/research/route.js`.
- Evaluates `checkResearchLimit(authenticatedEmail)`.
- If `!researchLimit.canResearch`, responds with status **403 Forbidden** and `{ error: 'RESEARCH_LIMIT_REACHED', message, weeklyCount, weeklyLimit, remaining, plan }`.

---

## 4. Key Files Modified / Created

| File | Role & Modifications |
|---|---|
| [`lib/subscriptionPlans.js`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/lib/subscriptionPlans.js) | Updated `researchLimit` properties (`free: 5`, `pro: 15`, `max: 25`). |
| [`lib/planUtils-server.js`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/lib/planUtils-server.js) | Updated `RESEARCH_LIMITS` and `checkResearchLimit` to dynamically assign plan limits (5/15/25). |
| [`lib/planUtils.js`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/lib/planUtils.js) | Synchronized `RESEARCH_LIMITS` and `checkResearchLimit` for client/edge utilities. |
| [`app/_components/DeepResearchLimitModal.jsx`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/app/_components/DeepResearchLimitModal.jsx) | **[NEW]** Glassmorphic modal popup for weekly Deep Research limit reached state. |
| [`app/_components/ChatBoxAiInput.jsx`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/app/_components/ChatBoxAiInput.jsx) | Integrated limit popup, button lock state (lock icon + counter), and submission gating. |
| [`DisplayResult.jsx`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/app/(routes)/search/[libId]/_components/DisplayResult.jsx) | Handled 403 limit response cleanly with limit popup without showing inline toasts/messages. |
