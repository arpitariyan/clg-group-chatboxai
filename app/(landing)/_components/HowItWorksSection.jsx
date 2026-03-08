'use client';

import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, useInView } from '@/lib/animations';
import { MessageSquare, Zap, Sparkles, ArrowRight } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: MessageSquare,
    title: 'Create your account',
    description: 'Sign up in seconds — no credit card required. Get instant access to our free plan with powerful AI models ready to use.',
    detail: 'Free plan includes 50 messages/day',
    color: 'violet',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
    numberColor: 'text-violet-600/30',
    border: 'hover:border-violet-500/20',
    glow: 'group-hover:bg-violet-600/5',
  },
  {
    number: '02',
    icon: Zap,
    title: 'Choose your AI model',
    description: 'Pick from 15+ cutting-edge AI models including GPT-4o, Claude 3.5, Gemini Pro, and more — all in one unified interface.',
    detail: '15+ AI models available',
    color: 'blue',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    numberColor: 'text-blue-600/30',
    border: 'hover:border-blue-500/20',
    glow: 'group-hover:bg-blue-600/5',
  },
  {
    number: '03',
    icon: Sparkles,
    title: 'Create anything, instantly',
    description: 'Chat, generate images, write code, build websites, analyze documents — unlock the full power of AI for every task you have.',
    detail: 'Unlimited creativity',
    color: 'purple',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    numberColor: 'text-purple-600/30',
    border: 'hover:border-purple-500/20',
    glow: 'group-hover:bg-purple-600/5',
  },
];

export default function HowItWorksSection() {
  const [ref, isInView] = useInView({ once: true, threshold: 0.1 });

  return (
    <section ref={ref} className="section-padding bg-[#0d0d15] relative overflow-hidden">
      {/* Gradient borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/15 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/15 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">How It Works</span>
          </motion.div>
          <motion.h2 variants={fadeInUp} className="landing-heading-lg text-white mb-5">
            Up and running in minutes
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-gray-500 leading-relaxed">
            No complex setup. No learning curve. Just sign in and start creating with the world's best AI.
          </motion.p>
        </motion.div>

        {/* Steps */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 relative"
        >
          {/* Animated Connector line (desktop only) */}
          <div className="hidden md:block absolute top-[4.5rem] left-[16.66%] right-[16.66%] h-px bg-white/[0.05] z-0 overflow-hidden">
            <motion.div 
              className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-50"
              animate={{ x: ['-100%', '300%'] }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            />
          </div>

          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              custom={index}
              variants={fadeInUp}
              className={`group relative p-7 rounded-2xl bg-white/[0.02] border border-white/[0.06] ${step.border} transition-all duration-300 overflow-hidden`}
            >
              {/* Background glow on hover */}
              <div className={`absolute inset-0 ${step.glow} transition-all duration-500 rounded-2xl`} />

              <div className="relative z-10">
                {/* Number + Icon row */}
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-12 h-12 rounded-xl ${step.iconBg} flex items-center justify-center`}>
                    <step.icon className={`w-5 h-5 ${step.iconColor}`} />
                  </div>
                  <span className={`text-4xl font-black ${step.numberColor} tabular-nums leading-none`}>
                    {step.number}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">{step.description}</p>

                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{step.detail}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
