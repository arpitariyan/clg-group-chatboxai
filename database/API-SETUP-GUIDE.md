# ChatboxAI API Service - Setup Guide

## Implementation Complete ✅

You now have a complete, production-ready API service similar to Perplexity, ChatGPT API, or Claude API.

---

## What's Been Implemented

### 1. **API Key Management System**
- ✅ Generate API keys: `cbx_live_*` and `cbx_test_*`
- ✅ Secure key hashing with SHA-256
- ✅ Key rotation support
- ✅ Key revocation
- ✅ Rate limit configuration per key

**Endpoints:**
- `POST /api/v1/keys` - Create new API key
- `GET /api/v1/keys` - List all keys (masked)
- `PATCH /api/v1/keys/{id}` - Update key settings
- `DELETE /api/v1/keys/{id}` - Revoke key
- `POST /api/v1/keys/{id}/rotate` - Rotate key

### 2. **API Gateway Middleware**
- ✅ Validates Bearer token authentication
- ✅ Enforces rate limits (RPM + TPM)
- ✅ Tracks usage per key
- ✅ Returns proper error responses
- ✅ Adds rate limit headers to responses

### 3. **Pricing & Metering System**
- ✅ Token-based pricing matrix
- ✅ Per-model pricing (OpenAI, Anthropic, Google)
- ✅ Specialized call pricing (search, embeddings)
- ✅ Usage logging to Appwrite
- ✅ Cost calculation per request

### 4. **Public API Endpoints (OpenAI-Compatible)**
- ✅ `POST /api/v1/chat/completions` - Chat completions
- ✅ `GET /api/v1/models` - List models with pricing
- ✅ `POST /api/v1/search` - Web search with citations
- ✅ `POST /api/v1/embeddings` - Text embeddings

### 5. **Documentation Portal**
- ✅ `/docs` - Overview page
- ✅ `/docs/getting-started` - Quick start guide
- ✅ `/docs/authentication` - Auth guide with examples
- ✅ `/docs/chat` - Chat API reference
- ✅ `/docs/models` - Available models & pricing
- ✅ `/docs/rate-limits` - Rate limiting guide
- ✅ OpenAPI 3.0 specification: `/public/openapi.json`

### 6. **Database Collections**
- ✅ `api_keys` - Store API keys (hashed)
- ✅ `api_usage_logs` - Log all API usage

---

## Configuration Required

### 1. **Environment Variables**

Add to `.env.local`:

```bash
# OpenAI
OPENAI_API_KEY=sk-xxx

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY=AIzaxxxxx

# Appwrite (already configured, verify these exist)
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
APPWRITE_DATABASE_ID=main

# Optional: Search provider
SERPAPI_API_KEY=your_serpapi_key
# or
PERPLEXITY_API_KEY=your_perplexity_key
```

### 2. **Create Appwrite Collections**

If not auto-created, manually create these collections in Appwrite:

#### Collection: `api_keys`
```
- key_id (string, primary)
- user_id (string, indexed)
- key_hash (string, unique, indexed)
- environment (string: 'live' or 'test')
- name (string)
- status (string: 'active', 'revoked', 'rotated')
- created_at (datetime)
- last_used_at (datetime, nullable)
- revoked_at (datetime, nullable)
- rate_limit_rpm (integer, default: 60)
- rate_limit_tpm (integer, default: 90000)
- metadata (object: { description, ip_whitelist })
```

#### Collection: `api_usage_logs`
```
- log_id (string, primary)
- user_id (string, indexed)
- key_id (string, indexed)
- endpoint (string: 'chat', 'search', 'embeddings')
- model (string)
- input_tokens (integer)
- output_tokens (integer)
- total_tokens (integer)
- search_queries (integer)
- cost_usd (number)
- status (string: 'success', 'error')
- created_at (datetime)
- timestamp (integer, unix)
```

---

## How to Use

### User Flow

1. **User signs up** → Goes to dashboard
2. **User creates API key** → Calls `POST /api/v1/keys` with Firebase token
   - Returns full key once (e.g., `cbx_live_abc123...`)
   - User must store securely
