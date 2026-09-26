import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import { Camera, Pill, Plus, Siren, Stethoscope, UserRound, X } from "lucide-react"
import { Page } from "@/components/app-shell"
import { ActionRow, DateTimeRow, EditSheet, Group, ListEditor, NumberRow, Row, SelectRow, TextRow } from "@/components/ios"
import { SecretRow } from "@/components/secret-field"
import { DrawingCanvas, type Stroke } from "@/components/drawing-canvas"
import { db, saveFile } from "@/lib/db"
import { ageFrom, formatTime12 } from "@/lib/date"
import { compressImage } from "@/lib/image"
import { uid } from "@/lib/id"
import {
  BLOOD_GROUPS,
  updateProfile,
  useProfile,
  useSettings,
  type Doctor,
  type EmergencyContact,
  type Medication,
  type Profile,
} from "@/lib/profile"
import { cmLabel, kgTo, toKg } from "@/lib/units"
import { useFileUrl } from "@/hooks/use-file-url"
import { useResolvedDark } from "@/lib/theme"

const upd = (fn: (p: Profile) => void) => updateProfile(fn)

function Avatar({ profile }: { profile: Profile }) {
  const url = useFileUrl(profile.photoId)
  const input = useRef<HTMLInputElement>(null)
  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      className="relative size-28 shrink-0 transition-transform active:scale-95"
      aria-label="Change profile photo"
    >
      <span className="grid size-full place-items-center overflow-hidden rounded-full bg-linear-to-b from-[#a1a1a6] to-[#86868b] text-white shadow-md">
        {url ? <img src={url} alt="" className="size-full object-cover" /> : <UserRound className="size-14" strokeWidth={1.6} />}
      </span>
      <span className="glass absolute right-0 bottom-0 grid size-9 place-items-center rounded-full text-primary">
        <Camera className="size-[18px]" />
      </span>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ""
          if (!f) return
          const old = profile.photoId
          const id = await saveFile(await compressImage(f, 600))
          await upd((p) => void (p.photoId = id))
          if (old) db.files.delete(old)
        }}
      />
    </button>
  )
}

/** Signature drawn with finger/stylus, stored as vector strokes. */
function SignatureRow({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [saved, setSaved] = useState<Stroke[]>([])
  const ink = useResolvedDark() ? "#f5f5f7" : "#0b0b0c"

  useEffect(() => {
    if (!profile.signatureId) return setSaved([])
    db.files.get(profile.signatureId).then(async (f) => f && setSaved(JSON.parse(await f.blob.text())))
  }, [profile.signatureId])

  const persist = async (next: Stroke[]) => {
    const id = profile.signatureId ?? uid()
    await db.files.put({ id, blob: new Blob([JSON.stringify(next)], { type: "application/json" }), type: "application/json", createdAt: Date.now() })
    await upd((p) => void (p.signatureId = id))
    setSaved(next)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setStrokes(saved)
          setOpen(true)
        }}
        className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-[17px] active:bg-muted"
      >
        <span className="flex-1">Signature</span>
        {saved.length ? (
          <span className="h-10 w-32">
            <DrawingCanvas
              strokes={saved.map((s) => ({ ...s, color: ink }))}
              onStroke={() => {}}
              active={false}
              tool={{ color: ink, size: 0.012, eraser: false }}
              className="size-full"
            />
          </span>
        ) : (
          <span className="text-muted-foreground">Add</span>
        )}
      </button>
      <EditSheet
        open={open}
        onOpenChange={(o) => {
          if (!o) persist(strokes)
          setOpen(o)
        }}
        title="Signature"
      >
        <div className="relative h-52 overflow-hidden rounded-[1.1rem] bg-card">
          <span className="pointer-events-none absolute inset-x-6 bottom-12 border-b border-dashed border-muted-foreground/40" />
          <X className="pointer-events-none absolute bottom-10 left-5 size-4 text-muted-foreground/60" />
          <DrawingCanvas
            strokes={strokes.map((s) => ({ ...s, color: ink }))}
            onStroke={(s) => setStrokes((x) => [...x, s])}
            active
            tool={{ color: ink, size: 0.008, eraser: false }}
            className="absolute inset-0 size-full"
          />
        </div>
        <Group>
          <ActionRow destructive onClick={() => setStrokes([])}>
            Clear Signature
          </ActionRow>
        </Group>
      </EditSheet>
    </>
  )
}

