import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * InputGroup UI Component
 * Flexible input container with prefix/suffix icons, buttons, or badges.
 */
function InputGroup({ className, children, ...props }) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        "relative flex w-full items-center rounded-xl border border-border/60 bg-transparent transition-all shadow-xs",
        "focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function InputGroupPrefix({ className, ...props }) {
  return (
    <div
      data-slot="input-group-prefix"
      className={cn("flex items-center pl-3 pr-1 text-muted-foreground select-none shrink-0", className)}
      {...props}
    />
  );
}

function InputGroupSuffix({ className, ...props }) {
  return (
    <div
      data-slot="input-group-suffix"
      className={cn("flex items-center pr-3 pl-1 text-muted-foreground select-none shrink-0", className)}
      {...props}
    />
  );
}

function InputGroupAddon({ position = "left", className, ...props }) {
  return position === "right" ? (
    <InputGroupSuffix className={className} {...props} />
  ) : (
    <InputGroupPrefix className={className} {...props} />
  );
}

export { InputGroup, InputGroupPrefix, InputGroupSuffix, InputGroupAddon };
export default InputGroup;
