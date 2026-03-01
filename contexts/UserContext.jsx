'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/services/supabase';

const UserContext = createContext({});

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

  const fetchUserData = async (user) => {
    if (!user) {
      setUserData(null);
      setLoading(false);
      return;
    }

    // Owner account — skip all Supabase queries, use hardcoded pro profile
    if (user.email === 'arpitariyanm@gmail.com') {
      setDbError(false);
      setUserData({
        email: 'arpitariyanm@gmail.com',
        name: user.displayName || 'Arpit',
        plan: 'pro',
        credits: 25000,
        mfa_enabled: false,
        accent_color: 'violet',
        language: 'en',
        subscription_start_date: null,
        subscription_end_date: null,
        last_monthly_reset: null,
      });
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setRefreshing(true);
      
      // Check if user exists in Supabase
      let { data: existingUser, error } = await supabase
        .from('Users')
        .select('*')
        .eq('email', user.email)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Network/connection errors (e.g. Supabase paused or timeout) — handle gracefully
        const isTimeout = error.code === 'TIMEOUT' || error.message?.includes('timeout') || error.message?.includes('fetch failed');
        console.error('Error fetching user from Supabase:', error?.message || JSON.stringify(error));
        if (isTimeout) {
          console.warn('[UserContext] Supabase is unreachable (timeout). Check if your Supabase project is paused at https://supabase.com/dashboard');
          setDbError(true);
        }
        setUserData(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // If user doesn't exist, create them
      if (!existingUser) {
        const newUser = {
          email: user.email,
          name: user.displayName || getUserNameFromEmail(user.email),
          plan: 'free',
          credits: 5000,
          last_monthly_reset: new Date().toISOString().split('T')[0],
          mfa_enabled: false,
          accent_color: 'violet',
          language: 'en'
        };

        const { data: createdUser, error: createError } = await supabase
          .from('Users')
          .insert([newUser])
          .select()
          .single();

        if (createError) throw createError;
        existingUser = createdUser;
      }

      setUserData(existingUser);
    } catch (error) {
      if (error && error.message) {
        const isTimeout = error.code === 'TIMEOUT' || error.message?.includes('timeout') || error.message?.includes('fetch failed');
        if (isTimeout) setDbError(true);
        console.error('Error fetching user data:', error);
      }
      setUserData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  // Update user data
  const updateUserData = async (updates) => {
    if (!currentUser || !userData) return null;

    // Owner account — update state in memory only, never touch Supabase
    if (currentUser.email === 'arpitariyanm@gmail.com') {
      const updated = { ...userData, ...updates };
      setUserData(updated);
      return updated;
    }

    try {
      const { data: updatedUser, error } = await supabase
        .from('Users')
        .update(updates)
        .eq('email', currentUser.email)
        .select()
        .single();

      if (error) {
        const isTimeout = error.code === 'TIMEOUT' || error.message?.includes('timeout') || error.message?.includes('fetch failed');
        if (isTimeout) {
          // Supabase unreachable — apply update optimistically in memory
          console.warn('[UserContext] Supabase unreachable in updateUserData, applying update locally');
          const updated = { ...userData, ...updates };
          setUserData(updated);
          return updated;
        }
        throw error;
      }

      setUserData(updatedUser);
      return updatedUser;
    } catch (error) {
      console.warn('[UserContext] Error updating user data (non-fatal):', error?.message || error);
      // Apply update optimistically so the UI stays consistent
      const updated = { ...userData, ...updates };
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
      if (currentUser?.email === 'arpitariyanm@gmail.com') return true;
      
      // Check subscription expiry
      if (userData?.subscription_end_date) {
        const endDate = new Date(userData.subscription_end_date);
        const now = new Date();
        return endDate > now; // Pro only if subscription hasn't expired
      }
      
      // If no end date but plan is pro, consider it active (for backwards compatibility)
      return true;
    })(),
    isSpecialAccount: currentUser?.email === 'arpitariyanm@gmail.com'
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};