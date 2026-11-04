/**
 * ChatboxAI — Model Cost Tiers
 * ════════════════════════════
 * Defines cost tiers, credit calculation formula, and downgrade ladder.
 *
 * Credit formula:
 *   1 Credit = ₹0.01
 *   1 USD    = 83 INR  →  1 USD = 8,300 credits
 *
 * For models with USD pricing:
 *   credits = (inputTokens/1000 × inputUSD + outputTokens/1000 × outputUSD) × USD_TO_CREDITS
 *
 * For models with zero pricing (free OpenRouter :free models):
 *   credits = MINIMUM_REQUEST_CREDITS (= 2)
 *   This covers infrastructure overhead and prevents "free" from meaning costless.
 */

import { MODEL_REGISTRY } from '@/lib/models-registry';
import { normalizePlan } from '@/lib/subscriptionPlans';

// ── Credit conversion constants ───────────────────────────────────────────────
/** Exchange rate: how many INR per USD */
export const USD_TO_INR = 83;

/** How many credits per INR  (1 credit = ₹0.01  →  100 credits per ₹1) */
export const INR_TO_CREDITS = 100;

/** Derived: credits per USD  (83 × 100 = 8,300) */
export const USD_TO_CREDITS = USD_TO_INR * INR_TO_CREDITS;

/**
 * Minimum credits charged per request, even for free models.
 * Covers API call overhead, rate-limit slot cost, and infrastructure.
 */
export const MINIMUM_REQUEST_CREDITS = 2;

/**
 * Default token assumptions used when actual token counts are unavailable
 * (i.e., during pre-call estimation).
 */
export const DEFAULT_ESTIMATED_INPUT_TOKENS = 800;
export const DEFAULT_ESTIMATED_OUTPUT_TOKENS = 500;

// ── Cost tier definitions ─────────────────────────────────────────────────────
export const COST_TIERS = {
  ULTRA_CHEAP: 1,
  CHEAP: 2,
  BALANCED: 3,
  PREMIUM: 4,
  ULTRA_PREMIUM: 5,
};

// ── Per-tier flat credit costs (used as floor/estimate when pricing is 0) ─────
// These kick in for free OpenRouter models where USD pricing is 0.
export const TIER_FLAT_CREDITS = {
  1: 2,    // ultra-cheap: 2 credits minimum
  2: 5,    // cheap: 5 credits
  3: 12,   // balanced: 12 credits
  4: 50,   // premium: 50 credits
  5: 200,  // ultra-premium: 200 credits
};

// ── Max cost tier accessible per plan ────────────────────────────────────────
// Pro can now access all tiers — credits are the control mechanism, not access gates.
export const PLAN_MAX_TIER = {
  free: 2,
  pro: 5,   // Pro accesses ALL tiers; expensive models just cost more credits
  max: 5,
};

// ── Downgrade ladder per plan ─────────────────────────────────────────────────
/**
 * When the selected model tier is too expensive, step down through these tiers.
 * Each entry is the next cheaper tier to try.
 */
export const DOWNGRADE_LADDER = {
  free: [2, 1],
  pro:  [4, 3, 2, 1],
  max:  [5, 4, 3, 2, 1],
};

// ── Credit calculation ────────────────────────────────────────────────────────

/**
 * Estimate the credit cost of a single LLM request.
 *
 * @param {object} model       – Model object from MODEL_REGISTRY (has .pricing, .costTier)
 * @param {number} inputTokens  – Estimated or actual input tokens
 * @param {number} outputTokens – Estimated or actual output tokens
 * @returns {number} Credits to charge (always >= MINIMUM_REQUEST_CREDITS)
 */
export function estimateCreditCost(model, inputTokens, outputTokens) {
  if (!model) return MINIMUM_REQUEST_CREDITS;

  const inTok  = Math.max(0, Number(inputTokens)  || DEFAULT_ESTIMATED_INPUT_TOKENS);
  const outTok = Math.max(0, Number(outputTokens) || DEFAULT_ESTIMATED_OUTPUT_TOKENS);

  const inputPriceUSD  = Number(model.pricing?.input  ?? 0);
  const outputPriceUSD = Number(model.pricing?.output ?? 0);

  // If the model has real USD pricing → dynamic calculation
  if (inputPriceUSD > 0 || outputPriceUSD > 0) {
    const costUSD = (inTok / 1000) * inputPriceUSD + (outTok / 1000) * outputPriceUSD;
    const credits = Math.ceil(costUSD * USD_TO_CREDITS);
    return Math.max(MINIMUM_REQUEST_CREDITS, credits);
  }

  // No USD pricing → use tier-based flat credits (always >= MINIMUM_REQUEST_CREDITS)
  const tier = Number(model.costTier ?? 1);
  return TIER_FLAT_CREDITS[tier] ?? MINIMUM_REQUEST_CREDITS;
}

