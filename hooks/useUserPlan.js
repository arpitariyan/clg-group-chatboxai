import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { normalizePlan } from '@/lib/subscriptionPlans';
import { authFetch } from '@/lib/auth-fetch';

const CACHE_KEY_PREFIX = 'chatboxai_plan_cache_';
const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 hours

function getPlanFromCache(email) {
  if (typeof window === 'undefined') return null;
  try {
    const key = `${CACHE_KEY_PREFIX}${email}`;
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch (e) {
    return null;
  }
}

function savePlanToCache(email, data) {
  if (typeof window === 'undefined') return;
  try {
    const key = `${CACHE_KEY_PREFIX}${email}`;
    localStorage.setItem(key, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (e) {
    // Ignore storage errors
  }
}

/**
 * Hook for managing user plan information and image generation limits.
 * Also exposes paid-credit balance so the UI can gate paid model access in real time.
 *
 * Changes vs original:
 *  - Implements 3-hour localStorage caching to avoid redundant DB queries on page load.
 *  - Listens for 'creditsUpdated' custom window event to auto-refresh on each AI request.
 *  - Returns `hasPaidCredits` so ChatBoxAiInput can lock paid models when balance is 0.
 *  - Returns `paidCredits` balance alongside free credits.
 */
export function useUserPlan() {
  const { currentUser } = useAuth();
  const [userPlan, setUserPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserPlan = useCallback(async (userEmail, forceRefresh = false) => {
    if (!userEmail) {
      setPlanLoading(false);
      return;
    }

    if (!forceRefresh) {
      const cachedData = getPlanFromCache(userEmail);
      if (cachedData) {
        setUserPlan(cachedData);
        setPlanLoading(false);
        return; // Skip network request, use cache
      }
    }

    try {
      setError(null);
      const response = await authFetch(`/api/user/plan?email=${encodeURIComponent(userEmail)}`);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setUserPlan(data);
          savePlanToCache(userEmail, data);
        } else {
          setError('Server returned invalid response format');
        }
      } else {
        try {
          const contentType = response.headers.get('content-type');
          const errorData =
            contentType && contentType.includes('application/json')
              ? await response.json()
              : { error: `HTTP ${response.status}: ${response.statusText}` };
          setError(errorData.error || 'Failed to fetch user plan');
        } catch (parseError) {
          setError('Failed to fetch user plan');
        }
      }
    } catch (err) {
      console.error('Error fetching user plan:', err);
      setError('Failed to fetch user plan');
    } finally {
      setPlanLoading(false);
    }
  }, []);

  // Fetch plan data when user changes
  useEffect(() => {
    if (currentUser?.email) {
      fetchUserPlan(currentUser.email, false); // Use cache on initial load
    } else {
      setUserPlan(null);
      setPlanLoading(false);
    }
  }, [currentUser, fetchUserPlan]);

  // Listen for 'creditsUpdated' events dispatched after every AI request
  // Debounced to 3 seconds to prevent rapid API calls when multiple components
  // dispatch or receive the event in quick succession.
  useEffect(() => {
    let debounceTimer = null;
    const handleCreditsUpdated = () => {
      if (!currentUser?.email) return;
      // Cancel any pending fetch and schedule a new one
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchUserPlan(currentUser.email, true); // Force refresh for live credit updates
      }, 3000); // 3-second debounce
    };
    window.addEventListener('creditsUpdated', handleCreditsUpdated);
    return () => {
      window.removeEventListener('creditsUpdated', handleCreditsUpdated);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [currentUser?.email, fetchUserPlan]);

  // Manual refresh function
  const refreshPlan = useCallback(() => {
    if (currentUser?.email) {
      setPlanLoading(true);
      fetchUserPlan(currentUser.email, true); // Force refresh
    }
  }, [currentUser?.email, fetchUserPlan]);

  // Derived values
  const normalizedPlan = normalizePlan(
    userPlan?.user?.plan || (userPlan?.user?.isPro ? 'pro' : 'free')
  );
  const isPro = normalizedPlan !== 'free' || Boolean(userPlan?.user?.isPro);
  const isMax = normalizedPlan === 'max' || Boolean(userPlan?.user?.isMax);
  const isPaid = isPro || isMax;

  // Remaining images: -1 for paid/unlimited, bounded number for free users
  const dailyLimit = isPaid ? -1 : (userPlan?.limits?.dailyLimit || 10);
  const dailyCount = userPlan?.limits?.dailyCount || 0;
  const remainingImages = isPaid
    ? -1
    : (typeof userPlan?.limits?.remainingImages === 'number'
      ? userPlan.limits.remainingImages
      : Math.max(0, dailyLimit - dailyCount));

  const canGenerateImage = isPaid ? true : (remainingImages > 0);

  // Credit balances
  const credits = userPlan?.user?.credits ?? 0;
  const paidCredits = userPlan?.user?.paid_credits ?? 0;

  // hasPaidCredits: true when user has remaining paid credits (even if plan expired)
  // This is used to lock/unlock paid models in the model picker in real time
  const hasPaidCredits = paidCredits > 0;

  return {
    userPlan,
    planLoading,
    error,
    refreshPlan,
    canGenerateImage,
    remainingImages,
    isPro,
    isMax,
    isPaid,
    planName: isMax ? 'max' : isPro ? 'pro' : 'free',
    planLabel: isMax ? 'Max' : isPro ? 'Pro' : 'Free',
    dailyCount,
    dailyLimit,
    credits,
    paidCredits,
    hasPaidCredits,
  };
}
