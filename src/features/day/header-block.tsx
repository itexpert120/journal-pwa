import { useEffect, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { toast } from "sonner"
import { Cake, Heart, Loader2, LocateFixed } from "lucide-react"
import { ActionRow, Cell, EditSheet, Group, NumberRow, Row, SelectRow } from "@/components/ios"
import { db, ENERGY_LEVELS, MOODS } from "@/lib/db"
import { fromISO, monthDay, todayISO } from "@/lib/date"
import { quoteFor } from "@/lib/quotes"
import { fetchWeather, weatherInfo, WEATHER_PRESETS } from "@/lib/weather"
import { cn } from "@/lib/utils"
import type { SectionProps } from "./types"

function Occasions({ date }: { date: string }) {
  const occ = useLiveQuery(() => db.occasions.where("md").equals(monthDay(date)).toArray(), [date])
  if (!occ?.length) return null
  const year = fromISO(date).getFullYear()
  return (
    <Group>
      {occ.map((o) => (
        <Row
          key={o.id}
          icon={o.kind === "Birthday" ? Cake : Heart}
          color={o.kind === "Birthday" ? "orange" : "pink"}
          label={o.name}
          detail={`${o.kind}${o.year && year > o.year ? ` · ${year - o.year} years` : ""}`}
          value="🎉"
        />
      ))}
    </Group>
  )
}

function Mood({ entry, patch }: SectionProps) {
  return (
    <Cell className="pb-2">
      <div role="radiogroup" aria-label="Mood" className="grid grid-cols-5">
        {MOODS.map((m) => {
          const on = entry.mood === m.value
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                navigator.vibrate?.(8)
                patch((e) => void (e.mood = on ? undefined : m.value))
              }}
              className="grid justify-items-center gap-1 py-1 active:scale-95"
            >
              <span
                className={cn(
                  "grid size-12 place-items-center rounded-full text-[1.75rem] transition-all duration-200",
                  on ? "scale-110 bg-primary/15 ring-2 ring-primary" : "bg-muted/60",
                )}
              >
                {m.emoji}
              </span>
              <span className={cn("text-[0.6875rem] font-medium", on ? "text-primary" : "text-muted-foreground")}>{m.label}</span>
            </button>
          )
        })}
      </div>
    </Cell>
  )
}

/** Energy as a battery: five cells inside a battery outline, tinted by level. */
function Energy({ entry, patch }: SectionProps) {
  const lvl = entry.energy ?? 0
  const tint = lvl <= 20 ? "bg-[#ff3b30]" : lvl <= 40 ? "bg-[#ff9500]" : "bg-[#34c759]"
  return (
    <div className="flex min-h-[3.25rem] items-center gap-3 px-4">
      <span className="text-[1.0625rem]">Energy</span>
      <div className="flex flex-1 items-center justify-end">
        <div role="radiogroup" aria-label="Energy" className="flex h-8 items-center rounded-[0.625rem] border-2 border-muted-foreground/40 p-[0.1875rem]">
          {ENERGY_LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={entry.energy === l}
              aria-label={`${l}%`}
              onClick={() => {
                navigator.vibrate?.(8)
                patch((e) => void (e.energy = e.energy === l ? undefined : l))
              }}
              className="h-full w-7 px-[1.5px] first:pl-0 last:pr-0"
            >
              <span className={cn("block h-full rounded-[0.25rem] transition-colors duration-200", lvl >= l ? tint : "bg-muted")} />
            </button>
          ))}
        </div>
        <span className="ml-px h-3 w-[0.1875rem] rounded-r-sm bg-muted-foreground/40" aria-hidden />
        <span className="ml-2 w-11 text-right text-[0.9375rem] text-muted-foreground tabular-nums">{entry.energy ? `${entry.energy}%` : "—"}</span>
      </div>
    </div>
  )
}

function Weather({ date, entry, patch }: SectionProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const w = entry.weather
  const info = w ? weatherInfo(w.code) : undefined
  const isToday = date === todayISO()

  const auto = async (silent = false) => {
    setLoading(true)
    try {
      const r = await fetchWeather()
      await patch((e) => void (e.weather = { ...r, manual: false }))
    } catch {
      if (!silent) toast.error("Couldn't get the weather. Check location permission.")
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch for today only when location is already granted — never prompt on load.
  useEffect(() => {
    if (!isToday || w || !navigator.permissions) return
    navigator.permissions
      .query({ name: "geolocation" })
      .then((p) => {
        if (p.state === "granted") auto(true)
      })
      .catch(() => {})
  }, [isToday, date])

  const presetFor = (code: number) => WEATHER_PRESETS.find((c) => weatherInfo(c).label === weatherInfo(code).label) ?? code

  return (
    <>
      <Row
        label="Weather"
        value={
          loading ? (
            <Loader2 className="inline size-4 animate-spin" />
          ) : w ? (
            <span className="text-foreground">
              {info!.icon} {w.temp}° <span className="text-muted-foreground">{info!.label}</span>
            </span>
          ) : (
            "Add"
          )
        }
        onClick={() => setOpen(true)}
        chevron
      />
      <EditSheet open={open} onOpenChange={setOpen} title="Weather">
        {isToday && (
          <Group>
            <ActionRow icon={loading ? Loader2 : LocateFixed} onClick={() => auto()}>
              Use Current Location
            </ActionRow>
          </Group>
        )}
        <Group footer="Fetched from Open-Meteo for today. Edit by hand any time.">
          <NumberRow
            label="Temperature"
            unit="°C"
            decimal
            value={w?.temp}
            onCommit={(v) => v !== undefined && patch((e) => void (e.weather = { code: e.weather?.code ?? 0, temp: v, manual: true }))}
            placeholder="—"
          />
          <SelectRow
            label="Conditions"
            value={w ? String(presetFor(w.code)) : undefined}
            options={WEATHER_PRESETS.map((c) => ({ value: String(c), label: `${weatherInfo(c).icon}  ${weatherInfo(c).label}` }))}
            onChange={(v) => patch((e) => void (e.weather = { temp: e.weather?.temp ?? 20, code: Number(v), manual: true }))}
            placeholder="Not Set"
          />
        </Group>
      </EditSheet>
    </>
  )
}

export function HeaderBlock(props: SectionProps) {
  return (
    <div className="grid gap-5">
      <p className="px-6 text-center font-serif text-[1.0625rem] leading-snug text-muted-foreground italic">“{quoteFor(props.date)}”</p>
      <div className="empty:hidden">
        <Occasions date={props.date} />
      </div>
      <Group header="How are you feeling?">
        <Mood {...props} />
        <Energy {...props} />
        <Weather {...props} />
      </Group>
    </div>
  )
}
