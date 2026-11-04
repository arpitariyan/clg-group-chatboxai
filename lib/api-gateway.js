/**
 * API Gateway Middleware
 * Validates API keys, enforces rate limiting, and attaches context
 */

import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { databases } from '@/services/appwrite-admin.js';
import { API_KEYS_COLLECTION_ID, APPWRITE_DATABASE_ID, USERS_COLLECTION_ID } from '@/services/appwrite-collections.js';
import { isValidPlatformApiKeyFormat } from '@/lib/platform-api-key.js';
import { getApiCreditsDoc } from '@/lib/api-credits.js';
import { ensureApiUsageStorageReady } from '@/lib/appwrite-api-usage-bootstrap.js';
import { API_USAGE_LOGS_COLLECTION_ID } from '@/services/appwrite-collections.js';
import { Query } from 'node-appwrite';
import { isFreeModelPublicId } from '@/lib/models-registry.js';

// In-memory rate limit store (key_id -> { count, resetTime })
// In production, use Redis
const rateLimitStore = new Map();

/**
 * Extract API key from Authorization header
 * @param {Request} request - Next.js request object
 * @returns {string|null} API key or null if not found
 */
export function extractApiKeyFromHeader(request) {
  const authHeader = request.headers.get('authorization') || '';
  
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

/**
 * Validate and retrieve API key record from database
 * @param {string} apiKey - Full API key from request
 * @returns {Promise<Object|null>} API key record or null if invalid/not found
 */
export async function validateAndGetApiKey(apiKey) {
  // Validate format first
  if (!isValidPlatformApiKeyFormat(apiKey)) {
    return null;
  }

  try {
    // Query database for API key by hash
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      API_KEYS_COLLECTION_ID,
      [
        Query.equal('key_hash', keyHash),
        Query.equal('status', 'active'),
      ]
    );

    if (response.documents.length === 0) {
      return null;
    }

    const keyRecord = response.documents[0];
    
    // Update last_used_at
    await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      API_KEYS_COLLECTION_ID,
      keyRecord.$id,
      {
        last_used_at: new Date().toISOString(),
      }
    );

    return keyRecord;
  } catch (error) {
    console.error('Error validating API key:', error);
    return null;
  }
}

async function getUserEmailFromKeyRecord(keyRecord) {
  if (!keyRecord?.user_email) {
    try {
      const userDocument = await databases.getDocument(APPWRITE_DATABASE_ID, USERS_COLLECTION_ID, keyRecord.user_id);
      return userDocument?.email || null;
    } catch (error) {
      console.error('Error resolving API key owner email:', error);
      return null;
    }
  }

  return keyRecord.user_email;
}

async function getFreeModelDailyRequestCount(userId) {
  if (!userId) return 0;

  await ensureApiUsageStorageReady();

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const response = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    API_USAGE_LOGS_COLLECTION_ID,
    [
      Query.equal('user_id', userId),
      Query.greaterThanEqual('created_at', startOfDay.toISOString()),
      Query.limit(1000),
    ]
  );

  return (response.documents || []).filter((log) => {
    const endpoint = String(log.endpoint || '').toLowerCase();
    return (endpoint === 'chat' || endpoint === 'responses');
  }).length;
}

/**
 * Check and enforce rate limits
 * @param {string} keyId - API key document ID
 * @param {Object} keyRecord - API key record from database
 * @param {number} tokensUsed - Tokens used in this request
 * @returns {Object} { allowed: boolean, remainingRequests: number, remainingTokens: number, resetInSeconds: number }
 */
