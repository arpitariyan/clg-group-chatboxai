# Dynamic Currency Selection & Razorpay Processing

**Date:** August 1, 2026

## Overview
Added a dynamic currency selector to the Pricing page. It auto-detects the user's currency via geolocation (`ipapi.co`) and converts INR to standard global currencies (USD, EUR, GBP, AUD, CAD) using live exchange rates (`api.exchangerate-api.com`).

## Updates Made

1. **Frontend (`app/(routes)/pricing/page.jsx`)**:
   - Added `selectedCurrency` and `exchangeRates` state logic.
   - Built an interactive dropdown selector for supported currencies.
   - Prices dynamically convert on display via `Intl.NumberFormat`.
   - Updated `handleRazorpayCheckout` to calculate the exact fractional amount using the fetched exchange rate and pass the **selected currency and converted amount** directly to the `/api/razorpay/create-order` endpoint. Razorpay now opens natively in the selected currency!

2. **Backend (`app/api/razorpay/create-order/route.js`)**:
   - Upgraded the checkout validation logic.
   - If the currency is INR, it strictly enforces the expected INR amount.
   - If the currency is international (e.g. USD), it securely queries the live exchange rate, calculates the expected converted base amount, and ensures the incoming client amount is within a narrow 5% tolerance margin. This prevents bypass attacks while seamlessly handling small rounding differences.
