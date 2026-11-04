'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

export default function ImageGenLoading({ isLoading = false }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return undefined;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        const increment = prev < 80 ? Math.random() * 2 + 1 : Math.random() * 0.5 + 0.1;
        return Math.min(prev + increment, 100);
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="w-full animate-pulse">
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-[oklch(0.2700_0_0)]">
        <div className="flex items-center justify-between gap-3 border-b border-white/6 px-4 py-3 sm:px-5">
          <div className="space-y-2">
            <div className="h-3 w-24 rounded-full bg-white/10" />
            <div className="h-4 w-40 rounded-full bg-white/10" />
          </div>
          <div className="h-7 w-20 rounded-full bg-white/10" />
        </div>

        <div className="bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_36%)] p-4 sm:p-5">
          <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-[oklch(0.2150_0_0)]">
            <motion.div
              className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)]"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="flex min-h-96 items-center justify-center px-6 py-10 text-center">
              <div className="relative z-10 w-full max-w-xl space-y-4">
                <div className="mx-auto h-12 w-12 rounded-2xl border border-white/10 bg-white/5" />
                <div className="space-y-3">
                  <div className="h-4 w-full rounded-full bg-white/10" />
                  <div className="h-4 w-5/6 rounded-full bg-white/10" />
                  <div className="h-4 w-2/3 rounded-full bg-white/10" />
                </div>
                <div className="mx-auto h-2 w-28 rounded-full bg-white/10" />
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{Math.round(progress)}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
