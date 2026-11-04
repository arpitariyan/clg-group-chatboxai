/**
 * Figma Error Handler
 * Centralized error classification, user-friendly message generation,
 * retry logic, and timeout utilities for all Figma integration modules.
 */

import { getValidToken } from '@/lib/oauth-manager';

// --- Error Types ---

export const ERROR_TYPES = {
  FIGMA_UNREACHABLE: 'FIGMA_UNREACHABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  AI_FAILURE: 'AI_FAILURE',
  UNSUPPORTED_NODES: 'UNSUPPORTED_NODES',
  TIMEOUT: 'TIMEOUT',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  DAILY_LIMIT: 'DAILY_LIMIT',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  INVALID_INPUT: 'INVALID_INPUT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

// --- Error Definitions ---

const ERROR_DEFINITIONS = {
  [ERROR_TYPES.FIGMA_UNREACHABLE]: {
    httpStatus: 502,
    message: 'Figma service is temporarily unavailable.',
    guidance: 'Please try again in a few moments. If the issue persists, check Figma\'s status page.',
    retryable: true,
  },
  [ERROR_TYPES.RATE_LIMITED]: {
    httpStatus: 429,
    message: 'Figma API rate limit reached.',
    guidance: 'Too many requests. Please wait a moment and try again.',
    retryable: true,
  },
  [ERROR_TYPES.TOKEN_EXPIRED]: {
    httpStatus: 401,
    message: 'Your Figma session has expired.',
    guidance: 'Attempting to refresh your connection automatically. Please retry your action.',
    retryable: true,
  },
  [ERROR_TYPES.TOKEN_REVOKED]: {
    httpStatus: 403,
    message: 'Your Figma connection has been revoked.',
    guidance: 'Please reconnect your Figma account from the Connections page.',
    retryable: false,
  },
  [ERROR_TYPES.AI_FAILURE]: {
    httpStatus: 500,
    message: 'AI generation encountered an issue.',
    guidance: 'The AI model could not complete the request. A simplified attempt will be made automatically.',
    retryable: true,
  },
  [ERROR_TYPES.UNSUPPORTED_NODES]: {
    httpStatus: 200,
    message: 'Some design elements were skipped.',
    guidance: 'Unsupported node types were excluded from the output. See the skipped list for details.',
    retryable: false,
  },
  [ERROR_TYPES.TIMEOUT]: {
    httpStatus: 504,
    message: 'The operation took too long and was cancelled.',
    guidance: 'Try selecting a smaller section of the design, or retry with fewer elements.',
    retryable: true,
  },
  [ERROR_TYPES.INSUFFICIENT_CREDITS]: {
    httpStatus: 402,
    message: 'Insufficient credits for this operation.',
    guidance: 'Please purchase more credits or upgrade your plan to continue.',
    retryable: false,
  },
  [ERROR_TYPES.DAILY_LIMIT]: {
    httpStatus: 429,
    message: 'Daily operation limit reached.',
    guidance: 'Free plan is limited to 5 Figma operations per day. Upgrade for unlimited access.',
    retryable: false,
  },
  [ERROR_TYPES.FILE_NOT_FOUND]: {
    httpStatus: 404,
    message: 'Figma file or node not found.',
    guidance: 'Check that the file key and node ID are correct, and that you have access to the file.',
    retryable: false,
  },
  [ERROR_TYPES.INVALID_INPUT]: {
    httpStatus: 400,
    message: 'Invalid request parameters.',
    guidance: 'Please check your input and try again.',
    retryable: false,
  },
  [ERROR_TYPES.INTERNAL_ERROR]: {
    httpStatus: 500,
    message: 'An unexpected error occurred.',
    guidance: 'Please try again. If the issue persists, contact support.',
    retryable: true,
  },
};

// --- Error Classification ---

/**
 * Classify a raw error into a known error type based on its message and properties.
 * @param {Error|object} error - The raw error to classify
 * @returns {string} One of the ERROR_TYPES values
 */
export function classifyError(error) {
  if (!error) return ERROR_TYPES.INTERNAL_ERROR;

  const message = (error.message || '').toLowerCase();
  const status = error.status || error.statusCode || null;

  // Rate limit
  if (status === 429 || message.includes('rate limit') || message.includes('429')) {
    return ERROR_TYPES.RATE_LIMITED;
  }

  // Token revoked / needs reauth
  if (
    message.includes('re-authorization required') ||
    message.includes('revoked') ||
    message.includes('needs_reauth') ||
    message.includes('please reconnect')
  ) {
    return ERROR_TYPES.TOKEN_REVOKED;
  }

  // Token expired
  if (
    message.includes('token expired') ||
    message.includes('token is invalid') ||
    message.includes('unauthorized') ||
    status === 401
  ) {
    return ERROR_TYPES.TOKEN_EXPIRED;
  }

  // File not found
  if (
    message.includes('not found') ||
    message.includes('no access') ||
    status === 404
  ) {
    return ERROR_TYPES.FILE_NOT_FOUND;
  }

  // Figma unreachable (network errors, 5xx from Figma)
  if (
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('network') ||
    message.includes('fetch failed') ||
    message.includes('temporarily unavailable') ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return ERROR_TYPES.FIGMA_UNREACHABLE;
  }

  // Timeout
  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('aborted')
  ) {
    return ERROR_TYPES.TIMEOUT;
  }

  // AI failure
  if (
    message.includes('generation failed') ||
    message.includes('ai') ||
    message.includes('model') ||
    message.includes('generatecontent')
  ) {
    return ERROR_TYPES.AI_FAILURE;
  }

  // Insufficient credits
  if (message.includes('insufficient credits') || message.includes('not enough credits')) {
    return ERROR_TYPES.INSUFFICIENT_CREDITS;
  }

  // Daily limit
  if (message.includes('daily limit') || message.includes('daily operation')) {
    return ERROR_TYPES.DAILY_LIMIT;
  }

  return ERROR_TYPES.INTERNAL_ERROR;
}

