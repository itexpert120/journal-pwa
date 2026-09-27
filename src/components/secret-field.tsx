import { useEffect, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { EditSheet, FieldRow, Group } from "@/components/ios"
import { openText, sealText, type Sealed } from "@/lib/crypto"
import { getLockConfig, unlockWithBiometric } from "@/lib/lock"

const mask = (s: string) => `•••• ${s.slice(-4)}`

/**
 * Encrypted-at-rest ID number as a list row. Masked by default; revealing
 * asks for Face ID / fingerprint again when biometric lock is on.
 */
export function SecretRow({
  label,
  sealed,
  onSave,
}: {
  label: string
  sealed: Sealed | undefined
  onSave: (s: Sealed | undefined) => void
}) {
  const [plain, setPlain] = useState("")
  const [draft, setDraft] = useState("")
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
        return toast.error("Verification cancelled")
      }
    }
    setRevealed(true)
    setTimeout(() => setRevealed(false), 20_000)
  }

  return (
    <>
      <div className="flex min-h-[3.25rem] items-center gap-2 pr-2 pl-4 text-[1.0625rem]">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 py-3 text-left active:opacity-60"
          onClick={() => {
            setDraft(plain)
            setEditing(true)
          }}
        >
          <span className="flex-1 truncate">{label}</span>
          <span className="truncate font-mono text-[0.9375rem] text-muted-foreground tabular-nums">
            {plain ? (revealed ? plain : mask(plain)) : "Not Set"}
          </span>
        </button>
        {plain && (
          <button
            type="button"
            aria-label={revealed ? "Hide" : "Reveal"}
            onClick={reveal}
            className="grid size-10 place-items-center rounded-full text-primary active:bg-muted"
          >
            {revealed ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        )}
      </div>
      <EditSheet
        open={editing}
        onOpenChange={async (o) => {
          if (!o) onSave(await sealText(draft.trim()))
          setEditing(o)
        }}
      title={label}
      >
        <Group footer="Encrypted on this device and shown masked.">
          <FieldRow label="Number">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              className="min-w-0 flex-1 bg-transparent py-3 text-right font-mono text-[1.0625rem] outline-none"
            />
          </FieldRow>
        </Group>
      </EditSheet>
    </>
  )
}
