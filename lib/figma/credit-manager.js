import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID, USAGE_LOGS_COLLECTION_ID } from '@/services/appwrite-collections';

/**
 * Credit costs for each Figma operation type.
 * Used by API routes to determine how many credits an operation requires.
 */
export const FIGMA_CREDIT_COSTS = {
  component: 20,
  page: 50,
  diagram: 15,
  designSystem: 30,
  assets: 5,
  context: 10,
  componentMap: 10,
};

/** Maximum Figma operations per day for free plan users. */
const FREE_PLAN_DAILY_LIMIT = 5;

/**
 * Checks whether a user has sufficient credits for a Figma operation,
 * enforces the free plan daily limit, and deducts credits on success.
 *
 * This function should be called BEFORE the operation begins to validate
 * that the user can proceed. After the operation succeeds, call
 * `deductCredits()` to actually subtract the credits.
 *
 * @param {string} userEmail - The user's email address.
 * @param {string} operationType - One of the keys in FIGMA_CREDIT_COSTS.
 * @returns {Promise<{allowed: boolean, remaining: number, error?: string, errorCode?: string, required?: number, available?: number, user?: object}>}
 */
export async function checkAndDeductCredits(userEmail, operationType) {
  const creditCost = FIGMA_CREDIT_COSTS[operationType];

  if (creditCost === undefined) {
    return {
      allowed: false,
      remaining: 0,
      error: `Unknown operation type: ${operationType}`,
      errorCode: 'INVALID_OPERATION',
    };
  }

  // 1. Look up the user
  let user;
  try {
    const res = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', userEmail),
      Query.limit(1),
    ]);
    if (res.documents.length === 0) {
      return {
        allowed: false,
        remaining: 0,
        error: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      };
    }
    user = res.documents[0];
  } catch (error) {
    console.error('[CreditManager] User lookup failed:', error);
    return {
      allowed: false,
      remaining: 0,
      error: 'Failed to verify user',
      errorCode: 'USER_LOOKUP_FAILED',
    };
  }

  // 2. Check sufficient credits
  if (user.credits < creditCost) {
    return {
      allowed: false,
      remaining: user.credits,
      error: `Insufficient credits. Required: ${creditCost}, Available: ${user.credits}`,
      errorCode: 'INSUFFICIENT_CREDITS',
      required: creditCost,
      available: user.credits,
    };
  }

  // 3. Check free plan daily limit
  if (user.plan === 'free') {
    const dailyCount = await getDailyOperationCount(user.$id);
    if (dailyCount >= FREE_PLAN_DAILY_LIMIT) {
      return {
        allowed: false,
        remaining: user.credits,
        error: 'Free plan is limited to 5 Figma operations per day. Upgrade for unlimited access.',
        errorCode: 'DAILY_LIMIT_REACHED',
      };
    }
  }

  // 4. Credits are available — return allowed with user reference for later deduction
  return {
    allowed: true,
    remaining: user.credits,
    user,
    creditCost,
  };
}

/**
 * Deducts credits from a user after a successful operation.
 * Should only be called AFTER the operation completes successfully.
 *
 * @param {object} user - The Appwrite user document (must have $id and credits fields).
 * @param {number} creditCost - The number of credits to deduct.
 * @returns {Promise<{success: boolean, remaining: number}>}
 */
export async function deductCredits(user, creditCost) {
  try {
    const newCredits = Math.max(0, user.credits - creditCost);
    await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, user.$id, {
      credits: newCredits,
    });
    return { success: true, remaining: newCredits };
  } catch (error) {
    console.error('[CreditManager] Credit deduction failed:', error);
    // Return success false but don't block the result — operation already succeeded
    return { success: false, remaining: Math.max(0, user.credits - creditCost) };
  }
}

/**
 * Logs a Figma operation to the usage_logs collection.
 *
 * @param {string} userEmail - The user's email address.
 * @param {string} operationType - The type of Figma operation (e.g., 'figma_convert_component').
 * @param {number} creditsUsed - The number of credits consumed.
 * @param {object} [options] - Additional options.
 * @param {string} [options.userId] - The Appwrite user document $id.
 * @param {number} [options.creditsRemaining] - Credits remaining after deduction.
 * @param {string} [options.model] - The model/service used (default: 'figma-api').
 * @returns {Promise<void>}
 */
export async function logFigmaOperation(userEmail, operationType, creditsUsed, options = {}) {
  const { userId, creditsRemaining, model = 'figma-api' } = options;

  try {
    // Resolve userId if not provided
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const res = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
        Query.equal('email', userEmail),
        Query.limit(1),
      ]);
      if (res.documents.length > 0) {
        resolvedUserId = res.documents[0].$id;
      }
    }

    await databases.createDocument(DB_ID, USAGE_LOGS_COLLECTION_ID, ID.unique(), {
      user_id: resolvedUserId || '',
      model,
      operation_type: operationType.startsWith('figma_') ? operationType : `figma_${operationType}`,
      credits_consumed: creditsUsed,
      credits_remaining: creditsRemaining ?? 0,
    });
  } catch (error) {
    console.error('[CreditManager] Usage log failed:', error);
    // Non-blocking — don't throw
  }
}

/**
 * Gets the number of Figma operations a user has performed today.
 * Used to enforce the free plan daily limit.
 *
 * @param {string} userId - The Appwrite user document $id.
 * @returns {Promise<number>} The count of Figma operations today.
 */
export async function getDailyOperationCount(userId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const logsRes = await databases.listDocuments(DB_ID, USAGE_LOGS_COLLECTION_ID, [
      Query.equal('user_id', userId),
      Query.startsWith('operation_type', 'figma_'),
      Query.limit(100),
    ]);
    const todayOps = logsRes.documents.filter(
      (doc) => doc.$createdAt && doc.$createdAt.startsWith(today)
    );
    return todayOps.length;
  } catch (error) {
    console.error('[CreditManager] Daily operation count check failed:', error);
    // If we can't check, return 0 to allow the operation (fail-open)
    return 0;
  }
}
