import { useState, useEffect } from 'react';
import { checkUserPlan, getSubscriptionDetails, getSubscriptionStatusMessage } from '@/lib/planUtils';

/**
 * Custom hook for managing subscription status across components
 * Provides real-time subscription data based on database values
 */
export const useSubscription = (userEmail) => {
  const [subscriptionData, setSubscriptionData] = useState({
    planInfo: null,
    details: null,
    statusMessage: '',
    effectivePlan: 'free',
    isActive: false,
    isPro: false,
    monthlyCredits: 5000,
    monthlyPrice: 0,
    currency: 'INR',
    loading: true,
    error: null
  });

  const loadSubscriptionData = async () => {
    if (!userEmail) {
      setSubscriptionData(prev => ({
        ...prev,
        loading: false,
        effectivePlan: 'free',
        isActive: false,
        isPro: false,
        monthlyCredits: 5000,
        monthlyPrice: 0
      }));
      return;
    }

    try {
      setSubscriptionData(prev => ({ ...prev, loading: true, error: null }));

      const [planInfo, subDetails, statusMessage] = await Promise.all([
        checkUserPlan(userEmail),
        getSubscriptionDetails(userEmail),
        getSubscriptionStatusMessage(userEmail)
      ]);

      const effectivePlan = planInfo.plan || 'free';
      const isPro = planInfo.isPro && !planInfo.isExpired;
      const isActive = subDetails.isActive && isPro;

      setSubscriptionData({
        planInfo,
        details: subDetails,
        statusMessage,
        effectivePlan,
        isActive,
        isPro,
        monthlyCredits: isPro ? 25000 : 5000,
        monthlyPrice: isPro ? 299 : 0,
        currency: 'INR',
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error loading subscription data:', error);
      setSubscriptionData(prev => ({
        ...prev,
        loading: false,
        error: error.message,
        effectivePlan: 'free',
        isActive: false,
        isPro: false,
        monthlyCredits: 5000,
        monthlyPrice: 0
      }));
    }
  };

  useEffect(() => {
    loadSubscriptionData();
  }, [userEmail]);

  // Function to manually refresh subscription data
  const refreshSubscription = () => {
    loadSubscriptionData();
  };

  return {
    ...subscriptionData,
    refreshSubscription
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
    subscription
  };
};

export default useSubscription;