3. **Developer integrates API** → Uses key in requests:
   ```bash
   curl https://api.chatboxai.com/v1/chat/completions \
     -H "Authorization: Bearer cbx_live_..." \
     -d '{"model": "gpt-4o-mini", "messages": [...]}'
   ```
4. **Usage tracked** → Each request logs to `api_usage_logs`
5. **Billing calculated** → Dashboard shows cost breakdown

---

## Testing the API

### 1. Create a Test API Key

```bash
# Authenticate with Firebase token
curl -X POST http://localhost:3000/api/v1/keys \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Key",
    "environment": "test",
    "rate_limit_rpm": 10,
    "rate_limit_tpm": 10000
  }'
```

Response:
```json
{
  "success": true,
  "key": "cbx_test_abc123...",
  "key_id": "...",
  "name": "Test Key",
  "environment": "test",
  "created_at": "2026-05-04T...",
  "last_digits": "...c123",
  "message": "Store this key safely. You will not be able to see it again."
}
```

### 2. Make a Chat Request

```bash
curl -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Authorization: Bearer cbx_test_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### 3. List Your API Keys

```bash
curl -X GET http://localhost:3000/api/v1/keys \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

### 4. Get Models

```bash
curl http://localhost:3000/api/v1/models
```

---

## Pricing Example

For a chat request with:
- Model: `gpt-4o-mini`
- Input tokens: 50
- Output tokens: 100

Cost calculation:
```
input_cost = (50 / 1000) * 0.00015 = $0.0000075
output_cost = (100 / 1000) * 0.0006 = $0.00006
total_cost = $0.0000675
```

---

## Next Steps (Phase 2)

### Optional Enhancements

1. **Streaming Responses**
   - Add SSE support to chat endpoint
   - Return token chunks as they stream

2. **Webhooks**
   - Notify users when usage quota reached
   - Send invoice notifications

3. **SDKs**
   - Generate Node.js SDK (wraps OpenAI SDK)
   - Generate Python SDK
   - Publish to npm/PyPI

4. **Analytics Dashboard**
   - Real-time usage charts
   - Cost breakdown by model
   - Token usage trends
   - Invoice history

5. **Team Billing**
   - Multiple users per account
   - Shared API key management
   - Team-level usage limits

6. **Advanced Security**
   - IP whitelist per key
   - Webhook signature verification
   - Audit logs
   - SOC 2 compliance

---

## File Structure

```
app/
  api/v1/
    chat/
      completions/
        route.js           ✅ Chat endpoint
    search/
      route.js            ✅ Search endpoint
    embeddings/
      route.js            ✅ Embeddings endpoint
    models/
      route.js            ✅ Models endpoint
    keys/
      route.js            ✅ Create/List API keys
      [id]/
        route.js          ✅ Update/Delete/Rotate keys
  docs/
    layout.jsx            ✅ Docs layout
    page.jsx              ✅ Docs overview
    [slug]/
      page.jsx            ✅ Dynamic doc pages

lib/
  platform-api-key.js     ✅ Key generation & hashing
  api-pricing.js          ✅ Pricing matrix & calculations
  api-gateway.js          ✅ Middleware & validation

services/
  appwrite-collections.js ✅ Updated with API collections

public/
  openapi.json            ✅ OpenAPI spec
```

---

## Security Considerations

1. **API Keys** are hashed with SHA-256 before storing
2. **Rate limiting** prevents abuse
3. **Provider keys** stored in environment variables (never exposed)
4. **Usage logging** tracks every request
5. **Error messages** don't leak sensitive info

---

## Troubleshooting

### Issue: "Unknown model"
**Solution:** Check `/api/v1/models` for available models

### Issue: "Rate limit exceeded"
**Solution:** Wait for rate limit reset (see `X-RateLimit-Reset-In` header)

### Issue: "Invalid API key"
**Solution:** Ensure key format is `cbx_live_*` or `cbx_test_*`

### Issue: Provider returns error
**Solution:** Check provider API key is valid in `.env.local`

---

## Support

For questions about the API service implementation, refer to:
- `/docs` - Documentation portal
- `public/openapi.json` - OpenAPI specification
- Contact: support@chatboxai.com

---

**Status**: Ready for production deployment ✅
**Last Updated**: May 4, 2026
