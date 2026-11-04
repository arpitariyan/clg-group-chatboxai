import { LoaderIcon } from "@/components/ui/animated-icon"
import { cn } from "@/lib/utils"

function Spinner({ className, ...props }) {
  return (
    <LoaderIcon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
