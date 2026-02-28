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
    description: 'Trusted worldwide'
  },
  { 
    id: 2, 
    value: 100000, 
    suffix: '+', 
    label: 'Messages Generated',
    description: 'And counting'
  },
  { 
    id: 3, 
    value: 99.9, 
    suffix: '%', 
    label: 'Uptime',
    description: 'Always available'
  },
  { 
    id: 4, 
    value: 150, 
    suffix: '+', 
    label: 'Countries',
    description: 'Global reach'
  },
];

// Animated counter component
function AnimatedCounter({ end, duration = 2000, suffix = '', isInView }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let startTime;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function for smooth counting
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentCount = easeOut * end;

      setCount(currentCount);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration, isInView]);

  // Format large numbers
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(num >= 10000 ? 0 : 1) + 'K';
    }
    return num.toFixed(suffix === '%' ? 1 : 0);
  };

  return (
    <span className="tabular-nums">
      {formatNumber(count)}{suffix}
    </span>
  );
}

export default function StatsSection() {
  const [ref, isInView] = useInView({ once: true, threshold: 0.3 });

  return (
    <section 
      ref={ref}
      className="section-padding bg-white dark:bg-gray-950"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.id}
              custom={index}
              variants={fadeInUp}
              className="text-center space-y-2"
            >
              <div className="text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white">
                <AnimatedCounter 
                  end={stat.value} 
                  suffix={stat.suffix}
                  isInView={isInView}
                />
              </div>
              <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                {stat.label}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-500">
                {stat.description}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
