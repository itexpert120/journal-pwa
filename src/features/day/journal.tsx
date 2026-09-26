import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { Eraser, Images, Keyboard, Mic, NotebookPen, PenLine, Trash2, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { TextAreaField } from "@/components/fields"
import { Section } from "@/components/section"
import { DrawingCanvas, type Stroke } from "@/components/drawing-canvas"
import { VoiceRecorder } from "@/components/voice-recorder"
import { PhotoGallery } from "@/components/photo-gallery"
import { db, saveFile, type Paper } from "@/lib/db"
import { useFileUrl } from "@/hooks/use-file-url"
import { cn } from "@/lib/utils"
import { useResolvedDark } from "@/lib/theme"
import type { SectionProps } from "./types"

type Mode = "type" | "write" | "voice"
const INKS = ["#1f2937", "#1d4ed8", "#b91c1c", "#047857"]
const DARK_INKS: Record<string, string> = { "#1f2937": "#f3f4f6" }

function useDrawing(date: string) {
  const id = `drawing-${date}`
  const strokes =
    useLiveQuery(async () => {
      const f = await db.files.get(id)
      return f ? (JSON.parse(await f.blob.text()) as Stroke[]) : []
    }, [id]) ?? []
  const save = async (next: Stroke[]) => {
    await db.files.put({ id, date, blob: new Blob([JSON.stringify(next)], { type: "application/json" }), type: "application/json", createdAt: Date.now() })
  }
  return { id, strokes, save }
}

function VoiceNote({ id, onDelete }: { id: string; onDelete: () => void }) {
  const url = useFileUrl(id)
  return (
    <div className="flex items-center gap-2">
      {url && <audio src={url} controls preload="metadata" className="h-11 min-w-0 flex-1" />}
      <Button variant="ghost" size="icon" aria-label="Delete voice note" onClick={onDelete}>
        <Trash2 />
      </Button>
    </div>
  )
}

export function JournalSection({ date, entry, patch }: SectionProps) {
  const [mode, setMode] = useState<Mode>("type")
  const [ink, setInk] = useState(INKS[0])
  const [eraser, setEraser] = useState(false)
  const drawing = useDrawing(date)
  const paper = entry.journal.paper
  const dark = useResolvedDark()
  const inkShown = (c: string) => (dark && DARK_INKS[c]) || c

  return (
    <>
      <Section
        title="Journal"
        icon={NotebookPen}
        action={
          <ToggleGroup
            value={[paper]}
            onValueChange={(v) => v[0] && patch((e) => void (e.journal.paper = v[0] as Paper))}
            variant="outline"
            size="sm"
            spacing={0}
            aria-label="Paper style"
          >
            <ToggleGroupItem value="lined" className="text-xs">
              Lined
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" className="text-xs">
              Grid
            </ToggleGroupItem>
            <ToggleGroupItem value="plain" className="text-xs">
              Plain
            </ToggleGroupItem>
          </ToggleGroup>
        }
      >
        {/* Input mode toggle: Type | Handwrite | Voice */}
        <ToggleGroup
          value={[mode]}
          onValueChange={(v) => v[0] && setMode(v[0] as Mode)}
          variant="outline"
          spacing={0}
          className="grid w-full grid-cols-3"
          aria-label="Input mode"
        >
          <ToggleGroupItem value="type" className="aria-pressed:bg-primary aria-pressed:text-primary-foreground">
            <Keyboard /> Type
          </ToggleGroupItem>
          <ToggleGroupItem value="write" className="aria-pressed:bg-primary aria-pressed:text-primary-foreground">
            <PenLine /> Write
          </ToggleGroupItem>
          <ToggleGroupItem value="voice" className="aria-pressed:bg-primary aria-pressed:text-primary-foreground">
            <Mic /> Voice
          </ToggleGroupItem>
        </ToggleGroup>

        {mode === "write" && (
          <div className="flex items-center gap-1.5" data-no-swipe>
            {INKS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Ink ${c}`}
                aria-pressed={!eraser && ink === c}
                onClick={() => {
                  setInk(c)
                  setEraser(false)
                }}
                className={cn(
                  "grid size-11 place-items-center rounded-full",
                  !eraser && ink === c && "ring-2 ring-primary",
                )}
              >
                <span className="size-6 rounded-full border border-black/10" style={{ background: inkShown(c) }} />
              </button>
            ))}
            <Button
              variant={eraser ? "default" : "ghost"}
              size="icon"
              aria-label="Eraser"
              aria-pressed={eraser}
              onClick={() => setEraser((e) => !e)}
            >
              <Eraser />
            </Button>
            <span className="flex-1" />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Undo stroke"
              disabled={!drawing.strokes.length}
              onClick={() => drawing.save(drawing.strokes.slice(0, -1))}
            >
              <Undo2 />
            </Button>
          </div>
        )}

        {mode === "voice" && (
          <VoiceRecorder
            onSave={async (blob) => {
              const id = await saveFile(blob, date, "Voice note")
              patch((e) => void e.journal.voiceIds.push(id))
            }}
          />
        )}
        {entry.journal.voiceIds.length > 0 && (
          <div className="grid gap-2">
            {entry.journal.voiceIds.map((id) => (
              <VoiceNote
                key={id}
                id={id}
                onDelete={() => {
                  db.files.delete(id)
                  patch((e) => void (e.journal.voiceIds = e.journal.voiceIds.filter((x) => x !== id)))
                }}
              />
            ))}
          </div>
        )}

        {/* The page: typed text underneath, handwriting canvas layered on top. */}
        <div
          className={cn(
            "relative -mx-4 min-h-[60dvh] border-y",
            `paper-${paper}`,
            mode === "write" && "ring-2 ring-primary/40 ring-inset",
          )}
          data-no-swipe={mode === "write" ? "" : undefined}
        >
          <TextAreaField
            value={entry.journal.text}
            onCommit={(v) => patch((e) => void (e.journal.text = v))}
            placeholder={mode === "type" ? "Dear diary…" : ""}
            readOnly={mode === "write"}
            aria-label="Journal text"
            className="min-h-[60dvh] resize-none rounded-none border-0 bg-transparent px-5 pt-2 font-heading text-[1.3rem] leading-8 shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <DrawingCanvas
            className="absolute inset-0 size-full"
            strokes={drawing.strokes.map((s) => ({ ...s, color: inkShown(s.color) }))}
            active={mode === "write"}
            tool={{ color: ink, size: eraser ? 0.012 : 0.0055, eraser }}
            onStroke={(s) => {
              drawing.save([...drawing.strokes, { ...s, color: eraser ? s.color : ink }])
              if (!entry.journal.drawingId) patch((e) => void (e.journal.drawingId = drawing.id))
            }}
          />
        </div>
        {mode === "write" && drawing.strokes.length > 0 && (
          <Button
            variant="ghost"
            className="justify-self-end text-muted-foreground"
            onClick={() => {
              drawing.save([])
              patch((e) => void (e.journal.drawingId = undefined))
            }}
          >
            <Trash2 /> Clear handwriting
          </Button>
        )}
      </Section>

      <Section title="Memories" icon={Images}>
        <PhotoGallery
          date={date}
          photos={entry.photos}
          onChange={(fn) => patch((e) => void (e.photos = fn(e.photos)))}
        />
      </Section>
    </>
  )
}
