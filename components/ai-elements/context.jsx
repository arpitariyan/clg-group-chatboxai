'use client';

import React from 'react';
import { Layers, Database, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Context AI Element
 * Visual indicator for active context tokens, injected system prompts, and memory items.
 */
export function Context({
  usedTokens = 0,
  maxTokens = 128000,
  files = [],
  memoryCount = 0,
  className,
}) {
  const percent = maxTokens > 0 ? Math.min(100, Math.round((usedTokens / maxTokens) * 100)) : 0;

  return (
    <div
      data-slot="ai-context"
      className={cn('rounded-xl border border-border/60 bg-card/60 p-3 text-xs space-y-2 shadow-xs', className)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Layers className="size-3.5 text-primary" />
          <span>Context Window</span>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">
          {usedTokens.toLocaleString()} / {maxTokens.toLocaleString()} tokens ({percent}%)
        </span>
      </div>

      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-300',
            percent > 85 ? 'bg-destructive' : percent > 60 ? 'bg-amber-500' : 'bg-primary'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      {(files.length > 0 || memoryCount > 0) && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
          {memoryCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Database className="size-3 text-muted-foreground" />
              {memoryCount} memories
            </span>
          )}
          {files.map((file, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted">
              <FileText className="size-2.5 text-muted-foreground" />
              {file}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default Context;
