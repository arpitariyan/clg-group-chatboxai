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
  { icon: Shield, text: 'SOC 2 Type II', color: 'text-blue-400' },
  { icon: Lock, text: 'GDPR Compliant', color: 'text-emerald-400' },
  { icon: Award, text: 'ISO 27001', color: 'text-violet-400' },
  { icon: CheckCircle, text: 'HIPAA Ready', color: 'text-purple-400' },
];

export default function TrustBadgesSection() {
  const [ref, isInView] = useInView({ once: true, threshold: 0.1 });

  return (
    <section
      ref={ref}
      className="section-padding bg-[#0a0a0f] border-t border-white/[0.04]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="space-y-16"
        >
          {/* AI Providers */}
          <div className="text-center space-y-10">
            <motion.p
              variants={fadeInUp}
              className="text-xs font-semibold text-gray-600 uppercase tracking-[0.2em]"
            >
              Powered by Leading AI Models
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
            >
              {aiProviders.map((provider, index) => (
                <motion.div
                  key={provider.name}
                  custom={index}
                  variants={fadeInUp}
                  className="relative group text-center space-y-1 p-4 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-500 cursor-default overflow-hidden"
                >
                  {/* Subtle hover gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600/0 via-transparent to-purple-600/0 group-hover:from-violet-600/10 group-hover:via-transparent group-hover:to-purple-600/10 transition-all duration-500" />
                  
                  <div className="relative z-10 text-sm font-semibold text-gray-500 group-hover:text-white transition-colors duration-300">
                    {provider.name}
                  </div>
                  <div className="relative z-10 text-xs text-gray-700 group-hover:text-gray-400 transition-colors duration-300">
                    {provider.subtext}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.04]" />

          {/* Security Certifications */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-wrap items-center justify-center gap-8 md:gap-16"
          >
            {certifications.map((cert, index) => (
              <motion.div
                key={cert.text}
                custom={index}
                variants={fadeInUp}
                className="flex items-center gap-2.5 group"
              >
                <cert.icon className={`w-4 h-4 ${cert.color} opacity-70 group-hover:opacity-100 transition-opacity`} />
                <span className="text-sm font-medium text-gray-500 group-hover:text-gray-300 transition-colors">
                  {cert.text}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* Trust statement */}
          <motion.div variants={fadeInUp} className="text-center">
            <p className="text-sm text-gray-700 max-w-2xl mx-auto">
              Trusted by 50,000+ users worldwide. Your data is encrypted end-to-end and we never train AI models on your private conversations.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
