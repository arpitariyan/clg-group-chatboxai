# CHATBOX AI — COMPLETE PAYMENT, FINANCIAL & ENTITLEMENT DEPENDENCY MAP

**Document Version:** 1.0.0  
**Date:** 2026-11-03  
**Classification:** Critical Security Architecture  
**Repositories Covered:**
- Renewal App (`chatboxai-renewal` @ commit `0b5a00eed9cf53d6100fe6d6f8ba3338f968e49f`, branch `security/payment-hardening`)
- Admin App (`chatboxai-admin` @ commit `8b136315a49a85123cbee40c7fb64564518f65da`, branch `security/admin-financial-hardening`)

---

## 1. COMPREHENSIVE PURCHASE & ORDER FLOWS

| Purchase Type | Product Description | Order Creation Route | Client Verification Route | Server Webhook Handler | Target Storage / Ledger |
|---|---|---|---|---|---|
| `subscription_pro` | Pro Subscription (Monthly/Annual) | `POST /api/razorpay/create-order` | `POST /api/razorpay/verify-checkout` (previously hijacked `POST /api/razorpay/webhook`) | `POST /api/razorpay/webhook` (`payment.captured`, `subscription.charged`) | `subscriptions`, `users`, `credit_transactions`, `payment_ledger` |
| `subscription_max` | Max Subscription (Monthly/Annual) | `POST /api/razorpay/create-order` | `POST /api/razorpay/verify-checkout` (previously hijacked `POST /api/razorpay/webhook`) | `POST /api/razorpay/webhook` (`payment.captured`, `subscription.charged`) | `subscriptions`, `users`, `credit_transactions`, `payment_ledger` |
| `api_credits` | Platform API Credits (Usage Wallet) | `POST /api/v1/credits/purchase` | `POST /api/v1/credits/verify-purchase` | `POST /api/razorpay/webhook` (`payment.captured`) | `api_credits`, `api_credit_transactions`, `payment_ledger` |
| `website_builder_credits` | AI Website Builder Credits | `POST /api/website-builder/credits/purchase` | `POST /api/website-builder/credits/verify-purchase` | `POST /api/razorpay/webhook` (`payment.captured`) | `website_user_credits`, `website_credit_transactions`, `payment_ledger` |

---

## 2. ORDER CREATION ENDPOINTS

### 2.1 Subscription Order Creation
- **Endpoint:** `POST /api/razorpay/create-order` (`app/api/razorpay/create-order/route.js`)
- **Authentication:** `withUser` (`lib/request-context.js`) verifying Firebase Bearer token via `verifyFirebaseIdToken` (`lib/server-auth.js`).
- **Input Parameters:** `planType` ('pro' | 'max'), `billingCycle` ('monthly' | 'annual'), `currency` ('INR' | allowlisted currencies), `couponCode`.
- **Authoritative Pricing:** Calculated server-side via `getDynamicPlanPrice` (`lib/dynamicPlanService.js`) and `getPlanMonthlyPrice` / `getPlanAnnualPrice` (`lib/subscriptionPlans.js`).
- **Discounts:** Validated via `validateCouponForCheckout` & reserved via `createCouponReservation` (`lib/coupon-service.js`).
- **Vulnerability Identified:** Missing creation of an immutable pending internal checkout transaction record in the Appwrite database prior to creating the Razorpay order.

### 2.2 API Credits Order Creation
- **Endpoint:** `POST /api/v1/credits/purchase` (`app/api/v1/credits/purchase/route.js`)
- **Authentication:** `resolveRequestUserEmail` (`lib/server-auth.js`) via Firebase ID token.
- **Input Parameters:** `amount` (minimum ₹50).
- **Vulnerability Identified:** Creates Razorpay order with notes, but does not store an immutable pending internal transaction in the database.

### 2.3 Website Builder Credits Order Creation
- **Endpoint:** `POST /api/website-builder/credits/purchase` (`app/api/website-builder/credits/purchase/route.js`)
- **Authentication:** `withUser` (`lib/request-context.js`) via Firebase ID token.
- **Input Parameters:** `packageId`.
- **Pricing:** Authoritative catalog `getDefaultWebsitePackageById` / `WEBSITE_CREDIT_PACKAGES_COLLECTION_ID`.
- **Vulnerability Identified:** Does not record an immutable internal pending transaction.

---

## 3. PAYMENT VERIFICATION ENDPOINTS & VULNERABILITIES

### 3.1 Pro/Max Subscription Checkout Verification
- **Endpoint:** Previously `POST /api/razorpay/webhook` (branch `handlePaymentVerification`)
- **Critical Vulnerability (P0 - Incident Cause):**
  - Unauthenticated manual verification branch in webhook route.
  - Accepted `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`, `user_email`, `plan_type`, `billing_cycle`.
  - Verified checkout HMAC signature (`order_id|payment_id`), but never verified the actual Razorpay order amount, currency, or product type.
  - Allowed an attacker who paid ₹50 for API credits to pass `plan_type: 'max'` and immediately receive Max tier + full Max paid credits without paying ₹2,500.