/**
 * Build a structured error response object for a given error type.
 * @param {string} errorType - One of ERROR_TYPES
 * @param {object} [extra] - Additional context to include in the response
 * @returns {{ error: string, message: string, guidance: string, retryable: boolean, httpStatus: number }}
 */
export function buildErrorResponse(errorType, extra = {}) {
  const definition = ERROR_DEFINITIONS[errorType] || ERROR_DEFINITIONS[ERROR_TYPES.INTERNAL_ERROR];

  return {
    error: errorType,
    message: extra.message || definition.message,
    guidance: extra.guidance || definition.guidance,
    retryable: definition.retryable,
    httpStatus: definition.httpStatus,
    ...extra,
  };
}

/**
 * Classify an error and build a structured response in one step.
 * @param {Error|object} error - The raw error
 * @param {object} [extra] - Additional context
 * @returns {{ error: string, message: string, guidance: string, retryable: boolean, httpStatus: number }}
 */
export function handleError(error, extra = {}) {
  const errorType = classifyError(error);
  return buildErrorResponse(errorType, extra);
}

// --- Retry Logic ---

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_BACKOFF_MS = 1000;

/**
 * Execute an async function with automatic retry on rate limit (429) errors.
 * Respects Retry-After headers when available.
 * @param {Function} fn - Async function to execute
 * @param {object} [options] - Retry options
 * @param {number} [options.maxRetries=3] - Maximum number of retries
 * @param {number} [options.baseBackoffMs=1000] - Base backoff in milliseconds
 * @returns {Promise<*>} Result of the function
 */
export async function withRetry(fn, options = {}) {
  const { maxRetries = DEFAULT_MAX_RETRIES, baseBackoffMs = DEFAULT_BASE_BACKOFF_MS } = options;

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorType = classifyError(error);

      // Only retry on rate limit errors
      if (errorType !== ERROR_TYPES.RATE_LIMITED) {
        throw error;
      }

      if (attempt >= maxRetries) {
        break;
      }

      // Calculate wait time: use Retry-After header if available, else exponential backoff
      const retryAfterSeconds = error.retryAfter || null;
      const waitMs = retryAfterSeconds
        ? retryAfterSeconds * 1000
        : baseBackoffMs * Math.pow(2, attempt);

      await sleep(waitMs);
    }
  }

  throw lastError || new Error('Request failed after maximum retries');
}

/**
 * Execute an async function with automatic token refresh on expiry.
 * If the token is expired, refreshes via oauth-manager and retries the original request.
 * @param {Function} fn - Async function that receives (accessToken) as argument
 * @param {string} userId - User's Firebase UID
 * @param {string} [appId='figma'] - App identifier for oauth-manager
 * @returns {Promise<*>} Result of the function
 */
export async function withTokenRefresh(fn, userId, appId = 'figma') {
  try {
    const token = await getValidToken(userId, appId);
    return await fn(token);
  } catch (error) {
    const errorType = classifyError(error);

    if (errorType === ERROR_TYPES.TOKEN_EXPIRED) {
      // getValidToken already handles refresh internally,
      // but if the call itself fails with 401, try getting a fresh token
      try {
        const freshToken = await getValidToken(userId, appId);
        return await fn(freshToken);
      } catch (refreshError) {
        const refreshErrorType = classifyError(refreshError);
        if (refreshErrorType === ERROR_TYPES.TOKEN_REVOKED) {
          throw Object.assign(new Error('Figma connection revoked. Please reconnect.'), {
            type: ERROR_TYPES.TOKEN_REVOKED,
          });
        }
        throw refreshError;
      }
    }

    if (errorType === ERROR_TYPES.TOKEN_REVOKED) {
      throw Object.assign(new Error('Figma connection revoked. Please reconnect.'), {
        type: ERROR_TYPES.TOKEN_REVOKED,
      });
    }

    throw error;
  }
}

// --- Timeout ---

const DEFAULT_TIMEOUT_MS = 60000; // 60 seconds

