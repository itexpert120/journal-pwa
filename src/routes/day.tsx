import { useEffect, useRef, useState } from "react"
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router"
import { format, getDaysInMonth } from "date-fns"
import { ChevronLeft, ChevronRight, Dumbbell, HeartPulse, ListChecks, NotebookPen, Share } from "lucide-react"
import { flushSync } from "react-dom"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePickerDrawer } from "@/components/date-picker-drawer"
import { useEntry, prefetchEntry } from "@/hooks/use-entry"
import { BarButton, TAB_BAR_SPACE } from "@/components/app-shell"
import { setNav } from "@/lib/nav"
import { useScrolled } from "@/hooks/use-scrolled"
import { fromISO, isISODate, shiftISO, toISO, todayISO, type ISODate } from "@/lib/date"
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
    delete document.documentElement.dataset.nav
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
  const { date = "" } = useParams()
  return isISODate(date) ? <DayPage date={date} /> : <Navigate to={`/day/${todayISO()}`} replace />
}

function DayPage({ date }: { date: ISODate }) {
  const [params, setParams] = useSearchParams()
  const section = (SECTIONS.find((s) => s.id === params.get("s"))?.id ?? "health") as SectionId
  const { entry, patch } = useEntry(date)
  const flipTo = useFlipTo()
  const [picker, setPicker] = useState(false)
  const d = fromISO(date)
  const isToday = date === todayISO()
  const swipeRef = useSwipe((dir) => flipTo(shiftISO(date, dir), date))
  const monthStrip = useRef<HTMLDivElement>(null)
  const scrolled = useScrolled(swipeRef)

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

  const setSection = (v: string) => {
    navigator.vibrate?.(6)
    setParams({ s: v }, { replace: true })
  }

  return (
    <Tabs value={section} onValueChange={(v) => setSection(String(v))} className="flex min-h-0 flex-1 flex-col gap-0">
      <main ref={swipeRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {/* Transparent nav layer: glass controls over a scroll-edge blur. */}
      <header className="no-print sticky top-0 z-20 pt-safe">
        <div aria-hidden className={cn("edge-top transition-opacity duration-200", scrolled ? "opacity-100" : "opacity-0")} />
        <div className="mx-auto flex h-[54px] w-full max-w-5xl items-center gap-2 px-4 md:px-6">
          <BarButton label="Previous day" onClick={() => flipTo(shiftISO(date, -1), date)}>
            <ChevronLeft strokeWidth={2.4} />
          </BarButton>
          <button
            type="button"
            className="flex min-w-0 flex-1 flex-col items-center rounded-full py-0.5 transition-transform active:scale-[0.97]"
            onClick={() => setPicker(true)}
            aria-label={`Change date, currently ${format(d, "EEEE d MMMM yyyy")}`}
          >
            <span className="text-[17px] leading-tight font-semibold">{format(d, "EEEE")}</span>
            <span className="text-[13px] text-muted-foreground tabular-nums">
              {format(d, "d MMMM yyyy")}
              {isToday && <span className="font-semibold text-primary"> · Today</span>}
            </span>
          </button>
          {!isToday && (
            <BarButton label="Go to today" onClick={() => flipTo(todayISO(), date)} className="px-3.5 text-[15px] font-semibold text-primary">
              Today
            </BarButton>
          )}
          <BarButton label="Next day" onClick={() => flipTo(shiftISO(date, 1), date)}>
            <ChevronRight strokeWidth={2.4} />
          </BarButton>
        </div>

        {/* Binder dividers: permanent Profile tab, year, then months — one glass capsule. */}
        <div className="mx-auto w-full max-w-5xl px-4 pt-1 md:px-6" data-no-swipe>
          <div ref={monthStrip} className="glass flex items-center gap-0.5 overflow-x-auto rounded-full p-1 scrollbar-none">
            <Link
              to="/profile"
              viewTransition
              onClick={() => setNav("tab")}
              className="shrink-0 rounded-full bg-foreground px-3 py-1.5 text-[13px] font-semibold text-background active:opacity-80"
            >
              Profile
            </Link>
            <button
              type="button"
              onClick={() => setPicker(true)}
              className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-bold tabular-nums active:bg-muted"
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
                    "min-w-11 shrink-0 rounded-full px-2.5 py-1.5 text-[13px] font-medium transition-colors md:flex-1",
                    active ? "bg-primary font-semibold text-primary-foreground" : "active:bg-muted",
                  )}
                >
                  {m}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mx-auto w-full max-w-5xl px-4 pt-2 pb-2 md:px-6">
          <TabsList className="glass mx-auto grid max-w-xl grid-cols-4 bg-transparent">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <TabsTrigger key={id} value={id} className="gap-1 px-1">
                <Icon />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </header>

        {entry && (
          <div className={cn("vt-page mx-auto grid w-full max-w-5xl gap-6 bg-background px-4 pt-3 md:px-6", TAB_BAR_SPACE)}>
            <HeaderBlock date={date} entry={entry} patch={patch} />
            {/* Phones: one column of cards. Tablets: two-column card grid. */}
            <TabsContent value="health" className="grid items-start gap-4 md:grid-cols-2">
              <HealthSection date={date} entry={entry} patch={patch} />
            </TabsContent>
            <TabsContent value="fitness" className="grid items-start gap-4 md:grid-cols-2">
              <FitnessSection date={date} entry={entry} patch={patch} />
            </TabsContent>
            <TabsContent value="day" className="grid items-start gap-4 md:grid-cols-2">
              <RoutineSection date={date} entry={entry} patch={patch} />
            </TabsContent>
            <TabsContent value="journal" className="grid items-start gap-4 md:grid-cols-2">
              <JournalSection date={date} entry={entry} patch={patch} />
            </TabsContent>
            <Button
              variant="ghost"
              className="justify-self-center text-muted-foreground"
              nativeButton={false}
              render={<Link to={`/export?from=${date}&to=${date}`} />}
            >
              <Share /> Export this day
            </Button>
          </div>
        )}
      </main>
      <DatePickerDrawer open={picker} onOpenChange={setPicker} value={date} onPick={(t) => flipTo(t, date)} />
    </Tabs>
  )
}
