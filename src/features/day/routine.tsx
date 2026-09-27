import { useState } from "react"
import { Link } from "react-router"
import { useLiveQuery } from "dexie-react-hooks"
import { format } from "date-fns"
import { CirclePlus, X } from "lucide-react"
import { CheckRow, DateTimeRow, EditSheet, Group, NoteRow, Row, TextRow } from "@/components/ios"
import { db, type TimedEvent, type Todo } from "@/lib/db"
import { formatTime12, fromISO } from "@/lib/date"
import { uid } from "@/lib/id"
import { setNav } from "@/lib/nav"
import { useSettings } from "@/lib/profile"
import { cn } from "@/lib/utils"
import type { SectionProps } from "./types"

/** "New item" row: plus icon + inline field, submit with Return. */
function AddRow({ placeholder, onAdd }: { placeholder: string; onAdd: (text: string) => void }) {
  const [v, setV] = useState("")
  const commit = () => {
    if (v.trim()) onAdd(v.trim())
    setV("")
  }
  return (
    <form
      className="flex min-h-[3.25rem] items-center gap-3 pl-4"
      onSubmit={(e) => {
        e.preventDefault()
        commit()
      }}
    >
      <CirclePlus className="size-6 shrink-0 fill-primary text-white" />
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        placeholder={placeholder}
        enterKeyHint="done"
        className="min-w-0 flex-1 bg-transparent py-3 pr-4 text-[1.0625rem] outline-none placeholder:text-muted-foreground/70"
      />
    </form>
  )
}

function TodoRows({ items, field, patch }: { items: Todo[]; field: "tasks" | "goals"; patch: SectionProps["patch"] }) {
  return items.map((t) => (
    <CheckRow
      key={t.id}
      checked={t.done}
      onChange={(c) =>
        patch((e) => {
          const x = e[field].find((y) => y.id === t.id)
          if (x) x.done = c
        })
      }
      label={t.text}
      trailing={
        <button
          type="button"
          aria-label={`Delete ${t.text}`}
          onClick={(ev) => {
            ev.preventDefault()
            patch((e) => void (e[field] = e[field].filter((y) => y.id !== t.id)))
          }}
          className="-mr-2 grid size-9 place-items-center rounded-full text-muted-foreground/70 active:bg-muted"
        >
          <X className="size-4" />
        </button>
      }
    />
  ))
}

function FollowUps({ date }: { date: string }) {
  const due = useLiveQuery(
    async () =>
      (await db.entries.toArray()).flatMap((e) => e.checkups.filter((c) => c.followUp === date).map((c) => ({ ...c, from: e.date }))),
    [date],
  )
  if (!due?.length) return null
  return (
    <Group header="Follow-ups Due">
      {due.map((c) => (
        <Row key={c.id} label={c.title || c.kind} detail={`From ${format(fromISO(c.from), "d MMM yyyy")}`} to={`/day/${c.from}?s=health`} />
      ))}
    </Group>
  )
}

