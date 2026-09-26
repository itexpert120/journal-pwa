import { useState } from "react"
import { addMonths, format, setMonth, setYear } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { MonthGrid } from "@/components/month-grid"
import { SheetBar } from "@/components/ios"
import { ScrollFade } from "@/components/scroll-fade"
import { fromISO, todayISO, type ISODate } from "@/lib/date"
import { cn } from "@/lib/utils"

const MONTHS = Array.from({ length: 12 }, (_, i) => format(new Date(2000, i, 1), "MMM"))

/** Day / month / year picker with no year bounds — type any year. */
export function DatePickerDrawer({
  open,
  onOpenChange,
  value,
  onPick,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  value: ISODate
  onPick: (d: ISODate) => void
}) {
  const [month, setMonthState] = useState(() => fromISO(value))
  const [yearText, setYearText] = useState(String(month.getFullYear()))
  const go = (d: Date) => {
    setMonthState(d)
    setYearText(String(d.getFullYear()))
  }
  const pick = (d: ISODate) => {
    onPick(d)
    onOpenChange(false)
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (o) go(fromISO(value))
        onOpenChange(o)
      }}
    >
      <DrawerContent>
        <SheetBar
          title="Go to Date"
          onCancel={() => onOpenChange(false)}
          onDone={() => pick(todayISO())}
          doneLabel="Today"
        />
        <div className="grid gap-3 overflow-y-auto px-4 pb-5">
          <div className="flex items-center gap-1 px-1">
            <span className="text-[20px] font-semibold">{format(month, "MMMM")}</span>
            <input
              aria-label="Year"
              inputMode="numeric"
              enterKeyHint="go"
              className="w-[4.5ch] rounded-lg bg-transparent px-1 text-[20px] font-semibold text-primary tabular-nums outline-none focus:bg-muted"
              value={yearText}
              onChange={(e) => {
                const t = e.target.value.replace(/\D/g, "").slice(0, 4)
                setYearText(t)
                const y = Number(t)
                if (t.length === 4 && y > 0) setMonthState((m) => setYear(m, y))
              }}
            />
            <span className="flex-1" />
            <button type="button" aria-label="Previous month" onClick={() => go(addMonths(month, -1))} className="grid size-11 place-items-center rounded-full text-primary active:bg-muted">
              <ChevronLeft className="size-6" strokeWidth={2.4} />
            </button>
            <button type="button" aria-label="Next month" onClick={() => go(addMonths(month, 1))} className="grid size-11 place-items-center rounded-full text-primary active:bg-muted">
              <ChevronRight className="size-6" strokeWidth={2.4} />
            </button>
          </div>
          <ScrollFade className="-mx-4 flex gap-1.5 px-4">
            {MONTHS.map((m, i) => (
              <button
                key={m}
                type="button"
                onClick={() => go(setMonth(month, i))}
                className={cn(
                  "h-9 min-w-13 shrink-0 rounded-full px-3 text-[15px] font-medium transition-colors",
                  i === month.getMonth() ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {m}
              </button>
            ))}
          </ScrollFade>
          <MonthGrid month={month} selected={value} onSelect={pick} size="lg" />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
