'use client';

import { motion } from 'framer-motion';
import { Star, CheckCircle2, Quote } from 'lucide-react';
import { fadeInUp, staggerContainer, useInView } from '@/lib/animations';

const testimonials = [
  {
    name: 'Rahul Sharma',
    role: 'Software Developer',
    avatar: 'RS',
    avatarGradient: 'from-violet-500 to-purple-700',
    rating: 5,
    text: 'ChatBox AI has completely transformed how I work. The code assistance is incredibly accurate, and having access to multiple AI models in one place is a game-changer.',
    verified: true,
  },
  {
    name: 'Priya Patel',
    role: 'Content Creator',
    avatar: 'PP',
    avatarGradient: 'from-blue-500 to-indigo-700',
    rating: 5,
    text: 'As a content creator, I use ChatBox AI daily for brainstorming, writing, and image generation. The quality of outputs is amazing.',
    verified: true,
  },
  {
    name: 'Amit Kumar',
    role: 'Student',
    avatar: 'AK',
    avatarGradient: 'from-emerald-500 to-teal-700',
    rating: 5,
    text: 'The free plan is perfect for students. I use it for homework help and learning new concepts. The AI explanations are clear and easy to understand.',
    verified: true,
  },
  {
    name: 'Sneha Reddy',
    role: 'Digital Marketer',
    avatar: 'SR',
    avatarGradient: 'from-orange-500 to-red-600',
    rating: 5,
    text: 'ChatBox AI helps me create marketing copy, design visuals, and analyze data. It saves me hours of work every week.',
    verified: true,
  },
  {
    name: 'Vikram Singh',
    role: 'Entrepreneur',
    avatar: 'VS',
    avatarGradient: 'from-pink-500 to-rose-700',
    rating: 5,
    text: 'Running a startup means wearing many hats. ChatBox AI is like having a team of experts at my fingertips.',
    verified: true,
  },
  {
    name: 'Ananya Gupta',
    role: 'Researcher',
    avatar: 'AG',
    avatarGradient: 'from-cyan-500 to-blue-700',
    rating: 5,
    text: 'The document analysis features are outstanding. I can upload papers and get summaries. It has accelerated my research significantly.',
    verified: true,
  },
];

// Duplicate for seamless loop
const row1 = [...testimonials.slice(0, 3), ...testimonials.slice(0, 3)];
const row2 = [...testimonials.slice(3, 6), ...testimonials.slice(3, 6)];

const TestimonialCard = ({ testimonial }) => (
  <div className="shrink-0 w-[400px] h-full p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/30 hover:bg-white/[0.04] hover:shadow-[0_0_40px_-15px_rgba(124,58,237,0.15)] transition-all duration-300 flex flex-col group">
    <Quote className="w-6 h-6 text-white/[0.06] mb-4 group-hover:text-violet-500/20 transition-colors" />
    <div className="flex gap-0.5 mb-4">
      {[...Array(testimonial.rating)].map((_, i) => (
        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      ))}
    </div>
    <p className="text-sm text-gray-400 leading-relaxed mb-6 grow">
      "{testimonial.text}"
    </p>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${testimonial.avatarGradient} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
          {testimonial.avatar}
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{testimonial.name}</div>
          <div className="text-xs text-gray-600">{testimonial.role}</div>
        </div>
      </div>
      {testimonial.verified && (
        <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" />
      )}
    </div>
  </div>
);

export default function TestimonialsSection() {
  const [ref, isInView] = useInView({ once: true, threshold: 0.1 });

  return (
    <section ref={ref} className="py-24 bg-[#0a0a0f] relative overflow-hidden">
      {/* Divider lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* Subtle purple glow */}
      <div className="absolute inset-0 bg-violet-950/5 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Testimonials</span>
          </motion.div>
          <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight">
            Loved by thousands
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-gray-500">
            See what our users are saying
          </motion.p>
        </motion.div>
      </div>

      {/* Marquees Container */}
      <div className="relative w-full overflow-hidden flex flex-col gap-6 mb-16">
        {/* Fading Edges */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0a0a0f] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0a0a0f] to-transparent z-10 pointer-events-none" />

        {/* Row 1: Left to right */}
        <motion.div
          className="flex gap-6 w-max"
          animate={{ x: ['-50%', '0%'] }}
          transition={{ repeat: Infinity, ease: 'linear', duration: 35 }}
        >
          {row1.map((testimonial, i) => (
            <TestimonialCard key={`r1-${i}`} testimonial={testimonial} />
          ))}
        </motion.div>

        {/* Row 2: Right to left */}
        <motion.div
          className="flex gap-6 w-max -ml-40"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ repeat: Infinity, ease: 'linear', duration: 40 }}
        >
          {row2.map((testimonial, i) => (
            <TestimonialCard key={`r2-${i}`} testimonial={testimonial} />
          ))}
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2.5 bg-white/[0.03] border border-violet-500/20 rounded-full px-6 py-3 shadow-[0_0_20px_-5px_rgba(124,58,237,0.1)]">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-sm font-medium text-gray-300">
              4.9/5 from 50,000+ verified users
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
