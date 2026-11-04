'use client';

import * as React from "react";
import { CheckCircle2, CircleDashed, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Trace UI Component
 * Linear agent activity trace line item matching shadcn base-nova specifications.
 */
function Trace({
  status = "completed", // "pending" | "running" | "completed" | "failed"
  title,
  duration,
  className,
  children,
  ...props
}) {
  return (
    <div
      data-slot="trace"
      className={cn(
        "relative flex items-start gap-3 pl-6 pb-4 last:pb-0 before:absolute before:left-2.5 before:top-3 before:bottom-0 before:w-px before:bg-border/60 last:before:hidden",
        className
      )}
      {...props}
    >
      <div className="absolute left-0 top-0.5 flex size-5 items-center justify-center rounded-full bg-background border border-border/60">
        {status === "running" ? (
          <Loader2 className="size-3 animate-spin text-primary" />
        ) : status === "completed" ? (
          <CheckCircle2 className="size-3 text-emerald-500" />
        ) : status === "failed" ? (
          <AlertCircle className="size-3 text-destructive" />
        ) : (
          <CircleDashed className="size-3 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">{title}</span>
          {duration && <span className="font-mono text-[10px] text-muted-foreground">{duration}</span>}
        </div>
        {children && <div className="text-xs text-muted-foreground">{children}</div>}
      </div>
    </div>
  );
}

export { Trace };
export default Trace;