export function checkRateLimit(keyId, keyRecord, tokensUsed = 0) {
  const now = Date.now();
  const rateLimitRpm = keyRecord.rate_limit_rpm || 60;    // default 60 requests/minute
  const rateLimitTpm = keyRecord.rate_limit_tpm || 90000; // default 90k tokens/minute

  // Get or initialize rate limit data
  let limitData = rateLimitStore.get(keyId);
  if (!limitData) {
    limitData = {
      requestCount: 0,
      tokenCount: 0,
      resetTime: now + 60000, // 1 minute from now
    };
    rateLimitStore.set(keyId, limitData);
  }

  // Reset if time window expired
  if (now >= limitData.resetTime) {
    limitData.requestCount = 0;
    limitData.tokenCount = 0;
    limitData.resetTime = now + 60000;
  }

  const resetInSeconds = Math.ceil((limitData.resetTime - now) / 1000);
  const allowed = 
    limitData.requestCount < rateLimitRpm && 
    (limitData.tokenCount + tokensUsed) <= rateLimitTpm;

  if (allowed) {
    limitData.requestCount += 1;
    limitData.tokenCount += tokensUsed;
  }

  return {
    allowed,
    remainingRequests: Math.max(0, rateLimitRpm - limitData.requestCount),
    remainingTokens: Math.max(0, rateLimitTpm - limitData.tokenCount),
    resetInSeconds,
    rateLimitRpm,
    rateLimitTpm,
  };
}

/**
 * Main middleware function to validate API key and rate limits
 * Attaches context to request and returns error response if validation fails
 * @param {Request} request - Next.js request
 * @param {number} tokensUsed - Optional tokens used estimate for rate limiting
 * @returns {Promise<Object>} { valid: boolean, context: Object|null, errorResponse: NextResponse|null }
 */
export async function validateApiRequest(request, tokensUsed = 0, requestedModel = '') {
  // Extract API key
  const apiKey = extractApiKeyFromHeader(request);
  if (!apiKey) {
    return {
      valid: false,
      context: null,
      errorResponse: NextResponse.json(
        {
          error: {
            message: 'Unauthorized. Missing or invalid API key.',
            type: 'authentication_error',
            code: 'missing_api_key',
          },
        },
        { status: 401 }
      ),
    };
  }

  // Validate API key
  const keyRecord = await validateAndGetApiKey(apiKey);
  if (!keyRecord) {
    return {
      valid: false,
      context: null,
      errorResponse: NextResponse.json(
        {
          error: {
            message: 'Unauthorized. Invalid or revoked API key.',
            type: 'authentication_error',
            code: 'invalid_api_key',
          },
        },
        { status: 401 }
      ),
    };
  }

  const userEmail = await getUserEmailFromKeyRecord(keyRecord);
  if (!userEmail) {
    return {
      valid: false,
      context: null,
      errorResponse: NextResponse.json(
        {
          error: {
            message: 'Unable to resolve API key owner.',
            type: 'authentication_error',
            code: 'api_key_owner_not_found',
          },
        },
        { status: 500 }
      ),
    };
  }

  // ── TEST environment: bypass credit & rate-limit checks completely ──────────
  if (keyRecord.environment === 'test') {
    return {
      valid: true,
      context: {
        userEmail,
        userId: keyRecord.user_id,
        keyId: keyRecord.$id,
        environment: 'test',
        accountTier: 'test',
        freeModelRequest: false,
        dailyFreeRequestCount: 0,
        rateLimit: { allowed: true, remainingRequests: 999, remainingTokens: 999999, resetInSeconds: 60, rateLimitRpm: 999, rateLimitTpm: 999999 },
      },
      errorResponse: null,
    };
  }

  const freeModelRequest = isFreeModelPublicId(requestedModel);
  let accountTier = 'free';
  let dailyFreeRequestCount = 0;

  // ── API Key Service credit check (completely separate from subscription credits) ──
  // accountTier is determined by the user's API credit balance in the `api_credits`
  // collection — NOT by the subscription system's `paid_credits` field.
  try {
    const apiCreditsDoc = await getApiCreditsDoc(userEmail);
    const apiBalance = Number(apiCreditsDoc?.balance_credits ?? 0);
    accountTier = apiBalance > 0 ? 'paid' : 'free';

    if (accountTier === 'free') {
      // Free API-tier users are globally limited to 300 requests per day across ALL endpoints
      dailyFreeRequestCount = await getFreeModelDailyRequestCount(keyRecord.user_id);
      if (dailyFreeRequestCount >= 300) {
        return {
          valid: false,
          context: null,
          errorResponse: NextResponse.json(
            {
              error: {
                message: 'Daily free-model request limit reached. Please try again tomorrow or purchase API credits.',
                type: 'rate_limit_error',
                code: 'free_model_daily_limit_exceeded',
              },
            },
            { status: 429 }
          ),
        };
      }
    }
  } catch (error) {
    console.error('Error checking API credit balance:', error);
    return {
      valid: false,
      context: null,
      errorResponse: NextResponse.json(
        {
          error: {
            message: 'Unable to verify API credit balance.',
            type: 'server_error',
            code: 'api_credit_lookup_failed',
          },
        },
        { status: 500 }
      ),
    };
  }

  // Check rate limits
  const rateLimitResult = checkRateLimit(keyRecord.$id, {
    ...keyRecord,
    rate_limit_rpm: accountTier === 'free' ? (keyRecord.rate_limit_rpm || 60) : Math.max(keyRecord.rate_limit_rpm || 60, 500),
    rate_limit_tpm: accountTier === 'free' ? (keyRecord.rate_limit_tpm || 90000) : Math.max(keyRecord.rate_limit_tpm || 90000, 2000000),
  }, tokensUsed);
  if (!rateLimitResult.allowed) {
    return {
      valid: false,
      context: null,
      errorResponse: NextResponse.json(
        {
          error: {
            message: 'Rate limit exceeded.',
            type: 'rate_limit_error',
            code: 'rate_limit_exceeded',
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.resetInSeconds),
          },
        }
      ),
    };
  }

  // Valid request - attach context
  return {
    valid: true,
    context: {
      userEmail,
      userId: keyRecord.user_id,
      keyId: keyRecord.$id,
      environment: keyRecord.environment,
      accountTier,
      freeModelRequest,
      dailyFreeRequestCount,
      rateLimit: rateLimitResult,
    },
    errorResponse: null,
  };
}

