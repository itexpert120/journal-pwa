import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "cn"

/** iOS-proportioned switch (51×31pt). */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 outline-none after:absolute after:-inset-2 focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:bg-emerald-500 data-unchecked:bg-muted-foreground/25 data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-[27px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.2)] transition-transform duration-200 ease-[cubic-bezier(0.3,1.4,0.6,1)] data-checked:translate-x-5"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
