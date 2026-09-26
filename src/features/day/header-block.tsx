import { useEffect, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { toast } from "sonner"
import { Cake, Heart, Loader2, LocateFixed, Quote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { NumberField, Field } from "@/components/fields"
import { db, ENERGY_LEVELS, MOODS } from "@/lib/db"
import { monthDay, fromISO, todayISO } from "@/lib/date"
import { quoteFor } from "@/lib/quotes"
import { fetchWeather, weatherInfo, WEATHER_PRESETS } from "@/lib/weather"
import { cn } from "@/lib/utils"
import type { SectionProps } from "./types"

function Occasions({ date }: { date: string }) {
  const occ = useLiveQuery(() => db.occasions.where("md").equals(monthDay(date)).toArray(), [date])
  if (!occ?.length) return null
  const year = fromISO(date).getFullYear()
  return (
    <div className="grid gap-2">
      {occ.map((o) => (
        <div
          key={o.id}
          className="flex items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground"
        >
          {o.kind === "Birthday" ? <Cake className="size-6 shrink-0" /> : <Heart className="size-6 shrink-0" />}
          <div className="min-w-0 leading-tight">
            <p className="truncate font-semibold">{o.name}</p>
            <p className="text-sm opacity-80">
              {o.kind}
              {o.year && year > o.year ? ` · ${year - o.year} years` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function WeatherChip({ date, entry, patch }: SectionProps) {
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
      if (!silent) toast.error("Couldn't get weather. Check location permission.")
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch for today only if location was already granted — never prompt on page load.
  useEffect(() => {
    if (!isToday || w || !navigator.permissions) return
    navigator.permissions
      .query({ name: "geolocation" })
      .then((p) => {
        if (p.state === "granted") auto(true)
      })
      .catch(() => {})
  }, [isToday, date])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-full min-h-16 w-16 flex-col items-center justify-center rounded-2xl bg-muted/70 transition-transform active:scale-95"
        aria-label={w ? `Weather: ${info!.label}, ${w.temp}°` : "Add weather"}
      >
        {loading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : w ? (
          <>
            <span className="text-2xl leading-none">{info!.icon}</span>
            <span className="mt-1 text-sm font-medium tabular-nums">{w.temp}°</span>
          </>
        ) : (
          <>
            <span className="text-2xl leading-none opacity-40">🌤️</span>
            <span className="mt-1 text-[11px] text-muted-foreground">Weather</span>
          </>
        )}
      </button>
      <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-3xl">Weather</DrawerTitle>
          </DrawerHeader>
          <div className="grid gap-4 p-4">
            {isToday && (
              <Button variant="secondary" size="lg" onClick={() => auto()} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <LocateFixed />} Use my location
              </Button>
            )}
            <Field label="Temperature" hint="°C">
              <NumberField
                value={w?.temp}
                decimal
                onCommit={(v) =>
                  patch((e) => {
                    if (v === undefined) return
                    e.weather = { code: e.weather?.code ?? 0, temp: v, manual: true }
                  })
                }
              />
            </Field>
            <Field label="Conditions" group>
              <div className="grid grid-cols-4 gap-2">
                {WEATHER_PRESETS.map((code) => {
                  const i = weatherInfo(code)
                  return (
                    <button
                      type="button"
                      key={code}
                      onClick={() => patch((e) => void (e.weather = { temp: e.weather?.temp ?? 20, code, manual: true }))}
                      className={cn(
                        "flex h-18 flex-col items-center justify-center gap-1 rounded-xl border text-[11px]",
                        w && weatherInfo(w.code).label === i.label && "border-primary bg-primary/10",
                      )}
                    >
                      <span className="text-2xl">{i.icon}</span>
                      {i.label}
                    </button>
                  )
                })}
              </div>
            </Field>
            <Button size="lg" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}

export function HeaderBlock(props: SectionProps) {
  const { date, entry, patch } = props
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2 empty:hidden">
        <Occasions date={date} />
      </div>
      <figure className="relative flex items-center rounded-3xl bg-accent px-5 py-4 text-accent-foreground">
        <Quote className="absolute top-3 left-3 size-4 opacity-40" />
        <blockquote className="pl-4 font-serif text-lg leading-snug italic md:text-xl">{quoteFor(date)}</blockquote>
      </figure>

      <div className="grid grid-cols-[1fr_auto] gap-3 rounded-3xl border bg-card p-3">
        <div className="grid gap-3">
          <div role="radiogroup" aria-label="Mood" className="flex justify-between">
            {MOODS.map((m) => {
              const on = entry.mood === m.value
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={m.label}
                  onClick={() => {
                    navigator.vibrate?.(8)
                    patch((e) => void (e.mood = on ? undefined : m.value))
                  }}
                  className={cn(
                    "grid size-11 place-items-center rounded-full text-[1.6rem] transition-all",
                    on ? "scale-110 bg-primary/15 ring-2 ring-primary" : entry.mood ? "opacity-40 grayscale-50" : "",
                  )}
                >
                  {m.emoji}
                </button>
              )
            })}
          </div>
          <div role="radiogroup" aria-label="Energy" className="flex items-center gap-1.5">
            <span className="mr-1 text-lg" aria-hidden>
              🔋
            </span>
            {ENERGY_LEVELS.map((lvl) => {
              const filled = (entry.energy ?? 0) >= lvl
              return (
                <button
                  key={lvl}
                  type="button"
                  role="radio"
                  aria-checked={entry.energy === lvl}
                  aria-label={`Energy ${lvl}%`}
                  onClick={() => {
                    navigator.vibrate?.(8)
                    patch((e) => void (e.energy = e.energy === lvl ? undefined : lvl))
                  }}
                  className="flex h-11 flex-1 items-center"
                >
                  <span
                    className={cn(
                      "h-6 w-full rounded-md border transition-colors",
                      filled ? "border-primary bg-primary" : "border-transparent bg-muted",
                    )}
                  />
                </button>
              )
            })}
            <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
              {entry.energy ? `${entry.energy}%` : "—"}
            </span>
          </div>
        </div>
        <WeatherChip {...props} />
      </div>
    </div>
  )
}
