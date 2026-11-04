'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, ArrowLeft, ArrowRight, Shield, X } from '@/components/ui/animated-icon';
import { Tag, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authFetch } from '@/lib/auth-fetch';
import { useUser } from '@/contexts/UserContext';
import { useSubscription } from '@/hooks/useSubscription';
import { ensureRazorpayScript } from '@/lib/razorpay-loader';
import { PLAN_FEATURES } from '@/lib/modelAccess';
import { getPlanAnnualPrice, getPlanDisplayName, getPlanMonthlyPrice, normalizePlan } from '@/lib/subscriptionPlans';
import { calculateCouponDiscount } from '@/lib/coupon-calculator';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.21, 0.47, 0.32, 0.98] },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const PLAN_ORDER = ['free', 'pro', 'max'];

const PLAN_CONFIG = {
  free: {
    name: 'Free',
    description: 'Perfect for getting started',
    popular: false,
  },
  pro: {
    name: 'Pro',
    description: 'Full power for creators and teams',
    popular: true,
  },
  max: {
    name: 'Max',
    description: 'Highest limits for power users',
    popular: false,
  },
};

const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$)' },
  { code: 'CAD', symbol: 'C$', label: 'CAD (C$)' },
];

export default function PricingPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { userData, refreshUserData, updateUserData, plan = 'free', loading: userLoading = false } = useUser() || {};
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponValidationLoading, setCouponValidationLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  
  const [selectedCurrency, setSelectedCurrency] = useState('INR');
  const [exchangeRates, setExchangeRates] = useState(null);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [dynamicPlans, setDynamicPlans] = useState(null);

  // Dynamic live plans polling (2-5s live update from admin panel)
  useEffect(() => {
    let active = true;
    const fetchLivePlans = async () => {
      try {
        const res = await fetch('/api/pricing-plans', { cache: 'no-store' });
        const data = await res.json();
        if (active && data.success && Array.isArray(data.plans)) {
          const map = {};
          for (const p of data.plans) {
            map[p.plan_id] = p;
          }
          setDynamicPlans(map);
        }
      } catch (err) {
        console.warn('Failed to load dynamic plans on pricing page:', err);
      }
    };

    fetchLivePlans();
    const interval = setInterval(fetchLivePlans, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const subscription = useSubscription(
    currentUser?.email,
    `${userData?.plan || ''}|${userData?.subscription_start_date || ''}|${userData?.subscription_end_date || ''}|${userData?.credits || ''}`
  );
  const normalizedPlan = subscription.loading
    ? normalizePlan(userData?.plan || plan)
    : normalizePlan(subscription.effectivePlan || userData?.plan || plan);

  useEffect(() => {
    let active = true;
    ensureRazorpayScript()
      .then(() => { if (active) setScriptLoaded(true); })
      .catch(() => {
        if (active) {
          setScriptLoaded(false);
          setPaymentError('Failed to load payment gateway. Please refresh and try again.');
        }
      });
      
    // Fetch Exchange Rates and Location for Currency
    const fetchCurrencyData = async () => {
      try {
        const ratesRes = await fetch('https://api.exchangerate-api.com/v4/latest/INR');
        const ratesData = await ratesRes.json();
        if (active && ratesData.rates) {
          setExchangeRates(ratesData.rates);
        }
        
        const locRes = await fetch('https://ipapi.co/json/');
        const locData = await locRes.json();
        if (active && locData.currency) {
          if (SUPPORTED_CURRENCIES.some(c => c.code === locData.currency)) {
            setSelectedCurrency(locData.currency);
          } else if (locData.country_code !== 'IN') {
            setSelectedCurrency('USD');
          }
        }
      } catch (err) {
        console.error('Failed to fetch currency data:', err);
      }
    };
    
    fetchCurrencyData();

    return () => { active = false; };
  }, []);

  const formatPrice = (inrAmount) => {
    if (selectedCurrency === 'INR' || !exchangeRates || !exchangeRates[selectedCurrency]) {
      return `₹${inrAmount}`;
    }
    const rate = exchangeRates[selectedCurrency];
    const converted = inrAmount * rate;
    
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: selectedCurrency,
      minimumFractionDigits: converted % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    }).format(converted);
  };

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/app');
  };

  const handleApplyCoupon = async (overrideCode) => {
    const codeToValidate = (overrideCode || couponInput || '').trim().toUpperCase();
    if (!codeToValidate) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    if (!currentUser) {
      setCouponError('Please sign in to apply coupon codes.');
      return;
    }

    setCouponValidationLoading(true);
    setCouponError('');
    setCouponSuccess('');

    try {
      const res = await authFetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeToValidate,
          planType: 'any',
          billingCycle,
          currency: selectedCurrency,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setAppliedCoupon(null);
        setCouponError(data?.error || 'Invalid or expired coupon code.');
        return;
      }

      setAppliedCoupon(data.coupon);
      setCouponInput(data.coupon.code);
      const discountDesc = data.coupon.discountType === 'percentage'
        ? `${data.coupon.discountValue}% OFF`
        : `₹${data.coupon.discountValue} OFF`;
      setCouponSuccess(`Coupon ${data.coupon.code} applied (${discountDesc})!`);
    } catch (err) {
      console.error('Coupon validation error:', err);
      setCouponError('Failed to validate coupon code. Please try again.');
    } finally {
      setCouponValidationLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
    setCouponSuccess('');
  };

  const handlePurchase = (planType) => {
    if (!currentUser) {
      router.push('/sign-in');
      return;
    }
    if (planType === 'free') return;

    handleRazorpayCheckout(planType);
  };

  const handleRazorpayCheckout = async (planType) => {
    setLoadingPlan(planType);
    setPaymentError('');

    try {
      if (!scriptLoaded || !window.Razorpay) {
        await ensureRazorpayScript();
      }

      const dynPlan = dynamicPlans?.[planType];
      const planAmount = dynPlan
        ? (billingCycle === 'annual' ? dynPlan.annual_price : dynPlan.monthly_price)
        : (billingCycle === 'annual' ? getPlanAnnualPrice(planType) : getPlanMonthlyPrice(planType));

      let finalAmountInSmallestUnit = planAmount * 100;
      let finalCurrency = 'INR';

      if (selectedCurrency !== 'INR' && exchangeRates && exchangeRates[selectedCurrency]) {
         const rate = exchangeRates[selectedCurrency];
         let converted = planAmount * rate;
         // Match the same rounding logic we use in formatPrice (to 2 decimal places)
         converted = Number(converted.toFixed(2));
         finalAmountInSmallestUnit = Math.round(converted * 100);
         finalCurrency = selectedCurrency;
      }

      const response = await authFetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalAmountInSmallestUnit,
          currency: finalCurrency,
          receipt: `${planType}_${billingCycle}_${Date.now()}`,
          userEmail: currentUser.email,
          planType,
          billingCycle,
          couponCode: appliedCoupon?.code || undefined,
        }),
      });

      const orderData = await response.json();
      if (!response.ok) {
        throw new Error(orderData?.details || orderData?.error || 'Failed to create payment order');
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'ChatBox AI',
        description: `${planType === 'max' ? 'Max' : 'Pro'} Plan Subscription (${billingCycle})`,
        order_id: orderData.id,
        handler: async (paymentResponse) => {
          const verifyResponse = await authFetch('/api/razorpay/verify-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            }),
          });

          const verifyData = await verifyResponse.json();
          if (!verifyResponse.ok || !verifyData.success) {
            throw new Error(verifyData?.details || verifyData?.error || 'Payment verification failed');
          }

          if (updateUserData) {
            const localUpdates = { plan: planType };
            if (typeof verifyData?.user?.credits === 'number') {
              localUpdates.credits = verifyData.user.credits;
            }
            await updateUserData(localUpdates);
          }
          if (refreshUserData) await refreshUserData();
          if (subscription?.refreshSubscription) await subscription.refreshSubscription();

          router.push('/app');
        },
        prefill: {
          name: userData?.name || currentUser.displayName || currentUser.email,
          email: currentUser.email,
        },
        theme: { color: planType === 'max' ? '#4a3c6a' : '#3a2c5a' },
        modal: { ondismiss: () => setLoadingPlan(null) },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment flow error:', error);
      setPaymentError(error?.message || 'An error occurred while processing payment.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen relative bg-[#0c0a09] text-white">
      {/* Subtle top border line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-4 sm:pt-6 pb-12 sm:pb-16">
        {/* Top navigation row */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleClose}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="text-xs font-mono text-neutral-400 bg-white/5 border border-white/10 rounded-full px-3 py-1">
            {userLoading || subscription.loading
              ? 'Loading...'
              : `Current: ${getPlanDisplayName(normalizedPlan)}`}
          </div>
        </div>

        {/* Header section — matches landing page typography & style */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="mb-8"
        >
          <motion.div variants={fadeInUp} className="flex items-center gap-3 mb-3">
            <span className="eyebrow text-xs uppercase tracking-[0.2em] text-[#7a6a9a] font-mono font-medium">PLANS</span>
          </motion.div>
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-medium text-white tracking-tight leading-[1.1]">
                Simple pricing,
                <br />
                <em className="font-serif italic text-muted-foreground">no surprises.</em>
              </h1>
            </div>
            
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Currency Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                  className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3.5 py-2 text-xs sm:text-sm font-medium text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <span>{SUPPORTED_CURRENCIES.find(c => c.code === selectedCurrency)?.code || 'INR'}</span>
                  <svg className={`w-3.5 h-3.5 opacity-60 transition-transform ${isCurrencyDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>

                {isCurrencyDropdownOpen && (
                  <div className="absolute right-0 sm:right-auto sm:left-0 mt-2 w-32 bg-[#16131f] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                    {SUPPORTED_CURRENCIES.map((currency) => (
                      <button
                        key={currency.code}
                        type="button"
                        onClick={() => {
                          setSelectedCurrency(currency.code);
                          setIsCurrencyDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors ${
                          selectedCurrency === currency.code
                            ? 'bg-white/15 text-white font-semibold'
                            : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
                        }`}
                      >
                        {currency.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Billing toggle — clean Monthly / Annual without hardcoded -17% */}
              <div className="inline-flex items-center p-1 bg-white/5 rounded-full border border-white/10">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 ${
                    billingCycle === 'monthly' ? 'bg-white text-black shadow-sm font-semibold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`px-4 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 ${
                    billingCycle === 'annual' ? 'bg-white text-black shadow-sm font-semibold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Annual
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Payment error */}
        {paymentError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs sm:text-sm text-red-200"
          >
            <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <div>{paymentError}</div>
          </motion.div>
        )}

        {/* Coupon Code Section */}
        <div className="mb-8">
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-[#5a4a7a]/20 border border-[#5a4a7a]/30 flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4 text-[#bba4e5]" />
              </div>
              <div className="flex-1 sm:flex-initial">
                <div className="text-sm font-medium text-white flex items-center gap-1.5">
                  Have a promotional code?
                </div>
                <div className="text-xs text-neutral-400">Apply coupon codes for instant discounts on Pro &amp; Max plans</div>
              </div>
            </div>

            {appliedCoupon ? (
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-mono font-semibold tracking-wider">{appliedCoupon.code}</span>
                  <span className="text-neutral-500">·</span>
                  <span className="font-semibold">
                    {appliedCoupon.discountType === 'percentage'
                      ? `${appliedCoupon.discountValue}% OFF`
                      : `₹${appliedCoupon.discountValue} OFF`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Remove coupon"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value.toUpperCase());
                    if (couponError) setCouponError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyCoupon();
                    }
                  }}
                  placeholder="COUPON CODE"
                  maxLength={20}
                  className="w-full sm:w-44 h-10 px-3.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-neutral-500 text-xs font-mono uppercase tracking-wider focus:outline-none focus:border-[#7a6a9a] transition-colors"
                />
                <Button
                  type="button"
                  onClick={() => handleApplyCoupon()}
                  disabled={couponValidationLoading || !couponInput.trim()}
                  className="h-10 px-4 rounded-xl bg-[#5a4a7a] hover:bg-[#6e5b94] text-white text-xs font-medium shrink-0 disabled:opacity-50"
                >
                  {couponValidationLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Apply'
                  )}
                </Button>
              </div>
            )}
          </div>

          {couponError && (
            <div className="mt-2.5 text-xs text-red-400 px-2 flex items-center gap-1.5">
              <X className="w-3.5 h-3.5 shrink-0" />
              <span>{couponError}</span>
            </div>
          )}
          {couponSuccess && !couponError && (
            <div className="mt-2.5 text-xs text-emerald-400 px-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{couponSuccess}</span>
            </div>
          )}
        </div>

        {/* Plan Cards Grid — matches landing page grid style */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="pricing-grid grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 items-stretch"
        >
          {PLAN_ORDER.map((planKey, index) => {
            const dynamicConfig = dynamicPlans?.[planKey];
            const name = dynamicConfig?.name || PLAN_CONFIG[planKey].name;
            const description = dynamicConfig?.description || PLAN_CONFIG[planKey].description;
            const isPopular = dynamicConfig !== undefined ? Boolean(dynamicConfig.is_popular) : PLAN_CONFIG[planKey].popular;
            const badgeText = dynamicConfig?.badge_text || (isPopular ? 'POPULAR' : '');
            const discountBadge = dynamicConfig?.discount_badge || (planKey === 'pro' ? '50% OFF' : '');
            const buttonText = dynamicConfig?.button_text || (planKey === 'pro' ? 'Choose Pro' : planKey === 'max' ? 'Choose Max' : 'Current Plan');

            const featureList = dynamicConfig?.features && Array.isArray(dynamicConfig.features) && dynamicConfig.features.length > 0
              ? dynamicConfig.features
              : PLAN_FEATURES[planKey].features;

            const baseMonthlyPrice = dynamicConfig ? dynamicConfig.monthly_price : getPlanMonthlyPrice(planKey);
            const baseAnnualPrice = dynamicConfig ? dynamicConfig.annual_price : getPlanAnnualPrice(planKey);
            const originalMonthlyPrice = dynamicConfig ? dynamicConfig.original_monthly_price : (planKey === 'pro' ? 999 : 0);
            const originalAnnualPrice = dynamicConfig ? dynamicConfig.original_annual_price : (planKey === 'pro' ? 9990 : 0);

            const price = billingCycle === 'annual' ? baseAnnualPrice : baseMonthlyPrice;
            const originalPrice = billingCycle === 'annual' ? originalAnnualPrice : originalMonthlyPrice;
            const isCurrentPlan = normalizedPlan === planKey;
            const isFree = planKey === 'free';

            // Calculate coupon discount for this card if active
            let discountedPrice = price;
            let hasActiveDiscount = false;
            let couponDiscountBadge = '';

            if (appliedCoupon && !isFree) {
              const eligiblePlans = Array.isArray(appliedCoupon.applicablePlans) && appliedCoupon.applicablePlans.length > 0
                ? appliedCoupon.applicablePlans.map((p) => String(p).toLowerCase())
                : ['pro', 'max'];
              const eligibleCycles = Array.isArray(appliedCoupon.applicableBillingCycles) && appliedCoupon.applicableBillingCycles.length > 0
                ? appliedCoupon.applicableBillingCycles.map((c) => String(c).toLowerCase())
                : ['monthly', 'annual'];

              const planEligible = eligiblePlans.includes('all') || eligiblePlans.includes(planKey);
              const cycleEligible = eligibleCycles.includes('all') || eligibleCycles.includes(billingCycle);

              if (planEligible && cycleEligible) {
                const quote = calculateCouponDiscount({
                  subtotalPaise: Math.round(price * 100),
                  discountType: appliedCoupon.discountType,
                  discountValue: Number(appliedCoupon.discountValue),
                });
                if (quote && quote.valid && quote.discountPaise > 0) {
                  hasActiveDiscount = true;
                  discountedPrice = quote.payableRupees;
                  couponDiscountBadge = appliedCoupon.discountType === 'percentage'
                    ? `${appliedCoupon.discountValue}% OFF`
                    : `₹${appliedCoupon.discountValue} OFF`;
                }
              }
            }

            return (
              <motion.div
                key={planKey}
                custom={index}
                variants={fadeInUp}
                className={`editorial-item rounded-2xl relative p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 ${
                  isPopular
                    ? 'border-brand/60 bg-[#16131f] shadow-xl shadow-brand/10'
                    : 'border-white/10 bg-[#121115]/90 hover:border-white/20'
                }`}
              >
                <div>
                  {/* Top card row: Plan name and Badges */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">{name}</h3>
                    {isPopular ? (
                      <span className="rounded-md border border-brand/60 bg-brand/10 px-2.5 py-0.5 font-mono text-[10px] uppercase text-brand tracking-wider font-semibold">
                        {badgeText || 'Popular'}
                      </span>
                    ) : isCurrentPlan ? (
                      <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[10px] uppercase text-neutral-400 tracking-wider">
                        Current
                      </span>
                    ) : badgeText ? (
                      <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[10px] uppercase text-neutral-300 tracking-wider">
                        {badgeText}
                      </span>
                    ) : null}
                  </div>

                  {/* Plan description */}
                  <p className="text-sm text-muted-foreground leading-relaxed min-h-[40px] mb-4">{description}</p>

                  {/* Pricing Display */}
                  {hasActiveDiscount ? (
                    <div className="mt-2 mb-6">
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                        <s>{formatPrice(price)}</s>
                        <span className="text-emerald-400 font-semibold text-xs tracking-wider uppercase">
                          {couponDiscountBadge}
                        </span>
                      </p>
                      <p className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-emerald-400 flex items-baseline gap-1.5">
                        <span>{formatPrice(discountedPrice)}</span>
                        <span className="font-sans text-sm sm:text-base text-muted-foreground font-normal">
                          /{billingCycle === 'annual' ? 'yr' : 'mo'}
                        </span>
                      </p>
                      <div className="text-xs text-emerald-400/90 font-medium mt-1.5 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>With coupon {appliedCoupon.code}</span>
                      </div>
                    </div>
                  ) : originalPrice > price ? (
                    <div className="mt-2 mb-6">
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                        <s>{formatPrice(originalPrice)}</s>
                        {discountBadge && (
                          <span className="text-primary font-semibold text-xs tracking-wider uppercase">
                            {discountBadge}
                          </span>
                        )}
                      </p>
                      <p className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white flex items-baseline gap-1.5">
                        <span>{formatPrice(price)}</span>
                        <span className="font-sans text-sm sm:text-base text-muted-foreground font-normal">
                          /{billingCycle === 'annual' ? 'yr' : 'mo'}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2 mb-6">
                      <p className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white flex items-baseline gap-1.5">
                        <span>{formatPrice(price)}</span>
                        <span className="font-sans text-sm sm:text-base text-muted-foreground font-normal">
                          /{billingCycle === 'annual' ? 'yr' : 'mo'}
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Feature list with green/primary checkmark */}
                  <ul className="my-6 sm:my-8 space-y-3 text-sm">
                    {featureList.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-neutral-300">
                        <span className="text-primary font-bold shrink-0 mt-0.5 text-base leading-none">✓</span>
                        <span className="leading-snug text-xs sm:text-sm text-neutral-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <div className="pt-4 mt-auto">
                  <Button
                    onClick={() => handlePurchase(planKey)}
                    disabled={!!loadingPlan || isCurrentPlan || isFree}
                    className={`h-11 w-full gap-2 px-5 text-sm font-medium transition-all duration-200 rounded-lg ${
                      isCurrentPlan
                        ? 'border border-white/10 bg-white/5 text-neutral-500 cursor-default hover:bg-white/5'
                        : isFree
                          ? 'border border-white/10 bg-white/5 text-neutral-500 cursor-default hover:bg-white/5'
                          : hasActiveDiscount
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 border-0'
                            : isPopular
                              ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-brand/20'
                              : 'border border-white/15 bg-white/5 hover:bg-white/10 text-white'
                    }`}
                  >
                    {isCurrentPlan ? (
                      'Current Plan'
                    ) : isFree ? (
                      'Free Forever'
                    ) : loadingPlan === planKey ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : hasActiveDiscount ? (
                      <>
                        <span>{`${buttonText} · ${formatPrice(discountedPrice)}`}</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    ) : (
                      <>
                        <span>{buttonText}</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Secure checkout footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-2 text-neutral-400 text-center"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-medium">Secure checkout via Razorpay</span>
          </div>
          <span className="hidden sm:inline text-neutral-600">·</span>
          <span className="text-xs text-neutral-500">
            After purchase, you will be returned to the app automatically.
          </span>
        </motion.div>

      </div>
    </div>
  );
}
