import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { format } from "date-fns"
import { ChevronLeft, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { db, entryHasContent, MEAL_SLOTS, MOODS, type Entry } from "@/lib/db"
import { ageFrom, fromISO, isISODate } from "@/lib/date"
import { openText } from "@/lib/crypto"
import { getProfile, getSettings, type Profile, type Settings } from "@/lib/profile"
import { cmLabel, kgTo, kmTo, waterLabel } from "@/lib/units"
import { weatherInfo } from "@/lib/weather"
import type { Stroke } from "@/components/drawing-canvas"

interface Data {
  profile: Profile
  settings: Settings
  entries: Entry[]
  urls: Map<string, string>
  handwriting: Map<string, string>
  ids: Record<string, string>
}

/** Rasterise handwriting strokes to a PNG for the printed page. */
function strokesToPng(strokes: Stroke[], W = 900) {
  const maxY = strokes.reduce((m, s) => Math.max(m, ...s.pts.filter((_, i) => i % 3 === 1)), 0)
  const c = document.createElement("canvas")
  c.width = W
  c.height = Math.max(100, Math.ceil(maxY * W) + 20)
  const ctx = c.getContext("2d")!
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  for (const s of strokes) {
    ctx.globalCompositeOperation = s.eraser ? "destination-out" : "source-over"
    ctx.strokeStyle = s.color
    ctx.lineWidth = s.size * W * (s.eraser ? 4 : 1)
    ctx.beginPath()
    for (let i = 0; i < s.pts.length; i += 3) ctx[i ? "lineTo" : "moveTo"](s.pts[i] * W, s.pts[i + 1] * W)
    ctx.stroke()
  }
  return c.toDataURL("image/png")
}

async function load(type: string, from: string, to: string): Promise<Data> {
  const [profile, settings] = await Promise.all([getProfile(), getSettings()])
  const entries =
    type === "profile" ? [] : (await db.entries.where("date").between(from, to, true, true).toArray()).filter(entryHasContent)
  const urls = new Map<string, string>()
  const handwriting = new Map<string, string>()
  const fileIds = [
    profile.photoId,
    ...entries.flatMap((e) => [
      ...e.photos.map((p) => p.fileId),
      ...(type === "medical" ? [...e.ecg.flatMap((x) => x.fileIds), ...e.checkups.flatMap((c) => c.fileIds)] : []),
    ]),
  ].filter(Boolean) as string[]
  for (const f of await db.files.bulkGet(fileIds)) if (f?.type.startsWith("image/")) urls.set(f.id, URL.createObjectURL(f.blob))
  if (type === "range")
    for (const e of entries)
      if (e.journal.drawingId) {
        const f = await db.files.get(e.journal.drawingId)
        const strokes = f ? (JSON.parse(await f.blob.text()) as Stroke[]) : []
        if (strokes.length) handwriting.set(e.date, strokesToPng(strokes))
      }
  const ids: Record<string, string> = {}
  if (type === "profile") for (const [k, v] of Object.entries(profile.ids)) ids[k] = await openText(v)
  return { profile, settings, entries, urls, handwriting, ids }
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mt-6 mb-2 border-b-2 border-black pb-1 font-heading text-2xl break-after-avoid">{children}</h2>
)
const KV = ({ k, v }: { k: string; v?: React.ReactNode }) =>
  v ? (
    <div className="flex gap-3 border-b border-neutral-200 py-1 text-sm">
      <span className="w-44 shrink-0 text-neutral-500">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  ) : null

function ProfileBlock({ d, full }: { d: Data; full: boolean }) {
  const p = d.profile
  const u = d.settings.units
  const age = ageFrom(p.dob)
  return (
    <section className="break-inside-avoid">
      <div className="flex items-center gap-4">
        {p.photoId && d.urls.get(p.photoId) && <img src={d.urls.get(p.photoId)} alt="" className="size-20 rounded-full object-cover" />}
        <div>
          <p className="font-heading text-3xl">{p.legalName}</p>
          {p.preferredName && <p className="text-neutral-500">“{p.preferredName}”</p>}
        </div>
      </div>
      <H>Medical</H>
      <KV k="Blood group" v={p.bloodGroup} />
      <KV k="Date of birth" v={p.dob && `${p.dob}${age !== undefined ? ` (${age} yrs)` : ""}`} />
      <KV k="Height" v={p.height && cmLabel(p.height, u.height)} />
      <KV k="Baseline weight" v={p.baselineWeight && `${kgTo(p.baselineWeight, u.weight)} ${u.weight}`} />
      <KV k="Allergies" v={p.allergies.length ? <span className="font-bold text-red-700">{p.allergies.join(", ")}</span> : undefined} />
      <KV k="Chronic conditions" v={p.conditions.join(", ")} />
      <KV k="Regular medications" v={p.medications.map((m) => `${m.name}${m.dose ? ` ${m.dose}` : ""}${m.times.length ? ` @ ${m.times.join(", ")}` : ""}`).join("; ")} />
      <KV k="Primary doctor" v={[p.primaryDoctor.name, p.primaryDoctor.clinic, p.primaryDoctor.phone].filter(Boolean).join(" · ")} />
      {p.specialists.map((s) => (
        <KV key={s.id} k={s.role || "Specialist"} v={[s.name, s.clinic, s.phone].filter(Boolean).join(" · ")} />
      ))}
      <KV k="Insurance" v={[p.insurance.provider, p.insurance.policy, p.insurance.helpline].filter(Boolean).join(" · ")} />
      <H>Emergency contacts</H>
      {(["primary", "secondary"] as const).map((k) => {
        const c = p.emergency[k]
        return <KV key={k} k={k === "primary" ? "Primary" : "Secondary"} v={[c.name, c.relationship, c.mobile, c.alternate].filter(Boolean).join(" · ")} />
      })}
      {full && (
        <>
          <H>Personal</H>
          <KV k="Phone" v={p.phone} />
          <KV k="Email" v={p.email} />
          <KV k="Address" v={p.address} />
          <KV k="Permanent address" v={p.permanentAddress} />
          <KV k="National ID" v={d.ids.national} />
          <KV k="Tax ID" v={d.ids.tax} />
          <KV k="Driving licence" v={d.ids.license} />
        </>
      )}
    </section>
  )
}

function DayBlock({ e, d, medicalOnly }: { e: Entry; d: Data; medicalOnly: boolean }) {
  const u = d.settings.units
  const mood = MOODS.find((m) => m.value === e.mood)
  const meds = d.profile.medications.flatMap((m) => m.times.map((t) => ({ m, t, taken: e.medsTaken[`${m.id}@${t}`] })))
  const medical = e.bp.length || e.ecg.length || e.weight || e.checkups.length || Object.keys(e.medsTaken).length || e.extraMeds.length
  if (medicalOnly && !medical) return null
  return (
    <article className="break-inside-avoid-page border-t border-neutral-300 pt-3 pb-4">
      <header className="mb-2 flex items-baseline gap-3">
        <h3 className="font-heading text-2xl">{format(fromISO(e.date), "EEEE, d MMMM yyyy")}</h3>
        <span className="text-sm text-neutral-500">
          {!medicalOnly && [mood && `${mood.emoji} ${mood.label}`, e.energy && `🔋 ${e.energy}%`, e.weather && `${weatherInfo(e.weather.code).icon} ${e.weather.temp}°`].filter(Boolean).join(" · ")}
        </span>
      </header>
      {e.bp.map((b) => (
        <KV key={b.id} k={`BP ${b.time}`} v={b.sys && `${b.sys}/${b.dia} mmHg · ${b.pulse ?? "–"} bpm`} />
      ))}
      <KV k="Weight" v={e.weight && `${kgTo(e.weight, u.weight)} ${u.weight}${e.bodyFat ? ` · ${e.bodyFat}% fat` : ""}`} />
      <KV k="Medicines" v={[...meds.map((x) => `${x.taken ? "✓" : "✗"} ${x.m.name} ${x.t}`), ...e.extraMeds.map((m) => `${m.taken ? "✓" : "✗"} ${m.name} ${m.dose ?? ""}`)].join(" · ") || undefined} />
      {e.ecg.map((x) => (
        <KV key={x.id} k={`ECG ${x.time}`} v={`${x.status}${x.note ? ` — ${x.note}` : ""}`} />
      ))}
      {e.checkups.map((c) => (
        <KV key={c.id} k={`${c.kind}${c.time ? ` ${c.time}` : ""}`} v={[c.title, c.note, c.followUp && `Follow-up ${c.followUp}`].filter(Boolean).join(" — ")} />
      ))}
      {medicalOnly && (
        <div className="mt-2 flex flex-wrap gap-2">
          {[...e.ecg.flatMap((x) => x.fileIds), ...e.checkups.flatMap((c) => c.fileIds)].map((id) =>
            d.urls.get(id) ? <img key={id} src={d.urls.get(id)} alt="" className="max-h-64 max-w-full border" /> : null,
          )}
        </div>
      )}
      {!medicalOnly && (
        <>
          <KV k="Steps" v={e.steps && `${e.steps.toLocaleString()}${e.distance ? ` · ${kmTo(e.distance, u.distance)} ${u.distance}` : ""}`} />
          <KV k="Workouts" v={e.workouts.map((w) => `${w.custom || w.type}${w.duration ? ` ${w.duration}min` : ""}${w.calories ? ` ${w.calories}kcal` : ""}`).join(" · ")} />
          <KV k="Water" v={e.water && waterLabel(e.water, u.water)} />
          {MEAL_SLOTS.map((s) => {
            const m = e.meals[s]
            return <KV key={s} k={s[0].toUpperCase() + s.slice(1)} v={m && [m.note, m.calories && `${m.calories} kcal`].filter(Boolean).join(" · ")} />
          })}
          <KV k="Tasks" v={e.tasks.map((t) => `${t.done ? "✓" : "○"} ${t.text}`).join(" · ")} />
          <KV k="Schedule" v={e.events.map((ev) => `${ev.time} ${ev.title}`).join(" · ")} />
          <KV k="Goals" v={e.goals.map((g) => `${g.done ? "✓" : "○"} ${g.text}`).join(" · ")} />
          <KV k="Win of the day" v={e.win} />
          {e.journal.text && <p className="mt-3 font-heading text-lg leading-relaxed whitespace-pre-wrap">{e.journal.text}</p>}
          {d.handwriting.get(e.date) && <img src={d.handwriting.get(e.date)} alt="Handwriting" className="mt-2 w-full" />}
          {e.photos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {e.photos.map((p) => (
                <figure key={p.id} className="break-inside-avoid">
                  {d.urls.get(p.fileId) && <img src={d.urls.get(p.fileId)} alt="" className="aspect-square w-full object-cover" />}
                  <figcaption className="text-xs text-neutral-600">
                    {[p.caption, p.location, p.tags.map((t) => `#${t}`).join(" ")].filter(Boolean).join(" · ")}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </>
      )}
    </article>
  )
}

export function Component() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const type = params.get("type") ?? "range"
  const from = params.get("from") ?? ""
  const to = params.get("to") ?? ""
  const [data, setData] = useState<Data>()

  useEffect(() => {
    if (type !== "profile" && (!isISODate(from) || !isISODate(to))) return
    let urls: Map<string, string> | undefined
    load(type, from, to).then((d) => {
      urls = d.urls
      setData(d)
    })
    return () => urls?.forEach((u) => URL.revokeObjectURL(u))
  }, [type, from, to])

  // Open the print sheet once images are decoded.
  useEffect(() => {
    if (!data) return
    Promise.all(Array.from(document.images).map((i) => i.decode().catch(() => {}))).then(() => setTimeout(() => window.print(), 300))
  }, [data])

  const title = type === "profile" ? "Profile" : type === "medical" ? "Medical summary" : "Journal"
  const range = type !== "profile" && from && to ? `${format(fromISO(from), "d MMM yyyy")} – ${format(fromISO(to), "d MMM yyyy")}` : ""

  return (
    <div className="h-dvh overflow-y-auto bg-white text-black print:h-auto print:overflow-visible">
      <div className="no-print sticky top-0 flex items-center gap-2 border-b bg-white p-2 pt-safe">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={() => navigate(-1)} className="text-black">
          <ChevronLeft />
        </Button>
        <span className="flex-1 font-medium">Preview</span>
        <Button onClick={() => window.print()} disabled={!data}>
          <Printer /> Save PDF
        </Button>
      </div>
      <div className="mx-auto max-w-3xl p-6 print:p-0">
        <header className="mb-4">
          <h1 className="font-heading text-4xl">{title}</h1>
          <p className="text-sm text-neutral-500">
            {data?.profile.legalName} {range && `· ${range}`} · exported {format(new Date(), "d MMM yyyy")}
          </p>
        </header>
        {!data ? (
          <p className="text-neutral-500">Preparing…</p>
        ) : (
          <>
            {type !== "range" && <ProfileBlock d={data} full={type === "profile"} />}
            {type !== "profile" && (
              <>
                {type === "medical" && <H>Daily log</H>}
                {data.entries.length === 0 && <p className="text-neutral-500">No entries in this range.</p>}
                {data.entries.map((e) => (
                  <DayBlock key={e.date} e={e} d={data} medicalOnly={type === "medical"} />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
