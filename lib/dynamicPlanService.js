import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { PRICING_PLANS_COLLECTION_ID } from '@/services/appwrite-collections';

export const DEFAULT_PLANS = {
  free: {
    plan_id: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    monthly_price: 0,
    annual_price: 0,
    original_monthly_price: 0,
    original_annual_price: 0,
    discount_badge: '',
    badge_text: 'Current',
    is_popular: false,
    daily_credits: 5000,
    monthly_paid_credits: 0,
    features: [
      '5,000 Daily Credits for Free Models',
      'Access to Free-tier models (Llama 3, Gemini Flash, etc.)',
      'Premium & Paid-models are locked',
      'Free credits reset daily at midnight UTC',
      'Standard support',
    ],
    button_text: 'Current Plan',
    is_active: true,
  },
  pro: {
    plan_id: 'pro',
    name: 'Pro',
    description: 'Full power for creators and teams',
    monthly_price: 499,
    annual_price: 4990,
    original_monthly_price: 999,
    original_annual_price: 9990,
    discount_badge: '50% OFF',
    badge_text: 'POPULAR',
    is_popular: true,
    daily_credits: 5000,
    monthly_paid_credits: 30000,
    features: [
      '30,000 Paid Credits Monthly',
      'Access to ALL models (including GPT 4, Claude 3.5, & Max-tier)',
      'Uninterrupted Access: Seamless switch to Free models if paid balance is exhausted',
      'Paid credits recharge monthly on your billing date',
      'Unlimited image generation & priority support',
    ],
    button_text: 'Choose Pro',
    is_active: true,
  },
  max: {
    plan_id: 'max',
    name: 'Max',
    description: 'Highest limits for power users',
    monthly_price: 1999,
    annual_price: 19990,
    original_monthly_price: 2999,
    original_annual_price: 29990,
    discount_badge: '',
    badge_text: '',
    is_popular: false,
    daily_credits: 5000,
    monthly_paid_credits: 150000,
    features: [
      '150,000 Paid Credits Monthly',
      'Access to ALL models (including Claude 3 Opus & GPT-5)',
      'Uninterrupted Access: Seamless switch to Free models if paid balance is exhausted',
      'Paid credits recharge monthly on your billing date',
      'Unlimited image generation & maximum speed limits',
    ],
    button_text: 'Choose Max',
    is_active: true,
  },
};

export function normalizePlanDocument(doc) {
  if (!doc) return null;
  const pid = String(doc.plan_id || '').toLowerCase();
  const fallback = DEFAULT_PLANS[pid] || {};

  let parsedFeatures = null;
  if (Array.isArray(doc.features)) {
    parsedFeatures = doc.features;
  } else if (typeof doc.features === 'string' && doc.features.trim()) {
    try {
      const parsed = JSON.parse(doc.features);
      if (Array.isArray(parsed)) {
        parsedFeatures = parsed;
      } else {
        parsedFeatures = [String(doc.features)];
      }
    } catch {
      parsedFeatures = [String(doc.features)];
    }
  }

  if (!parsedFeatures || !parsedFeatures.length) {
    parsedFeatures = fallback.features || [];
  }

  return {
    $id: doc.$id || '',
    plan_id: pid || 'custom',
    name: doc.name || fallback.name || pid,
    description: doc.description || fallback.description || '',
    monthly_price: (() => {
      const p = Number(doc.monthly_price ?? fallback.monthly_price ?? 0);
      return ((pid === 'pro' || pid === 'max') && p <= 0) ? (fallback.monthly_price || 499) : p;
    })(),
    annual_price: (() => {
      const p = Number(doc.annual_price ?? fallback.annual_price ?? 0);
      return ((pid === 'pro' || pid === 'max') && p <= 0) ? (fallback.annual_price || 4990) : p;
    })(),
    original_monthly_price: Number(doc.original_monthly_price ?? fallback.original_monthly_price ?? 0),
    original_annual_price: Number(doc.original_annual_price ?? fallback.original_annual_price ?? 0),
    discount_badge: doc.discount_badge || '',
    badge_text: doc.badge_text || '',
    is_popular: Boolean(doc.is_popular),
    daily_credits: Number(doc.daily_credits ?? fallback.daily_credits ?? 5000),
    monthly_paid_credits: Number(doc.monthly_paid_credits ?? fallback.monthly_paid_credits ?? 0),
    features: parsedFeatures,
    button_text: doc.button_text || fallback.button_text || 'Select Plan',
    is_active: doc.is_active !== undefined ? Boolean(doc.is_active) : true,
    updated_at: doc.updated_at || doc.$updatedAt || new Date().toISOString(),
  };
}

// 3-second memory cache for fast sub-second response while honoring 2-5 sec live admin sync
let cachedPlans = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 3000;

export async function getDynamicPlans(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedPlans && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedPlans;
  }

  try {
    const res = await databases.listDocuments(DB_ID, PRICING_PLANS_COLLECTION_ID, [
      Query.limit(10),
    ]);

    if (!res.documents || res.documents.length === 0) {
      cachedPlans = Object.values(DEFAULT_PLANS);
      lastFetchTime = now;
      return cachedPlans;
    }

    const plansMap = { ...DEFAULT_PLANS };

    for (const doc of res.documents) {
      const pid = String(doc.plan_id || '').toLowerCase();
      if (!pid) continue;
      plansMap[pid] = normalizePlanDocument(doc);
    }

    cachedPlans = ['free', 'pro', 'max'].map((k) => plansMap[k]).filter(Boolean);
    lastFetchTime = now;
    return cachedPlans;
  } catch (err) {
    console.warn('[dynamicPlanService] Failed reading pricing_plans collection, falling back to cached/default:', err.message);
    if (!cachedPlans) {
      cachedPlans = Object.values(DEFAULT_PLANS);
    }
    return cachedPlans;
  }
}

export async function getDynamicPlanConfig(planKey = 'free') {
  const plans = await getDynamicPlans();
  const normalized = String(planKey || 'free').toLowerCase();
  return plans.find((p) => p.plan_id === normalized) || DEFAULT_PLANS[normalized] || DEFAULT_PLANS.free;
}

export async function getDynamicPlanPrice(planKey = 'pro', billingCycle = 'monthly') {
  const config = await getDynamicPlanConfig(planKey);
  if (billingCycle === 'annual') {
    return config.annual_price ?? (config.monthly_price * 10);
  }
  return config.monthly_price ?? 0;
}

export async function getDynamicPlanPaidCredits(planKey = 'pro') {
  const config = await getDynamicPlanConfig(planKey);
  return config.monthly_paid_credits ?? (planKey === 'max' ? 150000 : planKey === 'pro' ? 30000 : 0);
}

export async function getDynamicPlanDailyCredits(planKey = 'free') {
  const config = await getDynamicPlanConfig(planKey);
  return config.daily_credits ?? 5000;
}
