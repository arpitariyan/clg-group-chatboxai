'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Zap, Shield } from 'lucide-react';
import { fadeInUp, staggerContainer, useInView } from '@/lib/animations';

const highlights = [
  { icon: Zap, text: 'No credit card required' },
  { icon: Shield, text: '30-day money-back guarantee' },
  { icon: Sparkles, text: 'Cancel anytime' },
];

export default function CTASection() {
  const [ref, isInView] = useInView({ once: true, threshold: 0.2 });

  return (
    <section ref={ref} className="section-padding bg-[#0a0a0f] relative overflow-hidden">
      {/* Lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* Inner glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-violet-600/8 blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="text-center"
        >
          {/* Badge */}
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-2 mb-8">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-sm font-medium text-violet-300">Start for free today</span>
          </motion.div>

          {/* Heading */}
          <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
            The AI platform that
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              works for you
            </span>
          </motion.h2>

          <motion.p variants={fadeInUp} className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join 50,000+ users who are already using ChatBox AI to supercharge their productivity. 
            Get started in seconds — no setup required.
          </motion.p>

          {/* Highlight pills */}
          <motion.div variants={fadeInUp} className="flex flex-wrap justify-center gap-4 mb-10">
            {highlights.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm text-gray-500">
                <Icon className="w-4 h-4 text-gray-700" />
                <span>{text}</span>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button
                size="lg"
                className="bg-violet-600 hover:bg-violet-500 text-white text-base px-10 h-13 rounded-xl shadow-lg shadow-violet-900/40 group focus-minimal transition-all duration-200"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button
                size="lg"
                className="bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 text-white text-base px-8 h-12 rounded-xl focus-minimal transition-all duration-200"
              >
                Sign In
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
