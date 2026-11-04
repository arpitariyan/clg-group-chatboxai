import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ButtonGroup UI Component
 * Connected segment control wrapper matching base-nova geometry.
 */
function ButtonGroup({ className, children, ...props }) {
  return (
    <div
      data-slot="button-group"
      role="group"
      className={cn(
        "inline-flex items-center -space-x-px rounded-xl border border-border/60 bg-muted/40 p-0.5 shadow-xs",
        "[&>button]:rounded-lg [&>button]:border-0 [&>button]:shadow-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { ButtonGroup };
export default ButtonGroup;
