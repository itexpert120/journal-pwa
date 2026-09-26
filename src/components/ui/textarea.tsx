import * as React from "react"
import { cn } from "cn"

/** Filled, auto-growing multi-line field. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-12 w-full rounded-xl border border-transparent bg-muted/80 px-4 py-3 text-base caret-primary transition-colors outline-none placeholder:text-muted-foreground/70 focus:border-primary/60 focus:bg-card disabled:opacity-50 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
