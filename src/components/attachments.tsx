import { useRef } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { FileText, Paperclip, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { db, saveFile } from "@/lib/db"
import { compressImage } from "@/lib/image"
import { useFileUrl } from "@/hooks/use-file-url"
import type { ISODate } from "@/lib/date"

function Thumb({ id, onRemove }: { id: string; onRemove: () => void }) {
  const url = useFileUrl(id)
  const file = useLiveQuery(() => db.files.get(id), [id])
  const isImage = file?.type.startsWith("image/")
  return (
    <div className="relative size-20 shrink-0">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="grid size-full place-items-center overflow-hidden rounded-lg border bg-muted"
      >
        {isImage && url ? (
          <img src={url} alt={file?.name ?? "Attachment"} className="size-full object-cover" />
        ) : (
          <div className="grid place-items-center gap-1 p-1 text-center text-[10px] text-muted-foreground">
            <FileText className="size-6" />
            <span className="line-clamp-2 break-all">{file?.name}</span>
          </div>
        )}
      </a>
      <button
        type="button"
        aria-label="Remove attachment"
        onClick={onRemove}
        className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full border bg-background shadow-sm"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

/** Image/PDF attachments (ECG printouts, lab reports). Camera is offered by the OS picker. */
export function Attachments({
  ids,
  date,
  onChange,
  label = "Attach file",
}: {
  ids: string[]
  date?: ISODate
  onChange: (ids: string[]) => void
  label?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const add = async (files: FileList | null) => {
    if (!files?.length) return
    const added = await Promise.all(
      Array.from(files).map(async (f) => saveFile(await compressImage(f, 2200, 0.88), date, f.name)),
    )
    onChange([...ids, ...added])
  }
  const remove = (id: string) => {
    onChange(ids.filter((x) => x !== id))
    db.files.delete(id)
  }
  return (
    <div className="flex gap-3 overflow-x-auto pt-2 pb-1 scrollbar-none" data-no-swipe={ids.length ? "" : undefined}>
      {ids.map((id) => (
        <Thumb key={id} id={id} onRemove={() => remove(id)} />
      ))}
      <Button
        variant="outline"
        className="size-20 shrink-0 flex-col gap-1 border-dashed text-xs text-muted-foreground"
        onClick={() => input.current?.click()}
      >
        <Paperclip className="size-5" />
        {label}
      </Button>
      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        multiple
        hidden
        onChange={(e) => {
          add(e.target.files)
          e.target.value = ""
        }}
      />
    </div>
  )
}
