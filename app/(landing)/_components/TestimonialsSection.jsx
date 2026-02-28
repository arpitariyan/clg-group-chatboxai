'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Star, CheckCircle2 } from 'lucide-react';
import { fadeInUp, staggerContainer, useInView } from '@/lib/animations';

const testimonials = [
  {
    name: 'Rahul Sharma',
    role: 'Software Developer',
    company: 'Tech Startup',
    avatar: 'RS',
    rating: 5,
    text: 'ChatBox AI has completely transformed how I work. The code assistance is incredibly accurate, and having access to multiple AI models in one place is a game-changer.',
    verified: true,
  },
  {
    name: 'Priya Patel',
    role: 'Content Creator',
    company: 'Digital Agency',
    avatar: 'PP',
    rating: 5,
    text: 'As a content creator, I use ChatBox AI daily for brainstorming, writing, and image generation. The quality of outputs is amazing.',
    verified: true,
  },
  {
    name: 'Amit Kumar',
    role: 'Student',
    company: 'University',
    avatar: 'AK',
    rating: 5,
    text: 'The free plan is perfect for students. I use it for homework help and learning new concepts. The AI explanations are clear and easy to understand.',
    verified: true,
  },
  {
    name: 'Sneha Reddy',
    role: 'Digital Marketer',
    company: 'E-commerce',
    avatar: 'SR',
    rating: 5,
    text: 'ChatBox AI helps me create marketing copy, design visuals, and analyze data. It saves me hours of work every week.',
    verified: true,
  },
  {
    name: 'Vikram Singh',
    role: 'Entrepreneur',
    company: 'Startup Founder',
    avatar: 'VS',
    rating: 5,
    text: 'Running a startup means wearing many hats. ChatBox AI is like having a team of experts at my fingertips.',
    verified: true,
  },
  {
    name: 'Ananya Gupta',
    role: 'Researcher',
    company: 'Research Institute',
    avatar: 'AG',
    rating: 5,
    text: 'The document analysis features are outstanding. I can upload papers and get summaries. It has accelerated my research significantly.',
    verified: true,
  },
];

export default function TestimonialsSection() {
  const [ref, isInView] = useInView({ once: true, threshold: 0.1 });

  return (
    <section 
      ref={ref}
      className="section-padding bg-white dark:bg-gray-950"
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
            Loved by thousands
          </motion.h2>
          <motion.p 
            variants={fadeInUp}
            className="landing-body-lg text-gray-600 dark:text-gray-400"
          >
            See what our users are saying
          </motion.p>
        </motion.div>

        {/* Testimonials Grid - 3 columns */}
        <motion.div 
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-16"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              custom={index}
              variants={fadeInUp}
            >
              <Card
                className="p-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover-lift h-full flex flex-col"
              >
                {/* Rating */}
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>

                {/* Testimonial Text */}
                <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed grow">
                  "{testimonial.text}"
                </p>

                {/* Author Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-linear-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 font-semibold mr-3">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white text-sm">
                        {testimonial.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                  {testimonial.verified && (
                    <CheckCircle2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust Badge */}
        <motion.div 
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={fadeInUp}
          className="text-center"
        >
          <div className="inline-flex items-center space-x-2 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full px-6 py-3">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            <span className="font-medium text-gray-900 dark:text-white">
              4.9/5 from 50,000+ verified users
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

