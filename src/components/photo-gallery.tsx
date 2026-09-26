import { useRef, useState } from "react"
import { ImagePlus, MapPin, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Field, TextField } from "@/components/fields"
import { db, saveFile, type Photo } from "@/lib/db"
import { compressImage } from "@/lib/image"
import { uid } from "@/lib/id"
import { useFileUrl } from "@/hooks/use-file-url"
import type { ISODate } from "@/lib/date"

function Tile({ photo, onOpen }: { photo: Photo; onOpen: () => void }) {
  const url = useFileUrl(photo.fileId)
  return (
    <button type="button" onClick={onOpen} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
      {url && <img src={url} alt={photo.caption || "Photo"} loading="lazy" decoding="async" className="size-full object-cover" />}
      {(photo.caption || photo.tags.length > 0) && (
        <span className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/70 to-transparent px-1.5 pt-4 pb-1 text-left text-[10px] text-white">
          {photo.caption || photo.tags.map((t) => `#${t}`).join(" ")}
        </span>
      )}
    </button>
  )
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [v, setV] = useState("")
  const add = () => {
    const t = v.replace(/^#/, "").trim().replace(/\s+/g, "")
    if (t && !tags.includes(t)) onChange([...tags, t])
    setV("")
  }
  return (
    <div className="grid gap-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Badge key={t} variant="secondary" className="h-8 gap-1 pr-1 text-sm">
              #{t}
              <button
                type="button"
                aria-label={`Remove tag ${t}`}
                className="grid size-6 place-items-center rounded-full"
                onClick={() => onChange(tags.filter((x) => x !== t))}
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <Input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={add}
          placeholder="#Family, #Travel…"
          autoCapitalize="none"
          enterKeyHint="done"
        />
      </form>
    </div>
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
      <div className="grid grid-cols-3 gap-1.5 md:grid-cols-5">
        {photos.map((p) => (
          <Tile key={p.id} photo={p} onOpen={() => setOpenId(p.id)} />
        ))}
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground active:bg-muted"
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
      <Drawer open={!!open} onOpenChange={(o) => !o && setOpenId(undefined)} showSwipeHandle>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-3xl">Memory</DrawerTitle>
          </DrawerHeader>
          {open && (
            <div className="grid gap-4 overflow-y-auto p-4">
              {openUrl && <img src={openUrl} alt={open.caption || "Photo"} className="max-h-[45dvh] w-full rounded-xl object-contain" />}
              <Field label="Caption">
                <TextField value={open.caption} onCommit={(v) => upd(open.id, (p) => ({ ...p, caption: v }))} placeholder="A short caption" />
              </Field>
              <Field label="Location">
                <div className="relative">
                  <MapPin className="pointer-events-none absolute top-3 left-3 size-5 text-muted-foreground" />
                  <TextField
                    value={open.location}
                    onCommit={(v) => upd(open.id, (p) => ({ ...p, location: v }))}
                    placeholder="Where was this?"
                    className="pl-10"
                  />
                </div>
              </Field>
              <Field label="Tags" group>
                <TagInput tags={open.tags} onChange={(tags) => upd(open.id, (p) => ({ ...p, tags }))} />
              </Field>
              <Button
                variant="destructive"
                size="lg"
                onClick={() => {
                  db.files.delete(open.fileId)
                  onChange((ps) => ps.filter((p) => p.id !== open.id))
                  setOpenId(undefined)
                }}
              >
                <Trash2 /> Delete photo
              </Button>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </>
  )
}