function MedicationSheet({ med, onClose }: { med?: Medication; onClose: () => void }) {
  const set = (fn: (m: Medication) => void) =>
    upd((p) => {
      const m = p.medications.find((x) => x.id === med?.id)
      if (m) fn(m)
    })
  return (
    <EditSheet
      open={!!med}
      onOpenChange={(o) => !o && onClose()}
      title={med?.name || "Medication"}
      onDelete={() => upd((p) => void (p.medications = p.medications.filter((x) => x.id !== med?.id)))}
      deleteLabel="Delete Medication"
    >
      {med && (
        <>
          <Group>
            <TextRow label="Name" value={med.name} onCommit={(v) => set((m) => void (m.name = v))} placeholder="Medicine" autoFocus={!med.name} />
            <TextRow label="Dosage" value={med.dose} onCommit={(v) => set((m) => void (m.dose = v))} placeholder="e.g. 5 mg" />
          </Group>
          <Group header="Schedule" footer="Each time appears as a checklist item with a reminder.">
            {med.times.map((t, i) => (
              <div key={i} className="flex items-center">
                <div className="flex-1">
                  <DateTimeRow label={`Dose ${i + 1}`} type="time" value={t} onChange={(v) => set((m) => void (m.times[i] = v))} />
                </div>
                <button
                  type="button"
                  aria-label="Remove time"
                  className="grid size-11 place-items-center text-muted-foreground"
                  onClick={() => set((m) => void m.times.splice(i, 1))}
                >
                  <X className="size-5" />
                </button>
              </div>
            ))}
            <ActionRow icon={Plus} onClick={() => set((m) => void m.times.push("08:00"))}>
              Add Time
            </ActionRow>
          </Group>
        </>
      )}
    </EditSheet>
  )
}

function DoctorSheet({ doc, onClose }: { doc?: Doctor; onClose: () => void }) {
  const set = (fn: (d: Doctor) => void) =>
    upd((p) => {
      const d = p.specialists.find((x) => x.id === doc?.id)
      if (d) fn(d)
    })
  return (
    <EditSheet
      open={!!doc}
      onOpenChange={(o) => !o && onClose()}
      title={doc?.role || "Specialist"}
      onDelete={() => upd((p) => void (p.specialists = p.specialists.filter((x) => x.id !== doc?.id)))}
      deleteLabel="Delete Specialist"
    >
      {doc && (
        <Group>
          <TextRow label="Speciality" value={doc.role} onCommit={(v) => set((d) => void (d.role = v))} placeholder="Cardiologist" autoFocus={!doc.role} />
          <TextRow label="Name" value={doc.name} onCommit={(v) => set((d) => void (d.name = v))} placeholder="Dr." />
          <TextRow label="Phone" type="tel" inputMode="tel" value={doc.phone} onCommit={(v) => set((d) => void (d.phone = v))} placeholder="Number" />
          <TextRow label="Clinic" value={doc.clinic} onCommit={(v) => set((d) => void (d.clinic = v))} placeholder="Location" />
        </Group>
      )}
    </EditSheet>
  )
}

function ContactGroup({
  title,
  c,
  which,
  alternate,
}: {
  title: string
  c: EmergencyContact
  which: "primary" | "secondary"
  alternate?: boolean
}) {
  const set = (fn: (x: EmergencyContact) => void) => upd((p) => fn(p.emergency[which]))
  return (
    <Group header={title}>
      <TextRow label="Name" value={c.name} onCommit={(v) => set((x) => void (x.name = v))} placeholder="Full name" />
      <TextRow label="Relationship" value={c.relationship} onCommit={(v) => set((x) => void (x.relationship = v))} placeholder="Spouse, Son…" />
      <TextRow label="Mobile" type="tel" inputMode="tel" value={c.mobile} onCommit={(v) => set((x) => void (x.mobile = v))} placeholder="Number" />
      {alternate && (
        <TextRow label="Alternate" type="tel" inputMode="tel" value={c.alternate} onCommit={(v) => set((x) => void (x.alternate = v))} placeholder="Number" />
      )}
    </Group>
  )
}

