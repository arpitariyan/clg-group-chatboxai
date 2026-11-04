import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import {
  USERS_COLLECTION_ID,
  SUBSCRIPTIONS_COLLECTION_ID,
  IMAGE_GENERATION_COLLECTION_ID,
  USAGE_LOGS_COLLECTION_ID,
} from '@/services/appwrite-collections';
import { getPlanMonthlyCredits, isMaxPlan, isPaidPlan, normalizePlan } from '@/lib/subscriptionPlans';

const RESEARCH_LIMITS = {
  FREE: { WEEKLY_RESEARCH: 5 },
  PRO: { WEEKLY_RESEARCH: 15 },
  MAX: { WEEKLY_RESEARCH: 25 },
};

const HAS_APPWRITE_CONFIG = Boolean(DB_ID && process.env.APPWRITE_API_KEY);

export function isInternalOperatorEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const cleanEmail = email.toLowerCase().trim();
  const configuredOperators = [
    ...(process.env.INTERNAL_OPERATOR_EMAILS || '').split(','),
    ...(process.env.ADMIN_EMAILS || '').split(','),
    (process.env.PROTECTED_ADMIN_EMAIL || ''),
  ]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return configuredOperators.includes(cleanEmail);
}

// ── In-memory user cache (30s TTL) to prevent redundant Appwrite calls ────────
const _userCache = new Map();
const USER_CACHE_TTL_MS = 30_000;

function getCachedUser(email) {
  const entry = _userCache.get(email);
  if (!entry) return null;
  if (Date.now() - entry.ts > USER_CACHE_TTL_MS) {
    _userCache.delete(email);
    return null;
  }
  return entry.data;
}

function setCachedUser(email, data) {
  _userCache.set(email, { ts: Date.now(), data });
}

// ── Wraps a promise with a timeout to prevent Appwrite hanging indefinitely ───
function withTimeout(promise, ms = 5000, label = 'Appwrite') {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}


function getWeekWindowUtc(date = new Date()) {
  const now = new Date(date);
  const day = now.getUTCDay(); // 0 = Sunday
  const start = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - day,
    0,
    0,
    0,
    0
  ));

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);

  return { start, end };
}

export async function checkUserPlan(userEmail) {
  if (!userEmail) {
    return { isPro: false, isMax: false, plan: 'free', subscription: null, isExpired: false, expiresAt: null };
  }

  if (!HAS_APPWRITE_CONFIG) {
    const isOwner = isInternalOperatorEmail(userEmail);
    return { isPro: isOwner, isMax: false, plan: isOwner ? 'pro' : 'free', subscription: null, isExpired: false, expiresAt: null, credits: 5000, paid_credits: isOwner ? 1000 : 0 };
  }

  try {
    // Check in-memory cache (30s TTL) - prevents redundant Appwrite calls
    let user = getCachedUser(userEmail);
    if (!user) {
      const usersRes = await withTimeout(
        databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
          Query.equal('email', userEmail),
          Query.limit(1),
        ]),
        5000, 'checkUserPlan'
      );
      user = usersRes.documents[0] || null;
      if (user) setCachedUser(userEmail, user);
    }

    if (!user) {
      if (isInternalOperatorEmail(userEmail)) {
        return { isPro: true, isMax: false, plan: 'pro', subscription: null, isExpired: false, expiresAt: null, credits: 5000, paid_credits: 1000 };
      }
      return { isPro: false, isMax: false, plan: 'free', subscription: null, isExpired: false, expiresAt: null, credits: 0, paid_credits: 0 };
    }

    const credits = user.credits ?? 0;
    const paid_credits = user.paid_credits ?? 0;

    let normalizedPlan = normalizePlan(user.plan);
    if (isInternalOperatorEmail(user?.email) && normalizedPlan === 'free') {
      normalizedPlan = 'pro';
    }

    if (isInternalOperatorEmail(user?.email)) {
      return { isPro: true, isMax: normalizedPlan === 'max', plan: normalizedPlan || 'pro', subscription: null, isExpired: false, expiresAt: null, credits, paid_credits };
    }

    if (normalizedPlan !== 'free' && user.subscription_end_date) {
      const now = new Date();
      const expiryDate = new Date(user.subscription_end_date);
      const isExpired = expiryDate <= now;

      if (isExpired) {
        if (isInternalOperatorEmail(user?.email)) {
          return {
            isPro: true,
            isMax: false,
            plan: 'pro',
            subscription: null,
            isExpired: false,
            expiresAt: null,
            credits,
            paid_credits,
          };
        }
        return {
          isPro: false,
          isMax: false,
          plan: 'free',
          subscription: null,
          isExpired: true,
          expiresAt: user.subscription_end_date,
          credits,
          paid_credits,
        };
      }

      return {
        isPro: true,
        isMax: normalizedPlan === 'max',
        plan: normalizedPlan,
        subscription: {
          start_date: user.subscription_start_date,
          end_date: user.subscription_end_date,
        },
        isExpired: false,
        expiresAt: user.subscription_end_date,
        credits,
        paid_credits,
      };
    }

    let subscription = null;
    try {
      const subRes = await databases.listDocuments(DB_ID, SUBSCRIPTIONS_COLLECTION_ID, [
        Query.equal('user_email', userEmail),
        Query.equal('status', 'active'),
        Query.orderDesc('created_at'),
        Query.limit(1),
      ]);
      subscription = subRes.documents[0] || null;
    } catch (_) {
      subscription = null;
    }

    if (subscription && subscription.status === 'active') {
      const subscriptionPlan = normalizePlan(subscription.plan_type || user.plan || 'pro');
      return {
        isPro: true,
        isMax: subscriptionPlan === 'max',
        plan: subscriptionPlan,
        subscription,
        isExpired: false,
        expiresAt: user.subscription_end_date,
        credits,
        paid_credits,
      };
    }

    return {
      isPro: isPaidPlan(user?.plan) || isInternalOperatorEmail(userEmail),
      isMax: isMaxPlan(user?.plan),
      plan: isInternalOperatorEmail(userEmail) ? 'pro' : normalizePlan(user?.plan),
      subscription: null,
      isExpired: false,
      expiresAt: user.subscription_end_date,
      credits,
      paid_credits,
    };
  } catch (error) {
    const isPermanentAccount = isInternalOperatorEmail(userEmail);
    console.error('Error in checkUserPlan:', error?.message || error);
    return {
      isPro: isPermanentAccount,
      isMax: false,
      plan: isPermanentAccount ? 'pro' : 'free',
      subscription: null,
      isExpired: false,
      expiresAt: null,
      credits: 0,
      paid_credits: 0,
    };
  }
}

