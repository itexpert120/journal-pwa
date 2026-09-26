import { useNavigate } from "react-router"
import { Asterisk, ChevronLeft, Phone } from "lucide-react"
import { Group, Row } from "@/components/ios"
import { useProfile, useSettings, type EmergencyContact } from "@/lib/profile"
import { ageFrom, formatTime12 } from "@/lib/date"
import { cmLabel, kgTo } from "@/lib/units"
import { setNav } from "@/lib/nav"
import { useFileUrl } from "@/hooks/use-file-url"
import { cn } from "@/lib/utils"

const tel = (n: string) => `tel:${n.replace(/[^\d+]/g, "")}`

function CallRow({ label, detail, number }: { label: string; detail?: string; number?: string }) {
  if (!number) return null
  return (
    <a href={tel(number)} className="flex min-h-[60px] items-center gap-3 px-4 active:bg-muted">
      <span className="min-w-0 flex-1 py-2">
        <span className="block text-[17px]">{label}</span>
        <span className="block text-[15px] text-muted-foreground tabular-nums">{detail ? `${detail} · ${number}` : number}</span>
      </span>
      <span className="grid size-10 place-items-center rounded-full bg-success text-white">
        <Phone className="size-5 fill-current" />
      </span>
    </a>
  )
}

function Contact({ c, title }: { c: EmergencyContact; title: string }) {
  if (!c.mobile && !c.name) return null
  return (
    <Group header={title}>
      <CallRow label={c.name || "Contact"} detail={c.relationship} number={c.mobile} />
      {c.alternate && <CallRow label="Alternate" number={c.alternate} />}
    </Group>
  )
}

/**
 * Read-only Medical ID for first responders. Reachable from the lock screen
 * without unlocking — deliberately excludes ID numbers and journal content.
 */
export function Component() {
  const p = useProfile()
  const s = useSettings()
  const navigate = useNavigate()
  const photo = useFileUrl(p?.photoId)
  if (!p || !s) return null
  const age = ageFrom(p.dob)

  return (
    <main className="h-dvh overflow-y-auto overscroll-contain bg-background">
      <header className="sticky top-0 z-20 pt-safe">
        <div aria-hidden className="edge-top" />
        <div className="mx-auto flex h-[54px] max-w-2xl items-center px-4">
          <button
            type="button"
            aria-label="Back"
            onClick={() => {
              setNav("pop")
              if (history.length > 1) navigate(-1)
              else navigate("/")
            }}
            className="glass grid size-11 place-items-center rounded-full active:scale-90"
          >
            <ChevronLeft className="size-[22px]" strokeWidth={2.4} />
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-2xl gap-6 px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <div className="flex items-center gap-2 px-1">
          <span className="grid size-8 place-items-center rounded-[9px] bg-alert text-white">
            <Asterisk className="size-6" strokeWidth={3} />
          </span>
          <h1 className="text-[34px] leading-tight font-bold text-alert">Medical ID</h1>
        </div>

        <div className="flex items-center gap-4 px-1">
          <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-linear-to-b from-[#a1a1a6] to-[#86868b] text-2xl font-semibold text-white">
            {photo ? <img src={photo} alt="" className="size-full object-cover" /> : (p.legalName || "?").slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="text-2xl leading-tight font-bold">{p.legalName || "Name not set"}</p>
            <p className="text-[15px] text-muted-foreground">
              {[age !== undefined && `${age} years old`, p.dob].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            ["Blood Type", p.bloodGroup],
            ["Height", p.height ? cmLabel(p.height, s.units.height) : undefined],
            ["Weight", p.baselineWeight ? `${kgTo(p.baselineWeight, s.units.weight)} ${s.units.weight}` : undefined],
          ].map(([k, v]) => (
            <div key={k} className="rounded-[1.25rem] bg-card p-3.5">
              <p className="text-[13px] text-muted-foreground">{k}</p>
              <p className={cn("mt-0.5 text-[22px] font-bold", k === "Blood Type" && v && "text-alert")}>{v ?? "—"}</p>
            </div>
          ))}
        </div>

        {p.allergies.length > 0 && (
          <Group header="Allergies & Reactions">
            {p.allergies.map((a) => (
              <Row key={a} label={<span className="font-semibold text-alert">{a}</span>} />
            ))}
          </Group>
        )}

        {p.conditions.length > 0 && (
          <Group header="Medical Conditions">
            {p.conditions.map((c) => (
              <Row key={c} label={c} />
            ))}
          </Group>
        )}

        {p.medications.length > 0 && (
          <Group header="Medications">
            {p.medications.map((m) => (
              <Row key={m.id} label={m.name} detail={[m.dose, m.times.map(formatTime12).join(", ")].filter(Boolean).join(" · ")} />
            ))}
          </Group>
        )}

        <Contact c={p.emergency.primary} title="Emergency Contact" />
        <Contact c={p.emergency.secondary} title="Secondary Contact" />

        {(p.primaryDoctor.name || p.primaryDoctor.phone) && (
          <Group header="Doctor">
            <CallRow label={p.primaryDoctor.name || "Doctor"} detail={p.primaryDoctor.clinic} number={p.primaryDoctor.phone} />
            {!p.primaryDoctor.phone && <Row label={p.primaryDoctor.name} detail={p.primaryDoctor.clinic} />}
          </Group>
        )}

        {(p.insurance.provider || p.insurance.policy) && (
          <Group header="Insurance">
            <Row label="Provider" value={p.insurance.provider} />
            <Row label="Policy" value={p.insurance.policy} />
            <CallRow label="Helpline" number={p.insurance.helpline} />
          </Group>
        )}
      </div>
    </main>
  )
}
