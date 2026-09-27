import { useEffect, useState } from "react"
import { Link } from "react-router"
import { Asterisk, Delete, Lock, ScanFace } from "lucide-react"
import { getLockConfig, lockStore, unlockWithBiometric, verifyPin, type LockConfig } from "@/lib/lock"
import { setNav } from "@/lib/nav"
import { cn } from "@/lib/utils"

const KEYS = [
  ["1", ""],
  ["2", "ABC"],
  ["3", "DEF"],
  ["4", "GHI"],
  ["5", "JKL"],
  ["6", "MNO"],
  ["7", "PQRS"],
  ["8", "TUV"],
  ["9", "WXYZ"],
] as const

/** iOS passcode screen: dots, glass number keys, Face ID, Emergency. */
export function LockScreen() {
  const [cfg, setCfg] = useState<LockConfig>()
  const [pin, setPin] = useState("")
  const [error, setError] = useState(false)

  const bio = async (c = cfg) => {
    if (!c?.credentialId) return
    try {
      if (await unlockWithBiometric(c.credentialId)) lockStore.set(false)
    } catch {
      /* cancelled — fall back to passcode */
    }
  }

  useEffect(() => {
    getLockConfig().then((c) => {
      setCfg(c)
      if (c.credentialId) bio(c)
    })
  }, [])

  const press = async (k: string) => {
    navigator.vibrate?.(8)
    const next = (pin + k).slice(0, 6)
    setPin(next)
    setError(false)
    if (next.length >= 4 && (await verifyPin(next))) lockStore.set(false)
    else if (next.length === 6) {
      setError(true)
      navigator.vibrate?.([30, 40, 30])
      setTimeout(() => setPin(""), 400)
    }
  }

  const key = "grid size-[4.875rem] place-items-center rounded-full bg-foreground/[0.08] transition-[background-color,transform] duration-100 active:scale-95 active:bg-foreground/25 dark:bg-white/[0.14]"

  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center bg-background px-8 pt-safe pb-safe">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 pt-10">
        <Lock className="size-6" />
        <p className="text-[1.25rem] font-medium">{error ? "Wrong Passcode" : "Enter Passcode"}</p>
        <div className={cn("flex h-4 gap-5", error && "animate-[shake_0.35s]")} aria-live="polite" aria-label={`${pin.length} digits entered`}>
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <span key={i} className={cn("size-3.5 rounded-full border-[1.5px] border-foreground transition-colors", i < pin.length && "bg-foreground")} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-6 gap-y-4 pb-4">
        {KEYS.map(([n, letters]) => (
          <button key={n} type="button" aria-label={n} onClick={() => press(n)} className={key}>
            <span className="grid justify-items-center leading-none">
              <span className="text-[2.125rem] font-light">{n}</span>
              <span className="h-3 text-[0.625rem] font-semibold tracking-[0.15em]">{letters}</span>
            </span>
          </button>
        ))}
        <button
          type="button"
          aria-label="Unlock with Face ID"
          disabled={!cfg?.credentialId}
          onClick={() => bio()}
          className="grid size-[4.875rem] place-items-center rounded-full text-primary active:scale-95 disabled:invisible"
        >
          <ScanFace className="size-8" strokeWidth={1.6} />
        </button>
        <button type="button" aria-label="0" onClick={() => press("0")} className={key}>
          <span className="text-[2.125rem] font-light">0</span>
        </button>
        <button
          type="button"
          aria-label="Delete"
          onClick={() => setPin((p) => p.slice(0, -1))}
          className={cn("grid size-[4.875rem] place-items-center rounded-full active:scale-95", !pin && "invisible")}
        >
          <Delete className="size-7" strokeWidth={1.6} />
        </button>
      </div>

      <div className="flex w-full max-w-xs justify-center pb-5">
        <Link
          to="/emergency"
          viewTransition
          onClick={() => setNav("modal")}
          className="flex h-11 items-center gap-1.5 rounded-full px-4 text-[1.0625rem] font-medium text-alert active:bg-muted"
        >
          <Asterisk className="size-5" strokeWidth={3} /> Emergency
        </Link>
      </div>
    </div>
  )
}