- **Remediation:** Remove manual verification branch from `/api/razorpay/webhook`. Introduce authenticated, strict endpoint `POST /api/razorpay/verify-checkout` validating the immutable internal transaction, querying Razorpay API for captured status, exact amount matching, exact currency, user ownership, and permanent idempotency.

### 3.2 API Credits Verification
- **Endpoint:** `POST /api/v1/credits/verify-purchase` (`app/api/v1/credits/verify-purchase/route.js`)
- **Critical Vulnerabilities (P0):**
  - Never fetched the Razorpay payment object (`razorpay.payments.fetch`).
  - Never verified that the payment was `captured`.
  - Never verified that `payment.order_id === razorpay_order_id`.
  - Deduplication only inspected the last 50 transactions of the current user (`getApiCreditTransactions(userEmail, 50)`), allowing replay across users or after 50 transactions.
  - No check that the order was actually created for API credits.

### 3.3 Website Builder Credits Verification
- **Endpoint:** `POST /api/website-builder/credits/verify-purchase` (`app/api/website-builder/credits/verify-purchase/route.js`)
- **Critical Vulnerabilities (P0):**
  - Accepted `packageId` directly from client request body.
  - Did NOT fetch Razorpay order or payment.
  - Did NOT verify captured payment status or payment amount against `packageData.priceInr`.
  - Did NOT verify that order was for Website Builder credits.
  - ZERO idempotency check: allowed replaying the same payment repeatedly to inflate credits.

---

## 4. RAZORPAY WEBHOOK PROCESSING

- **Endpoint:** `POST /api/razorpay/webhook` (`app/api/razorpay/webhook/route.js`)
- **Current Vulnerabilities:**
  - `verifySignature` used `JSON.stringify(body)` rather than raw untouched request bytes.
  - `if (process.env.RAZORPAY_WEBHOOK_SECRET && !verifySignature(...))` — failed OPEN if secret missing!
  - Unauthenticated manual verification hijacked the route.
  - No durable event deduplication table (missing `webhook_events` tracking).
  - Out-of-order events not handled safely.
  - `handlePaymentCaptured` marked subscription active without verifying amount or payment capture.
  - Hardcoded `PROTECTED_ADMIN_EMAIL` bypass in cancellation handler.

---

## 5. CREDIT WALLETS & MUTATION POINTS

1. **Standard Daily/Monthly Chat Credits:**
   - Stored in: `users.credits`
   - Reset via: Monthly/daily reset logic in `lib/planUtils-server.js` and `lib/credit-engine.js`.
2. **Paid Subscription Credits:**
   - Stored in: `users.paid_credits`
   - Mutated by: Subscription activation/renewal, manual admin grants, AI consumption (`app/api/ai/consume/route.js`).
3. **Platform API Credits:**
   - Stored in: `api_credits.balance_credits`
   - Ledgers: `api_credit_transactions`
   - Mutated by: `addApiCreditsWithLock` (`lib/api-credits.js`), `consumeApiCredits` (`lib/api-credits.js`).
4. **Website Builder Credits:**
   - Stored in: `website_user_credits.purchased_credits`, `weekly_credits`
   - Ledgers: `website_credit_transactions`
   - Mutated by: `addPurchasedCredits` (`app/api/website-builder/credits/verify-purchase/route.js`), `deductWebsiteCredits` (`app/api/website-builder/credits/deduct/route.js`).

---

## 6. ENTITLEMENT DECISION SOURCES & RISKS

- **Current Sources:**
  - `checkUserPlan` (`lib/planUtils-server.js`): Checks `user.plan` in Appwrite `users` collection.
  - **Critical Flaw:** If `user.plan === 'pro'` or `'max'` and `user.subscription_end_date` is null/empty, user is treated as permanently active Pro/Max!
  - **Critical Flaw:** Hardcoded `arpitariyanm@gmail.com` bypasses granting permanent Pro access without subscription dates.
  - `getUserSubscriptionStatus` (`app/api/user/subscription-status/route.js`): Relies on `user.plan` directly.
- **Required Architecture:**
  - Authoritative Entitlement Service (`lib/entitlements/entitlement-service.js`): Requires verified payment in `payment_ledger` or authorized, audited manual grant in `subscriptions`.

---

## 7. ADMIN FINANCIAL & RBAC OPERATIONS

