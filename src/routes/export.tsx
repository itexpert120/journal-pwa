import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { subDays } from "date-fns"
import { Check, FileText, HeartPulse, IdCard } from "lucide-react"
import { Page } from "@/components/app-shell"
import { ActionRow, DateTimeRow, Group, Row } from "@/components/ios"
import { toISO, todayISO } from "@/lib/date"
import { cn } from "@/lib/utils"

const TYPES = [
  { id: "range", label: "Journal Pages", detail: "Everything logged in a date range", icon: FileText, color: "blue" },
  { id: "medical", label: "Medical Summary", detail: "Profile, vitals, meds & checkups for your doctor", icon: HeartPulse, color: "red" },
  { id: "profile", label: "Profile", detail: "Personal & emergency passport", icon: IdCard, color: "gray" },
] as const

const PRESETS = [
  ["Week", 7],
  ["Month", 30],
  ["3 Months", 90],
  ["Year", 365],
] as const

export function Component() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [type, setType] = useState<(typeof TYPES)[number]["id"]>("range")
  const [from, setFrom] = useState(params.get("from") ?? toISO(subDays(new Date(), 29)))
  const [to, setTo] = useState(params.get("to") ?? todayISO())

  return (
    <Page title="Export PDF" back="/more" backLabel="Settings">
      <div className="grid gap-8">
        <Group header="Document">
          {TYPES.map((t) => (
            <Row key={t.id} icon={t.icon} color={t.color} label={t.label} detail={t.detail} onClick={() => setType(t.id)}>
              {type === t.id && <Check className="size-5 text-primary" strokeWidth={2.6} />}
            </Row>
          ))}
        </Group>

        {type !== "profile" && (
          <div className="grid gap-3">
            <Group header="Date Range">
              <DateTimeRow label="From" type="date" value={from} onChange={setFrom} />
              <DateTimeRow label="To" type="date" value={to} onChange={setTo} />
            </Group>
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
              {PRESETS.map(([l, d]) => {
                const f = toISO(subDays(new Date(), d - 1))
                const on = from === f && to === todayISO()
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => {
                      setFrom(f)
                      setTo(todayISO())
                    }}
                    className={cn("h-9 rounded-lg text-[0.8125rem] font-semibold transition-colors", on ? "bg-card shadow-sm" : "text-muted-foreground")}
                  >
                    {l}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <Group footer="Opens a print preview. Choose “Save as PDF” on Android, or Share → Save to Files on iPhone.">
          <ActionRow onClick={() => navigate(`/print?type=${type}&from=${from}&to=${to}`)}>Create PDF</ActionRow>
        </Group>
      </div>
    </Page>
  )
}
