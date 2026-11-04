'use client';

import React, { useState } from 'react';
import { AlertCircle, Copy, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Stack Trace AI Element
 * Error frame visualizer with call trace lines, file paths, and quick-copy action.
 */
export function StackTrace({
  error,
  frames = [],
  title = 'Runtime Exception',
  className,
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const handleCopy = () => {
    const text = `${error}\n${frames.map((f) => `  at ${f.function || 'anonymous'} (${f.file}:${f.line}:${f.col})`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      data-slot="ai-stack-trace"
      className={cn(
        'rounded-2xl border border-destructive/40 bg-destructive/5 text-xs overflow-hidden shadow-xs font-mono',
        className
      )}
    >
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-destructive/10 border-b border-destructive/20">
        <div className="flex items-center gap-2 text-destructive font-semibold">
          <AlertCircle className="size-4 shrink-0" />
          <span>{title}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded-md text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            title="Copy trace"
          >
            {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-md text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <ChevronDown className={cn('size-3 transition-transform', expanded && 'rotate-180')} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3.5 space-y-2 leading-relaxed">
          {error && <div className="text-destructive font-semibold text-[11px]">{error}</div>}

          {frames.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-destructive/20 text-[11px] text-muted-foreground">
              {frames.map((frame, idx) => (
                <div key={idx} className="flex items-start gap-1.5 overflow-x-auto">
                  <span className="text-destructive/60 shrink-0">at</span>
                  <span className="text-foreground font-medium">{frame.function || 'anonymous'}</span>
                  <span className="text-muted-foreground truncate">
                    ({frame.file}:{frame.line}:{frame.col})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StackTrace;
