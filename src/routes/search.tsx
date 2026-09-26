import { useDeferredValue, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { useLiveQuery } from "dexie-react-hooks"
import { format } from "date-fns"
import { Search as SearchIcon, SlidersHorizontal, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Page } from "@/components/app-shell"
import { Field } from "@/components/fields"
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

  return (
    <Page
      bar={
        <header className="glass-bar sticky top-0 z-20 pt-safe">
          <div className="mx-auto flex max-w-3xl items-center gap-2 p-3 md:px-8">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute top-3 left-3 size-5 text-muted-foreground" />
              <Input
                type="search"
                value={q}
                onChange={(e) => set("q", e.target.value)}
                placeholder="Search text or #tag"
                className="rounded-full pl-10"
                enterKeyHint="search"
                autoCapitalize="none"
                aria-label="Search"
              />
            </div>
            <Button
              variant={showFilters ? "secondary" : "ghost"}
              size="icon"
              aria-label="Filters"
              aria-expanded={showFilters}
              onClick={() => setShowFilters((s) => !s)}
            >
              <SlidersHorizontal />
            </Button>
          </div>
          <div className="mx-auto flex max-w-3xl gap-1.5 overflow-x-auto px-3 pb-3 scrollbar-none md:px-8">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => set("k", k === "all" ? "" : k)}
                className={cn(
                  "h-9 shrink-0 rounded-full px-4 text-sm font-semibold capitalize transition-colors",
                  kind === k ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/80",
                )}
              >
                {k}
              </button>
            ))}
          </div>
          {showFilters && (
            <div className="mx-auto grid max-w-3xl grid-cols-[1fr_1fr_auto] items-end gap-2 px-3 pb-3 md:px-8">
              <Field label="From">
                <Input type="date" value={from} onChange={(e) => set("from", e.target.value)} />
              </Field>
              <Field label="To">
                <Input type="date" value={to} onChange={(e) => set("to", e.target.value)} />
              </Field>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Clear dates"
                onClick={() =>
                  setParams((p) => {
                    p.delete("from")
                    p.delete("to")
                    return p
                  })
                }
              >
                <X />
              </Button>
            </div>
          )}
        </header>
      }
    >
      {hits === undefined ? null : hits.length === 0 ? (
        <div className="grid place-items-center gap-3 pt-16 text-center text-muted-foreground">
          <SearchIcon className="size-10 opacity-40" />
          <p>{q || from || to || kind !== "all" ? "Nothing found." : "Search your journal, medical logs and #tags."}</p>
          {!q && (
            <div className="flex flex-wrap justify-center gap-2">
              {["#health", "#family", "#travel", "#birthday"].map((t) => (
                <Button key={t} variant="outline" size="sm" onClick={() => set("q", t)}>
                  {t}
                </Button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <ul className="grid gap-2">
          {hits.map((h, i) => (
            <li key={i}>
              <Link
                to={`/day/${h.date}?s=${SECTION[h.kind]}`}
                viewTransition
                className="grid gap-1 rounded-xl border bg-card p-3 active:bg-muted"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{format(fromISO(h.date), "EEE d MMM yyyy")}</span>
                  <Badge variant="secondary" className="ml-auto capitalize">
                    {h.kind}
                  </Badge>
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">{highlight(h.text, q.startsWith("#") ? "" : q.trim())}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  )
}
