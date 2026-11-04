import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Slider UI Component
 * Accessible range slider matching shadcn base-nova track and thumb geometry.
 */
const Slider = React.forwardRef(({
  className,
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue = 50,
  onChange,
  disabled,
  ...props
}, ref) => {
  return (
    <div data-slot="slider" className={cn("relative flex w-full touch-none select-none items-center", className)}>
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          "w-full h-1.5 rounded-full bg-muted appearance-none cursor-pointer accent-primary",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
        {...props}
      />
    </div>
  );
});
Slider.displayName = "Slider";

export { Slider };
export default Slider;
