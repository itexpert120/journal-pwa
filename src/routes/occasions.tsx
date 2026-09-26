import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { format } from "date-fns"
import { Cake, Heart, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Page } from "@/components/app-shell"
import { Field } from "@/components/fields"
import { RemoveButton } from "@/components/section"
import { db, type Occasion } from "@/lib/db"
import { monthDay, todayISO } from "@/lib/date"
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

export function Component() {
  const list = useLiveQuery(() => db.occasions.toArray(), [])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<{ name: string; kind: Occasion["kind"]; date: string }>({ name: "", kind: "Birthday", date: "" })

  const sorted = (list ?? []).map((o) => ({ ...o, in: daysUntil(o.md) })).sort((a, b) => a.in - b.in)
  const save = async () => {
    if (!form.name.trim() || !form.date) return
    const [y] = form.date.split("-")
    await db.occasions.add({ id: uid(), name: form.name.trim(), kind: form.kind, md: form.date.slice(5), year: Number(y) || undefined })
    setForm({ name: "", kind: form.kind, date: "" })
    setOpen(false)
  }

  return (
    <Page
      title="Occasions"
      back="/more"
      actions={
        <Button size="icon" aria-label="Add occasion" onClick={() => setOpen(true)}>
          <Plus />
        </Button>
      }
    >
      {sorted.length === 0 ? (
        <div className="grid place-items-center gap-3 pt-16 text-center text-muted-foreground">
          <Cake className="size-10 opacity-40" />
          <p>Add birthdays and anniversaries.<br />They'll show on the day, every year.</p>
          <Button onClick={() => setOpen(true)}>
            <Plus /> Add occasion
          </Button>
        </div>
      ) : (
        <ul className="grid gap-2">
          {sorted.map((o) => (
            <li key={o.id} className="flex items-center gap-3 rounded-xl border bg-card py-2 pr-1 pl-3">
              {o.kind === "Birthday" ? <Cake className="size-5 text-primary" /> : <Heart className="size-5 text-rose-500" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{o.name}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(`2000-${o.md}T00:00`), "d MMMM")}
                  {o.year ? ` · since ${o.year}` : ""}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium tabular-nums",
                  o.md === monthDay(todayISO()) ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {o.in === 0 ? "Today 🎉" : o.in === 1 ? "Tomorrow" : `${o.in} days`}
              </span>
              <RemoveButton onClick={() => db.occasions.delete(o.id)} />
            </li>
          ))}
        </ul>
      )}

      <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-3xl">New occasion</DrawerTitle>
          </DrawerHeader>
          <form
            className="grid gap-4 p-4"
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              {(["Birthday", "Anniversary"] as const).map((k) => (
                <Button
                  key={k}
                  type="button"
                  variant={form.kind === k ? "default" : "outline"}
                  onClick={() => setForm((f) => ({ ...f, kind: k }))}
                >
                  {k === "Birthday" ? <Cake /> : <Heart />} {k}
                </Button>
              ))}
            </div>
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Who / what" />
            </Field>
            <Field label="Date" hint="year is used to count years">
              <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </Field>
            <Button type="submit" size="lg" disabled={!form.name.trim() || !form.date}>
              Save
            </Button>
          </form>
        </DrawerContent>
      </Drawer>
    </Page>
  )
}