export function Component() {
  const profile = useProfile()
  const settings = useSettings()
  const [medId, setMedId] = useState<string>()
  const [docId, setDocId] = useState<string>()

  useEffect(() => {
    if (!profile || !location.hash) return
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: "start" })
  }, [!!profile])

  if (!profile || !settings) return <Page title="Profile">{null}</Page>
  const wUnit = settings.units.weight
  const age = ageFrom(profile.dob)

  return (
    <Page
      title="Profile"
      wide
      actions={
        <Link
          to="/emergency"
          viewTransition
          className="flex h-9 items-center gap-1.5 rounded-full bg-alert px-3.5 text-[15px] font-semibold text-white active:opacity-80"
        >
          <Siren className="size-4" /> SOS
        </Link>
      }
    >
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2 md:items-start">
        {/* Identity header, like the Apple Account page */}
        <div className="grid justify-items-center gap-3 pt-2 text-center md:col-span-2">
          <Avatar profile={profile} />
          <div>
            <p className="text-2xl font-bold tracking-tight">{profile.preferredName || profile.legalName || "Your Name"}</p>
            {profile.legalName && profile.preferredName && <p className="text-[15px] text-muted-foreground">{profile.legalName}</p>}
            {(profile.bloodGroup || age !== undefined) && (
              <p className="mt-1 text-[15px] text-muted-foreground">
                {[age !== undefined && `${age} years`, profile.bloodGroup && `Blood ${profile.bloodGroup}`].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-8">
          <Group header="Personal">
            <TextRow label="Legal Name" value={profile.legalName} onCommit={(v) => upd((p) => void (p.legalName = v))} placeholder="Full name" autoComplete="name" />
            <TextRow label="Preferred" value={profile.preferredName} onCommit={(v) => upd((p) => void (p.preferredName = v))} placeholder="Nickname" autoComplete="nickname" />
            <SignatureRow profile={profile} />
          </Group>

          <Group header="Contact">
            <TextRow label="Phone" type="tel" inputMode="tel" autoComplete="tel" value={profile.phone} onCommit={(v) => upd((p) => void (p.phone = v))} placeholder="Number" />
            <TextRow label="Email" type="email" inputMode="email" autoCapitalize="none" autoComplete="email" value={profile.email} onCommit={(v) => upd((p) => void (p.email = v))} placeholder="Email" />
            <TextRow label="Address" autoComplete="street-address" value={profile.address} onCommit={(v) => upd((p) => void (p.address = v))} placeholder="Residential" />
            <TextRow label="Permanent" value={profile.permanentAddress} onCommit={(v) => upd((p) => void (p.permanentAddress = v))} placeholder="Address" />
          </Group>

          <Group header="Identity Documents" footer="Encrypted on this device. Revealing asks for Face ID when App Lock is on.">
            <SecretRow label="National ID" sealed={profile.ids.national} onSave={(s) => upd((p) => void (p.ids.national = s))} />
            <SecretRow label="Tax Number" sealed={profile.ids.tax} onSave={(s) => upd((p) => void (p.ids.tax = s))} />
            <SecretRow label="Driving Licence" sealed={profile.ids.license} onSave={(s) => upd((p) => void (p.ids.license = s))} />
          </Group>

          <ContactGroup title="Emergency Contact" c={profile.emergency.primary} which="primary" alternate />
          <ContactGroup title="Secondary Contact" c={profile.emergency.secondary} which="secondary" />
        </div>

        <div className="grid gap-8">
          <Group header="Medical">
            <SelectRow label="Blood Type" value={profile.bloodGroup} options={BLOOD_GROUPS} onChange={(v) => upd((p) => void (p.bloodGroup = v))} placeholder="Not Set" />
            <DateTimeRow label="Date of Birth" type="date" value={profile.dob} onChange={(v) => upd((p) => void (p.dob = v || undefined))} />
            <NumberRow
              label="Height"
              unit={profile.height ? `cm · ${cmLabel(profile.height, "ft")}` : "cm"}
              value={profile.height}
              onCommit={(v) => upd((p) => void (p.height = v))}
              placeholder="0"
            />
            <NumberRow
              label="Weight"
              unit={wUnit}
              decimal
              value={profile.baselineWeight === undefined ? undefined : kgTo(profile.baselineWeight, wUnit)}
              onCommit={(v) => upd((p) => void (p.baselineWeight = v === undefined ? undefined : toKg(v, wUnit)))}
              placeholder="0"
            />
          </Group>

          <Group header="Allergies" footer="Shown in red on your emergency card.">
            <ListEditor tone="alert" items={profile.allergies} onChange={(a) => upd((p) => void (p.allergies = a))} placeholder="Add allergy" />
          </Group>

          <Group header="Conditions">
            <ListEditor items={profile.conditions} onChange={(a) => upd((p) => void (p.conditions = a))} placeholder="Add condition" />
          </Group>

          <div id="medications" className="scroll-mt-20">
            <Group header="Medications" footer="Regular medications appear on every day's checklist.">
              {profile.medications.map((m) => (
                <Row
                  key={m.id}
                  icon={Pill}
                  color="orange"
                  label={m.name || "Untitled"}
                  detail={[m.dose, m.times.map(formatTime12).join(", ")].filter(Boolean).join(" · ")}
                  onClick={() => setMedId(m.id)}
                  chevron
                />
              ))}
              <ActionRow
                icon={Plus}
                onClick={() => {
                  const id = uid()
                  upd((p) => void p.medications.push({ id, name: "", times: ["08:00"] })).then(() => setMedId(id))
                }}
              >
                Add Medication
              </ActionRow>
            </Group>
          </div>

          <Group header="Primary Doctor">
            <TextRow label="Name" value={profile.primaryDoctor.name} onCommit={(v) => upd((p) => void (p.primaryDoctor.name = v))} placeholder="Dr." />
            <TextRow label="Clinic" value={profile.primaryDoctor.clinic} onCommit={(v) => upd((p) => void (p.primaryDoctor.clinic = v))} placeholder="Hospital" />
            <TextRow label="Phone" type="tel" inputMode="tel" value={profile.primaryDoctor.phone} onCommit={(v) => upd((p) => void (p.primaryDoctor.phone = v))} placeholder="Number" />
          </Group>

          <Group header="Specialists">
            {profile.specialists.map((d) => (
              <Row
                key={d.id}
                icon={Stethoscope}
                color="teal"
                label={d.name || d.role || "Specialist"}
                detail={[d.role, d.clinic].filter(Boolean).join(" · ")}
                onClick={() => setDocId(d.id)}
                chevron
              />
            ))}
            <ActionRow
              icon={Plus}
              onClick={() => {
                const id = uid()
                upd((p) => void p.specialists.push({ id, role: "", name: "" })).then(() => setDocId(id))
              }}
            >
              Add Specialist
            </ActionRow>
          </Group>

          <Group header="Health Insurance">
            <TextRow label="Provider" value={profile.insurance.provider} onCommit={(v) => upd((p) => void (p.insurance.provider = v))} placeholder="Company" />
            <TextRow label="Policy No." value={profile.insurance.policy} onCommit={(v) => upd((p) => void (p.insurance.policy = v))} placeholder="Card number" />
            <TextRow label="Helpline" type="tel" inputMode="tel" value={profile.insurance.helpline} onCommit={(v) => upd((p) => void (p.insurance.helpline = v))} placeholder="Number" />
          </Group>
        </div>
      </div>

      <MedicationSheet med={profile.medications.find((m) => m.id === medId)} onClose={() => setMedId(undefined)} />
      <DoctorSheet doc={profile.specialists.find((d) => d.id === docId)} onClose={() => setDocId(undefined)} />
    </Page>
  )
}
