/**
 * ChatboxAI — Credit Engine
 * ═══════════════════════════════════════════════════════════════════════════
 * Dual-wallet credit management system.
 *
 * ARCHITECTURE:
 *   Every user has TWO internal credit balances stored in the `users` collection:
 *     1. `credits`       → Daily Free Credits (5000/day, resets every midnight)
 *     2. `paid_credits`  → Monthly Paid Credits (0/30000/150000 per plan)
 *
 *   The user NEVER sees two wallets. The UI always shows a single number:
 *     creditsRemaining = credits + paid_credits
 *
 * CORE DEDUCTION RULES (NO EXCEPTIONS):
 *   Free Model  → deduct from `credits`       ONLY
 *   Paid Model  → deduct from `paid_credits`  ONLY
 *
 * BLOCKING RULES:
 *   Free model  + credits === 0       → Block (429 "Daily credits exhausted")
 *   Paid model  + paid_credits === 0  → Block (402 "Monthly credits exhausted")
 *   Paid model  + plan === 'free'     → Block (403 "Upgrade required")
 *   Both wallets === 0                → Block (402 "No credits remaining")
 */

import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID, USAGE_LOGS_COLLECTION_ID } from '@/services/appwrite-collections';
import { normalizePlan, getPlanConfig } from '@/lib/subscriptionPlans';
import { calculateChatCredits } from '@/lib/model-catalog';

const HAS_APPWRITE_CONFIG = Boolean(process.env.APPWRITE_API_KEY);

// ── Per-user mutex (prevents race conditions on concurrent requests) ────────────
const _creditLocks = new Map();

function queueByKey(key, task) {
  const previous = _creditLocks.get(key) || Promise.resolve();
  const runTask = previous.catch(() => {}).then(task);
  _creditLocks.set(key, runTask.finally(() => {
    if (_creditLocks.get(key) === runTask) _creditLocks.delete(key);
  }));
  return runTask;
}

// ── User document helpers ──────────────────────────────────────────────────────

/**
 * Fetch the user document from Appwrite by userId.
 * Includes on-the-fly daily reset if needed.
 */
export async function getUserCreditDoc(userId) {
  if (!HAS_APPWRITE_CONFIG || !userId) return null;
  try {
    const doc = await databases.getDocument(DB_ID, USERS_COLLECTION_ID, userId);
    return applyOnTheFlyDailyReset(doc);
  } catch (err) {
    console.error('[CreditEngine] getUserCreditDoc failed:', err?.message);
    return null;
  }
}

/**
 * Fetch user document by email (for contexts where only email is available).
 */
export async function getUserCreditDocByEmail(email) {
  if (!HAS_APPWRITE_CONFIG || !email) return null;
  try {
    const res = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', String(email).toLowerCase()),
      Query.limit(1),
    ]);
    const doc = res.documents[0] || null;
    if (!doc) return null;
    return applyOnTheFlyDailyReset(doc);
  } catch (err) {
    console.error('[CreditEngine] getUserCreditDocByEmail failed:', err?.message);
    return null;
  }
}

/**
 * Perform daily free credit reset if the last reset was not today.
 * This is an on-the-fly check — it runs on every request cheaply (date string compare).
 * The Inngest cron is the canonical reset mechanism; this is a safety net.
 */
async function applyOnTheFlyDailyReset(userDoc) {
  if (!userDoc) return null;
  const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

  if (userDoc.last_daily_reset === today) return userDoc; // already reset today

  // Need to reset daily free credits
  const updates = {
    credits: 5000,
    last_daily_reset: today,
  };

  try {
    const updated = await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, userDoc.$id, updates);
    return updated;
  } catch (err) {
    console.warn('[CreditEngine] On-the-fly daily reset failed (non-fatal):', err?.message);
    return { ...userDoc, ...updates };
  }
}

// ── Main API ───────────────────────────────────────────────────────────────────

/**
 * Get the combined credit balance for a user.
 * This is what the UI shows as "Credits Remaining".
 *
 * @param {string} userId
 * @returns {Promise<{ creditsRemaining: number, dailyFreeCredits: number, monthlyPaidCredits: number, plan: string }>}
 */
export async function getDualWalletBalance(userId) {
  const userDoc = await getUserCreditDoc(userId);
  if (!userDoc) {
    return { creditsRemaining: 0, dailyFreeCredits: 0, monthlyPaidCredits: 0, plan: 'free' };
  }

  const dailyFreeCredits = Math.max(0, Number(userDoc.credits ?? 0));
  const monthlyPaidCredits = Math.max(0, Number(userDoc.paid_credits ?? 0));
  const plan = normalizePlan(userDoc.plan);

  return {
    creditsRemaining: dailyFreeCredits + monthlyPaidCredits,
    dailyFreeCredits,
    monthlyPaidCredits,
    plan,
    userId: userDoc.$id,
    billingDate: userDoc.billing_date || 1,
    lastDailyReset: userDoc.last_daily_reset,
    lastMonthlyReset: userDoc.last_monthly_reset,
  };
}

/**
 * Check if a user can use a model — without actually deducting credits.
 * Call this BEFORE the AI provider call to fail fast.
 *
 * @param {string} userId
 * @param {'free' | 'paid'} modelCategory
 * @returns {Promise<{ allowed: boolean, code: number, reason: string }>}
 */
