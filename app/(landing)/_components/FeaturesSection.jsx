'use client';

import { motion } from 'framer-motion';
import {
  MessageSquare,
  Image as ImageIcon,
  Code,
  Globe,
  Mic,
  Brain,
  FileText,
  Search,
  ArrowRight,
} from 'lucide-react';
import { fadeInUp, staggerContainer, useInView } from '@/lib/animations';

const mainFeature = {
  icon: Brain,
  title: 'One Platform. Every AI Model.',
  description:
    'Stop switching between different AI services. ChatBox AI brings GPT-4o, Claude 3.5, Gemini Pro, Llama 3.1, Mistral, and 10+ other models into a single, beautiful interface. Switch models mid-conversation, compare outputs side-by-side, and always have the right AI for the job.',
  tags: ['GPT-4o', 'Claude 3.5', 'Gemini Pro', 'Llama 3.1', '+11 more'],
  stat1: { value: '15+', label: 'AI Models' },
  stat2: { value: '10×', label: 'Faster' },
  stat3: { value: '100%', label: 'Unified' },
};

const features = [
  {
    icon: MessageSquare,
    title: 'AI Chat',
    description: 'Intelligent conversations with context memory and multi-turn dialogue.',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
    border: 'hover:border-violet-500/20',
  },
  {
    icon: ImageIcon,
    title: 'Image Generation',
    description: 'Create stunning visuals from text with DALL-E & Stable Diffusion.',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    border: 'hover:border-blue-500/20',
  },
  {
    icon: Code,
    title: 'Code Assistant',
    description: 'Write, debug, and explain code in 50+ programming languages.',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    border: 'hover:border-emerald-500/20',
  },
  {
    icon: Globe,
    title: 'Website Builder',
    description: 'Generate full websites and landing pages with AI in seconds.',
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-400',
    border: 'hover:border-orange-500/20',
  },
  {
    icon: Mic,
    title: 'Voice AI',
    description: 'Speak naturally and get spoken AI responses in real time.',
    iconBg: 'bg-pink-500/10',
    iconColor: 'text-pink-400',
    border: 'hover:border-pink-500/20',
  },
  {
    icon: FileText,
    title: 'Document Analysis',
    description: 'Upload PDFs, docs, and spreadsheets for instant AI-powered summaries.',
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-400',
    border: 'hover:border-cyan-500/20',
  },
  {
    icon: Search,
    title: 'Web Search',
    description: 'Real-time web browsing to get up-to-date answers with citations.',
    iconBg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-400',
    border: 'hover:border-yellow-500/20',
  },
  {
    icon: Brain,
    title: 'AI Memory',
    description: 'Persistent memory that remembers your preferences across sessions.',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    border: 'hover:border-purple-500/20',
  },
];

export default function FeaturesSection() {
  const [ref, isInView] = useInView({ once: true, threshold: 0.05 });

  return (
    <section
      id="features"
      ref={ref}
      className="section-padding bg-[#0a0a0f] relative overflow-hidden"
    >
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Capabilities</span>
          </motion.div>
          <motion.h2 variants={fadeInUp} className="landing-heading-lg text-white mb-5">
            Everything you need,
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">nothing you don't</span>
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-gray-500 leading-relaxed">
            A complete AI toolkit designed to replace a dozen separate tools.
          </motion.p>
        </motion.div>

        {/* HERO FEATURE CARD */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-br from-violet-950/40 via-[#0d0d18] to-[#0d0d18] p-8 md:p-10 mb-4 overflow-hidden group"
        >
          {/* Glow in corner */}
          <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-violet-500/8 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute top-0 right-0 w-0 h-0 border-l-[200px] border-l-transparent border-t-[200px] border-t-violet-500/5 pointer-events-none" />

          <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center">
            {/* Text side */}
            <div>
              <div className="w-12 h-12 rounded-xl bg-violet-500/15 flex items-center justify-center mb-6">
                <mainFeature.icon className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 leading-snug">
                {mainFeature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed mb-6 text-sm">
                {mainFeature.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {mainFeature.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Stats side */}
            <div className="grid grid-cols-3 gap-4">
              {[mainFeature.stat1, mainFeature.stat2, mainFeature.stat3].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 text-center"
                >
                  <div className="text-3xl font-bold text-white mb-1">{s.value}</div>
                  <div className="text-xs text-gray-600">{s.label}</div>
                </div>
              ))}
              {/* Demo model switcher visual */}
              <div className="col-span-3 rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <div className="text-xs text-gray-600 mb-3">Active model</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {['GPT-4o', 'Claude 3.5', 'Gemini Pro'].map((model, i) => (
                    <div
                      key={model}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                        i === 0
                          ? 'bg-violet-600 text-white'
                          : 'bg-white/[0.04] text-gray-600 border border-white/[0.06]'
                      }`}
                    >
                      {model}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature Cards Grid */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              custom={index}
              variants={fadeInUp}
              className={`group relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] ${feature.border} hover:bg-white/[0.04] transition-all duration-300 cursor-default`}
            >
              <div className={`w-9 h-9 rounded-xl ${feature.iconBg} flex items-center justify-center mb-4`}>
                <feature.icon className={`w-4 h-4 ${feature.iconColor}`} />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">{feature.title}</h3>
              <p className="text-xs text-gray-600 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
