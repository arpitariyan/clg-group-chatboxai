/**
 * ChatboxAI — Budget Router
 * ══════════════════════════
 * Core engine for profit-aware model routing.
 *
 * Flow per request:
 *   1. resolveModelWithBudget()  – classify → estimate → reserve → pick model
 *   2. [call the AI provider]
 *   3. settleBudgetUsage()       – settle actual cost, refund over-reserve
 *      OR refundBudgetReserve()  – full refund if provider failed
 *
 * Credit formula:
 *   1 Credit = ₹0.01   |   1 USD = 8,300 credits
 *
 * All credit operations use the existing queueByKey locking in api-credits.js
 * to prevent race conditions.
 */

import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import {
  USERS_COLLECTION_ID,
  USAGE_LOGS_COLLECTION_ID,
  MODEL_USAGE_EVENTS_COLLECTION_ID,
} from '@/services/appwrite-collections';
import { MODEL_REGISTRY, findModel } from '@/lib/models-registry';
import { normalizePlan, getPlanConfig } from '@/lib/subscriptionPlans';
import {
  estimateCreditCost,
  calculateActualCreditCost,
  getNextDowngradeTier,
  pickModelForTier,
  PLAN_MAX_TIER,
  MINIMUM_REQUEST_CREDITS,
} from '@/lib/model-cost-tiers';
import { getModelCategory as getModelCategoryFromCatalog } from '@/lib/model-catalog';

// ── In-memory reservation store ───────────────────────────────────────────────
// Stores pending reservations that have been deducted but not yet settled.
// Key: reservationId  Value: { userEmail, reservedCredits, modelPublicId, timestamp }
const pendingReservations = new Map();

// ── Per-user credit deduction queue ──────────────────────────────────────────
const creditLocks = new Map();

function queueByKey(key, task) {
  const previous = creditLocks.get(key) || Promise.resolve();
  const runTask = previous.catch(() => {}).then(task);
  creditLocks.set(key, runTask.finally(() => {
    if (creditLocks.get(key) === runTask) creditLocks.delete(key);
  }));
  return runTask;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const HAS_APPWRITE_CONFIG = Boolean(DB_ID && process.env.APPWRITE_API_KEY);

async function getUserCreditsDoc(userEmail) {
  if (!HAS_APPWRITE_CONFIG) return null;
  try {
    const res = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', String(userEmail || '').toLowerCase()),
      Query.limit(1),
    ]);
    const user = res.documents[0] || null;
    if (!user) return null;

    let needsUpdate = false;
    const updates = {};
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // 1. Daily Free Credits Reset (5000) — applies to ALL plans
    if (!user.last_daily_reset || user.last_daily_reset !== todayStr) {
      updates.credits = 5000;
      updates.last_daily_reset = todayStr;
      needsUpdate = true;
    }

    // 2. Monthly Paid Credits Reset (Pro/Max plans)
    const normalizedPlan = normalizePlan(user.plan);
    if (normalizedPlan !== 'free') {
      const planConfig = getPlanConfig(normalizedPlan);
      const planPaidCredits = planConfig.paidCredits ?? 0;

      // ── KEY FIX: Immediately initialize paid_credits for newly upgraded users ──
      // If a Pro/Max user has 0 paid_credits (just upgraded, or never initialized),
      // grant them their full plan allowance immediately so they can use paid models.
      const currentPaidCredits = Number(user.paid_credits ?? 0);
      if (currentPaidCredits === 0 && planPaidCredits > 0) {
        updates.paid_credits = planPaidCredits;
        updates.last_monthly_reset = todayStr;
        needsUpdate = true;
        console.log(`[BudgetRouter] Initializing paid_credits for new ${normalizedPlan} user: ${userEmail} → ${planPaidCredits}`);
      } else {
        // Regular monthly reset logic with credit rollover
        const { reset } = shouldResetCredits(user);
        if (reset) {
          updates.paid_credits = currentPaidCredits + planPaidCredits;
          updates.last_monthly_reset = todayStr;
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      try {
        const updatedUser = await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, user.$id, updates);
        return updatedUser;
      } catch (updateErr) {
        console.warn('[BudgetRouter] Failed to perform on-the-fly credit reset:', updateErr?.message);
        return { ...user, ...updates }; // Return optimistically
      }
    }

    return user;
  } catch (err) {
    console.error('[BudgetRouter] getUserCreditsDoc error:', err);
    return null;
  }
}

