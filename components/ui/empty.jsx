import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Empty UI Component
 * Standardized empty state presentation matching base-nova geometry.
 */
function Empty({ className, icon: Icon, title, description, children, ...props }) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-border/60 bg-card/40 space-y-3",
        className
      )}
      {...props}
    >
      {Icon && (
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 border border-border/40 text-muted-foreground shadow-2xs">
          <Icon className="size-6" />
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        {title && <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>}
        {description && <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>}
      </div>
      {children && <div className="pt-2">{children}</div>}
    </div>
  );
}

export { Empty };
export default Empty;
