import { useState } from "react"
import { Link } from "react-router"
import { useLiveQuery } from "dexie-react-hooks"
import { CalendarClock, Clock, ListChecks, Target, Trophy } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { TextAreaField } from "@/components/fields"
import { Empty, RemoveButton, Section } from "@/components/section"
import { db, type Entry, type Todo } from "@/lib/db"
import { formatTime12 } from "@/lib/date"
import { uid } from "@/lib/id"
import { useSettings } from "@/lib/profile"
import { cn } from "@/lib/utils"
import type { SectionProps } from "./types"

function CheckRow({
  checked,
  onChecked,
  children,
  onRemove,
}: {
  checked: boolean
  onChecked: (c: boolean) => void
  children: React.ReactNode
  onRemove?: () => void
}) {
  return (
    <li className="flex items-center">
      <label className="flex min-h-12 flex-1 items-center gap-3 rounded-lg px-1 active:bg-muted">
        <Checkbox
          checked={checked}
          onCheckedChange={(c) => {
            navigator.vibrate?.(8)
            onChecked(!!c)
          }}
        />
        <span className={cn("flex-1", checked && "text-muted-foreground line-through")}>{children}</span>
      </label>
      {onRemove && <RemoveButton onClick={onRemove} />}
    </li>
  )
}

/** Single-line "type and press enter" adder — the fastest mobile pattern for lists. */
function QuickAdd({ placeholder, onAdd }: { placeholder: string; onAdd: (text: string) => void }) {
  const [v, setV] = useState("")
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!v.trim()) return
        onAdd(v.trim())
        setV("")
      }}
    >
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} enterKeyHint="done" />
    </form>
  )
}

function TodoList({
  items,
  field,
  patch,
  placeholder,
}: {
  items: Todo[]
  field: "tasks" | "goals"
  patch: SectionProps["patch"]
  placeholder: string
}) {
  return (
    <>
      {items.length > 0 && (
        <ul className="grid">
          {items.map((t) => (
            <CheckRow
              key={t.id}
              checked={t.done}
              onChecked={(c) =>
                patch((e) => {
                  const x = e[field].find((y) => y.id === t.id)
                  if (x) x.done = c
                })
              }
              onRemove={() => patch((e) => void (e[field] = e[field].filter((y) => y.id !== t.id)))}
            >
              {t.text}
            </CheckRow>
          ))}
        </ul>
      )}
      <QuickAdd placeholder={placeholder} onAdd={(text) => patch((e) => void e[field].push({ id: uid(), text, done: false }))} />
    </>
  )
}

function Routine({ entry, patch }: SectionProps) {
  const settings = useSettings()
  const routine = settings?.routine ?? []
  const done = routine.filter((r) => entry.routineDone[r.id]).length
  return (
    <Section
      title="Daily routine"
      icon={ListChecks}
      action={
        <span className="text-sm text-muted-foreground tabular-nums">
          {done}/{routine.length}
        </span>
      }
    >
      {routine.length === 0 && <Empty>No routine items yet.</Empty>}
      <ul className="grid">
        {routine.map((r) => (
          <CheckRow
            key={r.id}
            checked={!!entry.routineDone[r.id]}
            onChecked={(c) =>
              patch((e) => {
                if (c) e.routineDone[r.id] = true
                else delete e.routineDone[r.id]
              })
            }
          >
            {r.text}
          </CheckRow>
        ))}
      </ul>
      <Link to="/more/routine" className="text-sm text-primary">
        Edit routine
      </Link>
      <h3 className="mt-2 text-sm font-medium text-muted-foreground">Today's tasks</h3>
      <TodoList items={entry.tasks} field="tasks" patch={patch} placeholder="Add a task…" />
    </Section>
  )
}

function EventRow({ ev, patch }: { ev: Entry["events"][number]; patch: SectionProps["patch"] }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-primary/10 py-1 pl-3 text-sm">
      <span className="text-xs font-medium text-primary tabular-nums">{formatTime12(ev.time)}</span>
      <span className="flex-1 font-medium">{ev.title}</span>
      <RemoveButton onClick={() => patch((e) => void (e.events = e.events.filter((x) => x.id !== ev.id)))} />
    </div>
  )
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 06:00 → 22:00

