'use client';

import React from 'react';
import { Sparkles, ArrowRight } from '@/components/ui/animated-icon';

/**
 * ProactiveNextStepBar — Phase 11 Proactive UI Component
 * Renders the single highest-leverage next action suggested by next-step-intelligence.
 *
 * @param {{ suggestion: string, actionPrompt: string, onAccept: (prompt: string) => void }} props
 */
export default function ProactiveNextStepBar({ suggestion, actionPrompt, onAccept }) {
  if (!suggestion || !actionPrompt) return null;

  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-foreground backdrop-blur-sm transition-all duration-200 hover:border-primary/40 hover:bg-primary/10">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
        <span className="truncate font-medium text-foreground/90">{suggestion}</span>
      </div>

      <button
        type="button"
        onClick={() => onAccept && onAccept(actionPrompt)}
        className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:scale-102 active:scale-98"
      >
        <span>Continue</span>
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}
