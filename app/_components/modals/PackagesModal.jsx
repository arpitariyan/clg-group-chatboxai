'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Crown, Zap, Shield, Sparkles, X } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { PLAN_FEATURES } from '@/lib/modelAccess';

const PackagesModal = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const userContext = useUser();
  
  // Add debugging
  console.log('PackagesModal - userContext keys:', Object.keys(userContext));
  console.log('PackagesModal - refreshUserData type:', typeof userContext.refreshUserData);
  
  // Destructure with fallback
  const { 
    plan = 'free', 
    isSpecialAccount = false, 
    refreshUserData = async () => {
      console.warn('refreshUserData not available, reloading page instead');
      window.location.reload();
    }
  } = userContext || {};
  
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Razorpay script when modal opens
  useEffect(() => {
    if (isOpen && !scriptLoaded && !window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => setScriptLoaded(true);
      script.onerror = () => {
        setPaymentError('Failed to load payment gateway. Please refresh and try again.');
      };
      document.body.appendChild(script);
      
      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    } else if (window.Razorpay) {
      setScriptLoaded(true);
    }
  }, [isOpen, scriptLoaded]);

  const handleUpgradeToPro = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    setPaymentError(null);

    try {
      // Check if Razorpay script is loaded
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Payment gateway is loading. Please wait a moment and try again.');
      }

      // Check if Razorpay key is configured
      if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
        throw new Error('Payment system is not configured. Please contact support.');
      }

      // Create Razorpay order
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 29900, // ₹299 in paisa
          currency: 'INR',
          receipt: `pro_${Date.now()}`, // Shortened receipt to stay under 40 chars
          userEmail: currentUser.email
        })
      });

      let orderData;
      try {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(`Server returned ${contentType || 'non-JSON'} response: ${response.statusText}`);
        }
        orderData = await response.json();
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        throw new Error('Invalid response from payment server. Please try again.');
      }

      console.log('Order creation response:', { response: response.ok, data: orderData });

      if (!response.ok) {
        const errorMessage = orderData.error || orderData.details || 'Failed to create payment order';
        throw new Error(errorMessage);
      }

      // Initialize Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'ChatBox AI',
        description: 'Pro Plan Subscription (Monthly)',
        order_id: orderData.id,
        handler: async function (response) {
          try {
            console.log('Payment response received:', response);
            setLoading(true);
            
            // Verify payment
            const verifyResponse = await fetch('/api/razorpay/webhook', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                user_email: currentUser.email
              })
            });

            console.log('Verify response status:', verifyResponse.status);
            
            let verifyData;
            try {
              const contentType = verifyResponse.headers.get('content-type');
              if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Server returned ${contentType || 'non-JSON'} response`);
              }
              verifyData = await verifyResponse.json();
              console.log('Verify response data:', verifyData);
            } catch (jsonError) {
              console.error('Failed to parse verification response as JSON:', jsonError);
              throw new Error('Invalid response from payment verification');
            }

            if (verifyResponse.ok && verifyData.success) {
              console.log('Payment verification successful:', verifyData);
              
              // Payment successful, refresh user data
              setLoading(true);
              
              try {
                await refreshUserData();
                console.log('User data refreshed successfully');
              } catch (refreshError) {
                console.error('Error refreshing user data:', refreshError);
                // Fallback: reload the page to refresh user data
                console.log('Falling back to page reload');
                window.location.reload();
                return;
              }
              
              // Give a moment for the state to update
              setTimeout(() => {
                setLoading(false);
                onClose();
                
                // Show success message with user details
                const message = `🎉 Congratulations! Your Pro subscription is now active.\n\n` +
                              `✅ 25,000 monthly credits activated\n` +
                              `✅ Access to all premium models\n` +
                              `✅ Priority support enabled\n\n` +
                              `Email: ${currentUser.email}`;
                
                alert(message);
              }, 1000);
              
            } else {
              const errorMessage = verifyData?.error || verifyData?.details || 'Payment verification failed';
              console.error('Payment verification failed:', errorMessage);
              throw new Error(errorMessage);
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            setLoading(false);
            setPaymentError(error.message || 'Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: currentUser.displayName || currentUser.email,
          email: currentUser.email,
        },
        theme: {
          color: '#8b5cf6'
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      console.error('Payment error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'An error occurred while processing your payment.';
      
      if (error.message.includes('Invalid response')) {
        errorMessage = 'Payment server error. Please try again in a moment.';
      } else if (error.message.includes('not configured')) {
        errorMessage = 'Payment system is not configured. Please contact support.';
      } else if (error.message.includes('failed to load')) {
        errorMessage = 'Payment gateway failed to load. Please refresh the page and try again.';
      } else if (error.message.includes('loading')) {
        errorMessage = 'Payment gateway is still loading. Please wait and try again.';
      } else if (error.message.includes('Invalid amount')) {
        errorMessage = 'Invalid payment amount. Please contact support.';
      } else if (error.message.includes('create order') || error.message.includes('payment order')) {
        errorMessage = 'Failed to initialize payment. Please check your internet connection and try again.';
      } else if (error.message.includes('receipt')) {
        errorMessage = 'Payment initialization error. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setPaymentError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const PlanCard = ({ planType, title, price, period, features, badge, icon: Icon, isCurrentPlan, isRecommended }) => (
    <Card className={`relative h-full transition-all duration-200 ${
      isCurrentPlan 
        ? 'ring-2 ring-primary bg-primary/5' 
        : 'hover:shadow-lg hover:scale-[1.02]'
    } ${isRecommended ? 'border-primary' : ''}`}>
      {badge && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground px-3 py-1">
            {badge}
          </Badge>
        </div>
      )}
      
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center mb-2">
          <Icon className={`w-8 h-8 ${planType === 'pro' ? 'text-amber-500' : 'text-primary'}`} />
        </div>
        <CardTitle className="text-2xl font-bold">{title}</CardTitle>
        <CardDescription className="text-lg">
          <span className="text-3xl font-bold text-foreground">{price}</span>
          {period && <span className="text-muted-foreground">/{period}</span>}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </div>
          ))}
        </div>

        <div className="pt-4">
          {isCurrentPlan ? (
            <Button disabled className="w-full" variant="secondary">
              <Shield className="w-4 h-4 mr-2" />
              Current Plan
            </Button>
          ) : planType === 'free' ? (
            <Button disabled className="w-full" variant="outline">
              Free Forever
            </Button>
          ) : isSpecialAccount ? (
            <Button disabled className="w-full" variant="secondary">
              <Crown className="w-4 h-4 mr-2" />
              Pro Active (Default)
            </Button>
          ) : (
            <Button 
              onClick={handleUpgradeToPro}
              disabled={loading || !scriptLoaded}
              className="w-full bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : !scriptLoaded ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Loading Payment...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[oklch(0.209_0_0)]">
        <DialogHeader className="text-center space-y-2">
          <div className="flex items-center justify-between w-full">
            {/* <div className="flex-1" /> */}
            <DialogTitle className="text-3xl font-bold bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Choose Your Plan
            </DialogTitle>
            {/* <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              <X className="w-4 h-4" />
            </Button> */}
          </div>
          <DialogDescription className="text-lg text-muted-foreground">
            Unlock the full potential of ChatBox AI with our flexible pricing plans
          </DialogDescription>
        </DialogHeader>

        {paymentError && (
          <div className="bg-red-50 dark:bg-[oklch(0.2478_0_0)] border border-red-200 dark:border-red-600 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <X className="w-5 h-5 text-red-500" />
              <p className="text-red-700 dark:text-red-300 font-medium">Payment Error</p>
            </div>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{paymentError}</p>
            <Button 
              onClick={() => setPaymentError(null)} 
              variant="outline" 
              size="sm" 
              className="mt-3"
            >
              Try Again
            </Button>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <PlanCard
            planType="free"
            title="Free Plan"
            price="₹0"
            period={null}
            features={PLAN_FEATURES.free.features}
            icon={Zap}
            isCurrentPlan={plan === 'free'}
            isRecommended={false}
          />

          <PlanCard
            planType="pro"
            title="Pro Plan"
            price="₹299"
            period="month"
            features={PLAN_FEATURES.pro.features}
            badge="Recommended"
            icon={Crown}
            isCurrentPlan={plan === 'pro'}
            isRecommended={true}
          />
        </div>

        <div className="mt-8 p-4 bg-gray-100 dark:bg-[oklch(0.2478_0_0)] rounded-lg">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-1" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Secure Payment</p>
              <p>All payments are processed securely through Razorpay. Your financial information is encrypted and protected. Cancel anytime from your settings.</p>
            </div>
          </div>
        </div>

        {/* Razorpay Script */}
        <script
          src="https://checkout.razorpay.com/v1/checkout.js"
          async
        />
      </DialogContent>
    </Dialog>
  );
};

export default PackagesModal;