'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { fadeInUp, staggerContainer, useInView } from '@/lib/animations';

const faqs = [
  {
    question: 'What is ChatBox AI?',
    answer: 'ChatBox AI is a comprehensive AI platform that provides access to multiple advanced AI models including GPT-4, Claude 3, and Gemini. It offers features like AI chat, image generation, code assistance, website building, voice AI, and more—all in one platform.',
  },
  {
    question: 'How does the free plan work?',
    answer: "The free plan gives you access to basic AI models like GPT-3.5 Turbo with 50 messages per day, 10 image generations per day, and 7-day conversation history. It's perfect for trying out the platform and basic usage without any cost.",
  },
  {
    question: "What's included in the Pro plan?",
    answer: 'The Pro plan unlocks unlimited access to all premium AI models (GPT-4, Claude 3, Gemini Pro), unlimited messages and image generation, advanced features like website builder and voice AI, file upload and analysis, priority support, and unlimited conversation history.',
  },
  {
    question: 'Can I upgrade or downgrade my plan?',
    answer: "Yes! You can upgrade to Pro at any time to unlock premium features. If you downgrade from Pro to Free, you'll retain access to Pro features until the end of your billing period, then automatically switch to Free plan limits.",
  },
  {
    question: 'Which AI models do you support?',
    answer: 'We support multiple state-of-the-art AI models: GPT-3.5 Turbo (Free & Pro), GPT-4 and GPT-4 Turbo (Pro), Claude 3 Opus, Sonnet, and Haiku (Pro), Gemini Pro and Ultra (Pro), and more. You can switch between models based on your needs.',
  },
  {
    question: 'Is my data secure and private?',
    answer: "Absolutely! We take security seriously. All conversations are encrypted, your data is stored securely, and we never share your information with third parties. We're GDPR compliant and follow industry-best practices for data protection.",
  },
  {
    question: 'Can I use ChatBox AI for coding?',
    answer: 'Yes! ChatBox AI is excellent for coding. It can help you write code, debug issues, explain complex concepts, review code, suggest optimizations, and support multiple programming languages. Pro users get access to advanced code interpreter features.',
  },
  {
    question: 'How do I cancel my subscription?',
    answer: "You can cancel your Pro subscription anytime from your account settings. Once canceled, you'll continue to have Pro access until the end of your billing period, after which you'll automatically move to the free plan.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);
  const [ref, isInView] = useInView({ once: true, threshold: 0.1 });

  const toggleQuestion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section ref={ref} className="section-padding bg-[#0a0a0f] relative overflow-hidden">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">FAQ</span>
          </motion.div>
          <motion.h2 variants={fadeInUp} className="landing-heading-lg text-white mb-5">
            Common questions
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-gray-500">
            Everything you need to know
          </motion.p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="space-y-2"
        >
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              custom={index}
              variants={fadeInUp}
              className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                openIndex === index
                  ? 'bg-white/[0.04] border-violet-500/20'
                  : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.10]'
              }`}
            >
              <button
                onClick={() => toggleQuestion(index)}
                className="w-full px-6 py-5 flex items-start justify-between text-left focus-minimal group"
              >
                <span className="font-medium text-white pr-4 text-sm leading-relaxed mt-0.5 group-hover:text-violet-200 transition-colors">
                  {faq.question}
                </span>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                  openIndex === index 
                    ? 'bg-violet-500/20 text-violet-400 rotate-45' 
                    : 'bg-white/[0.04] text-gray-500 group-hover:bg-white/[0.08] group-hover:text-white'
                }`}>
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 pt-0 border-t border-white/[0.06]">
                      <p className="text-sm text-gray-500 leading-relaxed pt-4">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>

        {/* Help Link */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="text-center mt-10"
        >
          <p className="text-sm text-gray-600">
            Still have questions?{' '}
            <a href="/help-center" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
              Visit our Help Center →
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
