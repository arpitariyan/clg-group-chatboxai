'use client';

import React from 'react';
import { CheckCircle2, CircleDashed, Loader2, Wrench, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Task AI Element
 * Live agent task row with status indicator, assigned tool badge, and elapsed duration.
 */
export function Task({
  title,
  status = 'pending', // 'pending' | 'running' | 'completed' | 'failed'
  tool,
  duration,
  className,
}) {
  const isRunning = status === 'running';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  return (
    <div
      data-slot="ai-task"
      className={cn(
        'flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition-all',
        isRunning
          ? 'border-primary/50 bg-primary/5 text-foreground'
          : isCompleted
          ? 'border-border/40 bg-muted/20 text-muted-foreground'
          : isFailed
          ? 'border-destructive/40 bg-destructive/5 text-destructive'
          : 'border-border/30 bg-transparent text-foreground',
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isRunning ? (
          <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />
        ) : isCompleted ? (
          <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
        ) : (
          <CircleDashed className="size-3.5 text-muted-foreground shrink-0" />
        )}
        <span className={cn('font-medium truncate', isCompleted && 'line-through opacity-70')}>{title}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {tool && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground font-mono">
            <Wrench className="size-2.5" />
            {tool}
          </span>
        )}
        {duration && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="size-2.5" />
            {duration}
          </span>
        )}
      </div>
    </div>
  );
}

export default Task;