async function updateUserCredits(userId, newCredits, walletType = 'free') {
  if (!HAS_APPWRITE_CONFIG || !userId) return;
  const fieldName = walletType === 'paid' ? 'paid_credits' : 'credits';
  await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, userId, {
    [fieldName]: Math.max(0, Math.round(newCredits)),
  });
}

/**
 * Check if a model's accessTier is compatible with the user's plan.
 * Now also cross-checks the DB catalog for accurate 'free'/'paid' categorization.
 *
 * Access rules:
 *   Free → only category:'free' models
 *   Pro  → ALL models
 *   Max  → ALL models
 *
 * @param {object} model
 * @param {string} plan
 * @param {string} [dbCategory] – category from model catalog ('free'|'paid'), if resolved
 * @returns {boolean}
 */
function canPlanAccessModel(model, plan, dbCategory) {
  const p = normalizePlan(plan);
  if (p === 'max' || p === 'pro') return true;
  // Free: only allow free-category models
  const at = dbCategory ?? model?.accessTier ?? 'free';
  return at === 'free';
}

/**
 * Check if a model's costTier fits within the plan's budget tier cap.
 */
function isTierAffordable(model, plan, activeWalletCredits, isFreeModel = false) {
  if (isFreeModel) return true; // FIX: Free models require no payment and bypass tier restrictions
  const planMaxTier = PLAN_MAX_TIER[normalizePlan(plan)] ?? 2;
  if ((model.costTier ?? 1) > planMaxTier) return false;
  return activeWalletCredits >= MINIMUM_REQUEST_CREDITS;
}

// ── Core API ──────────────────────────────────────────────────────────────────

/**
 * Resolve the best model for a request within the user's budget.
 * Reserves credits before returning.
 *
 * @param {{
 *   userEmail: string,
 *   plan: string,
 *   requestedPublicId: string,
 *   requestClass: string,
 *   estimatedInputTokens: number,
 *   expectedOutputTokens: number,
 * }} params
 *
 * @returns {Promise<{
 *   resolvedModel: object,         // model object from MODEL_REGISTRY
 *   provider: string,              // 'groq' | 'google' | 'openrouter' | 'replicate' | …
 *   estimatedCostCredits: number,
 *   reservationId: string,
 *   fallbackTriggered: boolean,
 *   originalPublicId: string,
 *   blocked: boolean,              // true if no affordable model found
 *   blockReason?: string,
 * }>}
 */
