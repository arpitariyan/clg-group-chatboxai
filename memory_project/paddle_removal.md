# Payment System Update: Paddle Removal & Razorpay Exclusivity

**Date:** August 1, 2026

## Overview
As per the user's request, the Paddle payment gateway (which was recently integrated as a secondary gateway) has been completely removed from the project. The system has been reverted to use **Razorpay exclusively** as the sole payment gateway.

## Actions Taken

1. **Packages Removed:**
   - Uninstalled `@paddle/paddle-node-sdk`.
   - Uninstalled `@paddle/paddle-js`.

2. **Backend Code Removed:**
   - Deleted the Paddle webhook handler directory and its contents (`app/api/paddle/webhook/route.js`).
   
3. **Frontend Changes (`app/(routes)/pricing/page.jsx`):**
   - Removed the Gateway Selection Modal (`gatewayModalOpen`, `selectedPlanType` states).
   - Removed the `handlePaddleCheckout` logic.
   - Updated `handlePurchase` so that clicking a plan immediately triggers `handleRazorpayCheckout`.
   - Removed Paddle references in the footer copy (e.g. "Secure checkout via Razorpay & Paddle" -> "Secure checkout via Razorpay").

4. **Legal & Documentation Updates:**
   - **Terms of Service (`app/terms-conditions/TermsClient.jsx`):** Removed all mentions of Paddle being the Merchant of Record, removed the Paddle Refund Rules section, and updated the Billing section to indicate Razorpay as the sole payment partner.
   - **Privacy Policy (`app/privacy-policy/PrivacyClient.jsx`):** Removed mentions of Paddle collecting international tax and location data.
   - **Help Center (`app/help-center/HelpCenterClient.jsx`):** Updated the payment methods FAQ to solely list Razorpay (UPI, Net banking, Indian Cards) as the accepted payment method.

5. **Environment Configuration:**
   - Removed all Paddle-specific variables from `.env.example` (e.g., `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `PADDLE_API_KEY`, etc.).

## Current State
The app now operates exactly as it did before the second payment gateway was added. All purchases proceed immediately to Razorpay via the standard modal without requiring the user to choose a gateway.
