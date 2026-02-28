'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Lock, CheckCircle2 } from 'lucide-react';
import { fadeInUp, staggerContainer } from '@/lib/animations';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-32 pb-20 px-4">
      {/* Minimalist gradient background - subtle and clean */}
      <div className="absolute inset-0 bg-linear-to-b from-white via-gray-50/50 to-white dark:from-gray-950 dark:via-gray-900/50 dark:to-gray-950" />
      
      {/* Subtle accent glow - minimal, positioned strategically */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-200 h-100 bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-3xl" />

      {/* Content */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="relative z-10 max-w-5xl mx-auto text-center"
      >
        {/* Trust Badge - Minimal */}
        <motion.div 
          variants={fadeInUp}
          className="inline-flex items-center space-x-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-full px-4 py-2 mb-8"
        >
          <div className="w-2 h-2 bg-violet-600 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Trusted by 50,000+ users worldwide
          </span>
        </motion.div>

        {/* Main Heading - Extra large with generous spacing */}
        <motion.h1 
          variants={fadeInUp}
          className="landing-heading-xl text-gray-900 dark:text-white mb-6"
        >
          Your Intelligent
          <br />
          <span className="text-violet-600 dark:text-violet-400">AI Assistant</span>
        </motion.h1>

        {/* Subheading - Clean and readable */}
        <motion.p 
          variants={fadeInUp}
          className="landing-body-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-12"
        >
          Experience the future of AI-powered conversations. ChatBox AI helps you create, 
          learn, and solve problems with cutting-edge artificial intelligence.
        </motion.p>

        {/* CTA Buttons - Generous spacing */}
        <motion.div 
          variants={fadeInUp}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <Link href="/sign-up">
            <Button 
              size="lg" 
              className="bg-violet-600 cursor-pointer hover:bg-violet-700 text-white text-base px-8 py-6 rounded-xl shadow-lg shadow-violet-600/20 dark:shadow-violet-900/30 group focus-minimal"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="#features">
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-gray-300 cursor-pointer dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 text-base px-8 py-6 rounded-xl focus-minimal"
            >
              See How It Works
            </Button>
          </Link>
        </motion.div>

        {/* Trust Row - Security badges */}
        <motion.div 
          variants={fadeInUp}
          className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-500"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>SOC 2 Type II</span>
          </div>
          <div className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>GDPR Compliant</span>
          </div>
          <div className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>ISO 27001 Certified</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator - minimal */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-gray-300 dark:border-gray-700 rounded-full p-1">
          <div className="w-1.5 h-2 bg-gray-400 dark:bg-gray-600 rounded-full mx-auto" />
        </div>
      </div>
    </section>
  );
}
