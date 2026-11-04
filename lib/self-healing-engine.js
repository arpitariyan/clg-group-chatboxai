/**
 * ChatBox AI — Automated Self-Healing & Error Recovery Engine (Phase 14)
 * ══════════════════════════════════════════════════════════════════════════
 * Automatically diagnoses tool call & API execution errors, applies automated repair
 * strategies (token refresh, parameter alias mapping, retry backoff), and attempts self-correction.
 */

export const ERROR_CATEGORIES = {
  AUTH_EXPIRED:       'auth_expired',
  RATE_LIMITED:       'rate_limited',
  INVALID_PARAMETERS: 'invalid_parameters',
  TRANSIENT_NETWORK:  'transient_network',
  UNKNOWN:            'unknown',
};

/**
 * Classify execution error into actionable self-healing categories.
 *
 * @param {Error|string} error
 * @returns {string} One of ERROR_CATEGORIES
 */
export function classifyExecutionError(error) {
  const message = (error?.message || String(error || '')).toLowerCase();

  if (/\b(401|unauthorized|invalid token|token expired|expired_token|auth)\b/i.test(message)) {
    return ERROR_CATEGORIES.AUTH_EXPIRED;
  }
  if (/\b(429|rate limit|too many requests|quota exceeded|tpm|tpd)\b/i.test(message)) {
    return ERROR_CATEGORIES.RATE_LIMITED;
  }
  if (/\b(invalid parameter|missing parameter|validation error|bad request|400|schema)\b/i.test(message)) {
    return ERROR_CATEGORIES.INVALID_PARAMETERS;
  }
  if (/\b(fetch failed|econnreset|etimedout|502|503|504|network error|timeout)\b/i.test(message)) {
    return ERROR_CATEGORIES.TRANSIENT_NETWORK;
  }

  return ERROR_CATEGORIES.UNKNOWN;
}

/**
 * Generate a self-healing correction plan for a failed tool or API call.
 *
 * @param {Error|string} error
 * @param {object} context - { appId, toolId, parameters }
 * @returns {{ category: string, canSelfHeal: boolean, actionPlan: string, repairedParameters?: object }}
 */
export function diagnoseAndRepair(error, context = {}) {
  const category = classifyExecutionError(error);
  const { parameters = {} } = context;

  let canSelfHeal = false;
  let actionPlan = 'Log error and report to user';
  let repairedParameters = { ...parameters };

  switch (category) {
    case ERROR_CATEGORIES.AUTH_EXPIRED:
      canSelfHeal = true;
      actionPlan = 'Refresh OAuth / Firebase token and retry request once';
      break;

    case ERROR_CATEGORIES.RATE_LIMITED:
      canSelfHeal = true;
      actionPlan = 'Apply exponential backoff delay (2000ms) and retry request';
      break;

    case ERROR_CATEGORIES.INVALID_PARAMETERS:
      canSelfHeal = true;
      actionPlan = 'Map parameter aliases and normalize uuid strings';
      // Normalize parameter keys (e.g. page_id -> pageId, email_to -> to)
      if (repairedParameters.page_id && !repairedParameters.pageId) {
        repairedParameters.pageId = repairedParameters.page_id;
      }
      if (repairedParameters.email_to && !repairedParameters.to) {
        repairedParameters.to = repairedParameters.email_to;
      }
      break;

    case ERROR_CATEGORIES.TRANSIENT_NETWORK:
      canSelfHeal = true;
      actionPlan = 'Retry request after 1000ms transient network delay';
      break;

    default:
      canSelfHeal = false;
      actionPlan = 'Unrecoverable error; report details to user';
      break;
  }

  return {
    category,
    canSelfHeal,
    actionPlan,
    repairedParameters,
  };
}
