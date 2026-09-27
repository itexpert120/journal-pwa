import { useRef, useState } from "react"
import { Camera, Plus, X } from "lucide-react"
import {
  ActionRow,
  Cell,
  EditSheet,
  Group,
  NoteRow,
  NumberRow,
  Row,
  Segmented,
  SelectRow,
  Stepper,
  TextRow,
} from "@/components/ios"
import { db, MEAL_SLOTS, saveFile, WORKOUT_TYPES, type Meal, type MealSlot, type Workout } from "@/lib/db"
import { compressImage } from "@/lib/image"
import { uid } from "@/lib/id"
import { useSettings } from "@/lib/profile"
import { kmTo, toKm, waterLabel } from "@/lib/units"
import { useFileUrl } from "@/hooks/use-file-url"
import { cn } from "@/lib/utils"
import type { SectionProps } from "./types"

const MEAL_LABEL: Record<MealSlot, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snacks: "Snacks" }
const MEAL_EMOJI: Record<MealSlot, string> = { breakfast: "🥐", lunch: "🥗", dinner: "🍲", snacks: "🍎" }

function Activity({ entry, patch }: SectionProps) {
  const settings = useSettings()
  const unit = settings?.units.distance ?? "km"
  return (
    <Group header="Activity" footer="Enter manually — Apple Health and Health Connect can't be read by web apps.">
      <NumberRow label="Steps" value={entry.steps} onCommit={(v) => patch((e) => void (e.steps = v))} placeholder="0" />
      <NumberRow
        label="Distance"
        unit={unit}
        decimal
        value={entry.distance === undefined ? undefined : kmTo(entry.distance, unit)}
        onCommit={(v) => patch((e) => void (e.distance = v === undefined ? undefined : toKm(v, unit)))}
        placeholder="0"
      />
    </Group>
  )
}

function Water({ entry, patch }: SectionProps) {
  const settings = useSettings()
  const goal = settings?.waterGoal ?? 8
  const unit = settings?.units.water ?? "glass"
  const pct = Math.min(1, entry.water / goal)
  const set = (n: number) => {
    navigator.vibrate?.(8)
    patch((e) => void (e.water = Math.max(0, n)))
  }
  return (
    <Group header="Water">
      <Cell className="grid gap-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[28px] leading-none font-bold tabular-nums">{waterLabel(entry.water, unit)}</p>
            <p className="mt-1 text-[15px] text-muted-foreground">of {waterLabel(goal, unit)} goal</p>
          </div>
          <Stepper label="water" onDecrement={() => set(entry.water - 1)} onIncrement={() => set(entry.water + 1)} />
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-[#30b0c7] transition-[width] duration-500" style={{ width: `${pct * 100}%` }} />
        </div>
      </Cell>
    </Group>
  )
}

function Workouts({ entry, patch }: SectionProps) {
  const [id, setId] = useState<string>()
  const w = entry.workouts.find((x) => x.id === id)
  const upd = (fn: (x: Workout) => void) =>
    patch((e) => {
      const x = e.workouts.find((y) => y.id === id)
      if (x) fn(x)
    })
  const total = entry.workouts.reduce((s, x) => s + (x.duration ?? 0), 0)
  return (
    <Group header="Workouts" footer={total ? `${total} min total` : undefined}>
      {entry.workouts.map((x) => (
        <Row
          key={x.id}
          label={x.type === "Custom" ? x.custom || "Custom" : x.type}
          detail={
            [x.duration && `${x.duration} min`, x.calories && `${x.calories} kcal`, x.intensity && `Intensity ${x.intensity}/5`]
              .filter(Boolean)
              .join(" · ") || "Tap to add details"
          }
          onClick={() => setId(x.id)}
          chevron
        />
      ))}
      <ActionRow
        icon={Plus}
        onClick={() => {
          const nid = uid()
          patch((e) => void e.workouts.push({ id: nid, type: "Cardio" })).then(() => setId(nid))
        }}
      >
        Add Workout
      </ActionRow>
      <EditSheet
        open={!!w}
        onOpenChange={(o) => !o && setId(undefined)}
        title="Workout"
        onDelete={() => patch((e) => void (e.workouts = e.workouts.filter((x) => x.id !== id)))}
        deleteLabel="Delete Workout"
      >
        {w && (
          <>
            <Group>
              <SelectRow label="Type" value={w.type} options={WORKOUT_TYPES} onChange={(v) => upd((x) => void (x.type = v))} />
              {w.type === "Custom" && (
                <TextRow label="Activity" value={w.custom} onCommit={(v) => upd((x) => void (x.custom = v))} placeholder="e.g. Tennis" />
              )}
              <NumberRow label="Duration" unit="min" value={w.duration} onCommit={(v) => upd((x) => void (x.duration = v))} placeholder="0" />
              <NumberRow label="Calories" unit="kcal" value={w.calories} onCommit={(v) => upd((x) => void (x.calories = v))} placeholder="0" />
            </Group>
            <Group header="Intensity">
              <Cell>
                <Segmented
                  label="Intensity"
                  value={w.intensity}
                  options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: n }))}
                  onChange={(n) => upd((x) => void (x.intensity = n))}
                />
              </Cell>
            </Group>
          </>
        )}
      </EditSheet>
    </Group>
  )
}

