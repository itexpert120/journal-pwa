import { useState } from "react"
import { addMonths, format, setMonth, setYear } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { MonthGrid } from "@/components/month-grid"
import { fromISO, todayISO, type ISODate } from "@/lib/date"

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
      showSwipeHandle
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-3xl">Go to date</DrawerTitle>
        </DrawerHeader>
        <div className="grid gap-4 overflow-y-auto p-4 pb-safe">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => go(addMonths(month, -1))}>
              <ChevronLeft />
            </Button>
            <div className="flex flex-1 items-center justify-center gap-2 text-xl font-medium">
              {format(month, "MMMM")}
              <input
                aria-label="Year"
                inputMode="numeric"
                enterKeyHint="go"
                className="w-20 rounded-lg border bg-transparent py-1.5 text-center text-xl tabular-nums"
                value={yearText}
                onChange={(e) => {
                  const t = e.target.value.replace(/\D/g, "").slice(0, 4)
                  setYearText(t)
                  const y = Number(t)
                  if (t.length === 4 && y > 0) setMonthState((m) => setYear(m, y))
                }}
              />
            </div>
            <Button variant="outline" size="icon" aria-label="Next month" onClick={() => go(addMonths(month, 1))}>
              <ChevronRight />
            </Button>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {MONTHS.map((m, i) => (
              <Button
                key={m}
                size="sm"
                variant={i === month.getMonth() ? "default" : "ghost"}
                onClick={() => go(setMonth(month, i))}
              >
                {m}
              </Button>
            ))}
          </div>
          <MonthGrid month={month} selected={value} onSelect={pick} size="lg" />
          <Button size="lg" variant="secondary" onClick={() => pick(todayISO())}>
            Jump to today
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
