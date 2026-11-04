'use client';

import React from 'react';
import { Target, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task } from './task';

/**
 * Plan AI Element
 * Structured autonomous plan with objective header, checklist, and progress completion bar.
 */
export function Plan({
  objective,
  tasks = [],
  className,
}) {
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div
      data-slot="ai-plan"
      className={cn('rounded-2xl border border-border/60 bg-card/60 p-4 shadow-xs space-y-3', className)}
    >
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-primary" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Objective</h4>
        </div>
        <span className="text-xs font-semibold text-primary">{progressPercent}%</span>
      </div>

      {objective && <p className="text-xs text-muted-foreground leading-relaxed font-medium">{objective}</p>}

      {/* Progress Bar */}
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Task Checklist */}
      <div className="space-y-1.5 pt-1">
        {tasks.map((task, idx) => (
          <Task key={task.id || idx} {...task} />
        ))}
      </div>
    </div>
  );
}

export default Plan;
