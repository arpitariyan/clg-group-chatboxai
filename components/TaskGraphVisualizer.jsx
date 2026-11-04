'use client';

import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp, CheckCircle2, Loader2, Calendar, Mail, FileText, Hash, ImageIcon, Sparkles } from '@/components/ui/animated-icon';

const APP_ICONS = {
  gmail: Mail,
  google_calendar: Calendar,
  google_drive: FileText,
  notion: FileText,
  slack: Hash,
  canva: ImageIcon,
  figma: Sparkles,
};

/**
 * TaskGraphVisualizer — Phase 12 Multi-App Workflow Visualizer Component
 *
 * @param {{ taskGraph: object, appNames?: string[] }} props
 */
export default function TaskGraphVisualizer({ taskGraph }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!taskGraph || !Array.isArray(taskGraph.tasks) || taskGraph.tasks.length === 0) {
    return null;
  }

  const isMultiApp = taskGraph.strategy === 'multi_app_graph';

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-border/60 bg-muted/30 text-xs backdrop-blur-sm transition-all duration-200">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-2.5 font-medium text-foreground/90 hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Layers className="h-3 w-3" aria-hidden="true" />
          </div>
          <span>
            {isMultiApp ? 'Multi-App Execution Pipeline' : 'App Context Pipeline'}
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {taskGraph.tasks.length} {taskGraph.tasks.length === 1 ? 'step' : 'steps'}
          </span>
        </div>

        {isOpen ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        )}
      </button>

      {/* Body Task List */}
      {isOpen && (
        <div className="space-y-1.5 border-t border-border/40 px-4 py-3">
          {taskGraph.tasks.map((task) => {
            const IconComponent = APP_ICONS[task.appId] || Layers;
            return (
              <div
                key={task.taskId}
                className="flex items-center justify-between rounded-xl bg-background/50 px-3 py-2 border border-border/30"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <IconComponent className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="truncate font-medium text-foreground/90">{task.action}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {task.isParallel && (
                    <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-blue-500">
                      Parallel
                    </span>
                  )}
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
