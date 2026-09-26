import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

/**
 * Filled text field (iOS grouped / Material 3 filled style). 16px text so
 * iOS Safari never zooms the page on focus.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-xl border border-transparent bg-muted/80 px-4 text-base caret-primary transition-colors outline-none placeholder:text-muted-foreground/70 focus:border-primary/60 focus:bg-card disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&[type=date]]:appearance-none [&[type=time]]:appearance-none",
        className
      )}
      {...props}
    />
  )
}

export { Input }
