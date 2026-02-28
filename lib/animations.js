'use client';

import { useEffect, useState, useRef } from 'react';

/**
 * Framer Motion Animation Variants for Landing Page
 * Inspired by Apple's smooth, minimal animations
 */

// Fade in from bottom with customizable delay
export const fadeInUp = {
  hidden: { 
    opacity: 0, 
    y: 30 
  },
  visible: (custom = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      delay: custom * 0.1,
      ease: [0.25, 0.1, 0.25, 1.0], // Apple's preferred easing
    },
  }),
};

// Simple fade in
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

// Scale in with fade
export const scaleIn = {
  hidden: { 
    opacity: 0, 
    scale: 0.95 
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1.0],
    },
  },
};

// Slide in from left
export const slideInLeft = {
  hidden: { 
    opacity: 0, 
    x: -50 
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.7,
      ease: 'easeOut',
    },
  },
};

// Slide in from right
export const slideInRight = {
  hidden: { 
    opacity: 0, 
    x: 50 
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.7,
      ease: 'easeOut',
    },
  },
};

// Stagger children animation
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

// Parallax scroll effect variant
export const parallaxScroll = (scrollY, distance = 100) => ({
  y: scrollY * distance,
});

// Hover lift effect
export const hoverLift = {
  rest: { 
    y: 0,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  hover: {
    y: -4,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

// Gentle floating animation
export const floatAnimation = {
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Custom Hooks
 */

// Hook to detect when element is in viewport
export const useInView = (options = {}) => {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        if (options.once) {
          observer.disconnect();
        }
      } else if (!options.once) {
        setIsInView(false);
      }
    }, {
      threshold: options.threshold || 0.1,
      rootMargin: options.rootMargin || '0px',
    });

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [options.once, options.threshold, options.rootMargin]);

  return [ref, isInView];
};

// Hook for animated counter
export const useCounter = (end, duration = 2000, start = 0) => {
  const [count, setCount] = useState(start);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!isActive) return;

    let startTime;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth counting
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * (end - start) + start));

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [end, duration, start, isActive]);

  return [count, () => setIsActive(true)];
};

// Hook for scroll progress
export const useScrollProgress = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const progress = (scrollTop / (documentHeight - windowHeight)) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrollProgress;
};

// Hook for scroll Y position
export const useScrollY = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Set initial value

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrollY;
};

/**
 * Easing Functions
 * Matches Apple's animation curves
 */
export const easings = {
  // Apple's standard easing
  appleEase: [0.25, 0.1, 0.25, 1.0],
  
  // Smooth ease out
  easeOut: [0.22, 1, 0.36, 1],
  
  // Smooth ease in out
  easeInOut: [0.76, 0, 0.24, 1],
  
  // Bounce effect
  bounce: [0.68, -0.55, 0.265, 1.55],
};

/**
 * Utility function to create stagger delay
 */
export const getStaggerDelay = (index, baseDelay = 0.1) => {
  return index * baseDelay;
};
