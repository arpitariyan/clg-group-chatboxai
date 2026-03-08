import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import {
  USERS_COLLECTION_ID,
  SUBSCRIPTIONS_COLLECTION_ID,
  IMAGE_GENERATION_COLLECTION_ID,
  USAGE_LOGS_COLLECTION_ID,
} from '@/services/appwrite-collections';

const RESEARCH_LIMITS = {
  FREE: { MONTHLY_RESEARCH: 5 },
  PRO: { MONTHLY_RESEARCH: -1 },
};

export async function checkUserPlan(userEmail) {
  if (!userEmail) {
    return { isPro: false, plan: 'free', subscription: null, isExpired: false, expiresAt: null };
  }

  try {
    const usersRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', userEmail),
      Query.limit(1),
    ]);
    const user = usersRes.documents[0];

    if (!user) {
      return { isPro: false, plan: 'free', subscription: null, isExpired: false, expiresAt: null };
    }

    if (user.plan === 'pro' && (!user.subscription_end_date || user.email === 'arpitariyanm@gmail.com')) {
      return { isPro: true, plan: 'pro', subscription: null, isExpired: false, expiresAt: null };
    }

    if (user.plan === 'pro' && user.subscription_end_date) {
      const now = new Date();
      const expiryDate = new Date(user.subscription_end_date);
      const isExpired = expiryDate <= now;

      if (isExpired) {
        return {
          isPro: false,
          plan: 'free',
          subscription: null,
          isExpired: true,
          expiresAt: user.subscription_end_date,
        };
      }

      return {
        isPro: true,
        plan: 'pro',
        subscription: {
          start_date: user.subscription_start_date,
          end_date: user.subscription_end_date,
        },
        isExpired: false,
        expiresAt: user.subscription_end_date,
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
      return {
        isPro: true,
        plan: 'pro',
        subscription,
        isExpired: false,
        expiresAt: user.subscription_end_date,
      };
    }

    return {
      isPro: user?.plan === 'pro',
      plan: user?.plan || 'free',
      subscription: null,
      isExpired: false,
      expiresAt: user.subscription_end_date,
    };
  } catch (error) {
    const isPermanentAccount = userEmail === 'arpitariyanm@gmail.com';
    console.error('Error in checkUserPlan:', error?.message || error);
    return {
      isPro: isPermanentAccount,
      plan: isPermanentAccount ? 'pro' : 'free',
      subscription: null,
      isExpired: false,
      expiresAt: null,
    };
  }
}

export async function getDailyImageCount(userEmail) {
  if (!userEmail) return 0;

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
        plan: 'free',
        message: 'User email is required to check image generation limits.',
      };
    }

    const [planInfo, dailyCount] = await Promise.all([
      checkUserPlan(userEmail),
      getDailyImageCount(userEmail),
    ]);

    const { isPro, plan, isExpired, expiresAt } = planInfo;

    if (isExpired) {
      return {
        canGenerate: dailyCount < 10,
        dailyCount,
        dailyLimit: 10,
        plan: 'free',
        message: `Your Pro subscription expired on ${new Date(expiresAt).toLocaleDateString()}. You now have free plan limits: ${10 - dailyCount} images remaining today.`,
      };
    }

    if (isPro) {
      return {
        canGenerate: true,
        dailyCount,
        dailyLimit: -1,
        plan: 'pro',
        message: 'Unlimited image generation available with Pro plan',
      };
    }

    const freeLimit = 10;
    const canGenerate = dailyCount < freeLimit;

    return {
      canGenerate,
      dailyCount,
      dailyLimit: freeLimit,
      plan: plan || 'free',
      message: canGenerate
        ? `${freeLimit - dailyCount} images remaining today (Free plan)`
        : `Daily limit of ${freeLimit} images reached. Upgrade to Pro for unlimited generation.`,
    };
  } catch (error) {
    console.error('Error in checkImageGenerationLimit:', error?.message || error);
    return {
      canGenerate: false,
      dailyCount: 0,
      dailyLimit: 10,
      plan: 'free',
      message: 'Error checking image generation limits. Please try again.',
    };
  }
}

