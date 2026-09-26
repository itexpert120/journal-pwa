import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const toggleVariants = cva(
  "group/toggle inline-flex touch-manipulation items-center justify-center gap-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent aria-pressed:bg-muted",
        outline: "border border-border bg-card aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary",
        /** Segment of a segmented control — pair with <ToggleGroup variant="segmented">. */
        segmented:
          "text-foreground aria-pressed:bg-card aria-pressed:shadow-[0_2px_6px_rgb(0_0_0/0.12)] dark:aria-pressed:bg-[#636366]",
      },
      size: {
        default: "h-11 min-w-11 px-3",
        sm: "h-9 min-w-9 px-2.5 text-[0.8rem]",
        lg: "h-12 min-w-12 px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return <TogglePrimitive data-slot="toggle" className={cn(toggleVariants({ variant, size, className }))} {...props} />
}

export { Toggle, toggleVariants }
