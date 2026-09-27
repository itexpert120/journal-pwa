import { useState } from "react"
import { Link } from "react-router"
import { Plus } from "lucide-react"
import {
  ActionRow,
  CheckRow,
  DateTimeRow,
  EditSheet,
  Group,
  NoteRow,
  NumberRow,
  Row,
  SelectRow,
  TextRow,
} from "@/components/ios"
import { Attachments } from "@/components/attachments"
import { CHECKUP_KINDS, ECG_STATUSES, type BPReading, type Checkup, type EcgLog, type ExtraMed } from "@/lib/db"
import { formatTime12, fromISO, nowHHMM } from "@/lib/date"
import { uid } from "@/lib/id"
import { useProfile, useSettings } from "@/lib/profile"
import { kgTo, toKg } from "@/lib/units"
import { setNav } from "@/lib/nav"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import type { SectionProps } from "./types"

/**
 * ESC/ESH office BP categories; the higher of systolic/diastolic decides.
 * Optimal <120/<80 · Normal 120–129/80–84 · High-normal 130–139/85–89 · High ≥140/≥90.
 */
function bpClass(sys?: number, dia?: number) {
  if (!sys || !dia) return undefined
  if (sys >= 140 || dia >= 90) return { label: "High", cls: "text-alert" }
  if (sys >= 130 || dia >= 85) return { label: "High-normal", cls: "text-[#ff9500]" }
  if (sys < 90 || dia < 60) return { label: "Low", cls: "text-[#30b0c7]" }
  if (sys >= 120 || dia >= 80) return { label: "Normal", cls: "text-success" }
  return { label: "Optimal", cls: "text-success" }
}

/** Opens a sheet for one list item by id; closing clears it. */
function useEditing() {
  const [id, setId] = useState<string>()
  return { id, open: setId, close: () => setId(undefined) }
}

function BloodPressure({ entry, patch }: SectionProps) {
  const ed = useEditing()
  const r = entry.bp.find((x) => x.id === ed.id)
  const upd = (fn: (x: BPReading) => void) =>
    patch((e) => {
      const x = e.bp.find((y) => y.id === ed.id)
      if (x) fn(x)
    })
  return (
    <Group header="Blood Pressure">
      {entry.bp.map((b) => {
        const c = bpClass(b.sys, b.dia)
        return (
          <Row
            key={b.id}
            label={
              <span className="tabular-nums">
                <span className="text-[22px] font-semibold">{b.sys && b.dia ? `${b.sys}/${b.dia}` : "—"}</span>
                <span className="ml-1 text-[15px] text-muted-foreground">mmHg</span>
              </span>
            }
            detail={[formatTime12(b.time), b.pulse && `${b.pulse} bpm`].filter(Boolean).join(" · ")}
            onClick={() => ed.open(b.id)}
            chevron
          >
            {c && <span className={cn("text-[15px] font-semibold", c.cls)}>{c.label}</span>}
          </Row>
        )
      })}
      <ActionRow
        icon={Plus}
        onClick={() => {
          const id = uid()
          patch((e) => void e.bp.push({ id, time: nowHHMM() })).then(() => ed.open(id))
        }}
      >
        Add Reading
      </ActionRow>
      <EditSheet
        open={!!r}
        onOpenChange={(o) => !o && ed.close()}
        title="Blood Pressure"
        onDelete={() => patch((e) => void (e.bp = e.bp.filter((x) => x.id !== ed.id)))}
        deleteLabel="Delete Reading"
      >
        {r && (
          <>
            <Group>
              <DateTimeRow label="Time" type="time" value={r.time} onChange={(v) => upd((x) => void (x.time = v))} />
            </Group>
            <Group footer={bpClass(r.sys, r.dia) && `Category: ${bpClass(r.sys, r.dia)!.label} (ESC/ESH). For information only — not medical advice.`}>
              <NumberRow label="Systolic" unit="mmHg" value={r.sys} onCommit={(v) => upd((x) => void (x.sys = v))} placeholder="120" autoFocus={!r.sys} />
              <NumberRow label="Diastolic" unit="mmHg" value={r.dia} onCommit={(v) => upd((x) => void (x.dia = v))} placeholder="80" />
              <NumberRow label="Pulse" unit="bpm" value={r.pulse} onCommit={(v) => upd((x) => void (x.pulse = v))} placeholder="72" />
            </Group>
          </>
        )}
      </EditSheet>
    </Group>
  )
}

