import { useEffect, useState } from "react"
import { Eye, EyeOff, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { openText, sealText, type Sealed } from "@/lib/crypto"
import { getLockConfig, unlockWithBiometric } from "@/lib/lock"

const mask = (s: string) => (s.length <= 4 ? "•".repeat(s.length) : `${"•".repeat(Math.min(8, s.length - 4))} ${s.slice(-4)}`)

/**
 * Encrypted-at-rest ID number. Shown masked; revealing it asks for
 * Face ID / fingerprint again when biometric lock is set up.
 */
export function SecretField({
  label,
  sealed,
  onSave,
}: {
  label: string
  sealed: Sealed | undefined
  onSave: (s: Sealed | undefined) => void
}) {
  const [plain, setPlain] = useState("")
  const [revealed, setRevealed] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    openText(sealed).then(setPlain)
  }, [sealed])

  const reveal = async () => {
    if (revealed) return setRevealed(false)
    const cfg = await getLockConfig()
    if (cfg.enabled && cfg.credentialId) {
      try {
        if (!(await unlockWithBiometric(cfg.credentialId))) return
      } catch {
        toast.error("Verification cancelled")
        return
      }
    }
    setRevealed(true)
    // Re-mask automatically so it doesn't stay on screen.
    setTimeout(() => setRevealed(false), 20_000)
  }

  if (editing)
    return (
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          onSave(await sealText(plain.trim()))
          setEditing(false)
        }}
      >
        <Input
          autoFocus
          value={plain}
          onChange={(e) => setPlain(e.target.value)}
          aria-label={label}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
        />
        <Button type="submit">Save</Button>
      </form>
    )

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 text-left font-mono tabular-nums"
        aria-label={`Edit ${label}`}
      >
        <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
        <span className="truncate">{plain ? (revealed ? plain : mask(plain)) : <span className="font-sans text-muted-foreground">Not set</span>}</span>
      </button>
      {plain && (
        <Button variant="ghost" size="icon" aria-label={revealed ? "Hide" : "Reveal"} onClick={reveal}>
          {revealed ? <EyeOff /> : <Eye />}
        </Button>
      )}
    </div>
  )
}
