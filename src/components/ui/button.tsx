import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * Native-feeling touch button: ≥44pt targets, press-to-shrink feedback
 * instead of hover states, rounded like iOS / Material 3 buttons.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 touch-manipulation items-center justify-center rounded-full border border-transparent bg-clip-padding font-semibold whitespace-nowrap transition-[transform,opacity,background-color] duration-150 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96] active:opacity-80 disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm",
        outline: "border-border bg-card text-primary",
        secondary: "bg-accent text-accent-foreground",
        ghost: "text-foreground active:bg-muted",
        destructive: "bg-destructive/12 text-destructive",
        glass: "glass-light text-foreground",
        link: "text-primary active:scale-100",
      },
      size: {
        default: "h-12 gap-2 px-5 text-base",
        xs: "h-8 gap-1 px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-10 gap-1.5 px-4 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-14 gap-2 px-7 text-[1.05rem]",
        icon: "size-11 rounded-full",
        "icon-xs": "size-8 rounded-full [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-10 rounded-full [&_svg:not([class*='size-'])]:size-4.5",
        "icon-lg": "size-14 rounded-full [&_svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
