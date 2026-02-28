import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook for managing user plan information and image generation limits
 * @returns {Object} User plan data and utilities
 */
export function useUserPlan() {
    const { currentUser } = useAuth();
    const [userPlan, setUserPlan] = useState(null);
    const [planLoading, setPlanLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchUserPlan = async (userEmail) => {
        if (!userEmail) {
            setPlanLoading(false);
            return;
        }

        try {
            setError(null);
            const response = await fetch(`/api/user/plan?email=${userEmail}`);
            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    setUserPlan(data);
                } else {
                    setError('Server returned invalid response format');
                }
            } else {
                try {
                    const contentType = response.headers.get('content-type');
                    const errorData = contentType && contentType.includes('application/json') 
                        ? await response.json() 
                        : { error: `HTTP ${response.status}: ${response.statusText}` };
                    setError(errorData.error || 'Failed to fetch user plan');
                } catch (parseError) {
                    setError('Failed to fetch user plan');
                }
            }
        } catch (error) {
            console.error('Error fetching user plan:', error);
            setError('Failed to fetch user plan');
        } finally {
            setPlanLoading(false);
        }
    };

    // Fetch plan data when user changes
    useEffect(() => {
        if (currentUser?.email) {
            fetchUserPlan(currentUser.email);
        } else {
            setUserPlan(null);
            setPlanLoading(false);
        }
    }, [currentUser]);

    // Manual refresh function
    const refreshPlan = () => {
        if (currentUser?.email) {
            setPlanLoading(true);
            fetchUserPlan(currentUser.email);
        }
    };

    // Check if user can generate more images
    const canGenerateImage = userPlan?.limits?.canGenerate || false;
    
    // Get remaining images for free users
    const remainingImages = userPlan?.user?.isPro 
        ? -1 // Unlimited
        : Math.max(0, (userPlan?.limits?.dailyLimit || 0) - (userPlan?.limits?.dailyCount || 0));

    return {
        userPlan,
        planLoading,
        error,
        refreshPlan,
        canGenerateImage,
        remainingImages,
        isPro: userPlan?.user?.isPro || false,
        planName: userPlan?.user?.isPro ? 'Pro' : 'Free',
        dailyCount: userPlan?.limits?.dailyCount || 0,
        dailyLimit: userPlan?.limits?.dailyLimit || 10
    };
}

export default useUserPlan;