/**
 * Calculate actual credit cost from real token usage (called after the request).
 * Identical formula to estimateCreditCost but uses actual token counts.
 *
 * @param {object} model
 * @param {number} actualInputTokens
 * @param {number} actualOutputTokens
 * @returns {number}
 */
export function calculateActualCreditCost(model, actualInputTokens, actualOutputTokens) {
  return estimateCreditCost(model, actualInputTokens, actualOutputTokens);
}

// ── Model lookup helpers ──────────────────────────────────────────────────────

/**
 * Get a model's cost tier from its publicId.
 * @param {string} publicId
 * @returns {number} 1–5
 */
export function getModelCostTier(publicId) {
  const model = MODEL_REGISTRY.find(m => m.publicId === publicId);
  return model?.costTier ?? 1;
}

/**
 * Get a model's accessTier from its publicId.
 * @param {string} publicId
 * @returns {'free'|'pro'|'max'}
 */
export function getModelAccessTier(publicId) {
  const model = MODEL_REGISTRY.find(m => m.publicId === publicId);
  return model?.accessTier ?? 'free';
}

// ── Downgrade selection ───────────────────────────────────────────────────────

/**
 * Given a failed model tier, return the next cheaper tier the plan allows.
 * Returns null if no more tiers are available (hard block).
 *
 * @param {'free'|'pro'|'max'} plan
 * @param {number} failedTier – The tier that was too expensive or failed
 * @returns {number|null}
 */
export function getNextDowngradeTier(plan, failedTier) {
  const normalizedPlan = normalizePlan(plan);
  const ladder = DOWNGRADE_LADDER[normalizedPlan] ?? DOWNGRADE_LADDER.free;
  const idx = ladder.indexOf(failedTier);
  if (idx === -1) {
    // Not in ladder — try the first tier below failed tier
    return ladder.find(t => t < failedTier) ?? null;
  }
  return ladder[idx + 1] ?? null;
}

/**
 * Pick the best available model at or below a target cost tier for a given plan,
 * optionally biased toward a specific request class.
 *
 * @param {'free'|'pro'|'max'} plan
 * @param {number} maxTier
 * @param {'chat'|'coding'|'research'|'long-context'|'file-analysis'} requestClass
 * @returns {object|null} Model from MODEL_REGISTRY or null
 */
export function pickModelForTier(plan, maxTier, requestClass = 'chat') {
  const normalizedPlan = normalizePlan(plan);
  const planMaxTier = PLAN_MAX_TIER[normalizedPlan] ?? 2;
  const effectiveMaxTier = Math.min(maxTier, planMaxTier);

  // Filter models accessible for plan + within cost tier
  const candidates = MODEL_REGISTRY.filter(m => {
    if (m.publicId === 'auto') return false;
    if ((m.costTier ?? 1) > effectiveMaxTier) return false;

    // Access tier gate:
    //   Free  → only accessTier: 'free' models
    //   Pro   → ALL models (credit cost is the gate, not access)
    //   Max   → ALL models
    const mt = m.accessTier ?? 'free';
    if (normalizedPlan === 'free' && mt !== 'free') return false;
    return true;
  });

  if (candidates.length === 0) return null;

  // Bias toward certain providers for each request class
  const providerBias = {
    coding:       ['groq', 'openrouter', 'google'],
    research:     ['google', 'groq', 'openrouter'],
    'long-context': ['google', 'openrouter'],
    'file-analysis': ['google', 'openrouter'],
    chat:         ['groq', 'google', 'openrouter'],
  };

  const biasOrder = providerBias[requestClass] ?? providerBias.chat;

  // Sort: prefer biased provider, then by descending costTier (better model within budget)
  const sorted = [...candidates].sort((a, b) => {
    const ap = a.providers[0]?.provider ?? 'unknown';
    const bp = b.providers[0]?.provider ?? 'unknown';
    const ai = biasOrder.indexOf(ap);
    const bi = biasOrder.indexOf(bp);
    const aBias = ai === -1 ? 99 : ai;
    const bBias = bi === -1 ? 99 : bi;
    if (aBias !== bBias) return aBias - bBias;
    return (b.costTier ?? 1) - (a.costTier ?? 1);
  });

  return sorted[0] ?? null;
}