export async function getDailyImageCount(userEmail) {
  if (!userEmail) return 0;

  if (!HAS_APPWRITE_CONFIG) return 0;

  try {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const res = await databases.listDocuments(DB_ID, IMAGE_GENERATION_COLLECTION_ID, [
      Query.equal('userEmail', userEmail),
      Query.greaterThanEqual('$createdAt', startOfDay.toISOString()),
      Query.lessThanEqual('$createdAt', endOfDay.toISOString()),
      Query.equal('status', ['completed', 'generating']),
    ]);

    return res.total || 0;
  } catch (error) {
    console.error('Error in getDailyImageCount:', error?.message || error);
    return 0;
  }
}

export async function checkImageGenerationLimit(userEmail) {
  try {
    if (!userEmail) {
      return {
        canGenerate: false,
        dailyCount: 0,
        dailyLimit: 10,
        remainingImages: 0,
        plan: 'free',
        message: 'User email is required to check image generation limits.',
      };
    }

    const [planInfo, dailyCount] = await Promise.all([
      checkUserPlan(userEmail),
      getDailyImageCount(userEmail),
    ]);

    const { isPro, isMax, plan, isExpired, expiresAt } = planInfo;
    const normalized = normalizePlan(plan);
    const isPaid = (isPro || isMax || normalized === 'pro' || normalized === 'max') && !isExpired;

    if (isExpired) {
      const freeLimit = 10;
      const remaining = Math.max(0, freeLimit - dailyCount);
      return {
        canGenerate: dailyCount < freeLimit,
        dailyCount,
        dailyLimit: freeLimit,
        remainingImages: remaining,
        plan: 'free',
        message: `Your ${normalized === 'max' ? 'Max' : 'Pro'} subscription expired on ${new Date(expiresAt).toLocaleDateString()}. You now have free plan limits: ${remaining} images remaining today.`,
      };
    }

    if (isPaid) {
      return {
        canGenerate: true,
        dailyCount,
        dailyLimit: -1,
        remainingImages: -1,
        plan: normalized,
        message: `Unlimited image generation available with ${normalized === 'max' ? 'Max' : 'Pro'} plan`,
      };
    }

    const freeLimit = 10;
    const canGenerate = dailyCount < freeLimit;
    const remaining = Math.max(0, freeLimit - dailyCount);

    return {
      canGenerate,
      dailyCount,
      dailyLimit: freeLimit,
      remainingImages: remaining,
      plan: normalized || 'free',
      message: canGenerate
        ? `${remaining} images remaining today (Free plan)`
        : `Daily limit of ${freeLimit} images reached. Upgrade to Pro for unlimited generation.`,
    };
  } catch (error) {
    console.error('Error in checkImageGenerationLimit:', error?.message || error);
    return {
      canGenerate: false,
      dailyCount: 0,
      dailyLimit: 10,
      remainingImages: 0,
      plan: 'free',
      message: 'Error checking image generation limits. Please try again.',
    };
  }
}

