export function isInternalOperatorEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const cleanEmail = email.toLowerCase().trim();
  const configured = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return configured.includes(cleanEmail);
}
import { databases, DB_ID, Query } from '@/services/appwrite-admin.js';
import { USERS_COLLECTION_ID, SUBSCRIPTIONS_COLLECTION_ID, IMAGE_GENERATION_COLLECTION_ID, USAGE_LOGS_COLLECTION_ID } from '@/services/appwrite-collections';

/**
 * Check if user has a valid Pro plan based on subscription data and dates
 * @param {string} userEmail - User's email address
 * @returns {Promise<{isPro: boolean, plan: string, subscription: object|null, isExpired: boolean, expiresAt: string|null}>}
 */
export async function checkUserPlan(userEmail) {
    if (!userEmail) {
        return {
            isPro: false,
            isMax: false,
            plan: 'free',
            subscription: null,
            isExpired: false,
            expiresAt: null
        };
    }

    try {
        // First check the Users table for the most up-to-date plan information
        const usersRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
            Query.equal('email', userEmail),
            Query.limit(1)
        ]);
        const user = usersRes.documents[0];

        // Check if user exists
        if (!user) {
            if (isInternalOperatorEmail(userEmail)) {
                return {
                    isPro: true,
                    isMax: false,
                    plan: 'pro',
                    subscription: null,
                    isExpired: false,
                    expiresAt: null
                };
            }
            return {
                isPro: false,
                isMax: false,
                plan: 'free',
                subscription: null,
                isExpired: false,
                expiresAt: null
            };
        }

        let normalizedPlan = user.plan || 'free';
        if (isInternalOperatorEmail(user?.email) && normalizedPlan === 'free') {
            normalizedPlan = 'pro';
        }

        // Special handling for permanent accounts (like arpitariyanm@gmail.com)
        if (isInternalOperatorEmail(user?.email)) {
      return { isPro: true, isMax: normalizedPlan === 'max', plan: normalizedPlan || 'pro', subscription: null, isExpired: false, expiresAt: null };
    }

        // Check subscription expiry for regular pro users
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
                        expiresAt: null
                    };
                }
                return {
                    isPro: false,
                    isMax: false,
                    plan: 'free',
                    subscription: null,
                    isExpired: true,
                    expiresAt: user.subscription_end_date
                };
            }

            // Active pro/max subscription
            return {
                isPro: true,
                isMax: normalizedPlan === 'max',
                plan: normalizedPlan,
                subscription: {
                    start_date: user.subscription_start_date,
                    end_date: user.subscription_end_date
                },
                isExpired: false,
                expiresAt: user.subscription_end_date
            };
        }

        // Check for active subscription in subscriptions table as fallback
        let subscription = null;
        try {
            const subRes = await databases.listDocuments(DB_ID, SUBSCRIPTIONS_COLLECTION_ID, [
                Query.equal('user_email', userEmail),
                Query.equal('status', 'active'),
                Query.isNotNull('razorpay_order_id'),
                Query.isNotNull('plan_type'),
                Query.orderDesc('created_at'),
                Query.limit(1)
            ]);
            subscription = subRes.documents[0] || null;
        } catch (subError) {
            console.error('Error checking subscription:', subError);
        }

        // If valid subscription found with all required fields
        if (subscription &&
            subscription.razorpay_order_id &&
            subscription.plan_type &&
            subscription.status === 'active') {

            const subscriptionPlan = subscription.plan_type || user.plan || 'pro';
            return {
                isPro: true,
                isMax: subscriptionPlan === 'max',
                plan: subscriptionPlan,
                subscription: subscription,
                isExpired: false,
                expiresAt: user.subscription_end_date
            };
        }

        return {
            isPro: user?.plan === 'pro' || user?.plan === 'max' || isInternalOperatorEmail(userEmail),
            isMax: user?.plan === 'max',
            plan: isInternalOperatorEmail(userEmail) ? 'pro' : (user?.plan || 'free'),
            subscription: null,
            isExpired: false,
            expiresAt: user.subscription_end_date
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
            expiresAt: null
        };
    }
}

/**
 * Get user's daily image generation count
 * @param {string} userEmail - User's email address
 * @returns {Promise<number>} Number of images generated today
 */
export async function getDailyImageCount(userEmail) {
    if (!userEmail) return 0;

    try {
        // Fix date calculation - create separate date objects to avoid mutation
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const startOfDayISO = startOfDay.toISOString();
        const endOfDayISO = endOfDay.toISOString();

        const res = await databases.listDocuments(DB_ID, IMAGE_GENERATION_COLLECTION_ID, [
            Query.equal('userEmail', userEmail),
            Query.greaterThanEqual('created_at', startOfDayISO),
            Query.lessThanEqual('created_at', endOfDayISO),
            Query.equal('status', ['completed', 'generating'])
        ]);

        return res.total || 0;
    } catch (error) {
        // Enhanced error logging for unexpected errors
        console.error('Error in getDailyImageCount:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            userEmail: userEmail,
            cause: error.cause,
            fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
        });
        return 0;
    }
}