function Medicines({ entry, patch }: SectionProps) {
  const profile = useProfile()
  const ed = useEditing()
  const m = entry.extraMeds.find((x) => x.id === ed.id)
  const upd = (fn: (x: ExtraMed) => void) =>
    patch((e) => {
      const x = e.extraMeds.find((y) => y.id === ed.id)
      if (x) fn(x)
    })
  const scheduled = (profile?.medications ?? [])
    .flatMap((med) => (med.times.length ? med.times : [""]).map((t) => ({ med, t, key: `${med.id}@${t}` })))
    .sort((a, b) => a.t.localeCompare(b.t))
  const taken = scheduled.filter((s) => entry.medsTaken[s.key]).length

  return (
    <Group
      header="Medications"
      action={
        <Link to="/profile#medications" viewTransition onClick={() => setNav("push")}>
          Edit
        </Link>
      }
      footer={
        scheduled.length === 0 && entry.extraMeds.length === 0
          ? "Add regular medications in your Profile and they'll appear here every day."
          : scheduled.length > 0
            ? `${taken} of ${scheduled.length} scheduled doses taken.`
            : undefined
      }
    >
      {scheduled.map(({ med, t, key }) => {
        const at = entry.medsTaken[key]
        return (
          <CheckRow
            key={key}
            checked={!!at}
            onChange={(c) =>
              patch((e) => {
                if (c) e.medsTaken[key] = nowHHMM()
                else delete e.medsTaken[key]
              })
            }
            label={med.name}
            detail={[med.dose, t ? formatTime12(t) : "Any time"].filter(Boolean).join(" · ")}
            trailing={at && <span className="text-[15px] text-muted-foreground tabular-nums">{formatTime12(at)}</span>}
          />
        )
      })}
      {entry.extraMeds.map((x) => (
        <CheckRow
          key={x.id}
          checked={x.taken}
          onChange={(c) =>
            patch((e) => {
              const y = e.extraMeds.find((z) => z.id === x.id)
              if (y) y.taken = c
            })
          }
          label={x.name || "Medicine"}
          detail={[x.dose, formatTime12(x.time)].filter(Boolean).join(" · ")}
          trailing={
            <button type="button" onClick={(ev) => (ev.preventDefault(), ed.open(x.id))} className="text-[15px] text-primary">
              Edit
            </button>
          }
        />
      ))}
      <ActionRow
        icon={Plus}
        onClick={() => {
          const id = uid()
          patch((e) => void e.extraMeds.push({ id, name: "", time: nowHHMM(), taken: true })).then(() => ed.open(id))
        }}
      >
        Log Other Medicine
      </ActionRow>
      <EditSheet
        open={!!m}
        onOpenChange={(o) => !o && ed.close()}
        title="Medicine"
        onDelete={() => patch((e) => void (e.extraMeds = e.extraMeds.filter((x) => x.id !== ed.id)))}
      >
        {m && (
          <Group>
            <TextRow label="Name" value={m.name} onCommit={(v) => upd((x) => void (x.name = v))} placeholder="Medicine" autoFocus={!m.name} />
            <TextRow label="Dose" value={m.dose} onCommit={(v) => upd((x) => void (x.dose = v))} placeholder="e.g. 500 mg" />
            <DateTimeRow label="Time" type="time" value={m.time} onChange={(v) => upd((x) => void (x.time = v))} />
          </Group>
        )}
      </EditSheet>
    </Group>
  )
}

function Body({ entry, patch }: SectionProps) {
  const settings = useSettings()
  const unit = settings?.units.weight ?? "kg"
  return (
    <Group header="Body">
      <NumberRow
        label="Weight"
        unit={unit}
        decimal
        value={entry.weight === undefined ? undefined : kgTo(entry.weight, unit)}
        onCommit={(v) => patch((e) => void (e.weight = v === undefined ? undefined : toKg(v, unit)))}
        placeholder="—"
      />
      <NumberRow label="Body Fat" unit="%" decimal value={entry.bodyFat} onCommit={(v) => patch((e) => void (e.bodyFat = v))} placeholder="Optional" />
    </Group>
  )
}

