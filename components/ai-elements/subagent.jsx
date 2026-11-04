'use client';

import React from 'react';
import { Bot, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Subagent AI Element
 * Visual representation of an autonomous delegated agent task.
 */
export function Subagent({
  name,
  role,
  status = 'running', // 'running' | 'completed' | 'idle'
  task,
  className,
}) {
  const isRunning = status === 'running';
  const isCompleted = status === 'completed';

  return (
    <div
      data-slot="ai-subagent"
      className={cn(
        'flex items-start gap-3 p-3.5 rounded-2xl border transition-all text-xs shadow-xs',
        isRunning
          ? 'border-primary/50 bg-primary/5'
          : isCompleted
          ? 'border-border/60 bg-muted/20'
          : 'border-border/40 bg-card/60',
        className
      )}
    >
      <div className="relative size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
        <Bot className="size-4" />
        {isRunning && (
          <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-primary animate-ping" />
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-foreground truncate">{name}</span>
            {role && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                {role}
              </span>
            )}
          </div>
          {isRunning ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-primary font-medium">
              <Loader2 className="size-3 animate-spin" /> Working
            </span>
          ) : isCompleted ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
              <CheckCircle2 className="size-3" /> Done
            </span>
          ) : null}
        </div>

        {task && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{task}</p>
        )}
      </div>
    </div>
  );
}

export default Subagent;
