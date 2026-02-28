'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Shield } from 'lucide-react';
import { fadeInUp, staggerContainer, useInView } from '@/lib/animations';

const pricingPlans = [
  {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Perfect for getting started',
    features: [
      'Access to GPT-3.5 Turbo',
      'Basic AI models',
      'Standard response time',
      'Image generation (10/day)',
      'Web search capabilities',
    ],
    cta: 'Get Started',
    href: '/sign-up',
    popular: false,
  },
  {
    name: 'Pro',
    monthlyPrice: 299,
    annualPrice: 2990,
    description: 'Full power of AI',
    features: [
      'Everything in Free',
      'Access to GPT-4 & Claude 3',
      'Access to Gemini Pro',
      'Unlimited messages',
      'Unlimited image generation',
      'Priority support',
      'Advanced features',
      'Website builder access',
      'Voice AI features',
    ],
    cta: 'Upgrade to Pro',
    href: '/sign-up',
    popular: true,
  },
];

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [ref, isInView] = useInView({ once: true, threshold: 0.1 });

  return (
    <section 
      id="pricing" 
      ref={ref}
      className="section-padding bg-gray-50/50 dark:bg-gray-900/50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div 
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <motion.h2 
            variants={fadeInUp}
            className="landing-heading-lg text-gray-900 dark:text-white mb-6"
          >
            Simple pricing
          </motion.h2>
          <motion.p 
            variants={fadeInUp}
            className="landing-body-lg text-gray-600 dark:text-gray-400 mb-8"
          >
            Start free, upgrade when you're ready
          </motion.p>

          {/* Billing Toggle */}
          <motion.div 
            variants={fadeInUp}
            className="inline-flex items-center gap-3 p-1 bg-gray-200 dark:bg-gray-800 rounded-full"
          >
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                !isAnnual
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                isAnnual
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Annual
              <span className="ml-2 text-xs text-violet-600 dark:text-violet-400 font-semibold">
                Save 17%
              </span>
            </button>
          </motion.div>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div 
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12"
        >
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.name}
              custom={index}
              variants={fadeInUp}
            >
              <Card
                className={`relative p-10 h-full flex flex-col ${
                  plan.popular
                    ? 'border-2 border-violet-600 dark:border-violet-500 shadow-xl'
                    : 'border border-gray-200 dark:border-gray-800'
                } bg-white dark:bg-gray-900 hover-lift`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white border-0 px-4 py-1">
                    Most Popular
                  </Badge>
                )}

                <div className="mb-8">
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline">
                    <span className="text-6xl font-bold text-gray-900 dark:text-white">
                      ₹{isAnnual ? plan.annualPrice : plan.monthlyPrice}
                    </span>
                    <span className="text-gray-500 dark:text-gray-500 ml-2">
                      /{isAnnual ? 'year' : 'month'}
                    </span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8 grow">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <Check className="w-5 h-5 text-violet-600 dark:text-violet-400 mr-3 shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.href} className="block cursor-pointer">
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? 'bg-violet-600 hover:bg-violet-700 text-white cursor-pointer'
                        : 'bg-gray-900 dark:bg-gray-100 cursor-pointer text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200'
                    } py-6 text-base focus-minimal`}
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust Elements */}
        <motion.div 
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={fadeInUp}
          className="text-center space-y-6"
        >
          {/* User Count with Avatar Stack */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-linear-to-br from-violet-400 to-purple-500 border-2 border-white dark:border-gray-900 flex items-center justify-center text-white text-sm font-semibold"
                >
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Join <span className="font-semibold text-gray-900 dark:text-white">5000+ users</span> already using ChatBox AI
            </p>
          </div>

          {/* Money-back Guarantee */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-500">
            <Shield className="w-4 h-4" />
            <span>30-day money-back guarantee • Secure payment • Cancel anytime</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