function Ecg({ date, entry, patch }: SectionProps) {
  const ed = useEditing()
  const r = entry.ecg.find((x) => x.id === ed.id)
  const upd = (fn: (x: EcgLog) => void) =>
    patch((e) => {
      const x = e.ecg.find((y) => y.id === ed.id)
      if (x) fn(x)
    })
  return (
    <Group header="Heart / ECG">
      {entry.ecg.map((x) => (
        <Row
          key={x.id}
          label={<span className={cn(x.status !== "Normal" && "text-alert")}>{x.status}</span>}
          detail={[formatTime12(x.time), x.fileIds.length && `${x.fileIds.length} attachment${x.fileIds.length > 1 ? "s" : ""}`, x.note].filter(Boolean).join(" · ")}
          onClick={() => ed.open(x.id)}
          chevron
        />
      ))}
      <ActionRow
        icon={Plus}
        onClick={() => {
          const id = uid()
          patch((e) => void e.ecg.push({ id, time: nowHHMM(), status: "Normal", fileIds: [] })).then(() => ed.open(id))
        }}
      >
        Add ECG
      </ActionRow>
      <EditSheet
        open={!!r}
        onOpenChange={(o) => !o && ed.close()}
        title="ECG"
        onDelete={() => patch((e) => void (e.ecg = e.ecg.filter((x) => x.id !== ed.id)))}
        deleteLabel="Delete ECG"
      >
        {r && (
          <>
            <Group>
              <SelectRow label="Result" value={r.status} options={ECG_STATUSES} onChange={(v) => upd((x) => void (x.status = v))} />
              <DateTimeRow label="Time" type="time" value={r.time} onChange={(v) => upd((x) => void (x.time = v))} />
            </Group>
            <Group header="Printout">
              <div className="px-4 pb-3">
                <Attachments date={date} ids={r.fileIds} onChange={(ids) => upd((x) => void (x.fileIds = ids))} label="Add" />
              </div>
            </Group>
            <Group header="Notes">
              <NoteRow value={r.note} onCommit={(v) => upd((x) => void (x.note = v))} placeholder="Symptoms, context…" />
            </Group>
          </>
        )}
      </EditSheet>
    </Group>
  )
}

function Checkups({ date, entry, patch }: SectionProps) {
  const ed = useEditing()
  const c = entry.checkups.find((x) => x.id === ed.id)
  const upd = (fn: (x: Checkup) => void) =>
    patch((e) => {
      const x = e.checkups.find((y) => y.id === ed.id)
      if (x) fn(x)
    })
  return (
    <Group header="Checkups & Tests">
      {entry.checkups.map((x) => (
        <Row
          key={x.id}
          label={x.title || x.kind}
          detail={[x.kind, x.time && formatTime12(x.time), x.followUp && `Follow-up ${format(fromISO(x.followUp), "d MMM")}`].filter(Boolean).join(" · ")}
          onClick={() => ed.open(x.id)}
          chevron
        />
      ))}
      <ActionRow
        icon={Plus}
        onClick={() => {
          const id = uid()
          patch((e) => void e.checkups.push({ id, kind: "Appointment", title: "", time: nowHHMM(), fileIds: [] })).then(() => ed.open(id))
        }}
      >
        Add Checkup
      </ActionRow>
      <EditSheet
        open={!!c}
        onOpenChange={(o) => !o && ed.close()}
        title={c?.kind ?? "Checkup"}
        onDelete={() => patch((e) => void (e.checkups = e.checkups.filter((x) => x.id !== ed.id)))}
        deleteLabel="Delete Checkup"
      >
        {c && (
          <>
            <Group>
              <SelectRow label="Type" value={c.kind} options={CHECKUP_KINDS} onChange={(v) => upd((x) => void (x.kind = v))} />
              <TextRow label="With" value={c.title} onCommit={(v) => upd((x) => void (x.title = v))} placeholder="Doctor, clinic or test" autoFocus={!c.title} />
              <DateTimeRow label="Time" type="time" value={c.time} onChange={(v) => upd((x) => void (x.time = v))} />
              <DateTimeRow label="Follow-up" type="date" value={c.followUp} onChange={(v) => upd((x) => void (x.followUp = v || undefined))} clearable />
            </Group>
            <Group header="Notes">
              <NoteRow value={c.note} onCommit={(v) => upd((x) => void (x.note = v))} placeholder="Results, advice…" />
            </Group>
            <Group header="Reports">
              <div className="px-4 pb-3">
                <Attachments date={date} ids={c.fileIds} onChange={(ids) => upd((x) => void (x.fileIds = ids))} label="Add" />
              </div>
            </Group>
          </>
        )}
      </EditSheet>
    </Group>
  )
}

export function HealthSection(props: SectionProps) {
  return (
    <>
      <BloodPressure {...props} />
      <Medicines {...props} />
      <Body {...props} />
      <Ecg {...props} />
      <Checkups {...props} />
    </>
  )
}
