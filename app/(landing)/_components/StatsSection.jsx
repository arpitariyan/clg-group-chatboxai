'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, useInView } from '@/lib/animations';

const stats = [
  {
    id: 1,
    value: 5000,
    suffix: '+',
    label: 'Active Users',
    description: 'Trusted worldwide',
    color: 'bg-gradient-to-r from-violet-400 to-purple-400',
  },
  {
    id: 2,
    value: 100000,
    suffix: '+',
    label: 'Messages Generated',
    description: 'And counting',
    color: 'bg-gradient-to-r from-blue-400 to-cyan-400',
  },
  {
    id: 3,
    value: 99.9,
    suffix: '%',
    label: 'Uptime',
    description: 'Always available',
    color: 'bg-gradient-to-r from-emerald-400 to-teal-400',
  },
  {
    id: 4,
    value: 150,
    suffix: '+',
    label: 'Countries',
    description: 'Global reach',
    color: 'bg-gradient-to-r from-pink-400 to-rose-400',
  },
];

function AnimatedCounter({ end, duration = 2000, suffix = '', isInView, color }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let startTime;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(easeOut * end);
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => { if (animationFrame) cancelAnimationFrame(animationFrame); };
  }, [end, duration, isInView]);

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(num >= 10000 ? 0 : 1) + 'K';
    return num.toFixed(suffix === '%' ? 1 : 0);
  };

  return (
    <span className={`tabular-nums bg-clip-text text-transparent ${color}`}>
      {formatNumber(count)}{suffix}
    </span>
  );
}

export default function StatsSection() {
  const [ref, isInView] = useInView({ once: true, threshold: 0.3 });

  return (
    <section ref={ref} className="section-padding bg-[#0d0d15] relative overflow-hidden">
      {/* Divider lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-violet-950/10 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 lg:divide-x lg:divide-white/[0.06]"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.id}
              custom={index}
              variants={fadeInUp}
              className="text-center space-y-1 px-8"
            >
              <div className="text-5xl lg:text-6xl font-bold tracking-tight">
                <AnimatedCounter
                  end={stat.value}
                  suffix={stat.suffix}
                  isInView={isInView}
                  color={stat.color}
                />
              </div>
              <div className="text-base font-semibold text-white mt-2">{stat.label}</div>
              <div className="text-sm text-gray-600">{stat.description}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
