import { useEffect, useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import {
  Bell,
  Cake,
  ChevronRight,
  Database,
  Download,
  FileDown,
  GripVertical,
  ListChecks,
  Lock,
  Ruler,
  Share,
  Smartphone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Page } from "@/components/app-shell"
import { Field, NumberField, TextField } from "@/components/fields"
import { AddButton, RemoveButton, Section } from "@/components/section"
import { uid } from "@/lib/id"
import { updateSettings, useSettings, type Settings } from "@/lib/profile"
import { notificationsSupported, requestNotifications, runDueReminders } from "@/lib/notify"
import { isIOS, isStandalone, promptInstall, useCanPromptInstall } from "@/lib/install"

function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: readonly (readonly [T, string])[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(v) => v[0] && onChange(v[0] as T)}
      variant="segmented"
      spacing={0}
      className="grid w-full"
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
      aria-label={label}
    >
      {options.map(([v, l]) => (
        <ToggleGroupItem key={v} value={v}>
          {l}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function LinkRow({ to, icon: Icon, label, hint }: { to: string; icon: typeof Lock; label: string; hint?: string }) {
  return (
    <Link to={to} viewTransition className="flex min-h-14 items-center gap-3 border-b px-1 last:border-0 active:bg-muted">
      <Icon className="size-5 text-primary" />
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <ChevronRight className="size-5 text-muted-foreground" />
    </Link>
  )
}

function InstallCard() {
  const canPrompt = useCanPromptInstall()
  if (isStandalone()) return null
  return (
    <Section title="Install app" icon={Smartphone} className="border-primary/40 bg-primary/5">
      {canPrompt ? (
        <Button size="lg" onClick={promptInstall}>
          <Download /> Add to Home Screen
        </Button>
      ) : isIOS() ? (
        <p className="text-sm">
          Tap <Share className="inline size-4" /> <b>Share</b> in Safari, then <b>Add to Home Screen</b>. Installing keeps your
          data safe from Safari's storage clean-up and enables reminders.
        </p>
      ) : (
        <p className="text-sm">Open your browser menu and choose <b>Install app</b> or <b>Add to Home screen</b>.</p>
      )}
    </Section>
  )
}

function StorageCard() {
  const [info, setInfo] = useState<{ used: number; quota: number; persisted: boolean }>()
  const load = async () => {
    const est = await navigator.storage?.estimate?.()
    const persisted = (await navigator.storage?.persisted?.()) ?? false
    setInfo({ used: est?.usage ?? 0, quota: est?.quota ?? 0, persisted })
  }
  useEffect(() => {
    load()
  }, [])
  const mb = (b: number) => (b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${(b / 1e6).toFixed(1)} MB`)
  return (
    <Section title="Storage" icon={Database}>
      {info && (
        <>
          <p className="text-sm">
            Using <b>{mb(info.used)}</b> {info.quota > 0 && <>of {mb(info.quota)} available</>} on this device.
          </p>
          {info.persisted ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">✓ Protected from automatic browser clean-up.</p>
          ) : (
            <Button
              variant="outline"
              onClick={async () => {
                const ok = await navigator.storage?.persist?.()
                toast[ok ? "success" : "info"](ok ? "Storage protected" : "Install the app to protect storage")
                load()
              }}
            >
              Protect my data from clean-up
            </Button>
          )}
        </>
      )}
      <LinkRow to="/more/backup" icon={Database} label="Encrypted backup & restore" hint="Save to Google Drive, iCloud or Files" />
    </Section>
  )
}

function Reminders({ s }: { s: Settings }) {
  const [perm, setPerm] = useState(notificationsSupported() ? Notification.permission : "unsupported")
  return (
    <Section title="Reminders" icon={Bell}>
      {perm === "unsupported" ? (
        <p className="text-sm text-muted-foreground">
          Notifications aren't available here.{isIOS() && " On iPhone, install the app to the Home Screen first."}
        </p>
      ) : perm !== "granted" ? (
        <Button
          size="lg"
          onClick={async () => {
            const p = await requestNotifications()
            setPerm(p)
            if (p === "denied") toast.error("Notifications blocked — enable them in system settings.")
          }}
        >
          <Bell /> Turn on notifications
        </Button>
      ) : null}
      <label className="flex min-h-12 items-center gap-3">
        <span className="flex-1">Daily journal prompt</span>
        <Input
          type="time"
          className="w-32"
          value={s.reminders.journal ?? ""}
          onChange={(e) => updateSettings((x) => void (x.reminders.journal = e.target.value || undefined))}
        />
      </label>
      <label className="flex min-h-12 items-center gap-3">
        <span className="flex-1">Medication alerts</span>
        <Switch checked={s.reminders.meds} onCheckedChange={(c) => updateSettings((x) => void (x.reminders.meds = c))} />
      </label>
      <label className="flex min-h-12 items-center gap-3">
        <span className="flex-1">Birthdays & anniversaries</span>
        <Switch checked={s.reminders.occasions} onCheckedChange={(c) => updateSettings((x) => void (x.reminders.occasions = c))} />
      </label>
      <p className="text-xs text-muted-foreground">
        Reminders fire when due while the app is open or when you next open it. On installed Android apps, the daily
        prompt can also arrive in the background.
      </p>
      {perm === "granted" && (
        <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => runDueReminders()}>
          Check reminders now
        </Button>
      )}
    </Section>
  )
}

export function Component() {
  const s = useSettings()

  useEffect(() => {
    if (s && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: "start" })
  }, [!!s])

  if (!s) return <Page title="More">{null}</Page>
  const units = (k: keyof Settings["units"], v: string) => updateSettings((x) => void ((x.units as Record<string, string>)[k] = v))

  return (
    <Page title="More">
      <div className="grid gap-4">
        <InstallCard />

        <div className="rounded-2xl border bg-card px-3">
          <LinkRow to="/export" icon={FileDown} label="Export PDF" hint="Date ranges, medical summary, profile" />
          <LinkRow to="/more/occasions" icon={Cake} label="Birthdays & anniversaries" />
          <LinkRow to="/more/security" icon={Lock} label="App lock" hint="PIN, Face ID / fingerprint" />
        </div>

        <div id="routine" className="scroll-mt-4">
          <Section title="Daily routine" icon={ListChecks}>
            <p className="-mt-1 text-xs text-muted-foreground">Non-negotiables that appear on every day's checklist.</p>
            {s.routine.map((r) => (
              <div key={r.id} className="flex items-center gap-1">
                <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />
                <TextField
                  value={r.text}
                  aria-label="Routine item"
                  onCommit={(v) =>
                    updateSettings((x) => {
                      const y = x.routine.find((z) => z.id === r.id)
                      if (y) y.text = v
                    })
                  }
                />
                <RemoveButton onClick={() => updateSettings((x) => void (x.routine = x.routine.filter((z) => z.id !== r.id)))} />
              </div>
            ))}
            <AddButton onClick={() => updateSettings((x) => void x.routine.push({ id: uid(), text: "" }))}>Add routine item</AddButton>
          </Section>
        </div>

        <Reminders s={s} />

        <Section title="Units" icon={Ruler}>
          <Field label="Weight" group>
            <Seg label="Weight" value={s.units.weight} onChange={(v) => units("weight", v)} options={[["kg", "kg"], ["lb", "lbs"]]} />
          </Field>
          <Field label="Distance" group>
            <Seg label="Distance" value={s.units.distance} onChange={(v) => units("distance", v)} options={[["km", "km"], ["mi", "miles"]]} />
          </Field>
          <Field label="Height" group>
            <Seg label="Height" value={s.units.height} onChange={(v) => units("height", v)} options={[["cm", "cm"], ["ft", "ft / in"]]} />
          </Field>
          <Field label="Water" group>
            <Seg label="Water" value={s.units.water} onChange={(v) => units("water", v)} options={[["glass", "Glasses"], ["l", "Litres"]]} />
          </Field>
          <Field label="Daily water goal" hint="glasses of 250 ml">
            <NumberField value={s.waterGoal} onCommit={(v) => v && updateSettings((x) => void (x.waterGoal = Math.round(v)))} />
          </Field>
        </Section>

        <StorageCard />
      </div>
    </Page>
  )
}
