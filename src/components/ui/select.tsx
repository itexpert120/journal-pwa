import { useState } from "react"
import { cn } from "cn"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

export type SelectOption = string | { value: string; label: string }
const norm = (o: SelectOption) => (typeof o === "string" ? { value: o, label: o } : o)

/**
 * Mobile picker: a filled field that opens a bottom sheet of options —
 * the pattern native apps use instead of a floating dropdown menu.
 */
function Select({
  value,
  onValueChange,
  options,
  label,
  placeholder = "Select",
  className,
}: {
  value: string | undefined
  onValueChange: (v: string) => void
  options: readonly SelectOption[]
  /** Sheet title and accessible name. */
  label: string
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const opts = options.map(norm)
  const current = opts.find((o) => o.value === value)
  return (
    <>
      <button
        type="button"
        data-slot="select-trigger"
        aria-label={`${label}: ${current?.label ?? placeholder}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-12 min-w-0 touch-manipulation items-center justify-between gap-2 rounded-xl bg-muted/80 pr-3 pl-4 text-left text-base transition-transform outline-none active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring/50",
          !current && "text-muted-foreground/70",
          className
        )}
      >
        <span className="truncate">{current?.label ?? placeholder}</span>
        <ChevronDownIcon className="size-5 shrink-0 text-muted-foreground" />
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{label}</DrawerTitle>
          </DrawerHeader>
          <ul role="listbox" aria-label={label} className="overflow-y-auto px-2 pb-2">
            {opts.map((o) => {
              const selected = o.value === value
              return (
                <li key={o.value} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.vibrate?.(8)
                      onValueChange(o.value)
                      setOpen(false)
                    }}
                    className={cn(
                      "flex h-14 w-full items-center gap-3 rounded-xl px-4 text-left text-[1.05rem] active:bg-muted",
                      selected && "font-semibold text-primary"
                    )}
                  >
                    <span className="flex-1">{o.label}</span>
                    {selected && <CheckIcon className="size-5" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </DrawerContent>
      </Drawer>
    </>
  )
}

export { Select }
