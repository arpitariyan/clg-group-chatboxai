'use client';

import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, CheckCircle2, Loader2, AlertCircle } from '@/components/ui/animated-icon';

/**
 * ThinkingProgressWidget — Claude-style safe execution progress widget.
 * Displays progress stages (Understanding → Planning → Generating → Validating → Complete)
 * without exposing hidden chain-of-thought or raw deliberation tokens.
 */
export default function ThinkingProgressWidget({ progressEvents = [], currentStage = 'understanding', isComplete = false }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!progressEvents || progressEvents.length === 0) {
    if (!isComplete) return null;
  }

  const activeEvent = isComplete
    ? (progressEvents[progressEvents.length - 1] || {
        message: 'Task completed successfully',
        progress: 100,
      })
    : (progressEvents.find((e) => e.stage === currentStage) ||
       progressEvents.filter((e) => e.status !== 'completed' && (e.progress || 0) < 100).pop() ||
       progressEvents[0] || {
        message: 'Processing document request...',
        progress: 50,
      });

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-primary/20 bg-inset/40 text-xs backdrop-blur-sm transition-all duration-200">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex cursor-pointer items-center justify-between px-3.5 py-2 hover:bg-hover-2/50"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            {isComplete ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
            ) : (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
            )}
          </div>
          <span className="truncate font-medium text-foreground/90">{activeEvent.message}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
          <span className="font-mono text-[10px] font-semibold text-primary">{activeEvent.progress || (isComplete ? 100 : 50)}%</span>
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </div>

      {isExpanded && progressEvents.length > 0 && (
        <div className="space-y-1.5 border-t border-border/40 px-4 py-2.5 bg-inset/60">
          {progressEvents.map((evt, idx) => {
            const isEvtDone = isComplete || (evt.progress || 0) <= (activeEvent.progress || 0);
            return (
              <div key={`evt-${idx}`} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isEvtDone ? 'bg-emerald-500' : 'bg-primary/40'}`} />
                <span className={`truncate ${isEvtDone ? 'text-foreground/90 font-medium' : ''}`}>{evt.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
