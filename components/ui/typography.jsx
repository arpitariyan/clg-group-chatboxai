import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Typography UI Components
 * Standardized typography scale matching official shadcn specifications.
 */
function TypographyH1({ className, ...props }) {
  return (
    <h1
      className={cn("scroll-m-20 text-3xl sm:text-4xl font-extrabold tracking-tight lg:text-5xl text-foreground", className)}
      {...props}
    />
  );
}

function TypographyH2({ className, ...props }) {
  return (
    <h2
      className={cn("scroll-m-20 border-b border-border/60 pb-2 text-2xl sm:text-3xl font-semibold tracking-tight first:mt-0 text-foreground", className)}
      {...props}
    />
  );
}

function TypographyH3({ className, ...props }) {
  return (
    <h3
      className={cn("scroll-m-20 text-xl sm:text-2xl font-semibold tracking-tight text-foreground", className)}
      {...props}
    />
  );
}

function TypographyH4({ className, ...props }) {
  return (
    <h4
      className={cn("scroll-m-20 text-lg font-semibold tracking-tight text-foreground", className)}
      {...props}
    />
  );
}

function TypographyP({ className, ...props }) {
  return (
    <p
      className={cn("leading-7 text-sm sm:text-base text-foreground/90 [&:not(:first-child)]:mt-4", className)}
      {...props}
    />
  );
}

function TypographyLead({ className, ...props }) {
  return (
    <p
      className={cn("text-lg sm:text-xl text-muted-foreground leading-relaxed", className)}
      {...props}
    />
  );
}

function TypographyMuted({ className, ...props }) {
  return (
    <p
      className={cn("text-xs sm:text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyH4,
  TypographyP,
  TypographyLead,
  TypographyMuted,
};
