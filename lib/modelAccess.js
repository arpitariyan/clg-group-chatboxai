import { getPlanAnnualPrice, getPlanDisplayName, getPlanMonthlyCredits, getPlanMonthlyPrice, isPaidPlan, getPlanMaxCostTier } from '@/lib/subscriptionPlans';

// Model access configuration for Free, Pro and Max plans
// Now uses accessTier from MODEL_REGISTRY for precise gating
export const MODEL_ACCESS = {
  free: 'accessTier:free',
  pro: 'all-except-max',
  max: 'all',
};

// Plan limits and features
export const PLAN_FEATURES = {
  free: {
    monthlyCredits: getPlanMonthlyCredits('free'),
    monthlyPrice: getPlanMonthlyPrice('free'),
    annualPrice: getPlanAnnualPrice('free'),
    dailyLimit: false,
    maxCostTier: getPlanMaxCostTier('free'),
    modelAccess: MODEL_ACCESS.free,
    features: [
      '5,000 Daily Credits for Free Models',
      'Access to Free-tier models (Llama 3, Gemini Flash, etc.)',
      'Premium & Paid-models are locked',
      'Free credits reset daily at midnight UTC',
      'Standard support',
    ],
  },
  pro: {
    monthlyCredits: getPlanMonthlyCredits('pro'),
    monthlyPrice: getPlanMonthlyPrice('pro'),
    annualPrice: getPlanAnnualPrice('pro'),
    dailyLimit: false,
    maxCostTier: getPlanMaxCostTier('pro'),
    modelAccess: MODEL_ACCESS.pro,
    features: [
      '30,000 Paid Credits Monthly',
      'Access to ALL models (including GPT-4, Claude 3.5, & Max-tier)',
      'Uninterrupted Access: Seamless switch to Free models if paid balance is exhausted',
      'Paid credits recharge monthly on your billing date',
      'Unlimited image generation & priority support',
    ],
  },
  max: {
    monthlyCredits: getPlanMonthlyCredits('max'),
    monthlyPrice: getPlanMonthlyPrice('max'),
    annualPrice: getPlanAnnualPrice('max'),
    dailyLimit: false,
    maxCostTier: getPlanMaxCostTier('max'),
    modelAccess: MODEL_ACCESS.max,
    features: [
      '150,000 Paid Credits Monthly',
      'Access to ALL models (including Claude 3 Opus & GPT-5)',
      'Uninterrupted Access: Seamless switch to Free models if paid balance is exhausted',
      'Paid credits recharge monthly on your billing date',
      'Unlimited image generation & maximum speed limits',
    ],
  }
};

/**
 * Check if user plan can access a model.
 * Access rules:
 *   Free → accessTier:'free' models only
 *   Pro  → ALL models (Max-tier models cost more credits but are not blocked)
 *   Max  → ALL models
 *
 * @param {object|string} model – Model object with accessTier / isPro fields
 * @param {string} userPlan     – 'free' | 'pro' | 'max'
 * @returns {boolean}
 */
export const canAccessModel = (model, userPlan = 'free', paidCredits = null) => {
  // Defensive check for swapped parameters (e.g. canAccessModel(userPlan, model))
  let actualModel = model;
  let actualPlan = userPlan;
  let actualCredits = paidCredits;

  if (typeof model === 'string' && typeof userPlan === 'object') {
    actualModel = userPlan;
    actualPlan = model;
  }

  if (actualCredits !== null && Number(actualCredits) > 0) return true;

  const plan = String(actualPlan || 'free').toLowerCase();

  // Pro and Max can access all models
  if (plan === 'pro' || plan === 'max') return true;

  // Free: check accessTier first, then fall back to isPro
  const accessTier = actualModel?.accessTier;
  if (accessTier) return accessTier === 'free';
  return !(actualModel?.isPro);
};

/**
 * Get operation cost for a model based on plan.
 * Dynamic cost is computed in budget-router/model-cost-tiers.
 * This returns a simple per-request estimate for UI display only.
 *
 * @param {string} userPlan
 * @param {number|null} costTier – model's costTier (1–5)
 * @returns {number} estimated credits per typical request
 */
export const getOperationCost = (userPlan = 'free', costTier = null) => {
  const TIER_ESTIMATE = { 1: 2, 2: 5, 3: 15, 4: 50, 5: 200 };
  if (costTier && TIER_ESTIMATE[costTier]) return TIER_ESTIMATE[costTier];
  return userPlan === 'free' ? 5 : 15;
};