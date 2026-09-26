import { useRef, useState } from "react"
import { useNavigate } from "react-router"
import { useLiveQuery } from "dexie-react-hooks"
import { addMonths, endOfMonth, format, startOfMonth } from "date-fns"
import { Cake, ChevronLeft, ChevronRight, Heart } from "lucide-react"
import { BarButton, Page } from "@/components/app-shell"
import { MonthGrid } from "@/components/month-grid"
import { DatePickerDrawer } from "@/components/date-picker-drawer"
import { Group, Row } from "@/components/ios"
import { weatherInfo } from "@/lib/weather"
import { db, emptyEntry, entryHasContent, MOODS } from "@/lib/db"
import { formatTime12, fromISO, isISODate, monthDay, toISO, todayISO } from "@/lib/date"
import { setNav } from "@/lib/nav"

/** Selected-day summary under the grid, like the event list in iOS Calendar. */
function DaySummary({ date, onOpen }: { date: string; onOpen: () => void }) {
  const e = useLiveQuery(async () => (await db.entries.get(date)) ?? emptyEntry(date), [date])
  if (!e) return null
  const mood = MOODS.find((m) => m.value === e.mood)
  const bp = e.bp.filter((b) => b.sys && b.dia).at(-1)
  const lines = [
    mood && { label: "Mood", value: `${mood.emoji} ${mood.label}` },
    e.energy && { label: "Energy", value: `${e.energy}%` },
    e.weather && { label: "Weather", value: `${weatherInfo(e.weather.code).icon} ${e.weather.temp}°` },
    bp && { label: "Blood Pressure", value: `${bp.sys}/${bp.dia}` },
    e.steps && { label: "Steps", value: e.steps.toLocaleString() },
    e.workouts.length > 0 && { label: "Workouts", value: String(e.workouts.length) },
    e.events.length > 0 && { label: "Next Event", value: `${formatTime12(e.events[0].time)} ${e.events[0].title}` },
    e.photos.length > 0 && { label: "Photos", value: String(e.photos.length) },
  ].filter(Boolean) as { label: string; value: string }[]
  return (
    <Group header={format(fromISO(date), "EEEE, d MMMM")} footer={!entryHasContent(e) ? "Nothing logged yet." : undefined}>
      {lines.map((l) => (
        <Row key={l.label} label={l.label} value={l.value} />
      ))}
      {e.journal.text && <p className="line-clamp-3 px-4 py-3 font-serif text-[16px] text-muted-foreground italic">{e.journal.text}</p>}
      <Row label={<span className="font-semibold text-primary">Open Day</span>} onClick={onOpen} chevron />
    </Group>
  )
}

export function Component() {
  const navigate = useNavigate()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [picker, setPicker] = useState(false)
  const [selected, setSelected] = useState(todayISO())
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
          <BarButton
            label="This month"
            onClick={() => {
              setMonth(startOfMonth(new Date()))
              setSelected(todayISO())
            }} className="px-4 text-[15px] font-semibold text-primary">
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
            <MonthGrid
              month={month}
              size="lg"
              marks={marks}
              selected={selected}
              onSelect={(d) => {
                navigator.vibrate?.(6)
                setSelected(d)
                if (d.slice(0, 7) !== from.slice(0, 7)) setMonth(startOfMonth(fromISO(d)))
              }}
            />
          </div>
        </section>

        <div className="grid gap-8">
          <DaySummary date={selected} onOpen={() => open(selected)} />
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
      <DatePickerDrawer
        open={picker}
        onOpenChange={setPicker}
        value={selected}
        onPick={(d) => {
          setSelected(d)
          setMonth(startOfMonth(fromISO(d)))
        }}
      />
    </Page>
  )
}
