import { useRef } from "react"
import { Camera, Droplets, Footprints, Minus, Plus, Utensils, Dumbbell, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Field, NumberField, TextAreaField, TextField } from "@/components/fields"
import { AddButton, Empty, Item, RemoveButton, Section } from "@/components/section"
import { db, MEAL_SLOTS, saveFile, WORKOUT_TYPES, type Meal, type MealSlot } from "@/lib/db"
import { compressImage } from "@/lib/image"
import { uid } from "@/lib/id"
import { useSettings } from "@/lib/profile"
import { kmTo, toKm, waterLabel } from "@/lib/units"
import { useFileUrl } from "@/hooks/use-file-url"
import { cn } from "@/lib/utils"
import type { SectionProps } from "./types"

function Steps({ entry, patch }: SectionProps) {
  const settings = useSettings()
  const unit = settings?.units.distance ?? "km"
  return (
    <Section title="Walk & steps" icon={Footprints}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Steps">
          <NumberField value={entry.steps} onCommit={(v) => patch((e) => void (e.steps = v))} placeholder="0" />
        </Field>
        <Field label="Distance" hint={unit}>
          <NumberField
            decimal
            value={entry.distance === undefined ? undefined : kmTo(entry.distance, unit)}
            onCommit={(v) => patch((e) => void (e.distance = v === undefined ? undefined : toKm(v, unit)))}
            placeholder="0"
          />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        Enter manually — Apple Health and Health Connect can't be read by web apps.
      </p>
    </Section>
  )
}

function Workouts({ entry, patch }: SectionProps) {
  const upd = (id: string, fn: (w: SectionProps["entry"]["workouts"][number]) => void) =>
    patch((e) => {
      const w = e.workouts.find((x) => x.id === id)
      if (w) fn(w)
    })
  return (
    <Section title="Exercise & workouts" icon={Dumbbell}>
      {entry.workouts.length === 0 && <Empty>No workouts logged.</Empty>}
      {entry.workouts.map((w) => (
        <Item key={w.id}>
          <div className="flex items-center gap-2">
            <Select
              label="Workout type"
              value={w.type}
              options={WORKOUT_TYPES}
              onValueChange={(v) => upd(w.id, (x) => void (x.type = v))}
              className="flex-1"
            />
            <RemoveButton onClick={() => patch((e) => void (e.workouts = e.workouts.filter((x) => x.id !== w.id)))} />
          </div>
          {w.type === "Custom" && (
            <TextField value={w.custom} placeholder="Activity name" onCommit={(v) => upd(w.id, (x) => void (x.custom = v))} />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duration" hint="min">
              <NumberField value={w.duration} onCommit={(v) => upd(w.id, (x) => void (x.duration = v))} />
            </Field>
            <Field label="Calories" hint="kcal">
              <NumberField value={w.calories} onCommit={(v) => upd(w.id, (x) => void (x.calories = v))} />
            </Field>
          </div>
          <Field label="Intensity" group>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Button
                  key={n}
                  variant={w.intensity === n ? "default" : "outline"}
                  aria-pressed={w.intensity === n}
                  onClick={() => upd(w.id, (x) => void (x.intensity = x.intensity === n ? undefined : n))}
                >
                  {n}
                </Button>
              ))}
            </div>
          </Field>
        </Item>
      ))}
      <AddButton onClick={() => patch((e) => void e.workouts.push({ id: uid(), type: "Cardio" }))}>Add workout</AddButton>
    </Section>
  )
}

function Water({ entry, patch }: SectionProps) {
  const settings = useSettings()
  const goal = settings?.waterGoal ?? 8
  const unit = settings?.units.water ?? "glass"
  const set = (n: number) => {
    navigator.vibrate?.(8)
    patch((e) => void (e.water = Math.max(0, n)))
  }
  return (
    <Section title="Water" icon={Droplets}>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon-lg" aria-label="One less glass" onClick={() => set(entry.water - 1)}>
          <Minus />
        </Button>
        <div className="flex-1 text-center">
          <p className="text-2xl font-semibold tabular-nums">{waterLabel(entry.water, unit)}</p>
          <p className="text-xs text-muted-foreground">goal {waterLabel(goal, unit)}</p>
        </div>
        <Button size="icon-lg" aria-label="One more glass" onClick={() => set(entry.water + 1)}>
          <Plus />
        </Button>
      </div>
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: Math.max(goal, entry.water) }).map((_, i) => (
          <span
            key={i}
            className={cn("h-2 flex-1 rounded-full", i < entry.water ? "bg-sky-500" : "bg-muted")}
          />
        ))}
      </div>
    </Section>
  )
}

