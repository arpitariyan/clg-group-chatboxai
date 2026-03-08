'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';

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
      consumeCredits: async () => {
        console.warn('consumeCredits called outside UserProvider context');
      },
      checkMonthlyReset: async () => {
        console.warn('checkMonthlyReset called outside UserProvider context');
      },
      plan: 'free',
      credits: 0,
      isPro: false,
      isSpecialAccount: false
    };
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dbError, setDbError] = useState(false); // true when Supabase is unreachable

  const applySpecialAccountOverrides = (email, profile) => {
    if (email !== SPECIAL_ACCOUNT_EMAIL || !profile) return profile;

    return {
      ...profile,
      plan: 'pro',
      credits: typeof profile.credits === 'number' ? profile.credits : 25000,
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

      const res = await axios.get('/api/user/profile', {
        params: {
          email: user.email,
          name: user.displayName || getUserNameFromEmail(user.email),
          createIfMissing: true,
        },
      });

      const fetchedUser = res?.data?.user || null;
      
      // console.log('=== fetchUserData result ===', {
      //   mfa_enabled: fetchedUser?.mfa_enabled,
      //   mfa_email: fetchedUser?.mfa_email,
      //   updatedAt: fetchedUser?.$updatedAt,
      //   docId: fetchedUser?.$id
      // });
      
      setUserData(applySpecialAccountOverrides(user.email, fetchedUser));
    } catch (error) {
      const isTimeout = error?.message?.includes('timeout') || error?.message?.includes('fetch failed');
      if (isTimeout) setDbError(true);
      console.error('Error fetching user data:', error?.message || error);
      setUserData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  // Update user data
  const updateUserData = async (updates) => {
    if (!currentUser) return null;

    try {
      const response = await axios.patch('/api/user/profile', {
        email: currentUser.email,
        updates,
      });

      // Merge existing state + optimistic updates + API response
      // This ensures if the API response is missing a field like mfa_enabled,
      // the local state will still optimistically reflect the requested update.
      const merged = {
        ...(userData || {}),
        ...updates,
        ...(response?.data?.user || {}),
      };

      const updatedUser = applySpecialAccountOverrides(currentUser.email, merged);

      setUserData(updatedUser);
      return updatedUser;
    } catch (error) {
      const isNameUpdate = Object.prototype.hasOwnProperty.call(updates || {}, 'name');
      const isTimeout = error?.message?.includes('timeout') || error?.message?.includes('fetch failed');
      if (isTimeout) {
        console.warn('[UserContext] Appwrite unreachable in updateUserData, applying update locally');
      }
      console.warn('[UserContext] Error updating user data (non-fatal):', error?.message || error);
      if (isNameUpdate) {
        // Name changes must persist in DB; do not mask failures with optimistic local-only state.
        throw error;
      }
      // Apply update optimistically so the UI stays consistent
      const updated = applySpecialAccountOverrides(currentUser.email, { ...(userData || {}), ...updates });
      setUserData(updated);
      return updated;
    }
  };

  // Refresh user data
  const refreshUserData = async () => {
    if (currentUser) {
      await fetchUserData(currentUser);
    }
  };

  // Consume credits
  const consumeCredits = async (amount) => {
    if (!userData) throw new Error('User data not loaded');
    
    if (userData.credits < amount) {
      throw new Error('Insufficient credits');
    }

    const newCredits = Math.max(0, userData.credits - amount);
    return await updateUserData({ credits: newCredits });
  };

  // Check if monthly reset is needed
  const checkMonthlyReset = async () => {
    if (!userData) return;

    // Skip if last_monthly_reset is missing/invalid (avoids 1970 false-trigger)
    if (!userData.last_monthly_reset) return;

    const lastReset = new Date(userData.last_monthly_reset);
    if (isNaN(lastReset.getTime())) return; // Unparseable date — skip

    const now = new Date();
    const daysDiff = Math.floor((now - lastReset) / (1000 * 60 * 60 * 24));

    if (daysDiff >= 30) {
      const resetCredits = userData.plan === 'pro' ? 25000 : 5000;
      await updateUserData({
        credits: resetCredits,
        last_monthly_reset: now.toISOString().split('T')[0]
      });
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
  }, [userData, refreshing]);

  // Fetch user data when auth state changes
  useEffect(() => {
    fetchUserData(currentUser);
  }, [currentUser]);

  const value = {
    userData,
    loading,
    refreshing,
    dbError,
    updateUserData,
    refreshUserData,
    consumeCredits,
    checkMonthlyReset,
    // Computed values for convenience
    plan: userData?.plan || 'free',
    credits: userData?.credits || 0,
    // Check if user is Pro AND subscription hasn't expired
    isPro: (() => {
      if (userData?.plan !== 'pro') return false;
      
      // Special account check - always Pro
      if (currentUser?.email === SPECIAL_ACCOUNT_EMAIL) return true;
      
      // Check subscription expiry
      if (userData?.subscription_end_date) {
        const endDate = new Date(userData.subscription_end_date);
        const now = new Date();
        return endDate > now; // Pro only if subscription hasn't expired
      }
      
      // If no end date but plan is pro, consider it active (for backwards compatibility)
      return true;
    })(),
    isSpecialAccount: currentUser?.email === SPECIAL_ACCOUNT_EMAIL
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};