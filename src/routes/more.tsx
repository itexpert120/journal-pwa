import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Bell,
  BookHeart,
  Cake,
  CloudUpload,
  Droplets,
  Download,
  FileDown,
  HardDrive,
  ListChecks,
  Lock,
  Pill,
  Ruler,
  Share,
  Smartphone,
} from "lucide-react"
import { Page } from "@/components/app-shell"
import { ActionRow, DateTimeRow, Group, NumberRow, Row, SelectRow, SwitchRow } from "@/components/ios"
import { updateSettings, useSettings, type Settings } from "@/lib/profile"
import { notificationsSupported, requestNotifications } from "@/lib/notify"
import { isIOS, isStandalone, promptInstall, useCanPromptInstall } from "@/lib/install"

function InstallGroup() {
  const canPrompt = useCanPromptInstall()
  if (isStandalone()) return null
  return (
    <Group
      footer={
        canPrompt
          ? "Installing keeps your journal on your Home Screen, works offline and enables reminders."
          : isIOS()
            ? "In Safari, tap Share, then “Add to Home Screen”. This also protects your data from Safari’s storage clean-up."
            : "Open the browser menu and choose “Install app”."
      }
    >
      {canPrompt ? (
        <Row icon={Download} color="blue" label="Install Journal" onClick={promptInstall} chevron />
      ) : (
        <Row icon={isIOS() ? Share : Smartphone} color="blue" label="Add to Home Screen" />
      )}
    </Group>
  )
}

function StorageGroup() {
  const [info, setInfo] = useState<{ used: number; persisted: boolean }>()
  const load = async () => {
    const est = await navigator.storage?.estimate?.()
    setInfo({ used: est?.usage ?? 0, persisted: (await navigator.storage?.persisted?.()) ?? false })
  }
  useEffect(() => {
    load()
  }, [])
  const size = (b: number) => (b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${(b / 1e6).toFixed(1)} MB`)
  return (
    <Group header="Data" footer="Everything is stored only on this device. Back up regularly to keep a copy in the cloud.">
      <Row icon={HardDrive} color="gray" label="Storage Used" value={info ? size(info.used) : "…"} />
      {info && !info.persisted && (
        <Row
          icon={Lock}
          color="green"
          label="Protect From Clean-Up"
          chevron
          onClick={async () => {
            const ok = await navigator.storage?.persist?.()
            toast[ok ? "success" : "info"](ok ? "Storage protected" : "Install the app to protect storage")
            load()
          }}
        />
      )}
      <Row icon={CloudUpload} color="blue" label="Backup & Restore" to="/more/backup" />
      <Row icon={FileDown} color="red" label="Export PDF" to="/export" />
    </Group>
  )
}

function RemindersGroup({ s }: { s: Settings }) {
  const [perm, setPerm] = useState(notificationsSupported() ? Notification.permission : "unsupported")
  return (
    <Group
      header="Reminders"
      footer={
        perm === "unsupported"
          ? `Notifications aren't available here.${isIOS() ? " On iPhone, add Journal to your Home Screen first." : ""}`
          : "Reminders arrive while Journal is open or the next time you open it. Installed Android apps can also get the daily prompt in the background."
      }
    >
      {perm !== "unsupported" && perm !== "granted" && (
        <ActionRow
          icon={Bell}
          onClick={async () => {
            const p = await requestNotifications()
            setPerm(p)
            if (p === "denied") toast.error("Notifications are blocked. Turn them on in system settings.")
          }}
        >
          Turn On Notifications
        </ActionRow>
      )}
      <DateTimeRow
        icon={BookHeart}
        color="purple"
        label="Journal Prompt"
        type="time"
        value={s.reminders.journal}
        onChange={(v) => updateSettings((x) => void (x.reminders.journal = v || undefined))}
      />
      <SwitchRow
        icon={Pill}
        color="red"
        label="Medications"
        checked={s.reminders.meds}
        onChange={(c) => updateSettings((x) => void (x.reminders.meds = c))}
      />
      <SwitchRow
        icon={Cake}
        color="pink"
        label="Birthdays & Anniversaries"
        checked={s.reminders.occasions}
        onChange={(c) => updateSettings((x) => void (x.reminders.occasions = c))}
      />
    </Group>
  )
}

export function Component() {
  const s = useSettings()
  if (!s) return <Page title="Settings">{null}</Page>
  const setUnit = <K extends keyof Settings["units"]>(k: K, v: string) =>
    updateSettings((x) => void (x.units[k] = v as Settings["units"][K]))

  return (
    <Page title="Settings">
      <div className="grid gap-8 md:grid-cols-2 md:items-start">
        <div className="grid gap-8">
          <InstallGroup />
          <Group header="Journal">
            <Row icon={Cake} color="pink" label="Birthdays & Anniversaries" to="/more/occasions" />
            <Row icon={ListChecks} color="orange" label="Daily Routine" to="/more/routine" />
            <Row icon={Lock} color="gray" label="Passcode & Face ID" to="/more/security" />
          </Group>
          <RemindersGroup s={s} />
        </div>
        <div className="grid gap-8">
          <Group header="Units">
            <SelectRow
              icon={Ruler}
              color="teal"
              label="Weight"
              value={s.units.weight}
              options={[{ value: "kg", label: "Kilograms" }, { value: "lb", label: "Pounds" }]}
              onChange={(v) => setUnit("weight", v)}
            />
            <SelectRow
              icon={Ruler}
              color="teal"
              label="Distance"
              value={s.units.distance}
              options={[{ value: "km", label: "Kilometres" }, { value: "mi", label: "Miles" }]}
              onChange={(v) => setUnit("distance", v)}
            />
            <SelectRow
              icon={Ruler}
              color="teal"
              label="Height"
              value={s.units.height}
              options={[{ value: "cm", label: "Centimetres" }, { value: "ft", label: "Feet & Inches" }]}
              onChange={(v) => setUnit("height", v)}
            />
            <SelectRow
              icon={Droplets}
              color="blue"
              label="Water"
              value={s.units.water}
              options={[{ value: "glass", label: "Glasses" }, { value: "l", label: "Litres" }]}
              onChange={(v) => setUnit("water", v)}
            />
          </Group>
          <Group footer="One glass is 250 ml.">
            <NumberRow
              label="Daily Water Goal"
              unit="glasses"
              value={s.waterGoal}
              onCommit={(v) => v && updateSettings((x) => void (x.waterGoal = Math.round(v)))}
            />
          </Group>
          <StorageGroup />
        </div>
      </div>
    </Page>
  )
}