export async function canUseModel(userId, modelCategory) {
  const bal = await getDualWalletBalance(userId);

  if (modelCategory === 'free') {
    if (bal.dailyFreeCredits <= 0) {
      return {
        allowed: false,
        code: 429,
        reason: 'Daily free credits exhausted. They will reset at midnight UTC.',
      };
    }
    return { allowed: true, code: 200, reason: 'ok' };
  }

  // Paid model check: allowed if user has monthlyPaidCredits > 0
  if (bal.monthlyPaidCredits <= 0) {
    if (bal.plan === 'free') {
      return {
        allowed: false,
        code: 403,
        reason: 'Paid models require a Pro or Max subscription with paid credits. Please upgrade your plan.',
      };
    }
    return {
      allowed: false,
      code: 402,
      reason: 'Monthly paid credits exhausted. Please wait for your next billing cycle or upgrade your plan.',
    };
  }

  return { allowed: true, code: 200, reason: 'ok' };
}

/**
 * Deduct credits from the correct wallet based on model category.
 * Uses per-user mutex to prevent race conditions.
 *
 * RULE:
 *   modelCategory === 'free' → deduct from `credits` (daily free wallet)
 *   modelCategory === 'paid' → deduct from `paid_credits` (monthly paid wallet)
 *
 * @param {{
 *   userId: string,
 *   modelCategory: 'free' | 'paid',
 *   creditsToDeduct: number,
 *   meta?: object         — optional metadata for the transaction log
 * }} params
 * @returns {Promise<{ success: boolean, walletAfter: number, creditsRemaining: number }>}
 */
export async function deductCredits({ userId, modelCategory, creditsToDeduct, meta = {} }) {
  if (!userId) throw new Error('[CreditEngine] userId is required for deductCredits');
  if (creditsToDeduct <= 0) return { success: true, walletAfter: 0, creditsRemaining: 0 };

  return queueByKey(userId, async () => {
    const userDoc = await getUserCreditDoc(userId);
    if (!userDoc) throw new Error('[CreditEngine] User not found');

    const fieldName = modelCategory === 'paid' ? 'paid_credits' : 'credits';
    const walletBefore = Math.max(0, Number(userDoc[fieldName] ?? 0));
    const walletAfter  = Math.max(0, walletBefore - creditsToDeduct);

    // Update the correct wallet
    await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, userDoc.$id, {
      [fieldName]: walletAfter,
    });

    // Log the transaction asynchronously (non-blocking)
    _logCreditTransaction({
      userId,
      userEmail: userDoc.email,
      plan: userDoc.plan,
      walletType: modelCategory,
      creditsDeducted: creditsToDeduct,
      walletBefore,
      walletAfter,
      ...meta,
    }).catch((err) => console.warn('[CreditEngine] Transaction log failed (non-fatal):', err?.message));

    const remainingFree = modelCategory === 'paid'
      ? Math.max(0, Number(userDoc.credits ?? 0))
      : walletAfter;
    const remainingPaid = modelCategory === 'free'
      ? Math.max(0, Number(userDoc.paid_credits ?? 0))
      : walletAfter;

    return {
      success: true,
      walletAfter,
      creditsRemaining: remainingFree + remainingPaid,
    };
  });
}

/**
 * Refund credits back to the correct wallet (e.g. on provider failure).
 *
 * @param {{ userId: string, modelCategory: 'free' | 'paid', creditsToRefund: number }} params
 */
export async function refundCredits({ userId, modelCategory, creditsToRefund }) {
  if (!userId || creditsToRefund <= 0) return;

  return queueByKey(userId, async () => {
    const userDoc = await getUserCreditDoc(userId);
    if (!userDoc) return;

    const fieldName = modelCategory === 'paid' ? 'paid_credits' : 'credits';
    const current = Math.max(0, Number(userDoc[fieldName] ?? 0));
    await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, userDoc.$id, {
      [fieldName]: current + creditsToRefund,
    });
  });
}

/**
 * Reset daily free credits for a single user.
 * Called by Inngest cron at midnight UTC.
 *
 * @param {string} userId
 * @param {string} plan
 */
export async function resetDailyFreeCredits(userId, plan = 'free') {
  if (!userId) return;
  const today = new Date().toISOString().split('T')[0];
  await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, userId, {
    credits: 5000,
    last_daily_reset: today,
  });
}

/**
 * Reset monthly paid credits for a single user.
 * Called by Inngest cron on the user's billing date.
 *
 * @param {string} userId
 * @param {string} plan
 */
export async function resetMonthlyPaidCredits(userId, plan = 'free') {
  if (!userId) return;
  const userDoc = await getUserCreditDoc(userId);
  const currentPaidCredits = Math.max(0, Number(userDoc?.paid_credits ?? 0));
  const planConfig = getPlanConfig(normalizePlan(plan));
  const newPaidCredits = currentPaidCredits + (planConfig.paidCredits ?? 0);
  const today = new Date().toISOString().split('T')[0];

  await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, userId, {
    paid_credits: newPaidCredits,
    last_monthly_reset: today,
  });
}

// ── Internal helpers ───────────────────────────────────────────────────────────

async function _logCreditTransaction({
  userId,
  userEmail,
  plan,
  walletType,
  creditsDeducted,
  walletBefore,
  walletAfter,
  model = '',
  modelCategory = '',
  endpoint = 'chat',
  promptTokens = 0,
  completionTokens = 0,
}) {
  if (!HAS_APPWRITE_CONFIG) return;
  try {
    await databases.createDocument(DB_ID, USAGE_LOGS_COLLECTION_ID, ID.unique(), {
      user_id: userId || '',
      user_email: String(userEmail || '').toLowerCase(),
      operation_type: 'ai_request',
      model: model || '',
      credits_consumed: Math.round(creditsDeducted),
      credits_remaining: Math.round(walletAfter),
      wallet_type: walletType,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Silent — logging must never break request flow
  }
}