function TimeLadder({ entry, patch }: SectionProps) {
  const [adding, setAdding] = useState<string>()
  const [title, setTitle] = useState("")
  const hourOf = (t: string) => Number(t.slice(0, 2))
  const outside = entry.events.filter((ev) => hourOf(ev.time) < 6 || hourOf(ev.time) > 22)

  const commit = () => {
    if (adding && title.trim()) {
      const time = adding
      patch((e) => {
        e.events.push({ id: uid(), time, title: title.trim() })
        e.events.sort((a, b) => a.time.localeCompare(b.time))
      })
    }
    setAdding(undefined)
    setTitle("")
  }

  return (
    <Section title="Schedule" icon={Clock}>
      <p className="-mt-1 text-xs text-muted-foreground">Tap an hour to add an event.</p>
      <ol className="grid">
        {HOURS.map((h) => {
          const hh = String(h).padStart(2, "0")
          const evs = entry.events.filter((ev) => hourOf(ev.time) === h)
          return (
            <li key={h} className="grid grid-cols-[3.5rem_1fr] border-t border-dashed first:border-t-0">
              <button
                type="button"
                className="h-11 text-left text-xs text-muted-foreground tabular-nums active:text-primary"
                onClick={() => setAdding(`${hh}:00`)}
              >
                {formatTime12(`${hh}:00`)}
              </button>
              <div className="grid content-center gap-1 py-1">
                {evs.map((ev) => (
                  <EventRow key={ev.id} ev={ev} patch={patch} />
                ))}
                {adding?.startsWith(hh) ? (
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      commit()
                    }}
                  >
                    <Input
                      type="time"
                      value={adding}
                      onChange={(e) => setAdding(e.target.value || adding)}
                      className="w-28 shrink-0"
                      aria-label="Event time"
                    />
                    <Input
                      autoFocus
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={commit}
                      placeholder="Event"
                      enterKeyHint="done"
                    />
                  </form>
                ) : (
                  evs.length === 0 && <button type="button" aria-label={`Add event at ${h}:00`} className="h-9" onClick={() => setAdding(`${hh}:00`)} />
                )}
              </div>
            </li>
          )
        })}
      </ol>
      {outside.map((ev) => (
        <EventRow key={ev.id} ev={ev} patch={patch} />
      ))}
    </Section>
  )
}

function FollowUps({ date }: { date: string }) {
  const due = useLiveQuery(
    async () =>
      (await db.entries.toArray()).flatMap((e) =>
        e.checkups.filter((c) => c.followUp === date).map((c) => ({ ...c, from: e.date })),
      ),
    [date],
  )
  if (!due?.length) return null
  return (
    <Section title="Follow-ups due" icon={CalendarClock} className="border-primary/40">
      {due.map((c) => (
        <Link key={c.id} to={`/day/${c.from}?s=health`} className="rounded-lg bg-muted/60 p-3 text-sm active:bg-muted">
          <p className="font-medium">{c.title || c.kind}</p>
          <p className="text-xs text-muted-foreground">From {c.from}</p>
        </Link>
      ))}
    </Section>
  )
}

function Goals({ entry, patch }: SectionProps) {
  return (
    <Section title="Goals & wins" icon={Target}>
      <TodoList items={entry.goals} field="goals" patch={patch} placeholder="Add a micro-goal…" />
      <div className="mt-2 grid gap-2 rounded-2xl bg-accent p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-accent-foreground">
          <Trophy className="size-4" /> Win of the day
        </h3>
        <TextAreaField
          value={entry.win}
          onCommit={(v) => patch((e) => void (e.win = v))}
          placeholder="Something you're proud of today…"
          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
      </div>
    </Section>
  )
}

export function RoutineSection(props: SectionProps) {
  return (
    <>
      <FollowUps date={props.date} />
      <Routine {...props} />
      <Goals {...props} />
      <TimeLadder {...props} />
    </>
  )
}
