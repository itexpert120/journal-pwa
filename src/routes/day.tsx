import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router"
import { format, getDaysInMonth } from "date-fns"
import { ChevronLeft, ChevronRight, Dumbbell, HeartPulse, ListChecks, NotebookPen, Share } from "lucide-react"
import { flushSync } from "react-dom"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePickerDrawer } from "@/components/date-picker-drawer"
import { useEntry, prefetchEntry } from "@/hooks/use-entry"
import { fromISO, shiftISO, toISO, todayISO, type ISODate } from "@/lib/date"
import { cn } from "@/lib/utils"
import { HeaderBlock } from "@/features/day/header-block"
import { HealthSection } from "@/features/day/health"
import { FitnessSection } from "@/features/day/fitness"
import { RoutineSection } from "@/features/day/routine"
import { JournalSection } from "@/features/day/journal"

const SECTIONS = [
  { id: "health", label: "Health", icon: HeartPulse },
  { id: "fitness", label: "Fitness", icon: Dumbbell },
  { id: "day", label: "Day", icon: ListChecks },
  { id: "journal", label: "Journal", icon: NotebookPen },
] as const
type SectionId = (typeof SECTIONS)[number]["id"]

const MONTHS = Array.from({ length: 12 }, (_, i) => format(new Date(2000, i, 1), "MMM"))

/** Swipe/flip to another day, animating like turning a binder page. */
function useFlipTo() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  return async (target: ISODate, from: ISODate) => {
    if (target === from) return
    await prefetchEntry(target)
    const dir = target > from ? "next" : "prev"
    const to = `/day/${target}${params.size ? `?${params}` : ""}`
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!document.startViewTransition || reduce) return navigate(to)
    document.documentElement.dataset.flip = dir
    const t = document.startViewTransition(() => flushSync(() => navigate(to)))
    t.finished.finally(() => delete document.documentElement.dataset.flip)
  }
}

/** Horizontal swipe on the page body → prev/next day. Ignores vertical scrolls and marked widgets. */
function useSwipe(onSwipe: (dir: 1 | -1) => void) {
  const ref = useRef<HTMLElement>(null)
  const cb = useRef(onSwipe)
  cb.current = onSwipe
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let x = 0,
      y = 0,
      t = 0,
      skip = false
    const start = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      skip =
        e.touches.length > 1 ||
        !!target.closest("[data-no-swipe],input,textarea,canvas,[role=slider]") ||
        // Leave the left edge alone: iOS uses it for back-swipe.
        e.touches[0].clientX < 24
      x = e.touches[0].clientX
      y = e.touches[0].clientY
      t = Date.now()
    }
    const end = (e: TouchEvent) => {
      if (skip) return
      const dx = e.changedTouches[0].clientX - x
      const dy = e.changedTouches[0].clientY - y
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8 && Date.now() - t < 600) cb.current(dx < 0 ? 1 : -1)
    }
    el.addEventListener("touchstart", start, { passive: true })
    el.addEventListener("touchend", end, { passive: true })
    return () => {
      el.removeEventListener("touchstart", start)
      el.removeEventListener("touchend", end)
    }
  }, [])
  return ref
}

