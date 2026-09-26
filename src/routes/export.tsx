import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { subDays } from "date-fns"
import { CalendarRange, FileDown, HeartPulse, IdCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Page } from "@/components/app-shell"
import { Field } from "@/components/fields"
import { toISO, todayISO } from "@/lib/date"
import { cn } from "@/lib/utils"

const TYPES = [
  { id: "range", label: "Journal pages", hint: "Everything logged in a date range", icon: CalendarRange },
  { id: "medical", label: "Medical summary", hint: "Profile, vitals, meds & checkups — for your doctor", icon: HeartPulse },
  { id: "profile", label: "Profile page", hint: "Personal & emergency passport", icon: IdCard },
] as const

const PRESETS = [
  ["7 days", 7],
  ["30 days", 30],
  ["90 days", 90],
  ["1 year", 365],
] as const

export function Component() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [type, setType] = useState<(typeof TYPES)[number]["id"]>("range")
  const [from, setFrom] = useState(params.get("from") ?? toISO(subDays(new Date(), 30)))
  const [to, setTo] = useState(params.get("to") ?? todayISO())

  return (
    <Page title="Export PDF" back="/more">
      <div className="grid gap-4">
        <div className="grid gap-2" role="radiogroup" aria-label="What to export">
          {TYPES.map(({ id, label, hint, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={type === id}
              onClick={() => setType(id)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border bg-card p-4 text-left transition-colors",
                type === id && "border-primary bg-primary/5 ring-1 ring-primary",
              )}
            >
              <Icon className="size-6 text-primary" />
              <span className="flex-1">
                <span className="block font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </span>
            </button>
          ))}
        </div>

        {type !== "profile" && (
          <div className="grid gap-3 rounded-2xl border bg-card p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
              </Field>
              <Field label="To">
                <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {PRESETS.map(([l, d]) => (
                <Button
                  key={l}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFrom(toISO(subDays(new Date(), d - 1)))
                    setTo(todayISO())
                  }}
                >
                  {l}
                </Button>
              ))}
            </div>
          </div>
        )}

        <Button size="lg" onClick={() => navigate(`/print?type=${type}&from=${from}&to=${to}`)} disabled={!from || !to}>
          <FileDown /> Create PDF
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Opens a print preview — choose <b>Save as PDF</b> (Android) or tap <b>Share → Save to Files</b> (iPhone).
        </p>
      </div>
    </Page>
  )
}
