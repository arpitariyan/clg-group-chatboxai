import { supabase } from '@/services/supabase';

/**
 * Check if user has a valid Pro plan based on subscription data and dates
 * @param {string} userEmail - User's email address
 * @returns {Promise<{isPro: boolean, plan: string, subscription: object|null, isExpired: boolean, expiresAt: string|null}>}
 */
export async function checkUserPlan(userEmail) {
    if (!userEmail) {
        return { 
            isPro: false, 
            plan: 'free', 
            subscription: null, 
            isExpired: false, 
            expiresAt: null 
        };
    }

    try {
        // First check the Users table for the most up-to-date plan information
        const { data: user, error: userError } = await supabase
            .from('Users')
            .select('plan, email, subscription_start_date, subscription_end_date, credits')
            .eq('email', userEmail)
            .single();

        if (userError && userError.code !== 'PGRST116') {
            console.error('Error checking user plan:', userError);
            return { 
                isPro: false, 
                plan: 'free', 
                subscription: null, 
                isExpired: false, 
                expiresAt: null 
            };
        }

        // Check if user exists
        if (!user) {
            return { 
                isPro: false, 
                plan: 'free', 
                subscription: null, 
                isExpired: false, 
                expiresAt: null 
            };
        }

        // Special handling for permanent accounts (like arpitariyanm@gmail.com)
        if (user.plan === 'pro' && (!user.subscription_end_date || user.email === 'arpitariyanm@gmail.com')) {
            return { 
                isPro: true, 
                plan: 'pro', 
                subscription: null, 
                isExpired: false, 
                expiresAt: null 
            };
        }

        // Check subscription expiry for regular pro users
        if (user.plan === 'pro' && user.subscription_end_date) {
            const now = new Date();
            const expiryDate = new Date(user.subscription_end_date);
            const isExpired = expiryDate <= now;

            // console.log('Subscription date check:', {
            //     email: userEmail,
            //     plan: user.plan,
            //     expiryDate: expiryDate.toISOString(),
            //     now: now.toISOString(),
            //     isExpired: isExpired
            // });

            if (isExpired) {
                // Subscription has expired - should be downgraded
                console.warn(`User ${userEmail} has expired subscription (expired: ${expiryDate.toISOString()})`);
                return { 
                    isPro: false, 
                    plan: 'free', // Return 'free' even if DB still shows 'pro' - it's expired
                    subscription: null, 
                    isExpired: true, 
                    expiresAt: user.subscription_end_date 
                };
            }

            // Active pro subscription
            return { 
                isPro: true, 
                plan: 'pro', 
                subscription: { 
                    start_date: user.subscription_start_date,
                    end_date: user.subscription_end_date
                }, 
                isExpired: false, 
                expiresAt: user.subscription_end_date 
            };
        }

        // Check for active subscription in subscriptions table as fallback
        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_email', userEmail)
            .eq('status', 'active')
            .not('razorpay_order_id', 'is', null)
            .not('plan_type', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error checking subscription:', error);
        }

        // If valid subscription found with all required fields
        if (subscription && 
            subscription.razorpay_order_id && 
            subscription.plan_type && 
            subscription.status === 'active') {
            
            return { 
                isPro: true, 
                plan: 'pro', 
                subscription: subscription, 
                isExpired: false, 
                expiresAt: user.subscription_end_date 
            };
        }

        // Default to user's current plan
        const isPro = user?.plan === 'pro';
        return { 
            isPro, 
            plan: user?.plan || 'free', 
            subscription: null, 
            isExpired: false, 
            expiresAt: user.subscription_end_date 
        };

    } catch (error) {
        console.error('Error in checkUserPlan:', error);
        return { 
            isPro: false, 
            plan: 'free', 
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
        // Validate Supabase client is available
        if (!supabase) {
            console.error('Error: Supabase client is not initialized');
            return 0;
        }

        // Fix date calculation - create separate date objects to avoid mutation
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const startOfDayISO = startOfDay.toISOString();
        const endOfDayISO = endOfDay.toISOString();

        const { count, error } = await supabase
            .from('ImageGeneration')
            .select('*', { count: 'exact', head: true })
            .eq('userEmail', userEmail)
            .gte('created_at', startOfDayISO)
            .lte('created_at', endOfDayISO)
            .in('status', ['completed', 'generating']); // Count both completed and in-progress

        if (error) {
            // Enhanced error logging
            console.error('Error getting daily image count:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
                userEmail: userEmail,
                startOfDay: startOfDayISO,
                endOfDay: endOfDayISO,
                fullError: JSON.stringify(error, null, 2)
            });
            return 0;
        }

        return count || 0;
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
        MONTHLY_RESEARCH: 5
    },
    PRO: {
        MONTHLY_RESEARCH: -1 // Unlimited
    }
};

