import * as React from "react"
import { cva } from "class-variance-authority"
import { X, File, FileText, ImageIcon } from "@/components/ui/animated-icon"

import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { FOCUS_RING } from "@/components/surface"

const AttachmentGroup = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-wrap gap-2 pt-2 pb-1", className)} {...props} />
))
AttachmentGroup.displayName = "AttachmentGroup"

/* State colours follow the shared accent policy in components/surface.js:
   amber = in progress, rose = negative. `uploading` used to be blue, which is
   reserved for Deep Research, and it sat right next to the amber `processing`
   state — two hues for two halves of one wait. Both are amber now and the
   distinction is carried by the description text, which is always present. */
const attachmentVariants = cva(
  "relative inline-flex items-center gap-3 rounded-xl border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted/50 backdrop-blur-sm max-w-sm group",
  {
    variants: {
      state: {
        idle: "border-border/40 bg-muted/20 dark:bg-white/5",
        uploading: "border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10",
        processing: "border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10",
        error: "border-rose-500/50 bg-rose-50/80 dark:bg-rose-900/20",
        done: "border-border/40 bg-muted/40 dark:bg-white/5",
      },
    },
    defaultVariants: {
      state: "done",
    },
  }
)

const Attachment = React.forwardRef(({ className, state, ...props }, ref) => (
  <div ref={ref} className={cn(attachmentVariants({ state }), className)} {...props} />
))
Attachment.displayName = "Attachment"

const AttachmentMedia = React.forwardRef(({ className, variant = "file", children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 dark:bg-white/10 overflow-hidden", className)}
      {...props}
    >
      {children ? children :
        variant === 'image' ? <ImageIcon className="h-5 w-5 text-muted-foreground" /> :
          variant === 'text' ? <FileText className="h-5 w-5 text-muted-foreground" /> :
            <File className="h-5 w-5 text-muted-foreground" />}
    </div>
  )
})
AttachmentMedia.displayName = "AttachmentMedia"

/* `pr-7` reserves the corner the remove button occupies, so a long filename
   truncates before it collides with the control instead of sliding under it. */
const AttachmentContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-1 flex-col gap-1 min-w-0 pr-7", className)} {...props} />
))
AttachmentContent.displayName = "AttachmentContent"

/* `break-all` is wrong for filenames but `truncate` alone drops the extension,
   which is the most informative part. Truncation is kept and the full name is
   exposed through `title` by the callers. */
const AttachmentTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-xs font-semibold text-foreground truncate", className)} {...props} />
))
AttachmentTitle.displayName = "AttachmentTitle"

const AttachmentDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-[11px] text-muted-foreground tabular-nums", className)} {...props} />
))
AttachmentDescription.displayName = "AttachmentDescription"

/* Was `opacity-0 group-hover:opacity-100`, which means that on any touch device
   there is no visible way to detach a file — hover never fires, so the only
   control for undoing an attachment was invisible and undiscoverable. It is
   always visible now, held back to 70% so it stays subordinate to the filename,
   and going to full opacity on hover *or* keyboard focus. */
const AttachmentActions = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute right-1 top-1 flex opacity-70 transition-opacity duration-150",
      "group-hover:opacity-100 focus-within:opacity-100",
      className
    )}
    {...props}
  />
))
AttachmentActions.displayName = "AttachmentActions"

/* The remove control, shared so all three composers detach a file the same way.
   24×24 meets the WCAG 2.2 pointer-target minimum; `aria-label` is required
   because the button has no text, and `label` names *which* attachment so a
   screen-reader user hearing four of these can tell them apart. */
const AttachmentRemove = React.forwardRef(({ className, label, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    aria-label={label ? `Remove ${label}` : "Remove attachment"}
    className={cn(
      "inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full",
      "text-muted-foreground transition-colors duration-150",
      "hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400",
      FOCUS_RING,
      className
    )}
    {...props}
  >
    <X className="h-3.5 w-3.5" />
  </button>
))
AttachmentRemove.displayName = "AttachmentRemove"

/* Upload progress. `role="progressbar"` and the numeric value come from the
   underlying Progress; the percentage is also rendered as text because a bar
   alone conveys the state by width only. */
const AttachmentProgress = React.forwardRef(({ className, value = 0, label, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center gap-2", className)} {...props}>
    <Progress
      value={value}
      aria-label={label || "Upload progress"}
      className="h-1 flex-1"
    />
    <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
      {Math.round(value)}%
    </span>
  </div>
))
AttachmentProgress.displayName = "AttachmentProgress"

export {
  AttachmentGroup,
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentRemove,
  AttachmentProgress,
}
