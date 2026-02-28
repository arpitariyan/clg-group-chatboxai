'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { 
  MessageSquare, 
  Image as ImageIcon, 
  Code, 
  Globe, 
  Mic, 
  Brain,
} from 'lucide-react';
import { fadeInUp, staggerContainer, useInView } from '@/lib/animations';

const features = [
  {
    icon: MessageSquare,
    title: 'AI Chat',
    description: 'Engage in intelligent conversations with advanced AI models. Get instant answers, creative ideas, and expert assistance on any topic.',
  },
  {
    icon: ImageIcon,
    title: 'Image Generation',
    description: 'Create stunning visuals from text descriptions. Transform your ideas into beautiful images with AI-powered generation.',
  },
  {
    icon: Code,
    title: 'Code Assistant',
    description: 'Write, debug, and optimize code with AI. Support for multiple programming languages and frameworks with intelligent suggestions.',
  },
  {
    icon: Globe,
    title: 'Website Builder',
    description: 'Build professional websites with AI assistance. Get design suggestions and complete web solutions instantly.',
  },
  {
    icon: Mic,
    title: 'Voice AI',
    description: 'Interact with ChatBox AI using voice commands. Natural speech recognition and text-to-speech capabilities.',
  },
  {
    icon: Brain,
    title: 'Multiple AI Models',
    description: 'Access various AI models including GPT-4, Claude, Gemini, and more. Choose the best model for your specific task.',
  },
];

export default function FeaturesSection() {
  const [ref, isInView] = useInView({ once: true, threshold: 0.1 });

  return (
    <section 
      id="features" 
      ref={ref}
      className="section-padding bg-gray-50/50 dark:bg-gray-900/50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div 
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <motion.h2 
            variants={fadeInUp}
            className="landing-heading-lg text-gray-900 dark:text-white mb-6"
          >
            Everything you need
          </motion.h2>
          <motion.p 
            variants={fadeInUp}
            className="landing-body-lg text-gray-600 dark:text-gray-400"
          >
            Powerful AI capabilities designed to enhance your productivity
          </motion.p>
        </motion.div>

        {/* Features Grid - 2 columns, larger cards */}
        <motion.div 
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              custom={index}
              variants={fadeInUp}
            >
              <Card
                className="p-8 lg:p-10 hover-lift border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 group cursor-pointer"
              >
                {/* Monochrome icon - minimalist style */}
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 transition-colors duration-300">
                  <feature.icon className="w-7 h-7 text-gray-700 dark:text-gray-300 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-300 group-hover:rotate-3" />
                </div>
                
                <h3 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                
                <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

