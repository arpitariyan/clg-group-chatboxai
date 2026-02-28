'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { fadeInUp, staggerContainer, useInView } from '@/lib/animations';

const faqs = [
  {
    question: 'What is ChatBox AI?',
    answer: 'ChatBox AI is a comprehensive AI platform that provides access to multiple advanced AI models including GPT-4, Claude 3, and Gemini. It offers features like AI chat, image generation, code assistance, website building, voice AI, and more—all in one platform.',
  },
  {
    question: 'How does the free plan work?',
    answer: 'The free plan gives you access to basic AI models like GPT-3.5 Turbo with 50 messages per day, 10 image generations per day, and 7-day conversation history. It\'s perfect for trying out the platform and basic usage without any cost.',
  },
  {
    question: 'What\'s included in the Pro plan?',
    answer: 'The Pro plan unlocks unlimited access to all premium AI models (GPT-4, Claude 3, Gemini Pro), unlimited messages and image generation, advanced features like website builder and voice AI, file upload and analysis, priority support, and unlimited conversation history.',
  },
  {
    question: 'Can I upgrade or downgrade my plan?',
    answer: 'Yes! You can upgrade to Pro at any time to unlock premium features. If you downgrade from Pro to Free, you\'ll retain access to Pro features until the end of your billing period, then automatically switch to Free plan limits.',
  },
  {
    question: 'Which AI models do you support?',
    answer: 'We support multiple state-of-the-art AI models: GPT-3.5 Turbo (Free & Pro), GPT-4 and GPT-4 Turbo (Pro), Claude 3 Opus, Sonnet, and Haiku (Pro), Gemini Pro and Ultra (Pro), and more. You can switch between models based on your needs.',
  },
  {
    question: 'Is my data secure and private?',
    answer: 'Absolutely! We take security seriously. All conversations are encrypted, your data is stored securely, and we never share your information with third parties. We\'re GDPR compliant and follow industry-best practices for data protection.',
  },
  {
    question: 'Can I use ChatBox AI for coding?',
    answer: 'Yes! ChatBox AI is excellent for coding. It can help you write code, debug issues, explain complex concepts, review code, suggest optimizations, and support multiple programming languages. Pro users get access to advanced code interpreter features.',
  },
  {
    question: 'How do I cancel my subscription?',
    answer: 'You can cancel your Pro subscription anytime from your account settings. Once canceled, you\'ll continue to have Pro access until the end of your billing period, after which you\'ll automatically move to the free plan.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);
  const [ref, isInView] = useInView({ once: true, threshold: 0.1 });

  const toggleQuestion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section 
      ref={ref}
      className="section-padding bg-gray-50/50 dark:bg-gray-900/50"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div 
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.h2 
            variants={fadeInUp}
            className="landing-heading-lg text-gray-900 dark:text-white mb-6"
          >
            Common questions
          </motion.h2>
          <motion.p 
            variants={fadeInUp}
            className="landing-body-lg text-gray-600 dark:text-gray-400"
          >
            Everything you need to know
          </motion.p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div 
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="space-y-3"
        >
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              custom={index}
              variants={fadeInUp}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => toggleQuestion(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors focus-minimal"
              >
                <span className="font-semibold text-gray-900 dark:text-white pr-4 text-base">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 dark:text-gray-600 shrink-0 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180 text-violet-600 dark:text-violet-400' : ''
                  }`}
                />
              </button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 border-t border-gray-100 dark:border-gray-800 pt-4">
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>

        {/* Additional Help Card */}
        {/* <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={fadeInUp}
          className="mt-12 text-center"
        >
          <div className="inline-block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8">
            <HelpCircle className="w-12 h-12 text-violet-600 dark:text-violet-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Still have questions?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Our support team is here to help
            </p>
            <a
              href="/help-center"
              className="inline-flex items-center text-violet-600 dark:text-violet-400 hover:underline font-medium"
            >
              Visit Help Center
              <ChevronDown className="w-4 h-4 ml-1 -rotate-90" />
            </a>
          </div>
        </motion.div> */}
      </div>
    </section>
  );
}