export async function getMonthlyResearchCount(userEmail) {
  if (!userEmail) return 0;

  try {
    const userRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', userEmail),
      Query.limit(1),
    ]);
    const user = userRes.documents[0];

    if (!user?.$id) return 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const baseFilters = [
      Query.equal('operation_type', 'research'),
      Query.greaterThanEqual('$createdAt', startOfMonth.toISOString()),
      Query.lessThanEqual('$createdAt', endOfMonth.toISOString()),
    ];

    try {
      const byUserId = await databases.listDocuments(DB_ID, USAGE_LOGS_COLLECTION_ID, [
        Query.equal('user_id', user.$id),
        ...baseFilters,
      ]);
      return byUserId.total || 0;
    } catch (userIdError) {
      if (!String(userIdError?.message || '').includes('Attribute not found in schema')) {
        throw userIdError;
      }
    }

    const byUserEmail = await databases.listDocuments(DB_ID, USAGE_LOGS_COLLECTION_ID, [
      Query.equal('user_email', userEmail),
      ...baseFilters,
    ]);

    return byUserEmail.total || 0;
  } catch (error) {
    console.error('Error in getMonthlyResearchCount:', error?.message || error);
    return 0;
  }
}

export async function checkResearchLimit(userEmail) {
  try {
    if (!userEmail) {
      return {
        canResearch: false,
        monthlyCount: 0,
        monthlyLimit: RESEARCH_LIMITS.FREE.MONTHLY_RESEARCH,
        remaining: 0,
        plan: 'free',
        message: 'User email is required to check research limits.',
      };
    }

    const [planInfo, monthlyCount] = await Promise.all([
      checkUserPlan(userEmail),
      getMonthlyResearchCount(userEmail),
    ]);

    if (planInfo.isPro) {
      return {
        canResearch: true,
        monthlyCount,
        monthlyLimit: -1,
        remaining: -1,
        plan: 'pro',
        message: 'Unlimited Research available with Pro plan',
      };
    }

    const freeLimit = RESEARCH_LIMITS.FREE.MONTHLY_RESEARCH;
    const canResearch = monthlyCount < freeLimit;
    const remaining = Math.max(0, freeLimit - monthlyCount);

    return {
      canResearch,
      monthlyCount,
      monthlyLimit: freeLimit,
      remaining,
      plan: planInfo.plan || 'free',
      message: canResearch
        ? `${remaining} Research uses remaining this month (Free plan)`
        : `Monthly limit of ${freeLimit} Research uses reached. Upgrade to Pro for unlimited Research.`,
    };
  } catch (error) {
    console.error('Error in checkResearchLimit:', error?.message || error);
    return {
      canResearch: false,
      monthlyCount: 0,
      monthlyLimit: RESEARCH_LIMITS.FREE.MONTHLY_RESEARCH,
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

  if (userEmail === 'arpitariyanm@gmail.com') {
    return {
      hasSubscription: false,
      isActive: true,
      startDate: null,
      endDate: null,
      daysRemaining: null,
    };
  }

  try {
    const usersRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
      Query.equal('email', userEmail),
      Query.limit(1),
    ]);
    const user = usersRes.documents[0];

    if (!user) {
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
        isActive: user.plan === 'pro',
        startDate: null,
        endDate: null,
        daysRemaining: null,
      };
    }

    const now = new Date();
    const endDate = new Date(user.subscription_end_date);
    const isActive = endDate > now && user.plan === 'pro';
    const daysRemaining = isActive ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0;

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
      isActive: false,
      startDate: null,
      endDate: null,
      daysRemaining: null,
    };
  }
}

export async function getSubscriptionStatusMessage(userEmail) {
  if (userEmail === 'arpitariyanm@gmail.com') {
    return 'Pro Plan (Permanent Account)';
  }

  try {
    const planInfo = await checkUserPlan(userEmail);
    const subscriptionDetails = await getSubscriptionDetails(userEmail);

    if (planInfo.isExpired) {
      return `Pro Plan (Expired on ${new Date(planInfo.expiresAt).toLocaleDateString()})`;
    }

    if (planInfo.isPro) {
      if (subscriptionDetails.hasSubscription && subscriptionDetails.isActive) {
        const daysRemaining = subscriptionDetails.daysRemaining;
        if (daysRemaining > 7) return `Pro Plan (${daysRemaining} days remaining)`;
        if (daysRemaining > 0) return `Pro Plan (⚠️ Expires in ${daysRemaining} days)`;
        return 'Pro Plan (Expires today!)';
      }
      return 'Pro Plan (Permanent)';
    }

    return 'Free Plan';
  } catch (error) {
    console.error('Error getting subscription status message:', error?.message || error);
    return 'Free Plan';
  }
}