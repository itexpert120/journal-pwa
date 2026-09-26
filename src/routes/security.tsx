import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Fingerprint, KeyRound, Lock, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Page } from "@/components/app-shell"
import { Field } from "@/components/fields"
import { Section } from "@/components/section"
import { hashPin } from "@/lib/crypto"
import { biometricsAvailable, enrollBiometric, getLockConfig, lockStore, setLockConfig, type LockConfig } from "@/lib/lock"

const AUTO_LOCK = [
  [0, "Immediately"],
  [1, "After 1 min"],
  [5, "After 5 min"],
  [15, "After 15 min"],
] as const

export function Component() {
  const [cfg, setCfg] = useState<LockConfig>()
  const [bioOk, setBioOk] = useState(false)
  const [pin, setPin] = useState("")
  const [pin2, setPin2] = useState("")

  useEffect(() => {
    getLockConfig().then(setCfg)
    biometricsAvailable().then(setBioOk)
  }, [])
  if (!cfg) return <Page title="App lock" back="/more">{null}</Page>

  const save = async (c: LockConfig) => {
    await setLockConfig(c)
    setCfg(c)
  }

  const setPinCode = async () => {
    if (!/^\d{4,6}$/.test(pin)) return toast.error("PIN must be 4–6 digits")
    if (pin !== pin2) return toast.error("PINs don't match")
    await save({ ...cfg, enabled: true, pin: await hashPin(pin) })
    setPin("")
    setPin2("")
    toast.success("App lock is on")
  }

  const pinInput = (v: string, set: (s: string) => void, label: string) => (
    <Field label={label}>
      <Input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={6}
        value={v}
        onChange={(e) => set(e.target.value.replace(/\D/g, ""))}
        className="text-center text-2xl tracking-[0.5em]"
      />
    </Field>
  )

  return (
    <Page title="App lock" back="/more">
      <div className="grid gap-4">
        <Section title={cfg.enabled ? "Lock is on" : "Lock is off"} icon={cfg.enabled ? ShieldCheck : Lock}>
          <p className="text-sm text-muted-foreground">
            Require a PIN{bioOk ? " or Face ID / fingerprint" : ""} to open your journal. Emergency medical info stays
            reachable from the lock screen.
          </p>
          {cfg.enabled && (
            <>
              <label className="flex min-h-12 items-center gap-3">
                <span className="flex-1">Enable lock</span>
                <Switch
                  checked={cfg.enabled}
                  onCheckedChange={(c) => save({ ...cfg, enabled: c, ...(c ? {} : { pin: undefined, credentialId: undefined }) })}
                />
              </label>
              <Field label="Auto-lock" group>
                <div className="grid grid-cols-2 gap-2">
                  {AUTO_LOCK.map(([m, l]) => (
                    <Button key={m} variant={cfg.autoLockMinutes === m ? "default" : "outline"} onClick={() => save({ ...cfg, autoLockMinutes: m })}>
                      {l}
                    </Button>
                  ))}
                </div>
              </Field>
              <Button variant="secondary" onClick={() => lockStore.set(true)}>
                <Lock /> Lock now
              </Button>
            </>
          )}
        </Section>

        <Section title={cfg.pin ? "Change PIN" : "Set a PIN"} icon={KeyRound}>
          {pinInput(pin, setPin, "New PIN (4–6 digits)")}
          {pinInput(pin2, setPin2, "Confirm PIN")}
          <Button size="lg" onClick={setPinCode} disabled={pin.length < 4}>
            {cfg.pin ? "Update PIN" : "Turn on lock"}
          </Button>
        </Section>

        {bioOk && cfg.pin && (
          <Section title="Face ID / fingerprint" icon={Fingerprint}>
            {cfg.credentialId ? (
              <>
                <p className="text-sm text-emerald-700 dark:text-emerald-400">✓ Biometric unlock is set up.</p>
                <Button variant="outline" onClick={() => save({ ...cfg, credentialId: undefined })}>
                  Remove biometric unlock
                </Button>
              </>
            ) : (
              <Button
                size="lg"
                onClick={async () => {
                  try {
                    await save({ ...cfg, credentialId: await enrollBiometric() })
                    toast.success("Biometric unlock enabled")
                  } catch {
                    toast.error("Couldn't set up biometrics")
                  }
                }}
              >
                <Fingerprint /> Enable biometric unlock
              </Button>
            )}
          </Section>
        )}
      </div>
    </Page>
  )
}
