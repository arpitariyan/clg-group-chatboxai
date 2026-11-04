'use client';

import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Suggestion AI Element
 * Prompt recommendation pill and next action chip.
 */
export function Suggestion({
  text,
  category,
  onClick,
  className,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-slot="ai-suggestion"
      className={cn(
        'group flex items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-card/60 hover:bg-accent/40 hover:border-border text-left transition-all cursor-pointer shadow-xs',
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles className="size-3.5 text-primary shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
        <span className="text-xs font-medium text-foreground line-clamp-2 leading-snug">{text}</span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {category && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium uppercase tracking-wider">
            {category}
          </span>
        )}
        <ArrowRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
}

export default Suggestion;