export function Component() {
  const { date = todayISO() } = useParams()
  const [params, setParams] = useSearchParams()
  const section = (SECTIONS.find((s) => s.id === params.get("s"))?.id ?? "health") as SectionId
  const { entry, patch } = useEntry(date)
  const flipTo = useFlipTo()
  const [picker, setPicker] = useState(false)
  const d = fromISO(date)
  const isToday = date === todayISO()
  const swipeRef = useSwipe((dir) => flipTo(shiftISO(date, dir), date))
  const monthStrip = useRef<HTMLDivElement>(null)

  // Warm neighbours so swipes render instantly.
  useEffect(() => {
    prefetchEntry(shiftISO(date, 1))
    prefetchEntry(shiftISO(date, -1))
  }, [date])

  // Keep the active month tab in view.
  useEffect(() => {
    monthStrip.current
      ?.querySelector<HTMLElement>("[aria-current=true]")
      ?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" })
  }, [date])

  const goMonth = (m: number) => {
    const first = new Date(d.getFullYear(), m, 1)
    flipTo(toISO(new Date(d.getFullYear(), m, Math.min(d.getDate(), getDaysInMonth(first)))), date)
  }

  return (
    <>
      <header className="no-print z-20 shrink-0 border-b bg-background pt-safe">
        <div className="flex h-16 items-center gap-1 px-2">
          <Button variant="ghost" size="icon" aria-label="Previous day" onClick={() => flipTo(shiftISO(date, -1), date)}>
            <ChevronLeft />
          </Button>
          <button
            type="button"
            className="flex min-w-0 flex-1 flex-col items-center rounded-lg py-1 active:bg-muted"
            onClick={() => setPicker(true)}
            aria-label={`Change date, currently ${format(d, "EEEE d MMMM yyyy")}`}
          >
            <span className="font-heading text-[1.7rem] leading-none">{format(d, "EEEE")}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{format(d, "d MMMM yyyy")}</span>
          </button>
          <Button variant="ghost" size="icon" aria-label="Next day" onClick={() => flipTo(shiftISO(date, 1), date)}>
            <ChevronRight />
          </Button>
        </div>
        {/* Binder dividers: permanent Profile tab, then year + month tabs. */}
        <div ref={monthStrip} className="flex items-end gap-1 overflow-x-auto px-2 scrollbar-none" data-no-swipe>
          <Link
            to="/profile"
            viewTransition
            className="shrink-0 rounded-t-lg bg-leather px-3 py-2 text-xs font-semibold tracking-wide text-leather-foreground uppercase"
          >
            Profile
          </Link>
          <button
            type="button"
            onClick={() => setPicker(true)}
            className="shrink-0 rounded-t-lg bg-secondary px-3 py-2 text-xs font-semibold tabular-nums"
          >
            {d.getFullYear()}
          </button>
          {MONTHS.map((m, i) => {
            const active = i === d.getMonth()
            return (
              <button
                key={m}
                type="button"
                aria-current={active}
                onClick={() => goMonth(i)}
                className={cn(
                  "shrink-0 rounded-t-lg px-3 text-xs font-medium transition-all",
                  active ? "bg-primary py-2.5 text-primary-foreground" : "bg-muted py-2 text-muted-foreground",
                )}
              >
                {m}
              </button>
            )
          })}
          {!isToday && (
            <Button
              size="sm"
              variant="outline"
              className="sticky right-0 mb-1 ml-auto shrink-0 bg-background shadow-sm"
              onClick={() => flipTo(todayISO(), date)}
            >
              Today
            </Button>
          )}
        </div>
      </header>

      <main
        ref={swipeRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain [view-transition-name:page]"
        style={{ backgroundColor: "var(--background)" }}
      >
        {entry && (
          <div className="grid gap-4 px-4 pt-4 pb-10">
            <HeaderBlock date={date} entry={entry} patch={patch} />
            <Tabs value={section} onValueChange={(v) => setParams({ s: String(v) }, { replace: true })}>
              <TabsList className="sticky top-0 z-10 grid w-full grid-cols-4 shadow-sm">
                {SECTIONS.map(({ id, label, icon: Icon }) => (
                  <TabsTrigger key={id} value={id} className="gap-1 text-[13px]">
                    <Icon className="size-4" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="health" className="grid gap-4 pt-2">
                <HealthSection date={date} entry={entry} patch={patch} />
              </TabsContent>
              <TabsContent value="fitness" className="grid gap-4 pt-2">
                <FitnessSection date={date} entry={entry} patch={patch} />
              </TabsContent>
              <TabsContent value="day" className="grid gap-4 pt-2">
                <RoutineSection date={date} entry={entry} patch={patch} />
              </TabsContent>
              <TabsContent value="journal" className="grid gap-4 pt-2">
                <JournalSection date={date} entry={entry} patch={patch} />
              </TabsContent>
            </Tabs>
            <Button variant="ghost" className="justify-self-center text-muted-foreground" nativeButton={false} render={<Link to={`/export?from=${date}&to=${date}`} />}>
              <Share /> Export this day
            </Button>
          </div>
        )}
      </main>
      <DatePickerDrawer open={picker} onOpenChange={setPicker} value={date} onPick={(t) => flipTo(t, date)} />
    </>
  )
}
