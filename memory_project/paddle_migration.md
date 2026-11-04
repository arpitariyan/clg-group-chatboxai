# Polar to Paddle Migration

## Overview
This document summarizes the steps taken to completely remove the Polar payment gateway and replace it with Paddle (Billing) as the secondary payment provider for international and Apple Pay transactions.

## Changes Made

### 1. Dependency Updates
- **Removed**: `@polar-sh/nextjs` and `@polar-sh/sdk`
- **Installed**: `@paddle/paddle-node-sdk` and `@paddle/paddle-js`

### 2. Backend & Webhooks
- **Deleted**: `app/api/polar/create-checkout/route.js` and `app/api/polar/webhook/route.js`
- **Created**: `app/api/paddle/webhook/route.js`
  - Integrated `@paddle/paddle-node-sdk` for secure signature verification and unmarshalling.
  - Mirrored the database update logic (updating `users` and `subscriptions` collections in Appwrite).
  - Handles Paddle events: `transaction.completed`, `subscription.activated`, `subscription.canceled`, etc.

### 3. Frontend & Checkout UI
- **Modified**: `app/(routes)/pricing/page.jsx`
  - Removed Polar-specific functions.
  - Replaced the Polar checkout button with a Paddle checkout button.
  - Initialized Paddle.js on-demand using `process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`.
  - Triggered checkout using `Paddle.Checkout.open({ items: [...], customer: {...}, customData: {...} })`.
  - Mapped plans to Live Paddle `pri_` (Price) IDs via `.env` variables.

### 4. Text & Documentation
- **Modified**: 
  - `app/privacy-policy/PrivacyClient.jsx`
  - `app/terms-conditions/TermsClient.jsx`
  - `app/help-center/HelpCenterClient.jsx`
- Replaced all textual references of "Polar" with "Paddle".

### 5. Environment Variables
- Updated `.env.example` to replace Polar keys with Paddle configuration keys (Client Token, API Key, Webhook Secret, and 4 Price IDs).

## User Action Required
Since this integration was built pointing directly to the **Live** Paddle environment, the following manual steps are required in the Paddle Dashboard:
1. **Domain Verification**: Ensure the production domain is approved for checkout.
2. **Product & Price Creation**: Create Pro and Max plans (monthly/annual) and copy the `pri_...` IDs.
3. **Webhook Setup**: Point a webhook to `https://yourdomain.com/api/paddle/webhook`, subscribe to `transaction.completed` and `subscription.*` events, and copy the secret key.
4. **API Key Generation**: Generate a live API key and Client Token.
5. Add all these values to the local and production `.env` file.