export async function getWeeklyResearchCount(userEmail) {
  if (!userEmail) return 0;

  if (!HAS_APPWRITE_CONFIG) return 0;

  try {
    const userRes = await withTimeout(databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', userEmail),
      Query.limit(1),
    ]), 3000, 'getWeeklyResearchCount');
    const user = userRes.documents[0];

    if (!user?.$id) return 0;

    const { start: startOfWeek, end: endOfWeek } = getWeekWindowUtc();

    const baseFilters = [
      Query.equal('operation_type', 'research'),
      Query.greaterThanEqual('$createdAt', startOfWeek.toISOString()),
      Query.lessThanEqual('$createdAt', endOfWeek.toISOString()),
    ];

    try {
      const byUserId = await withTimeout(databases.listDocuments(DB_ID, USAGE_LOGS_COLLECTION_ID, [
        Query.equal('user_id', user.$id),
        ...baseFilters,
      ]), 3000);
      return byUserId.total || 0;
    } catch (userIdError) {
      if (!String(userIdError?.message || '').includes('Attribute not found in schema')) {
        throw userIdError;
      }
    }

    const byUserEmail = await withTimeout(databases.listDocuments(DB_ID, USAGE_LOGS_COLLECTION_ID, [
      Query.equal('user_email', userEmail),
      ...baseFilters,
    ]), 3000);

    return byUserEmail.total || 0;
  } catch (error) {
    console.error('Error in getWeeklyResearchCount:', error?.message || error);
    return 0;
  }
}

// Backward-compatible alias
export async function getMonthlyResearchCount(userEmail) {
  return getWeeklyResearchCount(userEmail);
}

export async function checkResearchLimit(userEmail) {
  try {
    if (!userEmail) {
      return {
        canResearch: false,
        weeklyCount: 0,
        weeklyLimit: RESEARCH_LIMITS.FREE.WEEKLY_RESEARCH,
        monthlyCount: 0,
        monthlyLimit: RESEARCH_LIMITS.FREE.WEEKLY_RESEARCH,
        remaining: 0,
        plan: 'free',
        message: 'User email is required to check research limits.',
      };
    }

    const [planInfo, weeklyCount] = await Promise.all([
      checkUserPlan(userEmail),
      getWeeklyResearchCount(userEmail),
    ]);

    const normalizedPlan = normalizePlan(planInfo?.plan);

    if (isInternalOperatorEmail(userEmail)) {
      return {
        canResearch: true,
        weeklyCount,
        weeklyLimit: -1,
        monthlyCount: weeklyCount,
        monthlyLimit: -1,
        remaining: -1,
        plan: 'pro',
        message: 'Unlimited Research available (Special Account)',
      };
    }

    const planLimit = normalizedPlan === 'max'
      ? RESEARCH_LIMITS.MAX.WEEKLY_RESEARCH
      : normalizedPlan === 'pro'
      ? RESEARCH_LIMITS.PRO.WEEKLY_RESEARCH
      : RESEARCH_LIMITS.FREE.WEEKLY_RESEARCH;

    const canResearch = weeklyCount < planLimit;
    const remaining = Math.max(0, planLimit - weeklyCount);

    return {
      canResearch,
      weeklyCount,
      weeklyLimit: planLimit,
      monthlyCount: weeklyCount,
      monthlyLimit: planLimit,
      remaining,
      plan: normalizedPlan,
      message: canResearch
        ? `${remaining} Deep Research uses remaining this week (${normalizedPlan.toUpperCase()} plan)`
        : `Weekly limit of ${planLimit} Deep Research uses reached for ${normalizedPlan.toUpperCase()} plan. Resets on Sunday.`,
    };
  } catch (error) {
    console.error('Error in checkResearchLimit:', error?.message || error);
    return {
      canResearch: false,
      weeklyCount: 0,
      weeklyLimit: RESEARCH_LIMITS.FREE.WEEKLY_RESEARCH,
      monthlyCount: 0,
      monthlyLimit: RESEARCH_LIMITS.FREE.WEEKLY_RESEARCH,
      remaining: 0,
      plan: 'free',
      message: 'Error checking research limits. Please try again.',
    };
  }
}

