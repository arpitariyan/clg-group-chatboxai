'use client';

import React, { useState } from 'react';
import { Wrench, CheckCircle2, AlertCircle, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Tool AI Element
 * Tool call presentation with input parameters, live execution status, and formatted output.
 */
export function Tool({
  name,
  status = 'completed', // 'running' | 'completed' | 'failed'
  input,
  output,
  duration,
  className,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isRunning = status === 'running';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  return (
    <div
      data-slot="ai-tool"
      className={cn(
        'rounded-xl border overflow-hidden text-xs transition-all shadow-xs',
        isRunning
          ? 'border-primary/50 bg-primary/5'
          : isCompleted
          ? 'border-border/60 bg-muted/20'
          : 'border-destructive/40 bg-destructive/5',
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-accent/40 select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center justify-center size-5 rounded-md bg-muted text-muted-foreground">
            <Wrench className="size-3" />
          </div>
          <span className="font-mono font-semibold text-foreground truncate">{name}</span>
          {isRunning ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-primary">
              <Loader2 className="size-2.5 animate-spin" /> Calling...
            </span>
          ) : isCompleted ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500">
              <CheckCircle2 className="size-2.5" /> Executed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-destructive">
              <AlertCircle className="size-2.5" /> Failed
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {duration && <span className="text-[10px] text-muted-foreground font-mono">{duration}</span>}
          <ChevronDown
            className={cn('size-3 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')}
          />
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border/40 p-3 space-y-2 bg-background/50 font-mono text-[11px]">
          {input && (
            <div>
              <span className="text-muted-foreground uppercase text-[9px] font-bold">Input:</span>
              <pre className="mt-1 p-2 rounded-md bg-muted/60 overflow-x-auto text-foreground whitespace-pre-wrap">
                {typeof input === 'object' ? JSON.stringify(input, null, 2) : input}
              </pre>
            </div>
          )}
          {output && (
            <div>
              <span className="text-muted-foreground uppercase text-[9px] font-bold">Output:</span>
              <pre className="mt-1 p-2 rounded-md bg-muted/60 overflow-x-auto text-foreground whitespace-pre-wrap">
                {typeof output === 'object' ? JSON.stringify(output, null, 2) : output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Tool;