export async function resolveModelWithBudget({
  userEmail,
  plan,
  requestedPublicId,
  requestClass = 'chat',
  estimatedInputTokens = 800,
  expectedOutputTokens = 500,
}) {
  let normalizedPlan = normalizePlan(plan);
  const originalPublicId = requestedPublicId;

  // ── Resolve DB-driven model category ─────────────────────────────────────
  // This is the source of truth for which wallet to deduct from.
  // Free models → daily free wallet | Paid models → monthly paid wallet
  let dbModelCategory = 'free';
  try {
    dbModelCategory = await getModelCategoryFromCatalog(requestedPublicId);
  } catch (catErr) {
    console.warn('[BudgetRouter] DB catalog lookup failed, using registry fallback:', catErr?.message);
  }

  // Get user credits from both wallets
  const userDoc = await getUserCreditsDoc(userEmail);
  const freeCreditsAvailable = Number(userDoc?.credits ?? 0);
  const paidCreditsAvailable = Number(userDoc?.paid_credits ?? 0);
  
  // FIX: Override client-provided plan with the DB-verified plan if available.
  // This prevents false blocks when the frontend times out fetching the plan and defaults to 'free'.
  if (userDoc?.plan) {
    normalizedPlan = normalizePlan(userDoc.plan);
  }
  const planConfig = getPlanConfig(normalizedPlan);

  // ── Free plan: hard block on premium/paid models (only if no remaining paid credits) ──
  // Check DB catalog first (authoritative); fall back to registry accessTier
  if (normalizedPlan === 'free' && paidCreditsAvailable <= 0) {
    const isPaidModel = dbModelCategory === 'paid' || (() => {
      const requestedModel = findModel(requestedPublicId);
      return requestedModel && requestedModel.accessTier !== 'free';
    })();

    if (isPaidModel) {
      return blocked(
        'This model requires a Pro or Max subscription. Please upgrade your plan to access paid models.',
        originalPublicId
      );
    }
  }

  // ── Resolve the requested model ──────────────────────────────────────────
  let resolvedModel = findModel(requestedPublicId);
  let fallbackTriggered = false;

  if (!resolvedModel || requestedPublicId === 'auto') {
    resolvedModel = pickModelForTier(normalizedPlan, PLAN_MAX_TIER[normalizedPlan] ?? 2, requestClass);
    if (!resolvedModel) return blocked('No suitable model available for your plan.', originalPublicId);
    fallbackTriggered = requestedPublicId !== 'auto';
  }

  // ── Downgrade ladder ─────────────────────────────────────────────────────
  let currentModel = resolvedModel;
  let downgradeRounds = 0;
  const MAX_DOWNGRADE_ROUNDS = 5;
  const isAutoRequest = requestedPublicId === 'auto' || !requestedPublicId;

  while (downgradeRounds < MAX_DOWNGRADE_ROUNDS) {
    downgradeRounds++;

    // Use DB catalog category for the current model if available; otherwise registry
    const currentModelCatalogCategory = downgradeRounds === 1
      ? dbModelCategory
      : ((currentModel.accessTier || 'free') === 'free' ? 'free' : 'paid');

    // Check plan access tier
    if (!canPlanAccessModel(currentModel, normalizedPlan, currentModelCatalogCategory)) {
      if (!isAutoRequest) return blocked('This model requires a higher plan.', originalPublicId);
      const nextTier = getNextDowngradeTier(normalizedPlan, currentModel.costTier ?? 1);
      if (nextTier === null) return blocked('This model requires a higher plan.', originalPublicId);
      const next = pickModelForTier(normalizedPlan, nextTier, requestClass);
      if (!next) return blocked('No accessible model found after downgrade.', originalPublicId);
      currentModel = next;
      fallbackTriggered = true;
      continue;
    }

    // Determine wallet based on DB catalog category
    const isFreeModel = currentModelCatalogCategory === 'free';
    const activeWalletCredits = isFreeModel ? freeCreditsAvailable : paidCreditsAvailable;
    const walletType = isFreeModel ? 'free' : 'paid';

    // Check tier affordability relative to the active wallet
    if (!isTierAffordable(currentModel, normalizedPlan, activeWalletCredits, isFreeModel)) {
      if (!isAutoRequest) return blocked(`Insufficient ${walletType === 'paid' ? 'paid-model' : 'daily free'} credits.`, originalPublicId);
      const nextTier = getNextDowngradeTier(normalizedPlan, currentModel.costTier ?? 1);
      if (nextTier === null) return blocked(`Insufficient ${walletType === 'paid' ? 'paid-model' : 'daily free'} credits.`, originalPublicId);
      const next = pickModelForTier(normalizedPlan, nextTier, requestClass);
      if (!next) return blocked('No affordable model found.', originalPublicId);
      currentModel = next;
      fallbackTriggered = true;
      continue;
    }

    const estCost = estimateCreditCost(currentModel, estimatedInputTokens, expectedOutputTokens);

    if (activeWalletCredits < estCost && !isFreeModel) {
      if (!isAutoRequest) return blocked(`Insufficient ${walletType === 'paid' ? 'paid-model balance' : 'daily free credits'} to use this specific model.`, originalPublicId);
      // Downgrade due to exact cost calculation
      const nextTier = getNextDowngradeTier(normalizedPlan, currentModel.costTier ?? 1);
      if (nextTier === null) {
        if (isFreeModel && activeWalletCredits >= MINIMUM_REQUEST_CREDITS) {
          const cheapest = pickModelForTier(normalizedPlan, 1, requestClass);
          if (cheapest) {
            const cheapCost = estimateCreditCost(cheapest, estimatedInputTokens, expectedOutputTokens);
            if (activeWalletCredits >= cheapCost) {
              const reservationId = await reserveCredits(userEmail, userDoc, cheapCost, cheapest.publicId, 'free');
              return {
                resolvedModel: cheapest,
                provider: cheapest.providers[0]?.provider ?? 'openrouter',
                estimatedCostCredits: cheapCost,
                reservationId,
                fallbackTriggered: true,
                originalPublicId,
                blocked: false,
              };
            }
          }
        }

        // If paid credits exhausted, automatically downgrade to best free model
        if (walletType === 'paid') {
          const nextFree = pickModelForTier(normalizedPlan, 2, requestClass);
          if (nextFree) {
            currentModel = nextFree;
            fallbackTriggered = true;
            continue;
          }
        }

        const walletName = walletType === 'paid' ? 'Paid-model balance' : 'Daily Free-model credits';
        return blocked(`${walletName} exhausted.`, originalPublicId);
      }
      
      const next = pickModelForTier(normalizedPlan, nextTier, requestClass);
      if (!next) return blocked('No affordable model after downgrade.', originalPublicId);
      currentModel = next;
      fallbackTriggered = true;
      continue;
    }

    const reservationId = await reserveCredits(userEmail, userDoc, estCost, currentModel.publicId, walletType);
    return {
      resolvedModel: currentModel,
      provider: currentModel.providers[0]?.provider ?? 'openrouter',
      estimatedCostCredits: estCost,
      reservationId,
      fallbackTriggered,
      originalPublicId,
      blocked: false,
      serverPlan: normalizedPlan, // Return the verified plan from DB
    };
  }

  return blocked('Downgrade limit reached. No model resolved.', originalPublicId);
}

