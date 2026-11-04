export const SUBSCRIPTION_PLANS = {
  free: {
    key: 'free',
    displayName: 'Free Plan',
    monthlyPrice: 0,
    annualPrice: 0,
    dailyCredits: 5000,
    paidCredits: 0,
    dailyImageLimit: 10,
    researchLimit: 5,
    tokenUsageFactor: 1,
    // Budget router config
    maxCostTier: 2,
  },
  pro: {
    key: 'pro',
    displayName: 'Pro Plan',
    monthlyPrice: 499,
    annualPrice: 4990,
    dailyCredits: 5000,
    paidCredits: 30000, // ₹300 ceiling (1 credit = ₹0.01)
    dailyImageLimit: -1,
    researchLimit: 15,
    tokenUsageFactor: 0.5,
    // Budget router config
    maxCostTier: 5,
  },
  max: {
    key: 'max',
    displayName: 'Max Plan',
    monthlyPrice: 1999,
    annualPrice: 19990,
    dailyCredits: 5000,
    paidCredits: 150000, // ₹1500 ceiling
    dailyImageLimit: -1,
    researchLimit: 25,
    tokenUsageFactor: 1,
    // Budget router config
    maxCostTier: 5,
  },
};

export const PLAN_ORDER = ['free', 'pro', 'max'];

export function normalizePlan(plan = 'free') {
  const normalized = String(plan || 'free').toLowerCase();
  return SUBSCRIPTION_PLANS[normalized] ? normalized : 'free';
}

export function getPlanConfig(plan = 'free') {
  return SUBSCRIPTION_PLANS[normalizePlan(plan)] || SUBSCRIPTION_PLANS.free;
}

export function getPlanDisplayName(plan = 'free') {
  return getPlanConfig(plan).displayName;
}

export function getPlanDailyCredits(plan = 'free') {
  return getPlanConfig(plan).dailyCredits || 5000;
}

export function getPlanPaidCredits(plan = 'free') {
  return getPlanConfig(plan).paidCredits || 0;
}

// Legacy function for backward compatibility
export function getPlanMonthlyCredits(plan = 'free') {
  return getPlanConfig(plan).paidCredits > 0 ? getPlanConfig(plan).paidCredits : getPlanConfig(plan).dailyCredits;
}

export function getPlanMonthlyPrice(plan = 'free') {
  return getPlanConfig(plan).monthlyPrice;
}

export function getPlanAnnualPrice(plan = 'free') {
  return getPlanConfig(plan).annualPrice;
}

export function getPlanTokenUsageFactor(plan = 'free') {
  return getPlanConfig(plan).tokenUsageFactor;
}

export function isPaidPlan(plan = 'free') {
  return normalizePlan(plan) !== 'free';
}

export function isMaxPlan(plan = 'free') {
  return normalizePlan(plan) === 'max';
}

/** Get the max cost tier (1-5) allowed for a given plan */
export function getPlanMaxCostTier(plan = 'free') {
  return getPlanConfig(plan).maxCostTier ?? 2;
}

/** Get the monthly spend ceiling in credits for a given plan */
export function getPlanSpendCeiling(plan = 'free') {
  return getPlanConfig(plan).spendCeilingCredits ?? 0;
}

/** Get the budget bucket config for a given plan */
export function getPlanBudgetBuckets(plan = 'free') {
  const config = getPlanConfig(plan);
  return {
    includedCredits: config.includedCredits ?? config.monthlyCredits,
    premiumReserve: config.premiumReserve ?? 0,
    fallbackReserve: config.fallbackReserve ?? config.monthlyCredits,
    safetyReserve: config.safetyReserve ?? 0,
  };
}
