import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { format } from "date-fns"
import { Cake, Heart, Plus } from "lucide-react"
import { Page } from "@/components/app-shell"
import { DateTimeRow, EditSheet, EmptyState, Group, Row, SelectRow, TextRow } from "@/components/ios"
import { Button } from "@/components/ui/button"
import { db, type Occasion } from "@/lib/db"
import { uid } from "@/lib/id"
import { cn } from "@/lib/utils"

/** Days until next occurrence, wrapping into next year. */
function daysUntil(md: string) {
  const now = new Date()
  const y = now.getFullYear()
  const today = new Date(y, now.getMonth(), now.getDate())
  let next = new Date(`${y}-${md}T00:00`)
  if (next < today) next = new Date(`${y + 1}-${md}T00:00`)
  return Math.round((next.getTime() - today.getTime()) / 86_400_000)
}

function OccasionSheet({ occasion, onOpenChange }: { occasion?: Occasion; onOpenChange: (o: boolean) => void }) {
  const o = occasion
  const upd = (patch: Partial<Occasion>) => o && db.occasions.update(o.id, patch)
  return (
    <EditSheet open={!!o} onOpenChange={onOpenChange} title={o?.kind ?? ""} onDelete={() => o && db.occasions.delete(o.id)}>
      {o && (
        <Group footer="The year is optional. It's used to count years, e.g. “25th anniversary”.">
          <TextRow label="Name" value={o.name} onCommit={(v) => upd({ name: v })} placeholder="Name" autoFocus={!o.name} />
          <SelectRow
            label="Type"
            value={o.kind}
            options={["Birthday", "Anniversary"]}
            onChange={(v) => upd({ kind: v as Occasion["kind"] })}
          />
          <DateTimeRow
            label="Date"
            type="date"
            value={`${o.year ?? 2000}-${o.md}`}
            onChange={(v) => v && upd({ md: v.slice(5), year: Number(v.slice(0, 4)) })}
          />
        </Group>
      )}
    </EditSheet>
  )
}

export function Component() {
  const list = useLiveQuery(() => db.occasions.toArray(), [])
  const [editId, setEditId] = useState<string>()
  const editing = list?.find((o) => o.id === editId)
  const sorted = (list ?? []).map((o) => ({ ...o, in: daysUntil(o.md) })).sort((a, b) => a.in - b.in)

  const add = async () => {
    const id = uid()
    const now = new Date()
    await db.occasions.add({ id, name: "", kind: "Birthday", md: format(now, "MM-dd") })
    setEditId(id)
  }

  return (
    <Page
      title="Occasions"
      back="/more"
      backLabel="Settings"
      actions={
        <Button variant="ghost" size="icon" aria-label="Add occasion" className="text-primary" onClick={add}>
          <Plus className="size-6" />
        </Button>
      }
    >
      {list && sorted.length === 0 ? (
        <EmptyState icon={Cake} title="No Occasions">
          <p>Birthdays and anniversaries appear on their day every year.</p>
          <Button className="mt-4" onClick={add}>
            <Plus /> Add Occasion
          </Button>
        </EmptyState>
      ) : (
        <Group header="Upcoming">
          {sorted.map((o) => (
            <Row
              key={o.id}
              icon={o.kind === "Birthday" ? Cake : Heart}
              color={o.kind === "Birthday" ? "orange" : "pink"}
              label={o.name || "Untitled"}
              detail={`${format(new Date(`2000-${o.md}T00:00`), "d MMMM")}${o.year ? ` · ${o.year}` : ""}`}
              onClick={() => setEditId(o.id)}
              chevron
            >
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[13px] font-semibold tabular-nums",
                  o.in === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {o.in === 0 ? "Today" : o.in === 1 ? "Tomorrow" : `${o.in} days`}
              </span>
            </Row>
          ))}
        </Group>
      )}
      <OccasionSheet
        occasion={editing}
        onOpenChange={(open) => {
          if (open) return
          // Discard a brand-new entry left without a name — after pending field edits flush.
          const id = editId
          setTimeout(async () => {
            const o = id && (await db.occasions.get(id))
            if (o && !o.name.trim()) db.occasions.delete(o.id)
          }, 900)
          setEditId(undefined)
        }}
      />
    </Page>
  )
}