/**
 * Settle actual usage after the LLM call completes.
 * Adjusts the reservation to match actual cost and refunds the difference.
 *
 * @param {{
 *   reservationId: string,
 *   userEmail: string,
 *   actualInputTokens: number,
 *   actualOutputTokens: number,
 *   modelUsed: object,
 *   providerUsed: string,
 *   requestClass: string,
 *   plan: string,
 *   requestedPublicId: string,
 *   fallbackTriggered: boolean,
 * }} params
 *
 * @returns {Promise<{ actualCostCredits: number, creditsSettled: number, walletAfter: number }>}
 */
export async function settleBudgetUsage({
  reservationId,
  userEmail,
  actualInputTokens,
  actualOutputTokens,
  modelUsed,
  providerUsed,
  requestClass = 'chat',
  plan = 'free',
  requestedPublicId = '',
  fallbackTriggered = false,
}) {
  const reservation = pendingReservations.get(reservationId);
  if (!reservation) {
    console.warn(`[BudgetRouter] No reservation found for id: ${reservationId}`);
    return { actualCostCredits: 0, creditsSettled: 0, walletAfter: 0 };
  }

  const actualCost = calculateActualCreditCost(
    modelUsed,
    actualInputTokens || reservation.estimatedInputTokens,
    actualOutputTokens || reservation.estimatedOutputTokens
  );

  const reservedCredits = reservation.reservedCredits;
  const overReserved   = Math.max(0, reservedCredits - actualCost);
  const walletType     = reservation.walletType || 'free';

  return queueByKey(userEmail, async () => {
    const userDoc = await getUserCreditsDoc(userEmail);
    if (!userDoc) {
      pendingReservations.delete(reservationId);
      return { actualCostCredits: actualCost, creditsSettled: actualCost, walletAfter: 0 };
    }

    // Current balance already has reservation deducted. Refund the over-reserved amount.
    const fieldName = walletType === 'paid' ? 'paid_credits' : 'credits';
    const currentCredits = Number(userDoc[fieldName] ?? 0);
    const walletAfter    = currentCredits + overReserved;
    const walletBefore   = reservation.walletBefore;

    if (overReserved > 0) {
      await updateUserCredits(userDoc.$id, walletAfter, walletType);
    }

    pendingReservations.delete(reservationId);

    // Log the usage event
    await logUsageEvent({
      userId: userDoc.$id,
      userEmail,
      subscriptionPlan: plan,
      requestClass,
      modelRequested: requestedPublicId,
      modelUsed: modelUsed?.publicId ?? '',
      providerUsed,
      estimatedCost: reservedCredits,
      actualCost,
      creditsReserved: reservedCredits,
      creditsSettled: actualCost,
      walletBefore,
      walletAfter,
      walletUsed: walletType,
      fallbackTriggered,
      status: 'settled',
    });

    return { actualCostCredits: actualCost, creditsSettled: actualCost, walletAfter };
  });
}

