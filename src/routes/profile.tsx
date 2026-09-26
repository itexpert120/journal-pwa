import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import {
  Camera,
  Contact,
  HeartPulse,
  IdCard,
  Pill,
  Plus,
  ShieldPlus,
  Siren,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Page } from "@/components/app-shell"
import { Field, NumberField, TextAreaField, TextField } from "@/components/fields"
import { AddButton, Item, RemoveButton, Section } from "@/components/section"
import { ChipList } from "@/components/chip-list"
import { SecretField } from "@/components/secret-field"
import { DrawingCanvas, type Stroke } from "@/components/drawing-canvas"
import { db, saveFile } from "@/lib/db"
import { ageFrom } from "@/lib/date"
import { compressImage } from "@/lib/image"
import { uid } from "@/lib/id"
import { BLOOD_GROUPS, updateProfile, useProfile, useSettings, type EmergencyContact, type Profile } from "@/lib/profile"
import { cmLabel, kgTo, toKg } from "@/lib/units"
import { useFileUrl } from "@/hooks/use-file-url"
import { useResolvedDark } from "@/lib/theme"

type Upd = (fn: (p: Profile) => void) => Promise<void>

function PhotoPicker({ profile, upd }: { profile: Profile; upd: Upd }) {
  const url = useFileUrl(profile.photoId)
  const input = useRef<HTMLInputElement>(null)
  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      className="relative size-24 shrink-0 transition-transform active:scale-95 md:size-28"
      aria-label="Change profile photo"
    >
      {/* Clip only the photo; the camera badge overlaps the ring. */}
      <span className="grid size-full place-items-center overflow-hidden rounded-full bg-muted ring-2 ring-primary/30">
        {url ? <img src={url} alt="Profile" className="size-full object-cover" /> : <UserRound className="size-10 text-muted-foreground" />}
      </span>
      <span className="absolute -right-0.5 -bottom-0.5 grid size-9 place-items-center rounded-full border-3 border-card bg-primary text-primary-foreground shadow-sm">
        <Camera className="size-4" />
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

/** Signature is drawn with a finger/stylus and stored as vector strokes, like handwriting. */
function Signature({ profile, upd }: { profile: Profile; upd: Upd }) {
  const [open, setOpen] = useState(false)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [saved, setSaved] = useState<Stroke[]>([])

  useEffect(() => {
    if (!profile.signatureId) return setSaved([])
    db.files.get(profile.signatureId).then(async (f) => f && setSaved(JSON.parse(await f.blob.text())))
  }, [profile.signatureId])

  const ink = useResolvedDark() ? "#f3f4f6" : "#111827"
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setStrokes(saved)
          setOpen(true)
        }}
        className="relative h-20 w-full overflow-hidden rounded-lg border border-dashed text-foreground"
        aria-label="Edit signature"
      >
        {saved.length ? (
          <DrawingCanvas strokes={saved.map((s) => ({ ...s, color: ink }))} onStroke={() => {}} active={false} tool={{ color: ink, size: 0.008, eraser: false }} className="size-full" />
        ) : (
          <span className="text-sm text-muted-foreground">Tap to sign</span>
        )}
      </button>
      <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-3xl">Signature</DrawerTitle>
          </DrawerHeader>
          <div className="grid gap-3 p-4">
            <div className="h-48 rounded-xl border bg-paper">
              <DrawingCanvas
                strokes={strokes.map((s) => ({ ...s, color: ink }))}
                onStroke={(s) => setStrokes((x) => [...x, s])}
                active
                tool={{ color: ink, size: 0.008, eraser: false }}
                className="size-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="lg" onClick={() => setStrokes([])}>
                Clear
              </Button>
              <Button
                size="lg"
                onClick={async () => {
                  const id = profile.signatureId ?? uid()
                  await db.files.put({
                    id,
                    blob: new Blob([JSON.stringify(strokes)], { type: "application/json" }),
                    type: "application/json",
                    createdAt: Date.now(),
                  })
                  await upd((p) => void (p.signatureId = id))
                  setSaved(strokes)
                  setOpen(false)
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}

function ContactFields({
  c,
  onChange,
  alternate,
}: {
  c: EmergencyContact
  onChange: (fn: (c: EmergencyContact) => void) => void
  alternate?: boolean
}) {
  return (
    <>
      <Field label="Name">
        <TextField value={c.name} onCommit={(v) => onChange((x) => void (x.name = v))} autoComplete="off" />
      </Field>
      <Field label="Relationship">
        <TextField value={c.relationship} onCommit={(v) => onChange((x) => void (x.relationship = v))} placeholder="Spouse, Son, Daughter…" />
      </Field>
      <Field label="Mobile">
        <TextField type="tel" inputMode="tel" value={c.mobile} onCommit={(v) => onChange((x) => void (x.mobile = v))} />
      </Field>
      {alternate && (
        <Field label="Alternate phone">
          <TextField type="tel" inputMode="tel" value={c.alternate} onCommit={(v) => onChange((x) => void (x.alternate = v))} />
        </Field>
      )}
    </>
  )
}

export function Component() {
  const profile = useProfile()
  const settings = useSettings()
  const upd: Upd = (fn) => updateProfile(fn)

  // Deep links like /profile#medications from the daily page.
  useEffect(() => {
    if (!profile || !location.hash) return
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: "start" })
  }, [!!profile])

  if (!profile || !settings) return <Page title="Profile">{null}</Page>
  const wUnit = settings.units.weight
  const hUnit = settings.units.height
  const age = ageFrom(profile.dob)

  return (
    <Page
      title="Profile"
      actions={
        <Button nativeButton={false} render={<Link to="/emergency" />} className="bg-alert text-white hover:bg-alert/90">
          <Siren /> Emergency card
        </Button>
      }
    >
      <div className="grid gap-4">
        {/* A. Personal identification */}
        <Section title="Personal" icon={UserRound}>
          <div className="flex items-center gap-4">
            <PhotoPicker profile={profile} upd={upd} />
            <div className="grid min-w-0 flex-1 gap-2">
              <TextField
                value={profile.legalName}
                onCommit={(v) => upd((p) => void (p.legalName = v))}
                placeholder="Full legal name"
                autoComplete="name"
                aria-label="Full legal name"
              />
              <TextField
                value={profile.preferredName}
                onCommit={(v) => upd((p) => void (p.preferredName = v))}
                placeholder="Preferred name"
                autoComplete="nickname"
                aria-label="Preferred name"
              />
            </div>
          </div>
          <Field label="Signature" group>
            <Signature profile={profile} upd={upd} />
          </Field>
        </Section>

        <Section title="Contact" icon={Contact}>
          <Field label="Phone">
            <TextField type="tel" inputMode="tel" autoComplete="tel" value={profile.phone} onCommit={(v) => upd((p) => void (p.phone = v))} />
          </Field>
          <Field label="Email">
            <TextField type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={profile.email} onCommit={(v) => upd((p) => void (p.email = v))} />
          </Field>
          <Field label="Residential address">
            <TextAreaField rows={2} autoComplete="street-address" value={profile.address} onCommit={(v) => upd((p) => void (p.address = v))} />
          </Field>
          <Field label="Permanent address">
            <TextAreaField rows={2} value={profile.permanentAddress} onCommit={(v) => upd((p) => void (p.permanentAddress = v))} />
          </Field>
        </Section>

        <Section title="ID numbers" icon={IdCard}>
          <p className="-mt-1 text-xs text-muted-foreground">Encrypted on this device. Masked unless you reveal them.</p>
          <Field label="National ID (CNIC / SSN / Passport)" group>
            <SecretField label="National ID" sealed={profile.ids.national} onSave={(s) => upd((p) => void (p.ids.national = s))} />
          </Field>
          <Field label="Tax identification number" group>
            <SecretField label="Tax ID" sealed={profile.ids.tax} onSave={(s) => upd((p) => void (p.ids.tax = s))} />
          </Field>
          <Field label="Driving licence" group>
            <SecretField label="Driving licence" sealed={profile.ids.license} onSave={(s) => upd((p) => void (p.ids.license = s))} />
          </Field>
        </Section>

        {/* B. Medical profile */}
        <Section title="Medical" icon={HeartPulse}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Blood group" group>
              <Select
                label="Blood group"
                value={profile.bloodGroup}
                options={BLOOD_GROUPS}
                placeholder="—"
                onValueChange={(v) => upd((p) => void (p.bloodGroup = v))}
                className="w-full"
              />
            </Field>
            <Field label="Date of birth" hint={age !== undefined ? `${age} yrs` : undefined}>
              <Input type="date" value={profile.dob ?? ""} onChange={(e) => upd((p) => void (p.dob = e.target.value || undefined))} />
            </Field>
            <Field label="Height" hint={profile.height ? cmLabel(profile.height, hUnit) : "cm"}>
              <NumberField value={profile.height} onCommit={(v) => upd((p) => void (p.height = v))} />
            </Field>
            <Field label="Baseline weight" hint={wUnit}>
              <NumberField
                decimal
                value={profile.baselineWeight === undefined ? undefined : kgTo(profile.baselineWeight, wUnit)}
                onCommit={(v) => upd((p) => void (p.baselineWeight = v === undefined ? undefined : toKg(v, wUnit)))}
              />
            </Field>
          </div>
          <Field label="Known allergies" group>
            <ChipList tone="alert" items={profile.allergies} onChange={(a) => upd((p) => void (p.allergies = a))} placeholder="Add allergy (drug, food, environmental)…" />
          </Field>
          <Field label="Chronic conditions" group>
            <ChipList items={profile.conditions} onChange={(a) => upd((p) => void (p.conditions = a))} placeholder="e.g. Hypertension, Diabetes…" />
          </Field>
        </Section>

        <div id="medications" className="scroll-mt-4">
          <Section title="Regular medications" icon={Pill}>
            <p className="-mt-1 text-xs text-muted-foreground">These appear as a daily checklist with reminders.</p>
            {profile.medications.map((m) => {
              const updM = (fn: (x: typeof m) => void) =>
                upd((p) => {
                  const x = p.medications.find((y) => y.id === m.id)
                  if (x) fn(x)
                })
              return (
                <Item key={m.id}>
                  <div className="flex gap-2">
                    <TextField value={m.name} placeholder="Medicine name" onCommit={(v) => updM((x) => void (x.name = v))} aria-label="Medicine name" />
                    <RemoveButton onClick={() => upd((p) => void (p.medications = p.medications.filter((y) => y.id !== m.id)))} />
                  </div>
                  <TextField value={m.dose} placeholder="Dosage, e.g. 5 mg" onCommit={(v) => updM((x) => void (x.dose = v))} aria-label="Dosage" />
                  <div className="flex flex-wrap items-center gap-2">
                    {m.times.map((t, i) => (
                      <div key={i} className="flex items-center rounded-lg border">
                        <input
                          type="time"
                          value={t}
                          aria-label="Dose time"
                          className="h-10 bg-transparent pl-2 tabular-nums"
                          onChange={(e) => updM((x) => void (x.times[i] = e.target.value))}
                        />
                        <button
                          type="button"
                          aria-label="Remove time"
                          className="grid size-10 place-items-center"
                          onClick={() => updM((x) => void x.times.splice(i, 1))}
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => updM((x) => void x.times.push("08:00"))}>
                      <Plus /> Time
                    </Button>
                  </div>
                </Item>
              )
            })}
            <AddButton onClick={() => upd((p) => void p.medications.push({ id: uid(), name: "", times: ["08:00"] }))}>
              Add medication
            </AddButton>
          </Section>
        </div>

        <Section title="Doctors" icon={Stethoscope}>
          <h3 className="text-sm font-medium text-muted-foreground">Primary doctor</h3>
          <Field label="Name">
            <TextField value={profile.primaryDoctor.name} onCommit={(v) => upd((p) => void (p.primaryDoctor.name = v))} />
          </Field>
          <Field label="Clinic / hospital">
            <TextField value={profile.primaryDoctor.clinic} onCommit={(v) => upd((p) => void (p.primaryDoctor.clinic = v))} />
          </Field>
          <Field label="Phone">
            <TextField type="tel" inputMode="tel" value={profile.primaryDoctor.phone} onCommit={(v) => upd((p) => void (p.primaryDoctor.phone = v))} />
          </Field>
          <h3 className="mt-2 text-sm font-medium text-muted-foreground">Specialists</h3>
          {profile.specialists.map((d) => {
            const updD = (fn: (x: typeof d) => void) =>
              upd((p) => {
                const x = p.specialists.find((y) => y.id === d.id)
                if (x) fn(x)
              })
            return (
              <Item key={d.id}>
                <div className="flex gap-2">
                  <TextField value={d.role} placeholder="Cardiologist, GP…" onCommit={(v) => updD((x) => void (x.role = v))} aria-label="Speciality" />
                  <RemoveButton onClick={() => upd((p) => void (p.specialists = p.specialists.filter((y) => y.id !== d.id)))} />
                </div>
                <TextField value={d.name} placeholder="Name" onCommit={(v) => updD((x) => void (x.name = v))} aria-label="Name" />
                <TextField type="tel" inputMode="tel" value={d.phone} placeholder="Contact number" onCommit={(v) => updD((x) => void (x.phone = v))} aria-label="Phone" />
                <TextField value={d.clinic} placeholder="Clinic location" onCommit={(v) => updD((x) => void (x.clinic = v))} aria-label="Clinic" />
              </Item>
            )
          })}
          <AddButton onClick={() => upd((p) => void p.specialists.push({ id: uid(), role: "", name: "" }))}>Add specialist</AddButton>
        </Section>

        <Section title="Health insurance" icon={ShieldPlus}>
          <Field label="Provider">
            <TextField value={profile.insurance.provider} onCommit={(v) => upd((p) => void (p.insurance.provider = v))} />
          </Field>
          <Field label="Policy / card number">
            <TextField value={profile.insurance.policy} onCommit={(v) => upd((p) => void (p.insurance.policy = v))} />
          </Field>
          <Field label="Helpline">
            <TextField type="tel" inputMode="tel" value={profile.insurance.helpline} onCommit={(v) => upd((p) => void (p.insurance.helpline = v))} />
          </Field>
        </Section>

        {/* C. Emergency contacts */}
        <Section title="Emergency contacts" icon={Siren}>
          <h3 className="text-sm font-semibold text-alert">Primary</h3>
          <ContactFields alternate c={profile.emergency.primary} onChange={(fn) => upd((p) => fn(p.emergency.primary))} />
          <h3 className="mt-2 text-sm font-semibold text-muted-foreground">Secondary</h3>
          <ContactFields c={profile.emergency.secondary} onChange={(fn) => upd((p) => fn(p.emergency.secondary))} />
        </Section>
      </div>
    </Page>
  )
}
