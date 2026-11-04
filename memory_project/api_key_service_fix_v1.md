# API Key Service Fixes (v1)

## Summary
The API key service has been updated to strictly align with the documented subscription boundaries and integration requirements.

### 1. Integration & CORS Support
**Problem:** The `/api/v1/*` routes were missing CORS headers and `OPTIONS` preflight handlers, preventing developers from calling the API directly from their frontend web applications.
**Solution:**
- Added global `Access-Control-Allow-Origin: *` and relevant method/header permissions to `next.config.mjs` for all `/api/:path*` routes.
- Added explicit `OPTIONS` handlers to `app/api/v1/chat/completions/route.js` and `app/api/v1/models/route.js` to ensure browsers receive a `204 No Content` on CORS preflight checks instead of a `405 Method Not Allowed`.

### 2. Paid Tier Rate Limit Fix
**Problem:** A critical bug in `lib/api-gateway.js` was artificially throttling Paid tier users to **10 Requests Per Minute (RPM)** by hardcoding the `rate_limit_rpm` override, violating the documented 500 RPM Paid tier capability.
**Solution:**
- Removed the hardcoded override.
- Implemented dynamic limits: Paid users now default to `Math.max(keyRecord.rate_limit_rpm || 60, 500)` RPM and `2,000,000` TPM.
- Free users retain the standard `keyRecord.rate_limit_rpm || 60` limits (since they are bottlenecked by the daily limit anyway).

### 3. Free Tier Global Limit (300/day)
**Problem:** The `getFreeModelDailyRequestCount` function was previously filtering Appwrite usage logs with `&& isFreeModelPublicId(log.model)`. This meant if a Free user somehow hit other endpoints, it wasn't counting towards their global daily limit.
**Solution:**
- Removed the `isFreeModelPublicId` condition from the daily count filter. 
- The `dailyFreeRequestCount` now counts **all** API calls (chat, responses, etc.) made by the user today, strictly enforcing the "300 requests per day across all endpoints" rule documented in `rate-limits.md`.

## Result
The API Key Service is now fully compliant with the documented ChatboxAI tier rules and is ready for production integration by external applications.