export async function getSubscriptionDetails(userEmail) {
  if (!userEmail) {
    return {
      hasSubscription: false,
      isActive: false,
      startDate: null,
      endDate: null,
      daysRemaining: null,
    };
  }

  if (!HAS_APPWRITE_CONFIG) {
    if (isInternalOperatorEmail(userEmail)) {
      return {
        hasSubscription: false,
        isActive: true,
        startDate: null,
        endDate: null,
        daysRemaining: null,
      };
    }
    return {
      hasSubscription: false,
      isActive: false,
      startDate: null,
      endDate: null,
      daysRemaining: null,
    };
  }

  try {
    // Check in-memory cache (30s TTL) - prevents redundant Appwrite calls
    let user = getCachedUser(userEmail);
    if (!user) {
      const usersRes = await withTimeout(
        databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
          Query.equal('email', userEmail),
          Query.limit(1),
        ]),
        5000, 'checkUserPlan'
      );
      user = usersRes.documents[0] || null;
      if (user) setCachedUser(userEmail, user);
    }

    if (!user) {
      if (isInternalOperatorEmail(userEmail)) {
        return {
          hasSubscription: false,
          isActive: true,
          startDate: null,
          endDate: null,
          daysRemaining: null,
        };
      }
      return {
        hasSubscription: false,
        isActive: false,
        startDate: null,
        endDate: null,
        daysRemaining: null,
      };
    }

    const hasSubscription = !!(user.subscription_start_date && user.subscription_end_date);
    if (!hasSubscription) {
      return {
        hasSubscription: false,
        isActive: isInternalOperatorEmail(userEmail) ? true : isPaidPlan(user.plan),
        startDate: null,
        endDate: null,
        daysRemaining: null,
      };
    }

    const now = new Date();
    const endDate = new Date(user.subscription_end_date);
    const isActive = (endDate > now && isPaidPlan(user.plan)) || isInternalOperatorEmail(userEmail);
    const daysRemaining = endDate > now ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0;

    return {
      hasSubscription: true,
      isActive,
      startDate: user.subscription_start_date,
      endDate: user.subscription_end_date,
      daysRemaining,
    };
  } catch (error) {
    console.error('Error in getSubscriptionDetails:', error?.message || error);
    return {
      hasSubscription: false,
      isActive: isInternalOperatorEmail(userEmail),
      startDate: null,
      endDate: null,
      daysRemaining: null,
    };
  }
}

export async function getSubscriptionStatusMessage(userEmail) {
  try {
    const planInfo = await checkUserPlan(userEmail);
    const subscriptionDetails = await getSubscriptionDetails(userEmail);

    if (planInfo.isExpired) {
      if (isInternalOperatorEmail(userEmail)) {
        return 'Pro Plan (Permanent Account)';
      }
      return `${planInfo.isMax ? 'Max' : 'Pro'} Plan (Expired on ${new Date(planInfo.expiresAt).toLocaleDateString()})`;
    }

    if (planInfo.isPro) {
      if (subscriptionDetails.hasSubscription && subscriptionDetails.isActive) {
        const daysRemaining = subscriptionDetails.daysRemaining;
        const planLabel = planInfo.isMax ? 'Max Plan' : 'Pro Plan';
        if (daysRemaining > 7) return `${planLabel} (${daysRemaining} days remaining)`;
        if (daysRemaining > 0) return `${planLabel} (⚠️ Expires in ${daysRemaining} days)`;
        return `${planLabel} (Expires today!)`;
      }
      return `${planInfo.isMax ? 'Max' : 'Pro'} Plan (Permanent Account)`;
    }

    if (isInternalOperatorEmail(userEmail)) {
      return 'Pro Plan (Permanent Account)';
    }

    return 'Free Plan';
  } catch (error) {
    console.error('Error getting subscription status message:', error?.message || error);
    return isInternalOperatorEmail(userEmail) ? 'Pro Plan (Permanent Account)' : 'Free Plan';
  }
}