/**
 * Check if user can generate more images based on their plan
 * @param {string} userEmail - User's email address
 * @returns {Promise<{canGenerate: boolean, dailyCount: number, dailyLimit: number, plan: string, message: string}>}
 */
export async function checkImageGenerationLimit(userEmail) {
    try {
        if (!userEmail) {
            return {
                canGenerate: false,
                dailyCount: 0,
                dailyLimit: 10,
                plan: 'free',
                message: 'User email is required to check image generation limits.'
            };
        }

        // Use Promise.allSettled to handle partial failures gracefully
        const [planResult, countResult] = await Promise.allSettled([
            checkUserPlan(userEmail),
            getDailyImageCount(userEmail)
        ]);

        // Extract results, handling both fulfilled and rejected promises
        const planInfo = planResult.status === 'fulfilled'
            ? planResult.value
            : { isPro: false, plan: 'free', subscription: null, isExpired: false, expiresAt: null };

        const dailyCount = countResult.status === 'fulfilled'
            ? countResult.value
            : 0;

        // Log if any promise was rejected
        if (planResult.status === 'rejected') {
            console.error('Error in checkUserPlan:', {
                reason: planResult.reason,
                userEmail: userEmail
            });
        }

        if (countResult.status === 'rejected') {
            console.error('Error in getDailyImageCount:', {
                reason: countResult.reason,
                userEmail: userEmail
            });
        }

        const { isPro, plan, isExpired, expiresAt } = planInfo;

        // Check if subscription is expired
        if (isExpired) {
            return {
                canGenerate: dailyCount < 10, // Treat as free plan
                dailyCount,
                dailyLimit: 10,
                plan: 'free',
                message: `Your Pro subscription expired on ${new Date(expiresAt).toLocaleDateString()}. You now have free plan limits: ${10 - dailyCount} images remaining today.`
            };
        }

        // Pro users have unlimited generation (if subscription is active)
        if (isPro) {
            const expiryMessage = expiresAt
                ? ` (expires ${new Date(expiresAt).toLocaleDateString()})`
                : ' (permanent)';

            return {
                canGenerate: true,
                dailyCount,
                dailyLimit: -1, // -1 indicates unlimited
                plan: 'pro',
                message: `Unlimited image generation available with Pro plan${expiryMessage}`
            };
        }

        // Free users have 10 images per day limit
        const freeLimit = 10;
        const canGenerate = dailyCount < freeLimit;

        return {
            canGenerate,
            dailyCount,
            dailyLimit: freeLimit,
            plan: 'free',
            message: canGenerate
                ? `${freeLimit - dailyCount} images remaining today (Free plan)`
                : `Daily limit of ${freeLimit} images reached. Upgrade to Pro for unlimited generation.`
        };

    } catch (error) {
        // Enhanced error logging for unexpected errors
        console.error('Error in checkImageGenerationLimit:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            userEmail: userEmail,
            cause: error.cause,
            fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
        });

        // Return safe default values on error
        return {
            canGenerate: false,
            dailyCount: 0,
            dailyLimit: 10,
            plan: 'free',
            message: 'Error checking image generation limits. Please try again.'
        };
    }
}

/**
 * Constants for plan limits
 */
export const PLAN_LIMITS = {
    FREE: {
        DAILY_IMAGES: 10,
        PLAN_NAME: 'Free',
        MONTHLY_CREDITS: 5000
    },
    PRO: {
        DAILY_IMAGES: -1, // Unlimited
        PLAN_NAME: 'Pro',
        MONTHLY_CREDITS: 25000
    }
};

/**
 * Constants for Research feature limits
 */
export const RESEARCH_LIMITS = {
    FREE: {
        WEEKLY_RESEARCH: 5
    },
    PRO: {
        WEEKLY_RESEARCH: 15
    },
    MAX: {
        WEEKLY_RESEARCH: 25
    }
};

