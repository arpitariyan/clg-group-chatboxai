'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';
import { getPlanMonthlyCredits, getPlanPaidCredits, normalizePlan } from '@/lib/subscriptionPlans';

const UserContext = createContext({});
const SPECIAL_ACCOUNT_EMAIL = 'arpitariyanm@gmail.com';

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    console.error('useUser must be used within a UserProvider');
    return {
      userData: null,
      loading: true,
      refreshing: false,
      updateUserData: async () => {
        console.warn('updateUserData called outside UserProvider context');
      },
      refreshUserData: async () => {
        console.warn('refreshUserData called outside UserProvider context');
      },
      refreshCredits: async () => {
        console.warn('refreshCredits called outside UserProvider context');
      },
      consumeCredits: async () => {
        console.warn('consumeCredits called outside UserProvider context');
      },
      checkMonthlyReset: async () => {
        console.warn('checkMonthlyReset called outside UserProvider context');
      },
      plan: 'free',
      credits: 0,
      paidCredits: 0,
      isPro: false,
      isSpecialAccount: false,
    };
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dbError, setDbError] = useState(false); // true when Appwrite is unreachable

  const applySpecialAccountOverrides = (email, profile) => {
    if (email !== SPECIAL_ACCOUNT_EMAIL || !profile) return profile;

    const dbPlan = normalizePlan(profile.plan);
    if (dbPlan === 'max') return profile;

    return {
      ...profile,
      plan: 'pro',
      credits: typeof profile.credits === 'number' ? profile.credits : getPlanMonthlyCredits('pro'),
    };
  };

  const fetchUserData = async (user) => {
    if (!user) {
      setUserData(null);
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);

      const token = await user.getIdToken?.().catch(() => null);
      if (!token) {
        setUserData(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const res = await axios.get('/api/user/profile', {
        params: {
          email: user.email,
          name: user.displayName || getUserNameFromEmail(user.email),
          createIfMissing: true,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const fetchedUser = res?.data?.user || null;
      const processed = applySpecialAccountOverrides(user.email, fetchedUser);
      setUserData(processed);
      // setUserData triggers React re-renders for all consumers; no extra event needed here.
    } catch (error) {
      if (error?.response?.status === 401) {
        // User session invalid or unauthenticated — gracefully reset user data without console error
        setUserData(null);
        return;
      }
      const axiosMsg = String(error?.message || '').toLowerCase();
      const apiMsg = String(
        error?.response?.data?.details || error?.response?.data?.error || ''
      ).toLowerCase();
      const isTimeout =
        axiosMsg.includes('timeout') ||
        axiosMsg.includes('fetch failed') ||
        axiosMsg.includes('network error') ||
        apiMsg.includes('timeout') ||
        apiMsg.includes('fetch failed') ||
        apiMsg.includes('network error');

      if (isTimeout) setDbError(true);
      console.error(
        'Error fetching user data:',
        error?.response?.data?.details || error?.message || error
      );
      setUserData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Lightweight credit refresh — only fetches the credit balance via the
   * dedicated balance endpoint, then patches userData in-place.
   * Much faster than a full profile refresh; used after every AI request.
   */
  const refreshCredits = useCallback(async () => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken?.();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get('/api/credits/balance', { headers });
      const data = res?.data;
      if (!data?.success) return;

      const { breakdown } = data;
      const newCredits = breakdown?.dailyFreeCredits ?? 0;
      const newPaidCredits = breakdown?.monthlyPaidCredits ?? 0;

      setUserData(prev => {
        if (!prev) return prev;
        return { ...prev, credits: newCredits, paid_credits: newPaidCredits };
      });
      // NOTE: Do NOT re-dispatch 'creditsUpdated' here — it would create an infinite loop
      // (creditsUpdated → refreshCredits → creditsUpdated → ...).
      // State update via setUserData is sufficient for all React consumers.
    } catch {
      // Non-fatal — sidebar will update on the next full refresh
    }
  }, [currentUser]);

  // Update user data
  const updateUserData = async (updates) => {
    const user = currentUser || auth?.currentUser;
    if (!user) return null;

    try {
      const token = await user.getIdToken?.().catch(() => null);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.patch('/api/user/profile', {
        email: user.email,
        updates,
      }, { headers });

      // Merge existing state + optimistic updates + API response
      const merged = {
        ...(userData || {}),
        ...updates,
        ...(response?.data?.user || {}),
      };

      const updatedUser = applySpecialAccountOverrides(currentUser.email, merged);
      setUserData(updatedUser);

      // Notify listeners if credits were part of the update
      if ('credits' in updates || 'paid_credits' in updates) {
        window.dispatchEvent(new CustomEvent('creditsUpdated', {
          detail: {
            credits: updatedUser?.credits ?? 0,
            paid_credits: updatedUser?.paid_credits ?? 0,
            plan: updatedUser?.plan ?? 'free',
          }
        }));
      }

      return updatedUser;
    } catch (error) {
      const isNameUpdate = Object.prototype.hasOwnProperty.call(updates || {}, 'name');
      const axiosMsg = String(error?.message || '').toLowerCase();
      const apiMsg = String(
        error?.response?.data?.details || error?.response?.data?.error || ''
      ).toLowerCase();
      const isTimeout =
        axiosMsg.includes('timeout') ||
        axiosMsg.includes('fetch failed') ||
        axiosMsg.includes('network error') ||
        apiMsg.includes('timeout') ||
        apiMsg.includes('fetch failed') ||
        apiMsg.includes('network error');

      if (isTimeout) {
        console.warn('[UserContext] Appwrite unreachable in updateUserData, applying update locally');
      }
      console.warn('[UserContext] Error updating user data (non-fatal):', error?.message || error);
      if (isNameUpdate) {
        // Name changes must persist in DB; do not mask failures with optimistic local-only state.
        throw error;
      }
      // Apply update optimistically so the UI stays consistent
      const updated = applySpecialAccountOverrides(currentUser.email, {
        ...(userData || {}),
        ...updates,
      });
      setUserData(updated);
      return updated;
    }
  };

  // Refresh user data (full profile)
  const refreshUserData = async () => {
    if (currentUser) {
      await fetchUserData(currentUser);
    }
  };

  // Consume credits (client-side optimistic update + server persistence)
  const consumeCredits = async (amount) => {
    if (!userData) throw new Error('User data not loaded');

    if (userData.credits < amount) {
      throw new Error('Insufficient credits');
    }

    const newCredits = Math.max(0, userData.credits - amount);
    return await updateUserData({ credits: newCredits });
  };

  // Check if monthly reset is needed (client-side safety net — server is authoritative)
  const checkMonthlyReset = async () => {
    if (!userData) return;

    // Skip if last_monthly_reset is missing/invalid (avoids 1970 false-trigger)
    if (!userData.last_monthly_reset) return;

    const lastReset = new Date(userData.last_monthly_reset);
    if (isNaN(lastReset.getTime())) return; // Unparseable date — skip

    const now = new Date();
    const daysDiff = Math.floor((now - lastReset) / (1000 * 60 * 60 * 24));

    if (daysDiff >= 30) {
      const normalizedPlan = normalizePlan(userData.plan);
      // Pro/Max: reset paid_credits. Free: reset daily credits.
      if (normalizedPlan !== 'free') {
        const currentPaidCredits = Math.max(0, Number(userData.paid_credits ?? 0));
        const resetPaidCredits = currentPaidCredits + getPlanPaidCredits(normalizedPlan);
        await updateUserData({
          paid_credits: resetPaidCredits,
          last_monthly_reset: now.toISOString().split('T')[0],
        });
      } else {
        await updateUserData({
          last_monthly_reset: now.toISOString().split('T')[0],
        });
      }
    }
  };

  // Helper function to extract name from email
  const getUserNameFromEmail = (email) => {
    if (!email) return 'User';
    const emailName = email.split('@')[0];
    const cleanName = emailName.replace(/[0-9._-]/g, '');
    return cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase() || 'User';
  };

  // Check for monthly reset when user data loads
  useEffect(() => {
    if (userData && !refreshing) {
      checkMonthlyReset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData, refreshing]);

  // Fetch user data when auth state changes
  useEffect(() => {
    fetchUserData(currentUser);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Listen for 'creditsUpdated' events — refresh credit balance so all
  // components reading from userData stay in sync.
  // Debounced to 2 seconds to avoid hammering the balance endpoint.
  useEffect(() => {
    let debounceTimer = null;
    const handleCreditsUpdated = () => {
      // Use refreshCredits (lightweight) instead of full refreshUserData to avoid
      // hammering the profile endpoint on every AI request.
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refreshCredits();
      }, 2000); // 2-second debounce
    };
    window.addEventListener('creditsUpdated', handleCreditsUpdated);
    return () => {
      window.removeEventListener('creditsUpdated', handleCreditsUpdated);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const value = {
    userData,
    loading,
    refreshing,
    dbError,
    updateUserData,
    refreshUserData,
    refreshCredits,
    consumeCredits,
    checkMonthlyReset,
    // Computed values for convenience
    plan: userData?.plan || 'free',
    // Daily free credits (5,000/day — applies to ALL plans, used for free-tier models only)
    credits: userData?.credits ?? 0,
    // Monthly paid credits (Pro: 30,000 | Max: 150,000 — used for paid models only)
    paidCredits: userData?.paid_credits ?? 0,
    // Check if user is Pro AND subscription hasn't expired
    isPro: (() => {
      const normalizedPlan = normalizePlan(userData?.plan);
      if (!['pro', 'max'].includes(normalizedPlan)) return false;

      // Special account check - always Pro
      if (currentUser?.email === SPECIAL_ACCOUNT_EMAIL) return true;

      // Check subscription expiry
      if (userData?.subscription_end_date) {
        const endDate = new Date(userData.subscription_end_date);
        const now = new Date();
        return endDate > now; // Pro only if subscription hasn't expired
      }

      // If no end date but plan is pro/max, consider it active (manual/permanent upgrade)
      return true;
    })(),
    isMax: normalizePlan(userData?.plan) === 'max',
    isSpecialAccount: currentUser?.email === SPECIAL_ACCOUNT_EMAIL,
    memoryEnabled: userData?.memory_enabled !== false, // Default to true if not set
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};