### 7.1 Admin Edit User (`app/api/admin/edit-user/route.js`)
- Checked permission: `users.edit`
- **Critical Flaw:** An admin with only user profile edit permission could alter financial fields: `plan`, `credits`, `paid_credits`, `subscription_end_date`.
- **Fix:** Strictly strip and reject all financial and subscription fields in `users.edit`. Require dedicated financial permissions (`subscriptions.edit`, `credits.adjust`).

### 7.2 Admin Subscriptions Management (`app/api/admin/subscriptions/route.js`)
- Checked permission: `subscriptions.edit`
- **Critical Flaws:**
  - PUT accepted separate `subscriptionId` and `email` without verifying that `subscriptionId` belongs to `email`.
  - DELETE supported `hardDelete = true`, destroying payment and subscription evidence, and swallowed Appwrite errors with `.catch(() => {})`.
  - Manual grants wrote to `users` before `subscriptions` without transactional atomicity.

### 7.3 Admin RBAC Service (`lib/adminRbacService.js`)
- **Critical Flaws:**
  - Predictable fallback secret: `'chatboxai-admin-invite-secret-2026'`. Must require `ADMIN_INVITE_SECRET`.
  - `isSuperAdmin` bypassed revocation checks unconditionally before checking `isRevokedAdmin`.
  - Local filesystem storage (`data/admin-team-store.json`) not durable across serverless lambda instances.

---

## 8. CRYPTOGRAPHY, SECRETS & AI CREDENTIALS

1. **Platform Customer API Keys:**
   - Generation: `generatePlatformApiKey` (`lib/platform-api-key.js`)
   - Hashing: SHA-256 in `api_keys.key_hash`
   - Encryption: AES-256-GCM in `api_keys.encrypted_key`
   - **Critical Flaw 1:** GET `/api/v1/keys` decrypted and exposed full plaintext keys in `api_key` response attribute!
   - **Critical Flaw 2:** Fallback secret derived from `APPWRITE_API_KEY` or `SUBSCRIPTION_CHECK_SECRET`.
2. **AI Provider Credentials:**
   - OpenAI, Gemini, Groq, Anthropic, ElevenLabs, Cloudflare, ModelScope, HuggingFace.
   - Exposed `NEXT_PUBLIC_` variables in `.env.example`: `NEXT_PUBLIC_GEMINI_API_KEY`, `NEXT_PUBLIC_A4F_API_KEY`, `NEXT_PUBLIC_HF_API_KEY`.
   - Must be strictly server-only with zero frontend exposure.

---

## 9. APPWRITE DATABASE COLLECTIONS INVOLVED

| Collection Name | Purpose | Critical Fields |
|---|---|---|
| `payment_ledger` (NEW) | Authoritative immutable financial ledger | `internal_transaction_id`, `razorpay_order_id`, `razorpay_payment_id`, `user_id`, `user_email`, `purchase_type`, `amount_minor_units`, `currency`, `payment_status`, `fulfillment_status`, `captured_at` |
| `payment_transactions` (NEW/EXT) | Immutable checkout session snapshots | `internal_transaction_id`, `user_id`, `user_email`, `purchase_type`, `package_id`, `plan_type`, `billing_cycle`, `amount_minor_units`, `currency`, `razorpay_order_id`, `status`, `expires_at` |
| `webhook_events` (NEW) | Deduplication & audit for Razorpay webhooks | `event_id`, `event_type`, `payload_hash`, `status`, `processed_at`, `error_log` |
| `subscriptions` | Active & historical subscriptions | `user_email`, `razorpay_order_id`, `razorpay_payment_id`, `plan_type`, `amount`, `status`, `start_date`, `end_date`, `is_manual_assignment` |
| `users` | User accounts and dual-wallet balances | `email`, `plan`, `credits`, `paid_credits`, `subscription_start_date`, `subscription_end_date` |
| `credit_transactions` | Audit log of subscription/manual credits | `userEmail`, `amount`, `type`, `description`, `timestamp` |
| `api_credits` | Platform API usage credit wallet | `user_id`, `balance_credits`, `updated_at` |
| `api_credit_transactions` | Platform API usage credit ledger | `order_id`, `payment_id`, `amount`, `transaction_type`, `balance_after` |
| `website_user_credits` | Website Builder credit balance | `user_email`, `weekly_credits`, `purchased_credits` |
| `website_credit_transactions`| Website Builder credit ledger | `user_email`, `amount`, `transaction_type`, `order_id`, `package_id` |
| `coupons` | Promo codes & discount rules | `code`, `discount_type`, `discount_value`, `max_redemptions`, `redemption_count`, `active` |
| `coupon_redemptions` | Reserved & redeemed coupon instances | `coupon_id`, `user_email`, `razorpay_order_id`, `status` |
| `admin_audit_logs` | Immutable audit log of admin mutations | `actorEmail`, `action`, `targetType`, `targetId`, `reason`, `details`, `timestamp` |
