import { useRef, useState } from "react"
import { ImagePlus } from "lucide-react"
import { EditSheet, Group, ListEditor, TextRow } from "@/components/ios"
import { db, saveFile, type Photo } from "@/lib/db"
import { compressImage } from "@/lib/image"
import { uid } from "@/lib/id"
import { useFileUrl } from "@/hooks/use-file-url"
import type { ISODate } from "@/lib/date"

function Tile({ photo, onOpen }: { photo: Photo; onOpen: () => void }) {
  const url = useFileUrl(photo.fileId)
  return (
    <button type="button" onClick={onOpen} className="relative aspect-square overflow-hidden rounded-xl bg-muted active:opacity-80">
      {url && <img src={url} alt={photo.caption || "Photo"} loading="lazy" decoding="async" className="size-full object-cover" />}
      {(photo.caption || photo.tags.length > 0) && (
        <span className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/70 to-transparent px-1.5 pt-4 pb-1 text-left text-[10px] text-white">
          {photo.caption || photo.tags.map((t) => `#${t}`).join(" ")}
        </span>
      )}
    </button>
  )
}

export function PhotoGallery({
  date,
  photos,
  onChange,
}: {
  date: ISODate
  photos: Photo[]
  onChange: (fn: (p: Photo[]) => Photo[]) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [openId, setOpenId] = useState<string>()
  const open = photos.find((p) => p.id === openId)
  const openUrl = useFileUrl(open?.fileId)
  const upd = (id: string, fn: (p: Photo) => Photo) => onChange((ps) => ps.map((p) => (p.id === id ? fn(p) : p)))

  return (
    <>
      <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
        {photos.map((p) => (
          <Tile key={p.id} photo={p} onOpen={() => setOpenId(p.id)} />
        ))}
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl bg-muted text-[13px] font-medium text-primary active:opacity-70"
        >
          <ImagePlus className="size-6" />
          Add photos
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ""
          const added: Photo[] = []
          for (const f of files) added.push({ id: uid(), fileId: await saveFile(await compressImage(f), date), tags: [] })
          onChange((ps) => [...ps, ...added])
        }}
      />
      <EditSheet
        open={!!open}
        onOpenChange={(o) => !o && setOpenId(undefined)}
        title="Memory"
        onDelete={() => {
          if (!open) return
          db.files.delete(open.fileId)
          onChange((ps) => ps.filter((p) => p.id !== open.id))
        }}
        deleteLabel="Delete Photo"
      >
        {open && (
          <>
            {openUrl && <img src={openUrl} alt={open.caption || "Photo"} className="max-h-[45dvh] w-full rounded-[1.625rem] object-contain" />}
            <Group>
              <TextRow label="Caption" value={open.caption} onCommit={(v) => upd(open.id, (p) => ({ ...p, caption: v }))} placeholder="Add a caption" />
              <TextRow label="Location" value={open.location} onCommit={(v) => upd(open.id, (p) => ({ ...p, location: v }))} placeholder="Where was this?" />
            </Group>
            <Group header="Tags" footer="e.g. Family, Travel — searchable with #tag.">
              <ListEditor items={open.tags} onChange={(tags) => upd(open.id, (p) => ({ ...p, tags: tags.map((t) => t.replace(/^#/, "").replace(/\s+/g, "")) }))} placeholder="Add tag" />
            </Group>
          </>
        )}
      </EditSheet>
    </>
  )
}
