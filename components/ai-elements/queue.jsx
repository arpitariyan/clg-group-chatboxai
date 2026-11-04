'use client';

import React from 'react';
import { ListOrdered, Clock, X, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Queue AI Element
 * Batch processing queue for asynchronous generations and jobs.
 */
export function Queue({
  items = [],
  onCancelItem,
  title = 'Job Queue',
  className,
}) {
  if (!items || items.length === 0) return null;

  return (
    <div
      data-slot="ai-queue"
      className={cn('rounded-2xl border border-border/60 bg-card/60 p-4 shadow-xs space-y-3', className)}
    >
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <ListOrdered className="size-4 text-primary" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">{title}</h4>
        </div>
        <span className="text-[11px] text-muted-foreground">{items.length} queued</span>
      </div>

      <div className="space-y-1.5">
        {items.map((item, idx) => {
          const isProcessing = item.status === 'processing';
          const isDone = item.status === 'done';

          return (
            <div
              key={item.id || idx}
              className={cn(
                'flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all',
                isProcessing
                  ? 'border-primary/50 bg-primary/5 text-foreground'
                  : 'border-border/40 bg-muted/20 text-muted-foreground'
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isProcessing ? (
                  <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />
                ) : isDone ? (
                  <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <span className="size-4 rounded-full bg-muted flex items-center justify-center text-[10px] font-mono shrink-0">
                    {idx + 1}
                  </span>
                )}
                <span className="font-medium truncate">{item.title || item.name}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {item.estimatedTime && (
                  <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                    <Clock className="size-2.5" />
                    {item.estimatedTime}
                  </span>
                )}
                {!isDone && onCancelItem && (
                  <button
                    type="button"
                    onClick={() => onCancelItem(item.id || idx)}
                    className="size-5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
                    title="Cancel task"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Queue;
