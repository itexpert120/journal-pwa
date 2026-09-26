import { useEffect, useState } from "react"
import { Link } from "react-router"
import { Delete, Fingerprint, HeartPulse, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getLockConfig, lockStore, unlockWithBiometric, verifyPin, type LockConfig } from "@/lib/lock"
import { cn } from "@/lib/utils"

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "bio", "0", "del"] as const

export function LockScreen() {
  const [cfg, setCfg] = useState<LockConfig>()
  const [pin, setPin] = useState("")
  const [error, setError] = useState(false)

  const bio = async (c = cfg) => {
    if (!c?.credentialId) return
    try {
      if (await unlockWithBiometric(c.credentialId)) lockStore.set(false)
    } catch {
      /* user cancelled — fall back to PIN */
    }
  }

  useEffect(() => {
    getLockConfig().then((c) => {
      setCfg(c)
      // Auto-prompt biometrics on open, like native apps.
      if (c.credentialId) bio(c)
    })
  }, [])

  const press = async (k: (typeof KEYS)[number]) => {
    navigator.vibrate?.(8)
    if (k === "bio") return bio()
    if (k === "del") return setPin((p) => p.slice(0, -1))
    const next = (pin + k).slice(0, 6)
    setPin(next)
    setError(false)
    if (next.length >= 4 && (await verifyPin(next))) lockStore.set(false)
    else if (next.length === 6) {
      setError(true)
      navigator.vibrate?.([30, 40, 30])
      setTimeout(() => setPin(""), 350)
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center bg-leather px-8 pt-safe pb-safe text-leather-foreground">
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <Lock className="size-8 opacity-70" />
        <h1 className="text-4xl">Journal is locked</h1>
        <div className={cn("flex h-4 gap-3", error && "animate-[shake_0.3s]")} aria-live="polite">
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <span
              key={i}
              className={cn("size-3 rounded-full border border-current", i < pin.length && "bg-current")}
            />
          ))}
        </div>
        <p className="h-5 text-sm opacity-80">{error ? "Wrong PIN" : "Enter your PIN"}</p>
      </div>
      <div className="grid w-full max-w-72 grid-cols-3 gap-4 pb-6">
        {KEYS.map((k) =>
          k === "bio" ? (
            <Button
              key={k}
              variant="ghost"
              aria-label="Unlock with biometrics"
              className="size-18 justify-self-center rounded-full text-leather-foreground hover:bg-white/10"
              disabled={!cfg?.credentialId}
              onClick={() => press(k)}
            >
              {cfg?.credentialId && <Fingerprint className="size-7" />}
            </Button>
          ) : (
            <Button
              key={k}
              variant="ghost"
              aria-label={k === "del" ? "Delete" : k}
              className={cn(
                "size-18 justify-self-center rounded-full text-3xl font-light text-leather-foreground hover:bg-white/10",
                k !== "del" && "bg-white/8",
              )}
              onClick={() => press(k)}
            >
              {k === "del" ? <Delete className="size-6" /> : k}
            </Button>
          ),
        )}
      </div>
      <Link
        to="/emergency"
        className="mb-4 flex items-center gap-2 rounded-full bg-alert px-5 py-3 text-sm font-semibold text-white"
      >
        <HeartPulse className="size-4" /> Emergency medical info
      </Link>
    </div>
  )
}