/**
 * Full refund of a reservation — call this when the provider fails completely.
 *
 * @param {{ reservationId: string, userEmail: string }} params
 */
export async function refundBudgetReserve({ reservationId, userEmail }) {
  const reservation = pendingReservations.get(reservationId);
  if (!reservation) return;

  return queueByKey(userEmail, async () => {
    const userDoc = await getUserCreditsDoc(userEmail);
    if (!userDoc) {
      pendingReservations.delete(reservationId);
      return;
    }

    const walletType = reservation.walletType || 'free';
    const fieldName = walletType === 'paid' ? 'paid_credits' : 'credits';
    const currentCredits = Number(userDoc[fieldName] ?? 0);
    const refunded = reservation.reservedCredits;
    await updateUserCredits(userDoc.$id, currentCredits + refunded, walletType);

    pendingReservations.delete(reservationId);

    // Log refund
    await logUsageEvent({
      userId: userDoc.$id,
      userEmail,
      subscriptionPlan: '',
      requestClass: '',
      modelRequested: reservation.modelPublicId,
      modelUsed: reservation.modelPublicId,
      providerUsed: '',
      estimatedCost: refunded,
      actualCost: 0,
      creditsReserved: refunded,
      creditsSettled: 0,
      walletBefore: reservation.walletBefore,
      walletAfter: currentCredits + refunded,
      walletUsed: walletType,
      fallbackTriggered: false,
      status: 'refunded',
    });
  });
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function blocked(blockReason, originalPublicId) {
  return {
    resolvedModel: null,
    provider: null,
    estimatedCostCredits: 0,
    reservationId: null,
    fallbackTriggered: false,
    originalPublicId,
    blocked: true,
    blockReason,
  };
}

async function reserveCredits(userEmail, userDoc, amount, modelPublicId, walletType = 'free') {
  const reservationId = `res_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  if (!userDoc) {
    pendingReservations.set(reservationId, {
      userEmail,
      reservedCredits: amount,
      modelPublicId,
      walletBefore: 0,
      walletType,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      timestamp: Date.now(),
    });
    return reservationId;
  }

  const fieldName = walletType === 'paid' ? 'paid_credits' : 'credits';
  const walletBefore = Number(userDoc[fieldName] ?? 0);
  const walletAfter  = Math.max(0, walletBefore - amount);

  await updateUserCredits(userDoc.$id, walletAfter, walletType);

  pendingReservations.set(reservationId, {
    userEmail,
    reservedCredits: amount,
    modelPublicId,
    walletBefore,
    walletType,
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
    timestamp: Date.now(),
  });

  return reservationId;
}

// ── Usage logging ─────────────────────────────────────────────────────────────

/**
 * Log a usage event to both usage_logs (existing) and model_usage_events (new).
 * Silently swallows errors — logging must never break the main flow.
 */
async function logUsageEvent({
  userId,
  userEmail,
  subscriptionPlan,
  requestClass,
  modelRequested,
  modelUsed,
  providerUsed,
  estimatedCost,
  actualCost,
  creditsReserved,
  creditsSettled,
  walletBefore,
  walletAfter,
  walletUsed,
  fallbackTriggered,
  status = 'settled',
}) {
  if (!HAS_APPWRITE_CONFIG) return;

  const now = new Date().toISOString();

  // Write to existing usage_logs collection (backward compat)
  try {
    await databases.createDocument(DB_ID, USAGE_LOGS_COLLECTION_ID, ID.unique(), {
      user_id: userId || '',
      user_email: String(userEmail || '').toLowerCase(),
      operation_type: 'ai_request',
      model: modelUsed || modelRequested || '',
      credits_consumed: Math.round(actualCost),
      credits_remaining: Math.round(walletAfter),
      created_at: now,
    });
  } catch (err) {
    console.warn('[BudgetRouter] Failed to write usage_log:', err?.message);
  }

  // UPSERT to model_usage_events collection (single row per user)
  if (!MODEL_USAGE_EVENTS_COLLECTION_ID || !userId) return;
  try {
    let existingDoc = null;
    try {
      existingDoc = await databases.getDocument(DB_ID, MODEL_USAGE_EVENTS_COLLECTION_ID, userId);
    } catch (e) {
      // Document not found (404)
    }

    const totalEstimatedCost = (existingDoc?.estimated_cost || 0) + Math.round(estimatedCost);
    const totalActualCost = (existingDoc?.actual_cost || 0) + Math.round(actualCost);
    const totalCreditsReserved = (existingDoc?.credits_reserved || 0) + Math.round(creditsReserved);
    const totalCreditsSettled = (existingDoc?.credits_settled || 0) + Math.round(creditsSettled);

    const payload = {
      user_id: userId,
      user_email: String(userEmail || '').toLowerCase(),
      subscription_plan: subscriptionPlan || existingDoc?.subscription_plan || 'free',
      request_class: requestClass || 'chat',
      model_requested: modelRequested || '',
      model_used: modelUsed || '',
      provider_used: providerUsed || '',
      estimated_cost: totalEstimatedCost,
      actual_cost: totalActualCost,
      credits_reserved: totalCreditsReserved,
      credits_settled: totalCreditsSettled,
      wallet_before: Math.round(walletBefore || existingDoc?.wallet_after || 0),
      wallet_after: Math.round(walletAfter),
      wallet_used: walletUsed || 'free',
      fallback_triggered: Boolean(fallbackTriggered),
      status,
      created_at: now,
    };

    if (existingDoc) {
      await databases.updateDocument(DB_ID, MODEL_USAGE_EVENTS_COLLECTION_ID, userId, payload);
    } else {
      await databases.createDocument(DB_ID, MODEL_USAGE_EVENTS_COLLECTION_ID, userId, payload);
    }
  } catch (err) {
    console.warn('[BudgetRouter] Failed to upsert model_usage_event:', err?.message);
  }
}

// ── Monthly credit reset (billing-cycle-aware) ────────────────────────────────

/**
 * Check and reset credits for a single user based on their billing cycle date.
 * Called by the daily Inngest cron.
 *
 * Reset rule:
 *   - If user has a subscription_start_date, reset on that same day-of-month.
 *   - If no subscription_start_date (free plan), reset on the 1st of each month.
 *   - Reset only if last reset was >= 28 days ago (prevents double-reset).
 *
 * @param {object} user – Appwrite user document
 * @returns {{ reset: boolean, reason: string }}
 */
export function shouldResetCredits(user) {
  const now = new Date();
  const today = now.getUTCDate(); // day of month (1-31)

  const lastReset = user.last_monthly_reset
    ? new Date(user.last_monthly_reset)
    : null;

  const daysSinceReset = lastReset
    ? (now - lastReset) / (1000 * 60 * 60 * 24)
    : 999;

  // Never reset if we already reset within the last 28 days
  if (daysSinceReset < 28) {
    return { reset: false, reason: 'reset_too_recent' };
  }

  // Determine reset day
  let resetDay = 1; // default: 1st of month for free users
  if (user.subscription_start_date) {
    const startDate = new Date(user.subscription_start_date);
    resetDay = startDate.getUTCDate();
    // Clamp to 28 to handle months with fewer days
    resetDay = Math.min(resetDay, 28);
  }

  if (today === resetDay) {
    return { reset: true, reason: 'billing_cycle_day' };
  }

  return { reset: false, reason: 'not_reset_day' };
}

/**
 * Get the credit allowance for a plan after reset.
 * @param {string} plan
 * @returns {number}
 */
export function getResetCreditAmount(plan) {
  const planConfig = getPlanConfig(normalizePlan(plan));
  return planConfig.paidCredits ?? 0;
}

/**
 * Reserve credits for artifact creation or document processing.
 *
 * @param {string} userEmail
 * @param {number} estimatedCost
 * @returns {Promise<{ success: boolean, reservationId?: string, walletType?: string, walletAfter?: number }>}
 */
export async function reserveArtifactCredits(userEmail, estimatedCost = 3) {
  if (!userEmail) return { success: true, reservationId: null };

  return queueByKey(userEmail, async () => {
    const userDoc = await getUserCreditsDoc(userEmail);
    if (!userDoc) return { success: true, reservationId: null };

    const freeCredits = Number(userDoc.credits ?? 0);
    const paidCredits = Number(userDoc.paid_credits ?? 0);
    const walletType = freeCredits >= estimatedCost ? 'free' : (paidCredits >= estimatedCost ? 'paid' : null);

    if (!walletType) {
      return { success: false, reservationId: null, error: 'INSUFFICIENT_CREDITS' };
    }

    const fieldName = walletType === 'paid' ? 'paid_credits' : 'credits';
    const currentBal = walletType === 'paid' ? paidCredits : freeCredits;
    const walletAfter = Math.max(0, currentBal - estimatedCost);

    await updateUserCredits(userDoc.$id, walletAfter, walletType);

    const reservationId = `res_art_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    pendingReservations.set(reservationId, {
      userEmail,
      reservedCredits: estimatedCost,
      walletType,
      walletBefore: currentBal,
      timestamp: Date.now(),
    });

    return { success: true, reservationId, walletType, walletAfter };
  });
}

