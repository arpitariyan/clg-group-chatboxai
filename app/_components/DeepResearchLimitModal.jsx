'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Atom, Lock, Sparkles, ArrowRight, X, Calendar } from '@/components/ui/animated-icon';
import { Button } from '@/components/ui/button';

export default function DeepResearchLimitModal({
  isOpen,
  onClose,
  plan = 'free',
  weeklyLimit = 5,
  weeklyCount = 5,
  remaining = 0,
}) {
  const router = useRouter();

  if (!isOpen) return null;

  const normalizedPlan = String(plan || 'free').toLowerCase();
  const planDisplayName =
    normalizedPlan === 'max'
      ? 'Max Plan'
      : normalizedPlan === 'pro'
      ? 'Pro Plan'
      : 'Free Plan';

  const isMax = normalizedPlan === 'max';
  const isPro = normalizedPlan === 'pro';

  const handleUpgrade = () => {
    onClose?.();
    router.push('/pricing');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border/60 bg-background/95 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl transition-all animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4 relative z-10">
          {/* Icon Badge */}
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Atom className="h-7 w-7" />
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-xs">
              <Lock className="h-3 w-3" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Deep Research Limit Reached
            </h2>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              {planDisplayName} ({weeklyLimit} requests/week)
            </div>
          </div>

          {/* Usage Message */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              You have used all <span className="font-semibold text-foreground">{weeklyLimit}</span> of your <span className="font-semibold text-foreground">{weeklyLimit}</span> weekly Deep Research requests.
            </p>

            <div className="flex items-center justify-center gap-2 rounded-xl bg-muted/60 px-4 py-2.5 text-xs font-medium text-foreground border border-border/40 mt-3">
              <Calendar className="h-4 w-4 text-primary shrink-0" />
              <span>Resets automatically every <strong className="text-foreground">Sunday</strong></span>
            </div>
          </div>

          {/* Upgrade Section for Free and Pro users */}
          {!isMax && (
            <div className="w-full pt-2">
              <div className="p-3.5 rounded-xl bg-muted/50 border border-border/60 space-y-2 text-left mb-4">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Need more research?</span>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <strong>Pro Plan:</strong> 15 Deep Research uses / week
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <strong>Max Plan:</strong> 25 Deep Research uses / week
                  </li>
                </ul>
              </div>

              <Button
                onClick={handleUpgrade}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl py-5 flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 shadow-xs"
              >
                <span>Upgrade Plan for More Limits</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Dismiss button */}
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full text-sm font-medium text-muted-foreground hover:text-foreground rounded-xl"
          >
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