/**
 * Format successful API response with rate limit headers
 * @param {Object} data - Response data
 * @param {Object} context - Request context from validateApiRequest
 * @param {number} status - HTTP status code
 * @returns {NextResponse} Formatted response
 */
export function createApiResponse(data, context, status = 200) {
  const response = NextResponse.json(data, { status });

  if (context?.rateLimit) {
    response.headers.set('X-RateLimit-Limit-Requests', String(context.rateLimit.rateLimitRpm || 60));
    response.headers.set('X-RateLimit-Remaining-Requests', String(context.rateLimit.remainingRequests));
    response.headers.set('X-RateLimit-Limit-Tokens', String(context.rateLimit.rateLimitTpm || 90000));
    response.headers.set('X-RateLimit-Remaining-Tokens', String(context.rateLimit.remainingTokens));
    response.headers.set('X-RateLimit-Reset-In', String(context.rateLimit.resetInSeconds));
  }

  return response;
}

/**
 * Format error API response
 * @param {string} message - Error message
 * @param {string} type - Error type (e.g., 'validation_error', 'server_error')
 * @param {string} code - Error code
 * @param {number} status - HTTP status code
 * @param {Object} context - Request context
 * @returns {NextResponse} Formatted error response
 */
export function createApiErrorResponse(message, type, code, status = 400, context = null) {
  const response = NextResponse.json(
    {
      error: {
        message,
        type,
        code,
      },
    },
    { status }
  );

  if (context?.rateLimit) {
    response.headers.set('X-RateLimit-Remaining-Requests', String(context.rateLimit.remainingRequests));
    response.headers.set('X-RateLimit-Remaining-Tokens', String(context.rateLimit.remainingTokens));
    response.headers.set('X-RateLimit-Reset-In', String(context.rateLimit.resetInSeconds));
  }

  return response;
}
