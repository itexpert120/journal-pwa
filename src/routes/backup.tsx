import { useRef, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { CloudUpload, FolderOpen, Loader2, ShieldCheck } from "lucide-react"
import { Page } from "@/components/app-shell"
import { ActionRow, EditSheet, FieldRow, Group, Row } from "@/components/ios"
import { createBackup, restoreBackup } from "@/lib/backup"
import { kvGet, kvSet } from "@/lib/db"
import { todayISO } from "@/lib/date"

function Secret({ label, value, onChange, autoFocus }: { label: string; value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <FieldRow label={label}>
      <input
        type="password"
        autoComplete="new-password"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Required"
        className="min-w-0 flex-1 bg-transparent py-3 text-right text-[1.0625rem] outline-none placeholder:text-muted-foreground/60"
      />
    </FieldRow>
  )
}

export function Component() {
  const [sheet, setSheet] = useState(false)
  const [pass, setPass] = useState("")
  const [pass2, setPass2] = useState("")
  const [busy, setBusy] = useState<"backup" | "restore">()
  const [restoreFile, setRestoreFile] = useState<File>()
  const [restorePass, setRestorePass] = useState("")
  const input = useRef<HTMLInputElement>(null)
  const last = useLiveQuery(() => kvGet<number>("lastBackup"), [])

  const backup = async () => {
    if (pass.length < 8) return toast.error("Use at least 8 characters")
    if (pass !== pass2) return toast.error("Passphrases don't match")
    setBusy("backup")
    try {
      const blob = await createBackup(pass)
      const file = new File([blob], `journal-backup-${todayISO()}.journal`, { type: "application/json" })
      // The share sheet saves straight to Google Drive, iCloud Drive or Files.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Journal backup" }).catch((e) => {
          if (e.name !== "AbortError") throw e
        })
      } else {
        const a = document.createElement("a")
        a.href = URL.createObjectURL(file)
        a.download = file.name
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
      }
      await kvSet("lastBackup", Date.now())
      setPass("")
      setPass2("")
      setSheet(false)
    } catch (e) {
      toast.error(`Backup failed: ${(e as Error).message}`)
    } finally {
      setBusy(undefined)
    }
  }

  const restore = async () => {
    if (!restoreFile) return
    setBusy("restore")
    try {
      const n = await restoreBackup(restoreFile, restorePass)
      toast.success(`Restored ${n} days`)
      setRestoreFile(undefined)
      setRestorePass("")
    } catch {
      toast.error("Wrong passphrase or damaged file")
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <Page title="Backup" back="/more" backLabel="Settings">
      <div className="grid gap-8">
        <div className="grid place-items-center gap-3 px-6 pt-2 text-center">
          <span className="grid size-16 place-items-center rounded-[1.125rem] bg-primary text-white shadow-lg shadow-primary/30">
            <ShieldCheck className="size-9" />
          </span>
          <p className="text-[0.9375rem] text-muted-foreground">
            Backups are end-to-end encrypted on this device with your passphrase before they leave it. Save them to Google
            Drive, iCloud Drive or Files. Nobody can read them without the passphrase.
          </p>
        </div>
        <Group>
          <Row label="Last Backup" value={last ? formatDistanceToNow(last, { addSuffix: true }) : "Never"} />
          <ActionRow icon={CloudUpload} onClick={() => setSheet(true)}>
            Back Up Now
          </ActionRow>
        </Group>
        <Group footer="Restoring replaces everything on this device with the backup's contents.">
          <ActionRow icon={FolderOpen} onClick={() => input.current?.click()}>
            Restore From File…
          </ActionRow>
        </Group>
      </div>
      <input
        ref={input}
        type="file"
        accept=".journal,application/json"
        hidden
        onChange={(e) => {
          setRestoreFile(e.target.files?.[0])
          e.target.value = ""
        }}
      />

      <EditSheet open={sheet} onOpenChange={setSheet} title="Encrypted Backup">
        <Group footer="If you forget this passphrase, the backup can't be recovered.">
          <Secret label="Passphrase" value={pass} onChange={setPass} autoFocus />
          <Secret label="Confirm" value={pass2} onChange={setPass2} />
        </Group>
        <Group>
          <ActionRow onClick={backup}>
            {busy === "backup" && <Loader2 className="size-5 animate-spin" />} Create Backup
          </ActionRow>
        </Group>
      </EditSheet>

      <EditSheet open={!!restoreFile} onOpenChange={(o) => !o && setRestoreFile(undefined)} title="Restore Backup">
        <Group header={restoreFile?.name} footer="All current data on this device will be replaced.">
          <Secret label="Passphrase" value={restorePass} onChange={setRestorePass} autoFocus />
        </Group>
        <Group>
          <ActionRow destructive onClick={restore}>
            {busy === "restore" && <Loader2 className="size-5 animate-spin" />} Replace & Restore
          </ActionRow>
        </Group>
      </EditSheet>
    </Page>
  )
}
