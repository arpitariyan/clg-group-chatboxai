'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, X, Shield, Zap, Star } from 'lucide-react';
import { fadeInUp, staggerContainer, useInView } from '@/lib/animations';

const pricingPlans = [
  {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Perfect for getting started',
    badge: null,
    features: [
      'Access to GPT-3.5 Turbo',
      'Basic AI models',
      'Standard response time',
      'Image generation (10/day)',
      'Web search capabilities',
      '50 messages per day',
      '7-day chat history',
    ],
    cta: 'Get Started Free',
    href: '/sign-up',
    popular: false,
  },
  {
    name: 'Pro',
    monthlyPrice: 299,
    annualPrice: 2990,
    description: 'Full power of AI — unlimited',
    badge: 'Most Popular',
    features: [
      'Everything in Free',
      'Access to GPT-4o & Claude 3.5',
      'Access to Gemini Pro & Ultra',
      'Unlimited messages',
      'Unlimited image generation',
      'Document upload & analysis',
      'Voice AI features',
      'Website builder access',
      'Priority 24/7 support',
      'Unlimited chat history',
      'Early access to new features',
    ],
    cta: 'Upgrade to Pro',
    href: '/sign-up',
    popular: true,
  },
];

const compareRows = [
  { label: 'AI Models', free: 'GPT-3.5', pro: 'GPT-4o, Claude 3.5, Gemini Pro +12 more' },
  { label: 'Daily Messages', free: '50 / day', pro: 'Unlimited' },
  { label: 'Image Generation', free: '10 / day', pro: 'Unlimited' },
  { label: 'Document Analysis', free: false, pro: true },
  { label: 'Voice AI', free: false, pro: true },
  { label: 'Website Builder', free: false, pro: true },
  { label: 'Priority Support', free: false, pro: true },
];

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [ref, isInView] = useInView({ once: true, threshold: 0.05 });

  return (
    <section
      id="pricing"
      ref={ref}
      className="section-padding bg-[#0d0d15] relative overflow-hidden"
    >
      {/* Gradient borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/15 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/15 to-transparent" />

      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-violet-600/6 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pricing</span>
          </motion.div>
          <motion.h2 variants={fadeInUp} className="landing-heading-lg text-white mb-5">
            Simple, transparent pricing
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-gray-500 mb-8">
            Start free. Upgrade when you need more power.
          </motion.p>

          {/* Billing Toggle */}
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center gap-1 p-1 bg-white/[0.04] border border-white/[0.08] rounded-full"
          >
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                !isAnnual
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                isAnnual
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Annual
              <span className="ml-2 text-xs text-violet-400 font-semibold">Save 17%</span>
            </button>
          </motion.div>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10"
        >
          {pricingPlans.map((plan, index) => (
            <motion.div key={plan.name} custom={index} variants={fadeInUp} className="relative">
              {plan.popular && (
                <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent" />
              )}
              <div
                className={`relative p-8 h-full flex flex-col rounded-2xl border transition-all duration-300 ${
                  plan.popular
                    ? 'bg-violet-950/30 border-violet-500/30 shadow-[0_0_60px_-15px_rgba(124,58,237,0.3)]'
                    : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.12]'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1.5 bg-violet-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      <Zap className="w-3 h-3" />
                      {plan.badge}
                    </div>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-7">
                  <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mb-5">{plan.description}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-5xl font-bold text-white">
                      ₹{isAnnual ? plan.annualPrice : plan.monthlyPrice}
                    </span>
                    <span className="text-gray-600 text-sm">/{isAnnual ? 'year' : 'month'}</span>
                  </div>
                  {isAnnual && plan.monthlyPrice > 0 && (
                    <p className="text-xs text-emerald-400 mt-1">
                      Save ₹{plan.monthlyPrice * 12 - plan.annualPrice}/year
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-8 grow">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        plan.popular ? 'bg-violet-500/20' : 'bg-white/[0.06]'
                      }`}>
                        <Check className={`w-2.5 h-2.5 ${plan.popular ? 'text-violet-400' : 'text-gray-400'}`} />
                      </div>
                      <span className="text-sm text-gray-400">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.href} className="block">
                  <Button
                    className={`w-full h-11 rounded-xl text-sm font-medium transition-all duration-200 ${
                      plan.popular
                        ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30'
                        : 'bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-white'
                    }`}
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Compare toggle */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="text-center mb-6"
        >
          <button
            onClick={() => setShowCompare(!showCompare)}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-4"
          >
            {showCompare ? 'Hide' : 'Compare'} all features
          </button>
        </motion.div>

        {/* Feature Comparison Table */}
        {showCompare && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-4xl mx-auto rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden mb-10"
          >
            <div className="grid grid-cols-3 bg-white/[0.03] border-b border-white/[0.06]">
              <div className="px-6 py-4 text-sm font-semibold text-gray-400">Feature</div>
              <div className="px-6 py-4 text-sm font-semibold text-center text-gray-400">Free</div>
              <div className="px-6 py-4 text-sm font-semibold text-center text-violet-400">Pro</div>
            </div>
            {compareRows.map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-3 border-b border-white/[0.04] last:border-0 ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
              >
                <div className="px-6 py-4 text-sm text-gray-500">{row.label}</div>
                <div className="px-6 py-4 text-sm text-center text-gray-500 flex items-center justify-center">
                  {typeof row.free === 'boolean' ? (
                    row.free
                      ? <Check className="w-4 h-4 text-emerald-400" />
                      : <X className="w-4 h-4 text-gray-700" />
                  ) : row.free}
                </div>
                <div className="px-6 py-4 text-sm text-center text-gray-300 flex items-center justify-center">
                  {typeof row.pro === 'boolean' ? (
                    row.pro
                      ? <Check className="w-4 h-4 text-violet-400" />
                      : <X className="w-4 h-4 text-gray-700" />
                  ) : (
                    <span className="text-xs">{row.pro}</span>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Trust Elements */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 border-2 border-[#0d0d15] flex items-center justify-center text-white text-xs font-semibold"
                >
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600">
              Join <span className="font-semibold text-gray-400">5,000+ users</span> already using ChatBox AI
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-700">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>30-day money-back guarantee</span>
            </div>
            <div className="w-1 h-1 bg-gray-800 rounded-full" />
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5" />
              <span>4.9/5 avg rating</span>
            </div>
            <div className="w-1 h-1 bg-gray-800 rounded-full" />
            <span>Cancel anytime</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