function MealPhoto({ id, onRemove }: { id: string; onRemove: () => void }) {
  const url = useFileUrl(id)
  return (
    <div className="relative">
      {url && <img src={url} alt="Meal" className="aspect-video w-full rounded-lg object-cover" />}
      <Button
        size="icon-sm"
        variant="secondary"
        aria-label="Remove photo"
        className="absolute top-2 right-2 rounded-full"
        onClick={onRemove}
      >
        <X />
      </Button>
    </div>
  )
}

const MEAL_LABEL: Record<MealSlot, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snacks: "Snacks" }

function MealCard({ slot, meal, date, patch }: { slot: MealSlot; meal: Meal; date: string; patch: SectionProps["patch"] }) {
  const file = useRef<HTMLInputElement>(null)
  const upd = (fn: (m: Meal) => void) =>
    patch((e) => {
      const m = (e.meals[slot] ??= {})
      fn(m)
    })
  return (
    <Item>
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-xl">{MEAL_LABEL[slot]}</h3>
        {!meal.photoId && (
          <Button variant="ghost" size="sm" onClick={() => file.current?.click()}>
            <Camera /> Photo
          </Button>
        )}
      </div>
      {meal.photoId && (
        <MealPhoto
          id={meal.photoId}
          onRemove={() => {
            db.files.delete(meal.photoId!)
            upd((m) => void (m.photoId = undefined))
          }}
        />
      )}
      <TextAreaField value={meal.note} onCommit={(v) => upd((m) => void (m.note = v))} placeholder="What did you eat?" rows={1} />
      <div className="grid grid-cols-4 gap-2">
        {(
          [
            ["calories", "kcal"],
            ["protein", "P g"],
            ["carbs", "C g"],
            ["fat", "F g"],
          ] as const
        ).map(([k, l]) => (
          <Field key={k} label={l}>
            <NumberField value={meal[k]} onCommit={(v) => upd((m) => void (m[k] = v))} className="px-2 text-center" />
          </Field>
        ))}
      </div>
      <input
        ref={file}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ""
          if (!f) return
          const id = await saveFile(await compressImage(f), date)
          upd((m) => void (m.photoId = id))
        }}
      />
    </Item>
  )
}

function Diet({ date, entry, patch }: SectionProps) {
  const totals = MEAL_SLOTS.reduce(
    (t, s) => {
      const m = entry.meals[s]
      return {
        kcal: t.kcal + (m?.calories ?? 0),
        p: t.p + (m?.protein ?? 0),
        c: t.c + (m?.carbs ?? 0),
        f: t.f + (m?.fat ?? 0),
      }
    },
    { kcal: 0, p: 0, c: 0, f: 0 },
  )
  const burned = entry.workouts.reduce((s, w) => s + (w.calories ?? 0), 0)
  return (
    <Section title="Diet log" icon={Utensils}>
      <div className="grid grid-cols-4 gap-2 rounded-xl bg-muted/60 p-3 text-center">
        {[
          ["kcal in", totals.kcal],
          ["protein", `${totals.p}g`],
          ["carbs", `${totals.c}g`],
          ["fat", `${totals.f}g`],
        ].map(([l, v]) => (
          <div key={l}>
            <p className="text-lg font-semibold tabular-nums">{v}</p>
            <p className="text-[11px] text-muted-foreground">{l}</p>
          </div>
        ))}
        {burned > 0 && (
          <p className="col-span-4 text-xs text-muted-foreground">
            {burned} kcal burned · net {totals.kcal - burned} kcal
          </p>
        )}
      </div>
      {MEAL_SLOTS.map((s) => (
        <MealCard key={s} slot={s} meal={entry.meals[s] ?? {}} date={date} patch={patch} />
      ))}
    </Section>
  )
}

export function FitnessSection(props: SectionProps) {
  return (
    <>
      <Steps {...props} />
      <Water {...props} />
      <Workouts {...props} />
      <Diet {...props} />
    </>
  )
}
