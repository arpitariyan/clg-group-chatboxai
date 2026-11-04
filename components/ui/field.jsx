import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

/**
 * Field UI Component
 * Composed form control container with label, description, and error message.
 * Supports both shorthand props (<Field label="..." description="..." />)
 * and subcomponent composition (<Field><FieldLabel>...</FieldLabel>...</Field>).
 */
function Field({
  label,
  description,
  error,
  required,
  className,
  children,
  id,
  ...props
}) {
  const generatedId = React.useId();
  const fieldId = id || generatedId;

  return (
    <div data-slot="field" className={cn("space-y-1.5", className)} {...props}>
      {label && (
        <Label htmlFor={fieldId} className="text-xs font-semibold text-foreground flex items-center gap-1">
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      {children}
      {description && !error && (
        <p className="text-[11px] text-muted-foreground leading-normal">{description}</p>
      )}
      {error && <p className="text-[11px] font-medium text-destructive leading-normal">{error}</p>}
    </div>
  );
}

function FieldLabel({ className, required, children, ...props }) {
  return (
    <Label data-slot="field-label" className={cn("text-xs font-semibold text-foreground flex items-center gap-1", className)} {...props}>
      {children}
      {required && <span className="text-destructive">*</span>}
    </Label>
  );
}

function FieldDescription({ className, children, ...props }) {
  return (
    <p data-slot="field-description" className={cn("text-[11px] text-muted-foreground leading-normal", className)} {...props}>
      {children}
    </p>
  );
}

function FieldError({ className, children, ...props }) {
  if (!children) return null;
  return (
    <p data-slot="field-error" className={cn("text-[11px] font-medium text-destructive leading-normal", className)} {...props}>
      {children}
    </p>
  );
}

export { Field, FieldLabel, FieldDescription, FieldError };
export default Field;
