import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Fingerprint, KeyRound, Lock, Timer } from "lucide-react"
import { Page } from "@/components/app-shell"
import { ActionRow, EditSheet, FieldRow, Group, Row, SelectRow, SwitchRow } from "@/components/ios"
import { hashPin } from "@/lib/crypto"
import { biometricsAvailable, enrollBiometric, getLockConfig, lockStore, setLockConfig, type LockConfig } from "@/lib/lock"

const AUTO_LOCK = [
  { value: "0", label: "Immediately" },
  { value: "1", label: "After 1 minute" },
  { value: "5", label: "After 5 minutes" },
  { value: "15", label: "After 15 minutes" },
]

function PinSheet({ open, onOpenChange, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; onSave: (pin: string) => void }) {
  const [pin, setPin] = useState("")
  const [pin2, setPin2] = useState("")
  const input = (v: string, set: (s: string) => void, label: string) => (
    <FieldRow label={label}>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={6}
        value={v}
        onChange={(e) => set(e.target.value.replace(/\D/g, ""))}
        className="min-w-0 flex-1 bg-transparent py-3 text-right text-xl tracking-[0.4em] outline-none"
      />
    </FieldRow>
  )
  const save = () => {
    if (!/^\d{4,6}$/.test(pin)) return toast.error("Passcode must be 4–6 digits")
    if (pin !== pin2) return toast.error("Passcodes don't match")
    onSave(pin)
    setPin("")
    setPin2("")
    onOpenChange(false)
  }
  return (
    <EditSheet open={open} onOpenChange={onOpenChange} title="Set Passcode">
      <Group footer="Use 4 to 6 digits.">
        {input(pin, setPin, "New Passcode")}
        {input(pin2, setPin2, "Confirm")}
      </Group>
      <Group>
        <ActionRow onClick={save}>Save Passcode</ActionRow>
      </Group>
    </EditSheet>
  )
}

export function Component() {
  const [cfg, setCfg] = useState<LockConfig>()
  const [bioOk, setBioOk] = useState(false)
  const [pinSheet, setPinSheet] = useState(false)

  useEffect(() => {
    getLockConfig().then(setCfg)
    biometricsAvailable().then(setBioOk)
  }, [])
  if (!cfg) return <Page title="Passcode" back="/more" backLabel="Settings">{null}</Page>

  const save = async (c: LockConfig) => {
    await setLockConfig(c)
    setCfg(c)
  }

  return (
    <Page title="Passcode & Face ID" back="/more" backLabel="Settings">
      <div className="grid gap-8">
        <Group footer="Emergency medical info stays available from the lock screen, like Medical ID.">
          {cfg.pin ? (
            <>
              <SwitchRow
                icon={Lock}
                color="gray"
                label="Require Passcode"
                checked={cfg.enabled}
                onChange={(c) => save({ ...cfg, enabled: c })}
              />
              <Row icon={KeyRound} color="blue" label="Change Passcode" chevron onClick={() => setPinSheet(true)} />
            </>
          ) : (
            <Row icon={KeyRound} color="blue" label="Turn Passcode On" chevron onClick={() => setPinSheet(true)} />
          )}
        </Group>

        {cfg.pin && cfg.enabled && (
          <>
            {bioOk && (
              <Group footer="Unlock with Face ID, Touch ID or your fingerprint instead of typing your passcode.">
                <SwitchRow
                  icon={Fingerprint}
                  color="green"
                  label="Biometric Unlock"
                  checked={!!cfg.credentialId}
                  onChange={async (on) => {
                    if (!on) return save({ ...cfg, credentialId: undefined })
                    try {
                      await save({ ...cfg, credentialId: await enrollBiometric() })
                    } catch {
                      toast.error("Couldn't set up biometrics")
                    }
                  }}
                />
              </Group>
            )}
            <Group>
              <SelectRow
                icon={Timer}
                color="orange"
                label="Auto-Lock"
                value={String(cfg.autoLockMinutes)}
                options={AUTO_LOCK}
                onChange={(v) => save({ ...cfg, autoLockMinutes: Number(v) })}
              />
            </Group>
            <Group>
              <ActionRow onClick={() => lockStore.set(true)}>Lock Now</ActionRow>
            </Group>
            <Group>
              <ActionRow destructive onClick={() => save({ ...cfg, enabled: false, pin: undefined, credentialId: undefined })}>
                Turn Passcode Off
              </ActionRow>
            </Group>
          </>
        )}
      </div>
      <PinSheet
        open={pinSheet}
        onOpenChange={setPinSheet}
        onSave={async (pin) => {
          await save({ ...cfg, enabled: true, pin: await hashPin(pin) })
          toast.success("Passcode set")
        }}
      />
    </Page>
  )
}
