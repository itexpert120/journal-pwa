import { useRef, useState } from "react"
import { useNavigate } from "react-router"
import { useLiveQuery } from "dexie-react-hooks"
import { addMonths, endOfMonth, format, startOfMonth } from "date-fns"
import { Cake, ChevronLeft, ChevronRight, Heart } from "lucide-react"
import { BarButton, Page } from "@/components/app-shell"
import { MonthGrid } from "@/components/month-grid"
import { DatePickerDrawer } from "@/components/date-picker-drawer"
import { Group, Row } from "@/components/ios"
import { db, entryHasContent, MOODS } from "@/lib/db"
import { isISODate, monthDay, toISO, todayISO } from "@/lib/date"
import { setNav } from "@/lib/nav"

export function Component() {
  const navigate = useNavigate()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [picker, setPicker] = useState(false)
  const from = toISO(startOfMonth(month))
  const to = toISO(endOfMonth(month))
  const isThisMonth = from === toISO(startOfMonth(new Date()))

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

  const stats = data?.entries ?? []
  const open = (d: string) => {
    setNav("push")
    navigate(`/day/${d}`, { viewTransition: true })
  }

  // Horizontal swipe on the grid changes month.
  const touch = useRef({ x: 0, y: 0 })

  return (
    <Page
      title="Calendar"
      wide
      actions={
        !isThisMonth && (
          <BarButton label="This month" onClick={() => setMonth(startOfMonth(new Date()))} className="px-4 text-[15px] font-semibold text-primary">
            Today
          </BarButton>
        )
      }
    >
      <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-start">
        <section className="rounded-[1.625rem] bg-card p-3 pb-4">
          <div className="flex items-center gap-1 px-1 pb-2">
            <button
              type="button"
              onClick={() => setPicker(true)}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-[17px] font-semibold active:bg-muted"
            >
              {format(month, "MMMM yyyy")}
              <ChevronRight className="size-4 text-primary" strokeWidth={2.6} />
            </button>
            <span className="flex-1" />
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setMonth((m) => addMonths(m, -1))}
              className="grid size-11 place-items-center rounded-full text-primary active:bg-muted"
            >
              <ChevronLeft className="size-6" strokeWidth={2.4} />
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="grid size-11 place-items-center rounded-full text-primary active:bg-muted"
            >
              <ChevronRight className="size-6" strokeWidth={2.4} />
            </button>
          </div>
          <div
            onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - touch.current.x
              const dy = e.changedTouches[0].clientY - touch.current.y
              if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) setMonth((m) => addMonths(m, dx < 0 ? 1 : -1))
            }}
          >
            <MonthGrid month={month} size="lg" marks={marks} onSelect={open} />
          </div>
        </section>

        <div className="grid gap-8">
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                [stats.length, "Days logged"],
                [stats.reduce((n, e) => n + e.workouts.length, 0), "Workouts"],
                [stats.reduce((n, e) => n + e.photos.length, 0), "Photos"],
              ] as const
            ).map(([v, l]) => (
              <div key={l} className="rounded-[1.25rem] bg-card p-3.5">
                <p className="text-[28px] leading-none font-bold tabular-nums">{v}</p>
                <p className="mt-1.5 text-[13px] text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>

          {occasionDays.length > 0 && (
            <Group header="Occasions">
              {occasionDays.map((o) => (
                <Row
                  key={o.id}
                  icon={o.kind === "Birthday" ? Cake : Heart}
                  color={o.kind === "Birthday" ? "orange" : "pink"}
                  label={o.name}
                  detail={o.kind}
                  value={monthDay(todayISO()) === o.md ? "Today" : format(new Date(`${o.iso}T00:00`), "d MMM")}
                  onClick={() => open(o.iso)}
                  chevron
                />
              ))}
            </Group>
          )}
        </div>
      </div>
      <DatePickerDrawer open={picker} onOpenChange={setPicker} value={from} onPick={open} />
    </Page>
  )
}
