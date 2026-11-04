import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Kbd (Keyboard Key) UI Component
 * Follows official shadcn base-nova specifications.
 */
function Kbd({ className, ...props }) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground shadow-2xs select-none",
        className
      )}
      {...props}
    />
  );
}

export { Kbd };
export default Kbd;
