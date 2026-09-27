import { useMemo } from "react"
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { toISO, todayISO, type ISODate } from "@/lib/date"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"]

/**
 * Perpetual month grid — any year works, nothing is precomputed.
 * `marks` decorates days (e.g. mood emoji or a dot for days with entries).
 */
export function MonthGrid({
  month,
  selected,
  onSelect,
  marks,
  size = "md",
}: {
  month: Date
  selected?: ISODate
  onSelect: (d: ISODate) => void
  marks?: Map<ISODate, React.ReactNode>
  size?: "md" | "lg"
}) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    const out: Date[] = []
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d)
    return out
  }, [month])
  const today = todayISO()

  return (
    <div role="grid" aria-label={format(month, "MMMM yyyy")} className="grid grid-cols-7 gap-y-1 text-center">
      {WEEKDAYS.map((w, i) => (
        <div key={i} className="pb-1 text-xs font-medium text-muted-foreground" aria-hidden>
          {w}
        </div>
      ))}
      {days.map((d) => {
        const iso = toISO(d)
        const inMonth = isSameMonth(d, month)
        const mark = marks?.get(iso)
        return (
          <button
            key={iso}
            type="button"
            role="gridcell"
            aria-selected={iso === selected}
            aria-label={format(d, "EEEE d MMMM yyyy")}
            onClick={() => onSelect(iso)}
            className={cn(
              "relative mx-auto flex flex-col items-center justify-center rounded-full text-base tabular-nums transition-colors active:bg-muted",
              size === "lg" ? "size-12" : "size-11",
              !inMonth && "text-muted-foreground/50",
              iso === today && "font-semibold text-primary ring-1 ring-primary/40",
              iso === selected && "bg-primary text-primary-foreground ring-0 active:bg-primary",
            )}
          >
            <span className="leading-none">{d.getDate()}</span>
            {mark && <span className="absolute -bottom-0.5 text-[10px] leading-none">{mark}</span>}
          </button>
        )
      })}
    </div>
  )
}