function MealPhoto({ id, onRemove }: { id: string; onRemove: () => void }) {
  const url = useFileUrl(id)
  return (
    <div className="relative mx-4 mb-3 overflow-hidden rounded-2xl">
      {url && <img src={url} alt="Meal" className="aspect-[4/3] w-full object-cover" />}
      <button type="button" aria-label="Remove photo" onClick={onRemove} className="glass absolute top-2 right-2 grid size-9 place-items-center rounded-full">
        <X className="size-4" />
      </button>
    </div>
  )
}

function MealSheet({
  slot,
  meal,
  date,
  patch,
  onClose,
}: {
  slot?: MealSlot
  meal: Meal
  date: string
  patch: SectionProps["patch"]
  onClose: () => void
}) {
  const file = useRef<HTMLInputElement>(null)
  const upd = (fn: (m: Meal) => void) => slot && patch((e) => fn((e.meals[slot] ??= {})))
  return (
    <EditSheet open={!!slot} onOpenChange={(o) => !o && onClose()} title={slot ? MEAL_LABEL[slot] : ""}>
      <Group>
        {meal.photoId ? (
          <div className="pt-3">
            <MealPhoto
              id={meal.photoId}
              onRemove={() => {
                db.files.delete(meal.photoId!)
                upd((m) => void (m.photoId = undefined))
              }}
            />
          </div>
        ) : (
          <ActionRow icon={Camera} onClick={() => file.current?.click()}>
            Add Photo of Plate
          </ActionRow>
        )}
        <NoteRow value={meal.note} onCommit={(v) => upd((m) => void (m.note = v))} placeholder="What did you eat?" rows={2} />
      </Group>
      <Group header="Nutrition">
        <NumberRow label="Calories" unit="kcal" value={meal.calories} onCommit={(v) => upd((m) => void (m.calories = v))} placeholder="0" />
        <NumberRow label="Protein" unit="g" value={meal.protein} onCommit={(v) => upd((m) => void (m.protein = v))} placeholder="0" />
        <NumberRow label="Carbs" unit="g" value={meal.carbs} onCommit={(v) => upd((m) => void (m.carbs = v))} placeholder="0" />
        <NumberRow label="Fat" unit="g" value={meal.fat} onCommit={(v) => upd((m) => void (m.fat = v))} placeholder="0" />
      </Group>
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
    </EditSheet>
  )
}

function MealThumb({ id }: { id: string }) {
  const url = useFileUrl(id)
  return url ? <img src={url} alt="" className="size-10 shrink-0 rounded-lg object-cover" /> : null
}

function Nutrition({ date, entry, patch }: SectionProps) {
  const [slot, setSlot] = useState<MealSlot>()
  const t = MEAL_SLOTS.reduce(
    (a, s) => {
      const m = entry.meals[s]
      return { kcal: a.kcal + (m?.calories ?? 0), p: a.p + (m?.protein ?? 0), c: a.c + (m?.carbs ?? 0), f: a.f + (m?.fat ?? 0) }
    },
    { kcal: 0, p: 0, c: 0, f: 0 },
  )
  const burned = entry.workouts.reduce((s, w) => s + (w.calories ?? 0), 0)
  const macros = [
    { k: "Protein", v: t.p, color: "bg-[#ff2d55]" },
    { k: "Carbs", v: t.c, color: "bg-[#ff9500]" },
    { k: "Fat", v: t.f, color: "bg-[#5856d6]" },
  ]

  return (
    <Group header="Nutrition">
      <Cell className="grid gap-3">
        <div>
          <p className="text-[28px] leading-none font-bold tabular-nums">
            {t.kcal}
            <span className="ml-1 text-[15px] font-normal text-muted-foreground">kcal eaten</span>
          </p>
          {burned > 0 && (
            <p className="mt-1 text-[15px] text-muted-foreground tabular-nums">
              {burned} burned · net {t.kcal - burned}
            </p>
          )}
        </div>
        {t.p + t.c + t.f > 0 && (
          <>
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
              {macros.map((m) => (
                <div key={m.k} className={cn("h-full", m.color)} style={{ flexGrow: m.v }} />
              ))}
            </div>
            <div className="flex gap-4 text-[13px] text-muted-foreground">
              {macros.map((m) => (
                <span key={m.k} className="flex items-center gap-1.5 tabular-nums">
                  <span className={cn("size-2 rounded-full", m.color)} />
                  {m.k} {m.v}g
                </span>
              ))}
            </div>
          </>
        )}
      </Cell>
      {MEAL_SLOTS.map((s) => {
        const m = entry.meals[s]
        return (
          <Row
            key={s}
            label={
              <span className="flex items-center gap-2">
                <span aria-hidden>{MEAL_EMOJI[s]}</span>
                {MEAL_LABEL[s]}
              </span>
            }
            detail={m?.note || (m?.calories ? undefined : "Not logged")}
            value={m?.calories ? `${m.calories} kcal` : undefined}
            onClick={() => setSlot(s)}
            chevron
          >
            {m?.photoId && <MealThumb id={m.photoId} />}
          </Row>
        )
      })}
      <MealSheet slot={slot} meal={(slot && entry.meals[slot]) || {}} date={date} patch={patch} onClose={() => setSlot(undefined)} />
    </Group>
  )
}

export function FitnessSection(props: SectionProps) {
  return (
    <>
      <Activity {...props} />
      <Water {...props} />
      <Workouts {...props} />
      <Nutrition {...props} />
    </>
  )
}
