import React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const markerVariants = cva(
  "inline-flex items-center gap-3 text-sm text-muted-foreground w-full",
  {
    variants: {
      variant: {
        default: "",
        border: "border-b border-border/40 pb-3 mb-3",
        separator: "justify-center relative before:absolute before:inset-0 before:top-1/2 before:-translate-y-1/2 before:w-full before:h-px before:bg-border/40 my-6 text-xs font-medium text-muted-foreground/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Marker = React.forwardRef(({ className, variant, render, role, ...props }, ref) => {
  const Comp = render ? Slot : "div"
  
  if (render) {
    return (
      <Comp
        ref={ref}
        role={role}
        className={cn(markerVariants({ variant }), className)}
        {...props}
      >
        {render}
      </Comp>
    )
  }

  return (
    <Comp
      ref={ref}
      role={role}
      className={cn(markerVariants({ variant }), className)}
      {...props}
    />
  )
})
Marker.displayName = "Marker"

const MarkerIcon = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    aria-hidden="true"
    className={cn(
      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/40 bg-muted/30 text-muted-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
MarkerIcon.displayName = "MarkerIcon"

const MarkerContent = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative z-10 bg-background px-3 py-1 rounded-full text-sm font-medium",
      className?.includes("shimmer")
        ? "bg-clip-text text-transparent bg-[linear-gradient(110deg,#a1a1aa,45%,#27272a,55%,#a1a1aa)] bg-[length:200%_100%] animate-shimmer dark:bg-[linear-gradient(110deg,#71717a,45%,#e4e4e7,55%,#71717a)]"
        : "",
      className
    )}
    {...props}
  />
))
MarkerContent.displayName = "MarkerContent"

export { Marker, MarkerContent, MarkerIcon, markerVariants }
