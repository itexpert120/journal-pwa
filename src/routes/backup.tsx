import { useRef, useState } from "react"
import { toast } from "sonner"
import { CloudUpload, FolderOpen, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Page } from "@/components/app-shell"
import { Field } from "@/components/fields"
import { Section } from "@/components/section"
import { createBackup, restoreBackup } from "@/lib/backup"
import { kvSet } from "@/lib/db"
import { todayISO } from "@/lib/date"

export function Component() {
  const [pass, setPass] = useState("")
  const [pass2, setPass2] = useState("")
  const [busy, setBusy] = useState<"backup" | "restore">()
  const [restoreFile, setRestoreFile] = useState<File>()
  const [restorePass, setRestorePass] = useState("")
  const input = useRef<HTMLInputElement>(null)

  const backup = async () => {
    if (pass.length < 8) return toast.error("Use a passphrase of at least 8 characters")
    if (pass !== pass2) return toast.error("Passphrases don't match")
    setBusy("backup")
    try {
      const blob = await createBackup(pass)
      const file = new File([blob], `journal-backup-${todayISO()}.journal`, { type: "application/json" })
      // Share sheet lets the user drop it straight into Google Drive, iCloud Drive or Files.
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
      toast.error("Couldn't restore — wrong passphrase or damaged file.")
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <Page title="Backup" back="/more">
      <div className="grid gap-4">
        <Section title="Encrypted backup" icon={CloudUpload}>
          <p className="text-sm text-muted-foreground">
            Everything — entries, photos, voice notes and your profile — is encrypted on this phone with your passphrase
            (AES-256) before it leaves. Save the file to Google Drive, iCloud Drive or Files. Nobody, including the cloud
            provider, can read it without the passphrase.
          </p>
          <Field label="Passphrase">
            <Input type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} />
          </Field>
          <Field label="Confirm passphrase">
            <Input type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} />
          </Field>
          <p className="flex gap-2 text-xs text-amber-700 dark:text-amber-400">
            <ShieldCheck className="size-4 shrink-0" /> If you forget the passphrase the backup can't be recovered.
          </p>
          <Button size="lg" onClick={backup} disabled={!!busy || !pass}>
            {busy === "backup" ? <Loader2 className="animate-spin" /> : <CloudUpload />} Create backup
          </Button>
        </Section>

        <Section title="Restore" icon={FolderOpen}>
          <p className="text-sm text-muted-foreground">Replaces everything on this device with the backup's contents.</p>
          <Button variant="outline" size="lg" onClick={() => input.current?.click()} disabled={!!busy}>
            <FolderOpen /> Choose backup file
          </Button>
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
        </Section>
      </div>

      <AlertDialog open={!!restoreFile} onOpenChange={(o) => !o && setRestoreFile(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore {restoreFile?.name}?</AlertDialogTitle>
            <AlertDialogDescription>All current data on this device will be replaced.</AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="password"
            placeholder="Backup passphrase"
            value={restorePass}
            onChange={(e) => setRestorePass(e.target.value)}
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={restore} disabled={!restorePass || !!busy}>
              {busy === "restore" && <Loader2 className="animate-spin" />} Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  )
}