function Routine({ entry, patch }: SectionProps) {
  const settings = useSettings()
  const routine = settings?.routine ?? []
  const done = routine.filter((r) => entry.routineDone[r.id]).length
  return (
    <Group
      header="Routine"
      action={
        <Link to="/more/routine" viewTransition onClick={() => setNav("push")}>
          Edit
        </Link>
      }
      footer={routine.length ? `${done} of ${routine.length} done` : "Set up your daily non-negotiables."}
    >
      {routine.map((r) => (
        <CheckRow
          key={r.id}
          checked={!!entry.routineDone[r.id]}
          onChange={(c) =>
            patch((e) => {
              if (c) e.routineDone[r.id] = true
              else delete e.routineDone[r.id]
            })
          }
          label={r.text}
        />
      ))}
      {routine.length === 0 && <Row label="Add Routine Items" to="/more/routine" />}
    </Group>
  )
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 06:00 → 22:00

function Schedule({ entry, patch }: SectionProps) {
  const [edit, setEdit] = useState<string>()
  const ev = entry.events.find((x) => x.id === edit)
  const upd = (fn: (x: TimedEvent) => void) =>
    patch((e) => {
      const x = e.events.find((y) => y.id === edit)
      if (x) fn(x)
      e.events.sort((a, b) => a.time.localeCompare(b.time))
    })
  const add = (time: string) => {
    const id = uid()
    patch((e) => void e.events.push({ id, time, title: "" })).then(() => setEdit(id))
  }
  const hourOf = (t: string) => Number(t.slice(0, 2))
  const outside = entry.events.filter((x) => hourOf(x.time) < 6 || hourOf(x.time) > 22)
  const nowHour = new Date().getHours()

  return (
    <Group header="Schedule" footer="Tap an hour to add an event.">
      <ol className="py-1.5">
        {HOURS.map((h) => {
          const hh = String(h).padStart(2, "0")
          const evs = entry.events.filter((x) => hourOf(x.time) === h)
          return (
            <li key={h} className="grid min-h-11 grid-cols-[4.25rem_1fr] items-start">
              <span className={cn("pt-3 pl-4 text-[0.8125rem] text-muted-foreground tabular-nums", h === nowHour && "font-semibold text-alert")}>
                {formatTime12(`${hh}:00`).replace(":00", "")}
              </span>
              <div className="grid min-h-11 content-center gap-1 border-t border-border/60 py-1 pr-4">
                {evs.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => setEdit(x.id)}
                    className="flex items-center gap-2 rounded-lg border-l-[0.1875rem] border-primary bg-primary/12 px-2.5 py-1.5 text-left text-[0.9375rem] active:opacity-70"
                  >
                    <span className="font-semibold text-primary tabular-nums">{formatTime12(x.time)}</span>
                    <span className="truncate">{x.title || "New Event"}</span>
                  </button>
                ))}
                {evs.length === 0 && (
                  <button type="button" aria-label={`Add event at ${h}:00`} onClick={() => add(`${hh}:00`)} className="h-9 w-full rounded-lg active:bg-muted" />
                )}
              </div>
            </li>
          )
        })}
      </ol>
      {outside.map((x) => (
        <Row key={x.id} label={x.title || "New Event"} value={formatTime12(x.time)} onClick={() => setEdit(x.id)} chevron />
      ))}
      <EditSheet
        open={!!ev}
        onOpenChange={(o) => {
          if (o) return
          const id = edit
          setEdit(undefined)
          // Drop events left untitled once pending edits have flushed.
          setTimeout(() => patch((e) => void (e.events = e.events.filter((x) => x.id !== id || x.title.trim()))), 900)
        }}
        title="Event"
        onDelete={() => patch((e) => void (e.events = e.events.filter((x) => x.id !== edit)))}
        deleteLabel="Delete Event"
      >
        {ev && (
          <Group>
            <TextRow label="Title" value={ev.title} onCommit={(v) => upd((x) => void (x.title = v))} placeholder="Event" autoFocus={!ev.title} />
            <DateTimeRow label="Time" type="time" value={ev.time} onChange={(v) => v && upd((x) => void (x.time = v))} />
          </Group>
        )}
      </EditSheet>
    </Group>
  )
}

export function RoutineSection(props: SectionProps) {
  const { entry, patch } = props
  return (
    <>
      <FollowUps date={props.date} />
      <Routine {...props} />
      <Group header="Tasks">
        <TodoRows items={entry.tasks} field="tasks" patch={patch} />
        <AddRow placeholder="New Task" onAdd={(text) => patch((e) => void e.tasks.push({ id: uid(), text, done: false }))} />
      </Group>
      <Group header="Micro-goals">
        <TodoRows items={entry.goals} field="goals" patch={patch} />
        <AddRow placeholder="New Goal" onAdd={(text) => patch((e) => void e.goals.push({ id: uid(), text, done: false }))} />
      </Group>
      <Group header="Win of the Day">
        <NoteRow value={entry.win} onCommit={(v) => patch((e) => void (e.win = v))} placeholder="Something you're proud of today…" rows={2} />
      </Group>
      <Schedule {...props} />
    </>
  )
}