/**
 * Get user's monthly Research usage count
 * @param {string} userEmail - User's email address
 * @returns {Promise<number>} Number of Research operations used in current month
 */
export async function getMonthlyResearchCount(userEmail) {
    if (!userEmail) return 0;

    try {
        if (!supabase) return 0;

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const { count, error } = await supabase
            .from('usage_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_email', userEmail)
            .eq('operation_type', 'research')
            .gte('created_at', startOfMonth.toISOString())
            .lte('created_at', endOfMonth.toISOString());

        if (error) {
            console.error('Error getting monthly research count:', error);
            return 0;
        }

        return count || 0;
    } catch (error) {
        console.error('Error in getMonthlyResearchCount:', error);
        return 0;
    }
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
                monthlyCount: 0,
                monthlyLimit: RESEARCH_LIMITS.FREE.MONTHLY_RESEARCH,
                remaining: 0,
                plan: 'free',
                message: 'User email is required to check research limits.'
            };
        }

        const [planInfo, monthlyCount] = await Promise.all([
            checkUserPlan(userEmail),
            getMonthlyResearchCount(userEmail)
        ]);

        const { isPro, plan } = planInfo;

        if (isPro) {
            return {
                canResearch: true,
                monthlyCount,
                monthlyLimit: -1, // Unlimited
                remaining: -1,
                plan: 'pro',
                message: 'Unlimited Research available with Pro plan'
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
            plan: plan || 'free',
            message: canResearch
                ? `${remaining} Research uses remaining this month (Free plan)`
                : `Monthly limit of ${freeLimit} Research uses reached. Upgrade to Pro for unlimited Research.`
        };
    } catch (error) {
        console.error('Error in checkResearchLimit:', error);
        return {
            canResearch: false,
            monthlyCount: 0,
            monthlyLimit: RESEARCH_LIMITS.FREE.MONTHLY_RESEARCH,
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
        const { data: user, error } = await supabase
            .from('Users')
            .select('subscription_start_date, subscription_end_date, plan')
            .eq('email', userEmail)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error getting subscription details:', error);
            return {
                hasSubscription: false,
                isActive: false,
                startDate: null,
                endDate: null,
                daysRemaining: null
            };
        }

        if (!user) {
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
                isActive: user.plan === 'pro', // Could be permanent pro account
                startDate: null,
                endDate: null,
                daysRemaining: null
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
            daysRemaining
        };

    } catch (error) {
        console.error('Error in getSubscriptionDetails:', error);
        return {
            hasSubscription: false,
            isActive: false,
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

        // Special account handling
        if (userEmail === 'arpitariyanm@gmail.com') {
            return 'Pro Plan (Permanent Account)';
        }

        if (planInfo.isExpired) {
            return `Pro Plan (Expired on ${new Date(planInfo.expiresAt).toLocaleDateString()})`;
        }

        if (planInfo.isPro) {
            if (subscriptionDetails.hasSubscription && subscriptionDetails.isActive) {
                const daysRemaining = subscriptionDetails.daysRemaining;
                if (daysRemaining > 7) {
                    return `Pro Plan (${daysRemaining} days remaining)`;
                } else if (daysRemaining > 0) {
                    return `Pro Plan (⚠️ Expires in ${daysRemaining} days)`;
                } else {
                    return 'Pro Plan (Expires today!)';
                }
            } else {
                return 'Pro Plan (Permanent)';
            }
        }

        return 'Free Plan';

    } catch (error) {
        console.error('Error getting subscription status message:', error);
        return 'Free Plan';
    }
}