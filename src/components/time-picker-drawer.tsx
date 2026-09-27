import { useLayoutEffect, useRef, useState } from "react"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { ActionRow, Group, SheetBar } from "@/components/ios"
import { nowHHMM } from "@/lib/date"
import { cn, remPx } from "@/lib/utils"

const VISIBLE = 5

const HOURS = Array.from({ length: 12 }, (_, i) => String(i === 0 ? 12 : i))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"))
const PERIODS = ["AM", "PM"]

/** One scroll-snapping column of an iOS-style wheel picker. */
function Wheel({
  items,
  index,
  onChange,
  label,
  className,
}: {
  items: string[]
  index: number
  onChange: (i: number) => void
  label: string
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [item] = useState(() => remPx(2.5))

  // Position once on mount (the sheet remounts its content on every open);
  // after that the scroll position is the source of truth.
  const initial = useRef(index)
  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = initial.current * item
  }, [])

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      // Vertical drags scroll the wheel, never dismiss the sheet.
      data-base-ui-swipe-ignore=""
      onScroll={(e) => {
        const i = Math.min(items.length - 1, Math.max(0, Math.round(e.currentTarget.scrollTop / item)))
        if (i !== index) {
          navigator.vibrate?.(4)
          onChange(i)
        }
      }}
      className={cn(
        "relative z-10 snap-y snap-mandatory overflow-y-auto overscroll-contain scrollbar-none [touch-action:pan-y] mask-[linear-gradient(transparent,black_30%,black_70%,transparent)]",
        className,
      )}
      style={{ height: VISIBLE * item, paddingBlock: ((VISIBLE - 1) / 2) * item }}
    >
      {items.map((it, i) => (
        <button
          key={it}
          type="button"
          role="option"
          aria-selected={i === index}
          onClick={() => ref.current?.scrollTo({ top: i * item, behavior: "smooth" })}
          className={cn(
            "block w-full snap-center text-[1.375rem] tabular-nums transition-colors",
            i === index ? "text-foreground" : "text-muted-foreground",
          )}
          style={{ height: item }}
        >
          {it}
        </button>
      ))}
    </div>
  )
}

/** Hour / minute / AM-PM wheels in a bottom sheet. Works the same on every browser. */
export function TimePickerDrawer({
  open,
  onOpenChange,
  title,
  value,
  onPick,
  onClear,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: React.ReactNode
  /** "HH:mm", or empty for unset. */
  value: string | undefined
  onPick: (hhmm: string) => void
  onClear?: () => void
}) {
  const parse = () => (value || nowHHMM()).split(":").map(Number)
  const [h, setH] = useState(() => parse()[0])
  const [m, setM] = useState(() => parse()[1])
  // Start from the current value each time the sheet opens.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      const [hh, mm] = parse()
      setH(hh)
      setM(mm)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <SheetBar
          title={title}
          onCancel={() => onOpenChange(false)}
          onDone={() => {
            onPick(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
            onOpenChange(false)
          }}
        />
        <div className="grid gap-5 px-4 pb-5">
          <div className="relative mx-auto flex w-full max-w-xs justify-center gap-1">
              <div className="pointer-events-none absolute inset-x-0 top-20 h-10 rounded-xl bg-muted" />
            <Wheel label="Hour" items={HOURS} index={h % 12} onChange={(i) => setH((prev) => i + (prev >= 12 ? 12 : 0))} className="w-16" />
            <Wheel label="Minute" items={MINUTES} index={m} onChange={setM} className="w-16" />
            <Wheel label="AM or PM" items={PERIODS} index={h >= 12 ? 1 : 0} onChange={(i) => setH((prev) => (prev % 12) + i * 12)} className="w-16" />
          </div>
          {onClear && (
            <Group>
              <ActionRow
                destructive
                onClick={() => {
                  onClear()
                  onOpenChange(false)
                }}
              >
                Clear Time
              </ActionRow>
            </Group>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
