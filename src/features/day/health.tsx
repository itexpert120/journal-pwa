import { Link } from "react-router"
import { Activity, HeartPulse, Pill, Scale, Stethoscope } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Field, NumberField, TextAreaField, TextField } from "@/components/fields"
import { AddButton, Empty, Item, RemoveButton, Section } from "@/components/section"
import { Attachments } from "@/components/attachments"
import { CHECKUP_KINDS, ECG_STATUSES } from "@/lib/db"
import { formatTime12, nowHHMM } from "@/lib/date"
import { uid } from "@/lib/id"
import { useProfile, useSettings } from "@/lib/profile"
import { kgTo, toKg } from "@/lib/units"
import { cn } from "@/lib/utils"
import type { SectionProps } from "./types"

/**
 * ESC/ESH office BP categories; the higher of systolic/diastolic decides.
 * Optimal <120/<80 · Normal 120–129/80–84 · High-normal 130–139/85–89 · High ≥140/≥90.
 */
function bpClass(sys?: number, dia?: number) {
  if (!sys || !dia) return undefined
  const good = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
  if (sys >= 140 || dia >= 90) return { label: "High", cls: "bg-alert/15 text-alert" }
  if (sys >= 130 || dia >= 85) return { label: "High-normal", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" }
  if (sys < 90 || dia < 60) return { label: "Low", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300" }
  if (sys >= 120 || dia >= 80) return { label: "Normal", cls: good }
  return { label: "Optimal", cls: good }
}

export function TimeInput({ value, onChange, label = "Time" }: { value?: string; onChange: (v: string) => void; label?: string }) {
  return (
    <Input type="time" aria-label={label} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="w-auto" />
  )
}

function BloodPressure({ entry, patch }: SectionProps) {
  const upd = (id: string, fn: (r: SectionProps["entry"]["bp"][number]) => void) =>
    patch((e) => {
      const r = e.bp.find((x) => x.id === id)
      if (r) fn(r)
    })
  return (
    <Section title="Blood pressure" icon={HeartPulse}>
      {entry.bp.length === 0 && <Empty>No readings yet.</Empty>}
      {entry.bp.map((r) => {
        const c = bpClass(r.sys, r.dia)
        return (
          <Item key={r.id}>
            <div className="flex items-center gap-2">
              <TimeInput value={r.time} onChange={(v) => upd(r.id, (x) => void (x.time = v))} />
              {c && <Badge className={cn("border-0", c.cls)}>{c.label}</Badge>}
              <span className="flex-1" />
              <RemoveButton onClick={() => patch((e) => void (e.bp = e.bp.filter((x) => x.id !== r.id)))} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Sys" hint="mmHg">
                <NumberField value={r.sys} onCommit={(v) => upd(r.id, (x) => void (x.sys = v))} placeholder="120" />
              </Field>
              <Field label="Dia" hint="mmHg">
                <NumberField value={r.dia} onCommit={(v) => upd(r.id, (x) => void (x.dia = v))} placeholder="80" />
              </Field>
              <Field label="Pulse" hint="bpm">
                <NumberField value={r.pulse} onCommit={(v) => upd(r.id, (x) => void (x.pulse = v))} placeholder="72" />
              </Field>
            </div>
          </Item>
        )
      })}
      <AddButton onClick={() => patch((e) => void e.bp.push({ id: uid(), time: nowHHMM() }))}>Add reading</AddButton>
    </Section>
  )
}

function Ecg({ date, entry, patch }: SectionProps) {
  const upd = (id: string, fn: (r: SectionProps["entry"]["ecg"][number]) => void) =>
    patch((e) => {
      const r = e.ecg.find((x) => x.id === id)
      if (r) fn(r)
    })
  return (
    <Section title="ECG / heart logs" icon={Activity}>
      {entry.ecg.length === 0 && <Empty>Attach ECG printouts and tag the result.</Empty>}
      {entry.ecg.map((r) => (
        <Item key={r.id}>
          <div className="flex items-center gap-2">
            <TimeInput value={r.time} onChange={(v) => upd(r.id, (x) => void (x.time = v))} />
            <Select
              label="ECG status"
              value={r.status}
              options={ECG_STATUSES}
              onValueChange={(v) => upd(r.id, (x) => void (x.status = v))}
              className={cn("flex-1", r.status !== "Normal" && "text-alert")}
            />
            <RemoveButton onClick={() => patch((e) => void (e.ecg = e.ecg.filter((x) => x.id !== r.id)))} />
          </div>
          <TextField value={r.note} onCommit={(v) => upd(r.id, (x) => void (x.note = v))} placeholder="Note (optional)" />
          <Attachments date={date} ids={r.fileIds} onChange={(ids) => upd(r.id, (x) => void (x.fileIds = ids))} label="ECG" />
        </Item>
      ))}
      <AddButton
        onClick={() => patch((e) => void e.ecg.push({ id: uid(), time: nowHHMM(), status: "Normal", fileIds: [] }))}
      >
        Add ECG log
      </AddButton>
    </Section>
  )
}

function Weight({ entry, patch }: SectionProps) {
  const settings = useSettings()
  const unit = settings?.units.weight ?? "kg"
  return (
    <Section title="Weight & body" icon={Scale}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Weight" hint={unit}>
          <NumberField
            decimal
            value={entry.weight === undefined ? undefined : kgTo(entry.weight, unit)}
            onCommit={(v) => patch((e) => void (e.weight = v === undefined ? undefined : toKg(v, unit)))}
          />
        </Field>
        <Field label="Body fat" hint="% optional">
          <NumberField decimal value={entry.bodyFat} onCommit={(v) => patch((e) => void (e.bodyFat = v))} />
        </Field>
      </div>
    </Section>
  )
}

function Medicines({ entry, patch }: SectionProps) {
  const profile = useProfile()
  const scheduled = (profile?.medications ?? [])
    .flatMap((m) => (m.times.length ? m.times : [""]).map((t) => ({ m, t, key: `${m.id}@${t}` })))
    .sort((a, b) => a.t.localeCompare(b.t))

  return (
    <Section
      title="Medicines taken"
      icon={Pill}
      action={
        <Link to="/profile#medications" className="text-sm text-primary">
          Edit list
        </Link>
      }
    >
      {scheduled.length === 0 && entry.extraMeds.length === 0 && (
        <Empty>
          Add your regular medications in your <Link to="/profile#medications" className="text-primary underline">profile</Link>{" "}
          and they'll appear here every day.
        </Empty>
      )}
      <ul className="grid gap-1">
        {scheduled.map(({ m, t, key }) => {
          const taken = entry.medsTaken[key]
          return (
            <li key={key}>
              <label className="flex min-h-12 items-center gap-3 rounded-lg px-1 active:bg-muted">
                <Checkbox
                  checked={!!taken}
                  onCheckedChange={(c) =>
                    patch((e) => {
                      if (c) e.medsTaken[key] = nowHHMM()
                      else delete e.medsTaken[key]
                    })
                  }
                />
                <span className={cn("flex-1 font-medium", taken && "text-muted-foreground line-through")}>{m.name}</span>
                {m.dose && <Badge variant="secondary">{m.dose}</Badge>}
                <span className="w-16 text-right text-xs text-muted-foreground tabular-nums">
                  {taken ? `✓ ${formatTime12(taken)}` : t ? formatTime12(t) : "any time"}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      {entry.extraMeds.map((m) => (
        <Item key={m.id} className="grid-cols-[auto_1fr_auto] items-center gap-2">
          <Checkbox
            checked={m.taken}
            aria-label="Taken"
            onCheckedChange={(c) =>
              patch((e) => {
                const x = e.extraMeds.find((y) => y.id === m.id)
                if (x) x.taken = !!c
              })
            }
          />
          <div className="grid grid-cols-[1fr_5rem] gap-2">
            <TextField
              value={m.name}
              placeholder="Medicine"
              onCommit={(v) =>
                patch((e) => {
                  const x = e.extraMeds.find((y) => y.id === m.id)
                  if (x) x.name = v
                })
              }
            />
            <TextField
              value={m.dose}
              placeholder="Dose"
              onCommit={(v) =>
                patch((e) => {
                  const x = e.extraMeds.find((y) => y.id === m.id)
                  if (x) x.dose = v
                })
              }
            />
          </div>
          <RemoveButton onClick={() => patch((e) => void (e.extraMeds = e.extraMeds.filter((x) => x.id !== m.id)))} />
        </Item>
      ))}
      <AddButton
        onClick={() => patch((e) => void e.extraMeds.push({ id: uid(), name: "", time: nowHHMM(), taken: true }))}
      >
        One-off medicine
      </AddButton>
    </Section>
  )
}

function Checkups({ date, entry, patch }: SectionProps) {
  const upd = (id: string, fn: (r: SectionProps["entry"]["checkups"][number]) => void) =>
    patch((e) => {
      const r = e.checkups.find((x) => x.id === id)
      if (r) fn(r)
    })
  return (
    <Section title="Medical checkups" icon={Stethoscope}>
      {entry.checkups.length === 0 && <Empty>Appointments, clinic visits and test results.</Empty>}
      {entry.checkups.map((c) => (
        <Item key={c.id}>
          <div className="flex items-center gap-2">
            <Select
              label="Checkup type"
              value={c.kind}
              options={CHECKUP_KINDS}
              onValueChange={(v) => upd(c.id, (x) => void (x.kind = v))}
              className="flex-1"
            />
            <TimeInput value={c.time} onChange={(v) => upd(c.id, (x) => void (x.time = v))} />
            <RemoveButton onClick={() => patch((e) => void (e.checkups = e.checkups.filter((x) => x.id !== c.id)))} />
          </div>
          <TextField
            value={c.title}
            placeholder="Doctor / clinic / test name"
            onCommit={(v) => upd(c.id, (x) => void (x.title = v))}
          />
          <TextAreaField value={c.note} placeholder="Notes, results, advice…" onCommit={(v) => upd(c.id, (x) => void (x.note = v))} />
          <Field label="Follow-up date">
            <Input
              type="date"
              value={c.followUp ?? ""}
              onChange={(e) => upd(c.id, (x) => void (x.followUp = e.target.value || undefined))}
            />
          </Field>
          <Attachments date={date} ids={c.fileIds} onChange={(ids) => upd(c.id, (x) => void (x.fileIds = ids))} label="Report" />
        </Item>
      ))}
      <AddButton
        onClick={() =>
          patch((e) => void e.checkups.push({ id: uid(), kind: "Appointment", title: "", time: nowHHMM(), fileIds: [] }))
        }
      >
        Add checkup
      </AddButton>
    </Section>
  )
}

export function HealthSection(props: SectionProps) {
  return (
    <>
      <BloodPressure {...props} />
      <Medicines {...props} />
      <Weight {...props} />
      <Ecg {...props} />
      <Checkups {...props} />
    </>
  )
}
