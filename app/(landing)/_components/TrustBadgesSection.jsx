'use client';

import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, useInView } from '@/lib/animations';
import { Award, Shield, Lock, CheckCircle } from 'lucide-react';

const aiProviders = [
  { name: 'OpenAI', subtext: 'GPT-4 & GPT-4o' },
  { name: 'Anthropic', subtext: 'Claude 3.5' },
  { name: 'Google AI', subtext: 'Gemini Pro' },
  { name: 'Meta', subtext: 'Llama 3.1' },
  { name: 'Mistral AI', subtext: 'Mixtral 8x7B' },
  { name: 'Cohere', subtext: 'Command R+' },
];

const certifications = [
  { icon: Shield, text: 'SOC 2 Type II', color: 'text-blue-600 dark:text-blue-400' },
  { icon: Lock, text: 'GDPR Compliant', color: 'text-green-600 dark:text-green-400' },
  { icon: Award, text: 'ISO 27001', color: 'text-purple-600 dark:text-purple-400' },
  { icon: CheckCircle, text: 'HIPAA Ready', color: 'text-violet-600 dark:text-violet-400' },
];

export default function TrustBadgesSection() {
  const [ref, isInView] = useInView({ once: true, threshold: 0.1 });

  return (
    <section 
      ref={ref}
      className="section-padding bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-900"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="space-y-16"
        >
          {/* AI Providers Section */}
          <div className="text-center space-y-8">
            <motion.p 
              variants={fadeInUp}
              className="text-sm font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider"
            >
              Powered by Leading AI Models
            </motion.p>
            
            <motion.div 
              variants={fadeInUp}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8"
            >
              {aiProviders.map((provider, index) => (
                <motion.div
                  key={provider.name}
                  custom={index}
                  variants={fadeInUp}
                  className="group text-center space-y-1"
                >
                  <div className="text-lg font-semibold text-gray-400 dark:text-gray-600 group-hover:text-gray-900 dark:group-hover:text-gray-300 transition-colors duration-300">
                    {provider.name}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-600">
                    {provider.subtext}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Security Certifications */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-12">
            <motion.div 
              variants={fadeInUp}
              className="flex flex-wrap items-center justify-center gap-8 md:gap-12"
            >
              {certifications.map((cert, index) => (
                <motion.div
                  key={cert.text}
                  custom={index}
                  variants={fadeInUp}
                  className="flex items-center gap-2 group"
                >
                  <cert.icon className={`w-5 h-5 ${cert.color}`} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {cert.text}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Trust Statement */}
          <motion.div 
            variants={fadeInUp}
            className="text-center"
          >
            <p className="text-sm text-gray-500 dark:text-gray-500 max-w-2xl mx-auto">
              Trusted by 50,000+ users worldwide. Your data is encrypted end-to-end and we never train AI models on your private conversations.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
