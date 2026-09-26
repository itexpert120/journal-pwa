import { useNavigate } from "react-router"
import { ChevronLeft, Phone, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useProfile, useSettings, type EmergencyContact } from "@/lib/profile"
import { ageFrom } from "@/lib/date"
import { cmLabel, kgTo } from "@/lib/units"
import { useFileUrl } from "@/hooks/use-file-url"

function Call({ label, number }: { label: string; number?: string }) {
  if (!number) return null
  return (
    <a
      href={`tel:${number.replace(/[^\d+]/g, "")}`}
      className="flex h-12 items-center gap-3 rounded-xl bg-emerald-600 px-4 font-semibold text-white active:bg-emerald-700"
    >
      <Phone className="size-5" />
      <span className="flex-1">{label}</span>
      <span className="tabular-nums opacity-90">{number}</span>
    </a>
  )
}

function ContactCard({ title, c }: { title: string; c: EmergencyContact }) {
  if (!c.name && !c.mobile) return null
  return (
    <div className="grid gap-2 rounded-2xl border bg-card p-4">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      <p className="text-xl font-semibold">
        {c.name} {c.relationship && <span className="text-base font-normal text-muted-foreground">· {c.relationship}</span>}
      </p>
      <Call label="Mobile" number={c.mobile} />
      <Call label="Alternate" number={c.alternate} />
    </div>
  )
}

function Row({ k, v }: { k: string; v?: React.ReactNode }) {
  if (!v) return null
  return (
    <div className="flex justify-between gap-4 border-b py-2.5 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  )
}

/**
 * Read-only "Medical ID" for first responders. Reachable from the lock screen
 * without unlocking — it deliberately excludes ID numbers and journal content.
 */
export function Component() {
  const p = useProfile()
  const s = useSettings()
  const navigate = useNavigate()
  const photo = useFileUrl(p?.photoId)
  if (!p || !s) return null
  const age = ageFrom(p.dob)

  return (
    <div className="h-dvh overflow-y-auto bg-background">
      <header className="sticky top-0 z-10 bg-alert pt-safe text-white">
        <div className="flex h-14 items-center gap-2 px-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back"
            className="text-white hover:bg-white/10"
            onClick={() => (history.length > 1 ? navigate(-1) : navigate("/"))}
          >
            <ChevronLeft />
          </Button>
          <h1 className="flex-1 text-3xl">Emergency info</h1>
        </div>
      </header>
      <main className="mx-auto grid max-w-lg gap-4 p-4 pb-safe">
        <div className="flex items-center gap-4">
          {photo && <img src={photo} alt="" className="size-20 rounded-full object-cover" />}
          <div>
            <p className="text-3xl font-bold tracking-tight">{p.legalName || "Name not set"}</p>
            {p.preferredName && <p className="text-muted-foreground">“{p.preferredName}”</p>}
          </div>
        </div>

        {p.bloodGroup && (
          <div className="flex items-center justify-between rounded-2xl bg-alert/10 p-4">
            <span className="font-medium">Blood group</span>
            <span className="text-4xl font-bold text-alert">{p.bloodGroup}</span>
          </div>
        )}

        {p.allergies.length > 0 && (
          <div className="rounded-2xl border-2 border-alert p-4">
            <p className="mb-2 flex items-center gap-2 font-semibold text-alert">
              <TriangleAlert className="size-5" /> Allergies
            </p>
            <div className="flex flex-wrap gap-2">
              {p.allergies.map((a) => (
                <span key={a} className="rounded-full bg-alert px-3 py-1.5 text-sm font-semibold text-white">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        <ContactCard title="Primary emergency contact" c={p.emergency.primary} />
        <ContactCard title="Secondary emergency contact" c={p.emergency.secondary} />

        <div className="rounded-2xl border bg-card px-4 py-1">
          <Row k="Age" v={age !== undefined ? `${age} years` : undefined} />
          <Row k="Date of birth" v={p.dob} />
          <Row k="Height" v={p.height ? cmLabel(p.height, s.units.height) : undefined} />
          <Row k="Weight" v={p.baselineWeight ? `${kgTo(p.baselineWeight, s.units.weight)} ${s.units.weight}` : undefined} />
          <Row k="Conditions" v={p.conditions.join(", ")} />
          <Row
            k="Medications"
            v={
              p.medications.length ? (
                <span className="grid">
                  {p.medications.map((m) => (
                    <span key={m.id}>
                      {m.name} {m.dose && <span className="text-muted-foreground">{m.dose}</span>}
                    </span>
                  ))}
                </span>
              ) : undefined
            }
          />
        </div>

        {(p.primaryDoctor.name || p.primaryDoctor.phone) && (
          <div className="grid gap-2 rounded-2xl border bg-card p-4">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Primary doctor</p>
            <p className="text-lg font-semibold">{p.primaryDoctor.name}</p>
            {p.primaryDoctor.clinic && <p className="text-muted-foreground">{p.primaryDoctor.clinic}</p>}
            <Call label="Call doctor" number={p.primaryDoctor.phone} />
          </div>
        )}

        {(p.insurance.provider || p.insurance.policy) && (
          <div className="grid gap-2 rounded-2xl border bg-card p-4">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Insurance</p>
            <Row k="Provider" v={p.insurance.provider} />
            <Row k="Policy" v={p.insurance.policy} />
            <Call label="Helpline" number={p.insurance.helpline} />
          </div>
        )}
      </main>
    </div>
  )
}
