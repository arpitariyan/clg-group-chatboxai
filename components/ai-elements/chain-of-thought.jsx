'use client';

import React, { useState } from 'react';
import { CheckCircle2, CircleDashed, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Chain of Thought AI Element
 * Sequential execution tracking with step status, elapsed time, and sub-step details.
 */
export function ChainOfThought({
  steps = [],
  title = 'Execution Steps',
  className,
}) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const toggleStep = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div
      data-slot="ai-chain-of-thought"
      className={cn('rounded-2xl border border-border/60 bg-card/60 p-4 shadow-xs space-y-3', className)}
    >
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
        <span className="text-[11px] text-muted-foreground">
          {steps.filter((s) => s.status === 'completed').length}/{steps.length} completed
        </span>
      </div>

      <div className="space-y-2">
        {steps.map((step, idx) => {
          const isExpanded = expandedIndex === idx;
          const isRunning = step.status === 'running';
          const isCompleted = step.status === 'completed';
          const isFailed = step.status === 'failed';

          return (
            <div
              key={step.id || idx}
              className={cn(
                'rounded-xl border transition-all overflow-hidden',
                isRunning
                  ? 'border-primary/40 bg-primary/5'
                  : isCompleted
                  ? 'border-border/40 bg-muted/20'
                  : isFailed
                  ? 'border-destructive/40 bg-destructive/5'
                  : 'border-border/30 bg-transparent'
              )}
            >
              <button
                type="button"
                onClick={() => step.details && toggleStep(idx)}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2.5 text-xs text-left',
                  step.details ? 'cursor-pointer hover:bg-accent/40' : 'cursor-default'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isRunning ? (
                    <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                  ) : isFailed ? (
                    <AlertCircle className="size-3.5 text-destructive shrink-0" />
                  ) : (
                    <CircleDashed className="size-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span
                    className={cn(
                      'font-medium truncate',
                      isCompleted ? 'text-muted-foreground' : 'text-foreground'
                    )}
                  >
                    {step.title || step.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {step.duration && (
                    <span className="text-[10px] text-muted-foreground font-mono">{step.duration}</span>
                  )}
                  {step.details && (
                    <ChevronDown
                      className={cn(
                        'size-3 text-muted-foreground transition-transform duration-200',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  )}
                </div>
              </button>

              {isExpanded && step.details && (
                <div className="px-3 pb-3 pt-1 text-[11px] leading-relaxed text-muted-foreground border-t border-border/20 bg-background/50">
                  {step.details}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ChainOfThought;
