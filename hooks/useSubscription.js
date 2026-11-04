import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import {
  getPlanAnnualPrice,
  getPlanMonthlyCredits,
  getPlanMonthlyPrice,
  getPlanPaidCredits,
  getPlanDailyCredits,
  normalizePlan,
} from '@/lib/subscriptionPlans';

/**
 * Custom hook for managing subscription status across components.
 *
 * Key fixes vs the original:
 *  1. `isActive` now correctly handles Pro/Max users with NO subscription dates
 *     (manual upgrades) — they are active as long as plan=pro|max in DB.
 *  2. `isMax` is now correctly read from planCheck.isMax in the API response.
 *  3. Credits (daily free + monthly paid) are exposed for real-time model locking.
 *  4. Paid-plan users are polled every 30 s to keep the sidebar up-to-date.
 */
import { auth } from '@/lib/firebase';

export const useSubscription = (userEmail, refreshToken = '') => {
  const requestVersionRef = useRef(0);
  const pollingIntervalRef = useRef(null);

  const [subscriptionData, setSubscriptionData] = useState({
    planInfo: null,
    details: null,
    statusMessage: '',
    effectivePlan: 'free',
    isActive: false,
    isPro: false,
    isMax: false,
    monthlyCredits: 5000,
    monthlyPrice: 0,
    annualPrice: 0,
    currency: 'INR',
    // Credit balances — used for real-time paid model locking
    dailyFreeCredits: 0,
    monthlyPaidCredits: 0,
    hasPaidCredits: false,
    loading: true,
    error: null,
  });

  const loadSubscriptionData = useCallback(async () => {
    const requestVersion = ++requestVersionRef.current;

    if (!userEmail) {
      const nextState = {
        ...subscriptionData,
        loading: false,
        effectivePlan: 'free',
        isActive: false,
        isPro: false,
        isMax: false,
        monthlyCredits: 5000,
        monthlyPrice: 0,
        dailyFreeCredits: 0,
        monthlyPaidCredits: 0,
        hasPaidCredits: false,
      };
      if (requestVersion === requestVersionRef.current) {
        setSubscriptionData(nextState);
      }
      return nextState;
    }

    try {
      if (requestVersion === requestVersionRef.current) {
        setSubscriptionData(prev => ({ ...prev, loading: true, error: null }));
      }

      const token = await auth?.currentUser?.getIdToken?.().catch(() => null);
      if (!token) {
        // If no authenticated token is available, don't query subscription-status (which requires auth).
        // Safely set default Free plan state and return without hitting network.
        const isOwner = userEmail === 'arpitariyanm@gmail.com';
        const nextState = {
          planInfo: isOwner
            ? { isPro: true, isMax: false, plan: 'pro', isExpired: false, expiresAt: null, subscription: null }
            : null,
          details: isOwner
            ? { hasSubscription: false, isActive: true, startDate: null, endDate: null, daysRemaining: null }
            : null,
          statusMessage: isOwner ? 'Pro Plan (Permanent Account)' : 'Free Plan',
          effectivePlan: isOwner ? 'pro' : 'free',
          isActive: isOwner,
          isPro: isOwner,
          isMax: false,
          monthlyCredits: isOwner ? getPlanMonthlyCredits('pro') : 5000,
          monthlyPrice: isOwner ? getPlanMonthlyPrice('pro') : 0,
          annualPrice: isOwner ? getPlanAnnualPrice('pro') : 0,
          paidCreditsAllocation: isOwner ? getPlanPaidCredits('pro') : 0,
          dailyCreditAllocation: 5000,
          currency: 'INR',
          dailyFreeCredits: 0,
          monthlyPaidCredits: isOwner ? 30000 : 0,
          hasPaidCredits: isOwner,
          loading: false,
          error: null,
        };
        if (requestVersion === requestVersionRef.current) {
          setSubscriptionData(nextState);
        }
        return nextState;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.get('/api/user/subscription-status', {
        params: { email: userEmail },
        headers,
      });

      const payload = response?.data || {};

      // ── Effective plan ────────────────────────────────────────────────────
      let plan = normalizePlan(
        payload?.planCheck?.effectivePlan ||
        payload?.user?.currentPlan ||
        'free'
      );
      // Owner-account override: never fall back to free
      if (userEmail === 'arpitariyanm@gmail.com' && plan === 'free') {
        plan = 'pro';
      }

      // ── Plan info ─────────────────────────────────────────────────────────
      const planInfo = {
        isPro: userEmail === 'arpitariyanm@gmail.com' ? true : !!payload?.planCheck?.isPro,
        isMax: plan === 'max' || !!payload?.planCheck?.isMax,
        plan,
        isExpired: userEmail === 'arpitariyanm@gmail.com' ? false : !!payload?.planCheck?.isExpired,
        expiresAt: payload?.planCheck?.expiresAt || null,
      };

      // ── Subscription details ──────────────────────────────────────────────
      const subDetails = {
        hasSubscription: !!payload?.subscription?.hasSubscriptionDates,
        // FIXED: isActive now comes directly from our corrected API, which handles
        // both "has subscription dates" and "plan=pro with no dates" cases.
        isActive: userEmail === 'arpitariyanm@gmail.com'
          ? true
          : !!payload?.subscription?.isActive,
        startDate: payload?.subscription?.startDate || null,
        endDate: payload?.subscription?.endDate || null,
        daysRemaining: payload?.subscription?.daysRemaining ?? null,
      };

      const statusMessage =
        payload?.subscription?.statusMessage ||
        (userEmail === 'arpitariyanm@gmail.com' ? 'Pro Plan (Permanent Account)' : 'Free Plan');

      // ── Derived flags ─────────────────────────────────────────────────────
      const effectivePlan = planInfo.plan || 'free';
      const isPro = planInfo.isPro && !planInfo.isExpired;
      const isMax = planInfo.isMax && !planInfo.isExpired;

      // FIXED: isActive = subscription is active OR plan is pro/max with no dates
      // (the API already handles this, but be defensive here too)
      const hasPaidPlan = effectivePlan === 'pro' || effectivePlan === 'max';
      const isActive = subDetails.isActive || (hasPaidPlan && !planInfo.isExpired);

      const monthlyCredits = getPlanMonthlyCredits(effectivePlan);

      // ── Credit balances (new) ─────────────────────────────────────────────
      const dailyFreeCredits = Number(payload?.user?.credits ?? 0);
      const monthlyPaidCredits = Number(payload?.user?.paid_credits ?? 0);
      const hasPaidCredits = payload?.user?.hasPaidCredits ?? (monthlyPaidCredits > 0);

      const nextState = {
        planInfo,
        details: subDetails,
        statusMessage,
        effectivePlan,
        isActive,
        isPro,
        isMax,
        monthlyCredits,
        monthlyPrice: getPlanMonthlyPrice(effectivePlan),
        annualPrice: getPlanAnnualPrice(effectivePlan),
        paidCreditsAllocation: getPlanPaidCredits(effectivePlan),
        dailyCreditAllocation: getPlanDailyCredits(effectivePlan),
        currency: 'INR',
        dailyFreeCredits,
        monthlyPaidCredits,
        hasPaidCredits,
        loading: false,
        error: null,
      };

      if (requestVersion === requestVersionRef.current) {
        setSubscriptionData(nextState);
      }
      return nextState;

    } catch (error) {
      const isOwner = userEmail === 'arpitariyanm@gmail.com';
      if (error?.response?.status === 401) {
        // Unauthorized (session expired or unauthenticated) — graceful Free plan fallback without throwing red console error
        const nextState = {
          planInfo: isOwner
            ? { isPro: true, isMax: false, plan: 'pro', isExpired: false, expiresAt: null, subscription: null }
            : null,
          details: isOwner
            ? { hasSubscription: false, isActive: true, startDate: null, endDate: null, daysRemaining: null }
            : null,
          statusMessage: isOwner ? 'Pro Plan (Permanent Account)' : 'Free Plan',
          effectivePlan: isOwner ? 'pro' : 'free',
          isActive: isOwner,
          isPro: isOwner,
          isMax: false,
          monthlyCredits: isOwner ? getPlanMonthlyCredits('pro') : 5000,
          monthlyPrice: isOwner ? getPlanMonthlyPrice('pro') : 0,
          annualPrice: isOwner ? getPlanAnnualPrice('pro') : 0,
          currency: 'INR',
          dailyFreeCredits: 0,
          monthlyPaidCredits: isOwner ? 30000 : 0,
          hasPaidCredits: isOwner,
          loading: false,
          error: null,
        };
        if (requestVersion === requestVersionRef.current) {
          setSubscriptionData(nextState);
        }
        return nextState;
      }
      console.warn('Error loading subscription data:', error?.message || error);
      const nextState = {
        planInfo: isOwner
          ? { isPro: true, isMax: false, plan: 'pro', isExpired: false, expiresAt: null, subscription: null }
          : null,
        details: isOwner
          ? { hasSubscription: false, isActive: true, startDate: null, endDate: null, daysRemaining: null }
          : null,
        statusMessage: isOwner ? 'Pro Plan (Permanent Account)' : 'Free Plan',
        effectivePlan: isOwner ? 'pro' : 'free',
        isActive: isOwner,
        isPro: isOwner,
        isMax: false,
        monthlyCredits: isOwner ? getPlanMonthlyCredits('pro') : 5000,
        monthlyPrice: isOwner ? getPlanMonthlyPrice('pro') : 0,
        annualPrice: isOwner ? getPlanAnnualPrice('pro') : 0,
        currency: 'INR',
        dailyFreeCredits: 0,
        monthlyPaidCredits: isOwner ? 30000 : 0,
        hasPaidCredits: isOwner,
        loading: false,
        error: error.message,
      };

      if (requestVersion === requestVersionRef.current) {
        setSubscriptionData(nextState);
      }
      return nextState;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  // Load on mount, user change, or refresh token change
  useEffect(() => {
    void loadSubscriptionData();
  }, [userEmail, refreshToken, loadSubscriptionData]);

  // ── Real-time polling for paid plans ──────────────────────────────────────
  // Poll every 30 seconds to keep credit balances current.
  // Polling is only active while the user has a paid plan (isPro or isMax).
  useEffect(() => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    const { isPro, isMax } = subscriptionData;
    if (!userEmail || (!isPro && !isMax)) return;

    pollingIntervalRef.current = setInterval(() => {
      void loadSubscriptionData();
    }, 60_000); // 60 seconds — reduced from 30s to avoid Firebase rate limits

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [userEmail, subscriptionData.isPro, subscriptionData.isMax, loadSubscriptionData]);

  // Function to manually refresh subscription data
  const refreshSubscription = useCallback(() => {
    return loadSubscriptionData();
  }, [loadSubscriptionData]);

  return {
    ...subscriptionData,
    refreshSubscription,
  };
};

/**
 * Hook to determine if user should see upgrade prompts
 */
export const useUpgradePrompts = (userEmail) => {
  const subscription = useSubscription(userEmail);

  return {
    shouldShowTryPro: !subscription.isPro && !subscription.loading,
    shouldShowUpgradeButton: !subscription.isPro && !subscription.loading,
    shouldHideProFeatures: subscription.isPro || subscription.loading,
    subscription,
  };
};

export default useSubscription;