import { useRef, useState } from "react"
import { useNavigate } from "react-router"
import { useLiveQuery } from "dexie-react-hooks"
import { addMonths, addYears, endOfMonth, format, startOfMonth } from "date-fns"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Page } from "@/components/app-shell"
import { MonthGrid } from "@/components/month-grid"
import { DatePickerDrawer } from "@/components/date-picker-drawer"
import { db, entryHasContent, MOODS } from "@/lib/db"
import { isISODate, monthDay, toISO, todayISO } from "@/lib/date"

export function Component() {
  const navigate = useNavigate()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [picker, setPicker] = useState(false)
  const from = toISO(startOfMonth(month))
  const to = toISO(endOfMonth(month))

  const data = useLiveQuery(async () => {
    const [entries, occasions] = await Promise.all([
      db.entries.where("date").between(from, to, true, true).toArray(),
      db.occasions.toArray(),
    ])
    return { entries: entries.filter(entryHasContent), occasions }
  }, [from, to])

  const marks = new Map<string, React.ReactNode>()
  for (const e of data?.entries ?? [])
    marks.set(e.date, e.mood ? MOODS.find((m) => m.value === e.mood)?.emoji : <span className="block size-1.5 rounded-full bg-primary" />)

  const occasionDays = (data?.occasions ?? [])
    .map((o) => ({ ...o, iso: `${month.getFullYear()}-${o.md}` }))
    .filter((o) => o.iso.slice(5, 7) === format(month, "MM") && isISODate(o.iso))
    .sort((a, b) => a.md.localeCompare(b.md))
  for (const o of occasionDays) if (!marks.has(o.iso)) marks.set(o.iso, "🎉")

  // Horizontal swipe changes month.
  const touch = useRef({ x: 0, y: 0 })
  const stats = data?.entries ?? []

  return (
    <Page title="Calendar">
      <div
        className="grid gap-4"
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - touch.current.x
          const dy = e.changedTouches[0].clientY - touch.current.y
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) setMonth((m) => addMonths(m, dx < 0 ? 1 : -1))
        }}
      >
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Previous year" onClick={() => setMonth((m) => addYears(m, -1))}>
            <ChevronsLeft />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setMonth((m) => addMonths(m, -1))}>
            <ChevronLeft />
          </Button>
          <button type="button" className="flex-1 rounded-full py-1 text-xl font-bold tracking-tight active:bg-muted" onClick={() => setPicker(true)}>
            {format(month, "MMMM yyyy")}
          </button>
          <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Next year" onClick={() => setMonth((m) => addYears(m, 1))}>
            <ChevronsRight />
          </Button>
        </div>

        <div className="rounded-2xl border bg-card p-2">
          <MonthGrid month={month} size="lg" marks={marks} onSelect={(d) => navigate(`/day/${d}`, { viewTransition: true })} />
        </div>

        <Button variant="secondary" onClick={() => setMonth(startOfMonth(new Date()))}>
          This month
        </Button>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-muted/60 p-3">
            <p className="text-2xl font-semibold tabular-nums">{stats.length}</p>
            <p className="text-xs text-muted-foreground">days logged</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <p className="text-2xl font-semibold tabular-nums">{stats.reduce((n, e) => n + e.workouts.length, 0)}</p>
            <p className="text-xs text-muted-foreground">workouts</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <p className="text-2xl font-semibold tabular-nums">{stats.reduce((n, e) => n + e.photos.length, 0)}</p>
            <p className="text-xs text-muted-foreground">photos</p>
          </div>
        </div>

        {occasionDays.length > 0 && (
          <div className="grid gap-2">
            <h2 className="text-2xl">Occasions</h2>
            {occasionDays.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => navigate(`/day/${o.iso}`)}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 text-left active:bg-muted"
              >
                <span className="w-12 text-center text-sm font-semibold text-primary tabular-nums">{format(new Date(o.iso + "T00:00"), "d MMM")}</span>
                <span className="flex-1">{o.name}</span>
                <span className="text-xs text-muted-foreground">{o.kind}</span>
                {monthDay(todayISO()) === o.md && <span>🎉</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      <DatePickerDrawer open={picker} onOpenChange={setPicker} value={from} onPick={(d) => navigate(`/day/${d}`)} />
    </Page>
  )
}
