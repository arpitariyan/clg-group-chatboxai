'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Shield, Lock, CheckCircle2, Send, Bot, User } from 'lucide-react';
import { fadeInUp, staggerContainer } from '@/lib/animations';

const demoMessages = [
  {
    role: 'user',
    text: 'Can you help me write a professional email to a client?',
  },
  {
    role: 'ai',
    text: "Of course! I'll help you craft a polished, professional email. Just share the context — who's the client, what's the topic, and what tone do you need?",
  },
  {
    role: 'user',
    text: 'It is a follow-up after a product demo. Keep it warm but professional.',
  },
  {
    role: 'ai',
    text: "Here's a great follow-up email:\n\nSubject: Great connecting with you — next steps\n\nHi [Name], Thank you for taking the time to join our demo yesterday...",
    typing: true,
  },
];

const modelBadges = [
  { name: 'GPT-4o', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { name: 'Claude 3.5', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { name: 'Gemini Pro', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-20 px-4">
      {/* Background layers */}
      <div className="absolute inset-0 bg-[#0a0a0f]" />

      {/* Animated Radial glows */}
      <motion.div 
        animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.05, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" 
      />
      <motion.div 
        animate={{ opacity: [0.4, 0.6, 0.4], y: [0, 20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[90px] pointer-events-none" 
      />
      <motion.div 
        animate={{ opacity: [0.3, 0.5, 0.3], x: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-purple-600/10 blur-[80px] pointer-events-none" 
      />

      {/* Animated Subtle Grid with Vignette */}
      <motion.div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
        animate={{ backgroundPosition: ['0px 0px', '0px 60px'] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
      />
      <div className="absolute inset-0 bg-[#0a0a0f] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,transparent_0%,black_100%)] pointer-events-none z-0" />

      {/* Content - two column layout */}
      <div className="relative z-10 max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: text content */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div
              variants={fadeInUp}
              className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-2 mb-8 backdrop-blur-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-sm font-medium text-violet-300">
                Trusted by 50,000+ users worldwide
              </span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              variants={fadeInUp}
              className="landing-heading-xl text-white mb-6 leading-[1.05]"
            >
              Your Intelligent
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                AI Assistant
              </span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              variants={fadeInUp}
              className="text-xl text-gray-400 max-w-xl mb-10 leading-relaxed"
            >
              Experience the future of AI-powered conversations. ChatBox AI helps you create,
              learn, and solve problems with cutting-edge artificial intelligence.
            </motion.p>

            {/* Model Badges */}
            <motion.div variants={fadeInUp} className="flex flex-wrap gap-2 mb-10 justify-center lg:justify-start">
              {modelBadges.map((m) => (
                <span
                  key={m.name}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border ${m.color}`}
                >
                  {m.name}
                </span>
              ))}
              <span className="text-xs font-medium px-3 py-1.5 rounded-full border border-white/10 text-gray-500">
                +12 more models
              </span>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10"
            >
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="relative group overflow-hidden bg-violet-600 hover:bg-transparent border border-transparent hover:border-violet-500 text-white text-base px-8 h-12 rounded-xl shadow-[0_0_40px_-10px_rgba(124,58,237,0.5)] focus-minimal transition-all duration-300 w-full sm:w-auto"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <span className="relative z-10 flex items-center">
                    Start for Free
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </Link>
              <Link href="#features">
                <Button
                  size="lg"
                  className="bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 text-white text-base px-8 h-12 rounded-xl focus-minimal transition-all duration-200 w-full sm:w-auto"
                >
                  See How It Works
                </Button>
              </Link>
            </motion.div>

            {/* Trust Row */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-5 text-sm text-gray-600"
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Free plan available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-gray-700" />
                <span>SOC 2 Compliant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-gray-700" />
                <span>End-to-end encrypted</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Chat UI Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
            className="hidden lg:block"
          >
            <div className="relative">
              {/* Glow behind mockup */}
              <div className="absolute inset-0 bg-violet-600/10 blur-3xl rounded-3xl" />

              {/* Chat window */}
              <div className="relative rounded-2xl border border-white/[0.08] bg-[#111118] overflow-hidden shadow-[0_32px_64px_-20px_rgba(0,0,0,0.8)]">
                {/* Window chrome */}
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] bg-[#0d0d14]">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/60" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                      <div className="w-3 h-3 rounded-full bg-green-500/60" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                    <span className="text-xs text-gray-500 font-medium">ChatBox AI</span>
                  </div>
                  <div className="text-xs text-gray-700">GPT-4o</div>
                </div>

                {/* Messages */}
                <div className="p-4 space-y-4 min-h-[320px]">
                  {demoMessages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.25, duration: 0.4 }}
                      className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        msg.role === 'user'
                          ? 'bg-violet-600'
                          : 'bg-gradient-to-br from-purple-600 to-indigo-600'
                      }`}>
                        {msg.role === 'user'
                          ? <User className="w-3.5 h-3.5 text-white" />
                          : <Bot className="w-3.5 h-3.5 text-white" />
                        }
                      </div>
                      {/* Bubble */}
                      <div
                        className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-violet-600/20 text-gray-200 rounded-tr-sm border border-violet-500/20'
                            : 'bg-white/[0.05] text-gray-300 rounded-tl-sm border border-white/[0.06]'
                        }`}
                      >
                        {msg.text}
                        {msg.typing && (
                          <span className="inline-flex gap-0.5 ml-1 align-middle">
                            <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Input area */}
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3">
                    <span className="text-sm text-gray-700 grow">Ask me anything...</span>
                    <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
                      <Send className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badge — models */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.4, duration: 0.5 }}
                className="absolute -right-6 top-16 bg-[#111118] border border-white/[0.08] rounded-xl px-3 py-2 shadow-xl flex items-center gap-2"
              >
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-xs text-gray-400 font-medium">15 AI models online</span>
              </motion.div>

              {/* Floating badge — users */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.6, duration: 0.5 }}
                className="absolute -left-6 bottom-20 bg-[#111118] border border-white/[0.08] rounded-xl px-3 py-2 shadow-xl flex items-center gap-2"
              >
                <div className="flex -space-x-1.5">
                  {['from-violet-500 to-purple-700', 'from-blue-500 to-indigo-700', 'from-emerald-500 to-teal-700'].map((g, i) => (
                    <div key={i} className={`w-5 h-5 rounded-full bg-gradient-to-br ${g} border border-[#111118]`} />
                  ))}
                </div>
                <span className="text-xs text-gray-400 font-medium">50K+ users active</span>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="flex justify-center mt-16">
          <div className="animate-bounce">
            <div className="w-5 h-9 border border-white/10 rounded-full p-1 flex justify-center">
              <div className="w-1 h-2 bg-violet-500/50 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
