'use client';

import React, { useState } from 'react';
import { ChevronDown, Brain, Sparkles, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Reasoning AI Element
 * Collapsible thought block with thinking status, duration, and expandable reasoning steps.
 * Conforms to shadcn/ui base-nova standards.
 */
export function Reasoning({
  title = 'Reasoning',
  duration,
  isStreaming = false,
  defaultOpen = false,
  children,
  className,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen || isStreaming);

  return (
    <div
      data-slot="ai-reasoning"
      className={cn(
        'rounded-xl border border-border/60 bg-muted/30 overflow-hidden text-sm transition-all shadow-xs',
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <Brain className={cn('size-3.5 text-primary', isStreaming && 'animate-pulse')} />
          <span className="font-semibold text-foreground/90">{title}</span>
          {isStreaming ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <Sparkles className="size-2.5 animate-spin" />
              Thinking...
            </span>
          ) : duration ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="size-2.5" />
              {duration}
            </span>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="border-t border-border/40 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground space-y-2 bg-background/40">
          {children}
        </div>
      )}
    </div>
  );
}

export default Reasoning;
