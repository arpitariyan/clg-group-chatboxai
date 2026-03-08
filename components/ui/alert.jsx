import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid grid-cols-[0_1fr] has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 gap-y-1 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
        info:
          "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100",
        warning:
          "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100",
        destructive:
          "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({ className, variant, ...props }) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }) {
  return (
    <h5
      className={cn("col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight", className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }) {
  return (
    <div
      className={cn("col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