/**
 * Execute an async function with a timeout.
 * If the operation exceeds the timeout, it is cancelled and a TIMEOUT error is thrown.
 * @param {Function} fn - Async function to execute
 * @param {object} [options] - Timeout options
 * @param {number} [options.timeoutMs=60000] - Timeout in milliseconds
 * @param {string} [options.operationName='Operation'] - Name for error messages
 * @returns {Promise<*>} Result of the function
 */
export async function withTimeout(fn, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, operationName = 'Operation' } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await Promise.race([
      fn(controller.signal),
      new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(
            Object.assign(
              new Error(`${operationName} timed out after ${timeoutMs / 1000}s`),
              { type: ERROR_TYPES.TIMEOUT }
            )
          );
        });
      }),
    ]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.type === ERROR_TYPES.TIMEOUT || error.message?.includes('timed out')) {
      throw Object.assign(error, { type: ERROR_TYPES.TIMEOUT });
    }
    throw error;
  }
}

// --- AI Retry ---

/**
 * Execute an AI generation function with retry logic.
 * On first failure, retries once with a simplified prompt.
 * On second failure, returns a partial result if possible.
 * @param {Function} generateFn - Async function (prompt) => result
 * @param {string} fullPrompt - The full AI prompt
 * @param {Function} [simplifyPrompt] - Function to simplify the prompt for retry
 * @param {object} [options] - Options
 * @param {*} [options.partialResult] - Partial result to return on complete failure
 * @returns {Promise<{ result: *, retried: boolean, partial: boolean }>}
 */
export async function withAIRetry(generateFn, fullPrompt, simplifyPrompt, options = {}) {
  const { partialResult = null } = options;

  // First attempt with full prompt
  try {
    const result = await generateFn(fullPrompt);
    return { result, retried: false, partial: false };
  } catch (firstError) {
    console.warn('[ErrorHandler] AI generation failed, retrying with simplified prompt:', firstError.message);

    // Second attempt with simplified prompt
    const simplifiedPrompt = simplifyPrompt ? simplifyPrompt(fullPrompt) : fullPrompt;

    try {
      const result = await generateFn(simplifiedPrompt);
      return { result, retried: true, partial: false };
    } catch (secondError) {
      console.error('[ErrorHandler] AI generation failed after retry:', secondError.message);

      // Return partial result if available
      if (partialResult !== null) {
        return {
          result: partialResult,
          retried: true,
          partial: true,
          error: secondError.message,
        };
      }

      throw Object.assign(
        new Error(`AI generation failed after retry: ${secondError.message}`),
        { type: ERROR_TYPES.AI_FAILURE }
      );
    }
  }
}

// --- Unsupported Nodes ---

const SUPPORTED_NODE_TYPES = [
  'FRAME',
  'COMPONENT',
  'COMPONENT_SET',
  'INSTANCE',
  'TEXT',
  'RECTANGLE',
  'ELLIPSE',
  'VECTOR',
  'GROUP',
  'SECTION',
  'LINE',
  'BOOLEAN_OPERATION',
];

/**
 * Filter nodes into supported and unsupported, returning both lists.
 * Supported nodes are processed; unsupported nodes are skipped and reported.
 * @param {object[]} nodes - Array of Figma nodes
 * @returns {{ supported: object[], skipped: { id: string, name: string, type: string }[] }}
 */
export function filterUnsupportedNodes(nodes) {
  if (!Array.isArray(nodes)) return { supported: [], skipped: [] };

  const supported = [];
  const skipped = [];

  for (const node of nodes) {
    if (SUPPORTED_NODE_TYPES.includes(node.type)) {
      supported.push(node);
    } else {
      skipped.push({
        id: node.id || 'unknown',
        name: node.name || 'Unnamed',
        type: node.type || 'UNKNOWN',
      });
    }
  }

  return { supported, skipped };
}

// --- Combined Wrapper ---

/**
 * Wrap a Figma API call with token refresh, retry, and timeout.
 * Combines all error handling strategies into a single utility.
 * @param {Function} apiFn - Async function (accessToken) => result
 * @param {object} context - Execution context
 * @param {string} context.userId - User's Firebase UID
 * @param {string} [context.appId='figma'] - App identifier
 * @param {number} [context.timeoutMs=60000] - Timeout in milliseconds
 * @param {string} [context.operationName='Figma operation'] - Name for error messages
 * @returns {Promise<*>} Result of the API call
 */
export async function withFigmaErrorHandling(apiFn, context = {}) {
  const {
    userId,
    appId = 'figma',
    timeoutMs = DEFAULT_TIMEOUT_MS,
    operationName = 'Figma operation',
  } = context;

  return withTimeout(
    async (signal) => {
      return withTokenRefresh(
        async (token) => {
          return withRetry(async () => {
            return apiFn(token, signal);
          });
        },
        userId,
        appId
      );
    },
    { timeoutMs, operationName }
  );
}

// --- Helpers ---

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