/**
 * Settle credits for completed artifact creation.
 *
 * @param {string} reservationId
 * @param {number} actualCost
 * @param {string} userEmail
 * @returns {Promise<{ actualCostCredits: number, walletAfter: number }>}
 */
export async function settleArtifactCredits(reservationId, actualCost = 3, userEmail = '') {
  const reservation = pendingReservations.get(reservationId);
  if (!reservation) {
    return { actualCostCredits: actualCost, walletAfter: 0 };
  }

  const reservedCredits = reservation.reservedCredits;
  const overReserved = Math.max(0, reservedCredits - actualCost);
  const targetEmail = userEmail || reservation.userEmail;
  const walletType = reservation.walletType || 'free';

  return queueByKey(targetEmail, async () => {
    const userDoc = await getUserCreditsDoc(targetEmail);
    if (!userDoc) {
      pendingReservations.delete(reservationId);
      return { actualCostCredits: actualCost, walletAfter: 0 };
    }

    const fieldName = walletType === 'paid' ? 'paid_credits' : 'credits';
    const currentCredits = Number(userDoc[fieldName] ?? 0);
    const walletAfter = currentCredits + overReserved;

    if (overReserved > 0) {
      await updateUserCredits(userDoc.$id, walletAfter, walletType);
    }

    pendingReservations.delete(reservationId);
    return { actualCostCredits: actualCost, walletAfter };
  });
}