function getWeekWindowUtc(date = new Date()) {
    const now = new Date(date);
    const day = now.getUTCDay();
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

/**
 * Get user's monthly Research usage count
 * @param {string} userEmail - User's email address
 * @returns {Promise<number>} Number of Research operations used in current month
 */
export async function getWeeklyResearchCount(userEmail) {
    if (!userEmail) return 0;

    try {
        const { start: startOfWeek, end: endOfWeek } = getWeekWindowUtc();

        const res = await databases.listDocuments(DB_ID, USAGE_LOGS_COLLECTION_ID, [
            Query.equal('user_email', userEmail),
            Query.equal('operation_type', 'research'),
            Query.greaterThanEqual('created_at', startOfWeek.toISOString()),
            Query.lessThanEqual('created_at', endOfWeek.toISOString())
        ]);

        return res.total || 0;
    } catch (error) {
        console.error('Error in getWeeklyResearchCount:', error);
        return 0;
    }
}

export async function getMonthlyResearchCount(userEmail) {
    return getWeeklyResearchCount(userEmail);
}

/**
 * Check if user can use Research based on plan and monthly usage
 * @param {string} userEmail - User's email address
 * @returns {Promise<{canResearch: boolean, monthlyCount: number, monthlyLimit: number, remaining: number, plan: string, message: string}>}
 */
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
                message: 'User email is required to check research limits.'
            };
        }

        const [planInfo, weeklyCount] = await Promise.all([
            checkUserPlan(userEmail),
            getWeeklyResearchCount(userEmail)
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
                message: 'Unlimited Research available (Special Account)'
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
                : `Weekly limit of ${planLimit} Deep Research uses reached for ${normalizedPlan.toUpperCase()} plan. Resets on Sunday.`
        };
    } catch (error) {
        console.error('Error in checkResearchLimit:', error);
        return {
            canResearch: false,
            weeklyCount: 0,
            weeklyLimit: RESEARCH_LIMITS.FREE.WEEKLY_RESEARCH,
            monthlyCount: 0,
            monthlyLimit: RESEARCH_LIMITS.FREE.WEEKLY_RESEARCH,
            remaining: 0,
            plan: 'free',
            message: 'Error checking research limits. Please try again.'
        };
    }
}

/**
 * Get subscription details for a user
 * @param {string} userEmail - User's email address
 * @returns {Promise<{hasSubscription: boolean, isActive: boolean, startDate: string|null, endDate: string|null, daysRemaining: number|null}>}
 */
export async function getSubscriptionDetails(userEmail) {
    if (!userEmail) {
        return {
            hasSubscription: false,
            isActive: false,
            startDate: null,
            endDate: null,
            daysRemaining: null
        };
    }

    try {
        const usersRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
            Query.equal('email', userEmail),
            Query.limit(1)
        ]);
        const user = usersRes.documents[0];

        if (!user) {
            if (isInternalOperatorEmail(userEmail)) {
                return {
                    hasSubscription: false,
                    isActive: true,
                    startDate: null,
                    endDate: null,
                    daysRemaining: null
                };
            }
            return {
                hasSubscription: false,
                isActive: false,
                startDate: null,
                endDate: null,
                daysRemaining: null
            };
        }

        const hasSubscription = !!(user.subscription_start_date && user.subscription_end_date);

        if (!hasSubscription) {
            return {
                hasSubscription: false,
                isActive: isInternalOperatorEmail(userEmail) ? true : (user.plan === 'pro' || user.plan === 'max'),
                startDate: null,
                endDate: null,
                daysRemaining: null
            };
        }

        const now = new Date();
        const endDate = new Date(user.subscription_end_date);
        const isActive = (endDate > now && (user.plan === 'pro' || user.plan === 'max')) || isInternalOperatorEmail(userEmail);
        const daysRemaining = endDate > now ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0;

        return {
            hasSubscription: true,
            isActive,
            startDate: user.subscription_start_date,
            endDate: user.subscription_end_date,
            daysRemaining
        };

    } catch (error) {
        console.error('Error in getSubscriptionDetails:', error);
        return {
            hasSubscription: false,
            isActive: isInternalOperatorEmail(userEmail),
            startDate: null,
            endDate: null,
            daysRemaining: null
        };
    }
}

/**
 * Check if a user's subscription is about to expire (within 7 days)
 * @param {string} userEmail - User's email address
 * @returns {Promise<{isExpiringSoon: boolean, daysUntilExpiry: number|null, expiryDate: string|null}>}
 */
export async function checkSubscriptionExpiry(userEmail) {
    const subscriptionDetails = await getSubscriptionDetails(userEmail);

    if (!subscriptionDetails.hasSubscription || !subscriptionDetails.isActive) {
        return {
            isExpiringSoon: false,
            daysUntilExpiry: null,
            expiryDate: null
        };
    }

    const daysRemaining = subscriptionDetails.daysRemaining || 0;
    const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;

    return {
        isExpiringSoon,
        daysUntilExpiry: daysRemaining,
        expiryDate: subscriptionDetails.endDate
    };
}

/**
 * Format subscription status for display
 * @param {string} userEmail - User's email address
 * @returns {Promise<string>} Formatted status message
 */
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
                if (daysRemaining > 7) {
                    return `${planLabel} (${daysRemaining} days remaining)`;
                } else if (daysRemaining > 0) {
                    return `${planLabel} (⚠️ Expires in ${daysRemaining} days)`;
                } else {
                    return `${planLabel} (Expires today!)`;
                }
            } else {
                return `${planInfo.isMax ? 'Max' : 'Pro'} Plan (Permanent Account)`;
            }
        }

        if (isInternalOperatorEmail(userEmail)) {
            return 'Pro Plan (Permanent Account)';
        }

        return 'Free Plan';

    } catch (error) {
        console.error('Error getting subscription status message:', error);
        return isInternalOperatorEmail(userEmail) ? 'Pro Plan (Permanent Account)' : 'Free Plan';
    }
}