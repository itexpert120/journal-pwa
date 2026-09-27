import { useDeferredValue, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { useLiveQuery } from "dexie-react-hooks"
import { format } from "date-fns"
import { ChevronRight, Search as SearchIcon, SlidersHorizontal, X } from "lucide-react"
import { BarButton, Page } from "@/components/app-shell"
import { ActionRow, DateTimeRow, EmptyState, Group } from "@/components/ios"
import { setNav } from "@/lib/nav"
import { db, type Entry } from "@/lib/db"
import { fromISO } from "@/lib/date"
import { cn } from "@/lib/utils"

const KINDS = ["all", "journal", "medical", "fitness", "day", "photos"] as const
type Kind = (typeof KINDS)[number]
const SECTION: Record<Exclude<Kind, "all">, string> = {
  journal: "journal",
  medical: "health",
  fitness: "fitness",
  day: "day",
  photos: "journal",
}

interface Hit { date: string; kind: Exclude<Kind, "all">; text: string; tags: string[] }

/** Flatten a day into searchable snippets, each tagged with the section it belongs to. */
function snippets(e: Entry): Hit[] {
  const out: Hit[] = []
  const add = (kind: Hit["kind"], text: string | undefined, tags: string[] = []) =>
    text?.trim() && out.push({ date: e.date, kind, text: text.trim(), tags })
  const hashtags = (s: string) => Array.from(s.matchAll(/#([\p{L}\d_]+)/gu), (m) => m[1].toLowerCase())

  add("journal", e.journal.text, hashtags(e.journal.text))
  e.photos.forEach((p) => add("photos", [p.caption, p.location, ...p.tags.map((t) => `#${t}`)].filter(Boolean).join(" · ") || "Photo", p.tags.map((t) => t.toLowerCase())))
  e.bp.forEach((b) => b.sys && add("medical", `BP ${b.sys}/${b.dia ?? "–"} · pulse ${b.pulse ?? "–"}`, ["health", "bp"]))
  e.ecg.forEach((x) => add("medical", `ECG ${x.status}${x.note ? ` — ${x.note}` : ""}`, ["health", "ecg"]))
  e.checkups.forEach((c) => add("medical", [c.kind, c.title, c.note].filter(Boolean).join(" — "), ["health", "checkup"]))
  e.extraMeds.forEach((m) => add("medical", `${m.name} ${m.dose ?? ""}`, ["health", "meds"]))
  e.workouts.forEach((w) => add("fitness", `${w.custom || w.type}${w.duration ? ` · ${w.duration} min` : ""}`, ["fitness"]))
  Object.entries(e.meals).forEach(([slot, m]) => add("fitness", m?.note && `${slot}: ${m.note}`, ["diet"]))
  e.events.forEach((ev) => add("day", `${ev.time} ${ev.title}`))
  e.tasks.forEach((t) => add("day", t.text))
  e.goals.forEach((g) => add("day", `Goal: ${g.text}`))
  add("day", e.win && `Win: ${e.win}`, ["win"])
  return out
}

function highlight(text: string, q: string) {
  if (!q) return text
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return text
  const start = Math.max(0, i - 40)
  return (
    <>
      {start > 0 && "…"}
      {text.slice(start, i)}
      <mark className="rounded bg-primary/20 px-0.5 text-inherit">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length, i + q.length + 120)}
    </>
  )
}

export function Component() {
  const [params, setParams] = useSearchParams()
  const q = params.get("q") ?? ""
  const kind = (params.get("k") as Kind) ?? "all"
  const from = params.get("from") ?? ""
  const to = params.get("to") ?? ""
  const [showFilters, setShowFilters] = useState(!!(from || to))
  const dq = useDeferredValue(q)

  const set = (k: string, v: string) =>
    setParams(
      (p) => {
        if (v) p.set(k, v)
        else p.delete(k)
        return p
      },
      { replace: true },
    )

  const hits = useLiveQuery(async () => {
    const needle = dq.trim().toLowerCase()
    const tagQuery = needle.startsWith("#") ? needle.slice(1) : undefined
    if (!needle && kind === "all" && !from && !to) return []
    const coll = from || to ? db.entries.where("date").between(from || "0000-01-01", to || "9999-12-31", true, true) : db.entries.toCollection()
    // Primary key is the ISO date, so reverse() yields newest first.
    const entries = await coll.reverse().toArray()
    const res: Hit[] = []
    for (const e of entries)
      for (const h of snippets(e)) {
        if (kind !== "all" && h.kind !== kind) continue
        if (tagQuery !== undefined ? !h.tags.some((t) => t.startsWith(tagQuery)) : needle && !h.text.toLowerCase().includes(needle)) continue
        res.push(h)
        if (res.length >= 200) return res
      }
    return res
  }, [dq, kind, from, to])

  const clearDates = () =>
    setParams((p) => {
      p.delete("from")
      p.delete("to")
      return p
    })

  return (
    <Page
      title="Search"
      actions={
        <BarButton label="Date filter" onClick={() => setShowFilters((v) => !v)} className={cn(showFilters && "text-primary")}>
          <SlidersHorizontal />
        </BarButton>
      }
    >
      <div className="grid gap-4">
        {/* Search field + scope chips */}
        <div className="flex h-11 items-center gap-2 rounded-full bg-muted px-3.5">
          <SearchIcon className="size-5 shrink-0 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => set("q", e.target.value)}
            placeholder="Journal, medical logs, #tags"
            enterKeyHint="search"
            autoCapitalize="none"
            aria-label="Search"
            className="min-w-0 flex-1 bg-transparent text-[1.0625rem] outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button type="button" aria-label="Clear" onClick={() => set("q", "")} className="grid size-6 place-items-center rounded-full bg-muted-foreground/40 text-background">
              <X className="size-3.5" strokeWidth={3} />
            </button>
          )}
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => set("k", k === "all" ? "" : k)}
              className={cn(
                "h-9 shrink-0 rounded-full px-4 text-[0.9375rem] font-medium capitalize transition-colors active:scale-95",
                kind === k ? "bg-foreground text-background" : "bg-card text-foreground",
              )}
            >
              {k}
            </button>
          ))}
        </div>
        {showFilters && (
          <Group>
            <DateTimeRow label="From" type="date" value={from} onChange={(v) => set("from", v)} clearable />
            <DateTimeRow label="To" type="date" value={to} onChange={(v) => set("to", v)} clearable />
            {(from || to) && (
              <ActionRow destructive onClick={clearDates}>
                Clear Dates
              </ActionRow>
            )}
          </Group>
        )}

        {hits === undefined ? null : hits.length === 0 ? (
          <EmptyState icon={SearchIcon} title={q || from || to || kind !== "all" ? "No Results" : "Search Your Journal"}>
            {q || from || to || kind !== "all" ? (
              <p>Try a different word or filter.</p>
            ) : (
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {["#health", "#family", "#travel", "#birthday"].map((t) => (
                  <button key={t} type="button" onClick={() => set("q", t)} className="h-9 rounded-full bg-card px-4 text-[0.9375rem] text-primary active:scale-95">
                    {t}
                  </button>
                ))}
              </div>
            )}
          </EmptyState>
        ) : (
          <Group header={`${hits.length}${hits.length === 200 ? "+" : ""} results`}>
            {hits.map((h, i) => (
              <Link
                key={i}
                to={`/day/${h.date}?s=${SECTION[h.kind]}`}
                viewTransition
                onClick={() => setNav("push")}
                className="grid gap-0.5 px-4 py-3 active:bg-muted"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[0.9375rem] font-semibold">{format(fromISO(h.date), "EEE d MMM yyyy")}</span>
                  <span className="ml-auto text-[0.8125rem] text-muted-foreground capitalize">{h.kind}</span>
                  <ChevronRight className="size-4 text-muted-foreground/60" />
                </div>
                <p className="line-clamp-2 text-[0.9375rem] text-muted-foreground">{highlight(h.text, q.startsWith("#") ? "" : q.trim())}</p>
              </Link>
            ))}
          </Group>
        )}
      </div>
    </Page>
  )
}
