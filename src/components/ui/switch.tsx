import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "cn"

/** iOS 26 switch: 63×28pt track with a capsule thumb that swells while pressed. */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer group/switch relative inline-flex h-7 w-[63px] shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 outline-none after:absolute after:-inset-2 focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:bg-success data-unchecked:bg-muted-foreground/25 data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block h-6 w-[37px] rounded-full bg-white shadow-[0_2px_5px_rgb(0_0_0/0.18)] transition-[transform,scale] duration-300 ease-[cubic-bezier(0.3,1.35,0.5,1)] group-active/switch:scale-x-110 group-active/switch:scale-y-115 data-checked:translate-x-[22px]"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
