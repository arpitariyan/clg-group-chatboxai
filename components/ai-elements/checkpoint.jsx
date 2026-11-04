'use client';

import React from 'react';
import { History, RotateCcw, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Checkpoint AI Element
 * Version snapshot card with timestamp, description, and rollback action.
 */
export function Checkpoint({
  id,
  version,
  timestamp,
  description,
  isCurrent = false,
  onRollback,
  className,
}) {
  return (
    <div
      data-slot="ai-checkpoint"
      className={cn(
        'flex items-center justify-between p-3 rounded-xl border text-xs transition-all shadow-xs',
        isCurrent
          ? 'border-primary/50 bg-primary/5'
          : 'border-border/60 bg-card/60 hover:border-border',
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center justify-center size-7 rounded-lg bg-muted text-muted-foreground shrink-0">
          <History className="size-3.5" />
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground truncate">
              {version ? `v${version}` : `Checkpoint ${id?.slice(0, 6)}`}
            </span>
            {isCurrent && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-medium">
                Current
              </span>
            )}
          </div>
          {description && <p className="text-[11px] text-muted-foreground truncate">{description}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {timestamp && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="size-2.5" />
            {timestamp}
          </span>
        )}
        {!isCurrent && onRollback && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRollback(id)}
            className="h-7 px-2 text-xs rounded-lg cursor-pointer"
          >
            <RotateCcw className="size-3 mr-1" /> Rollback
          </Button>
        )}
      </div>
    </div>
  );
}

export default Checkpoint;
