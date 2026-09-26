import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { Eraser, Keyboard, Mic, PenLine, Trash2, Undo2 } from "lucide-react"
import { Cell, Group, Segmented } from "@/components/ios"
import { DrawingCanvas, type Stroke } from "@/components/drawing-canvas"
import { VoiceRecorder, VoiceNote } from "@/components/voice-recorder"
import { PhotoGallery } from "@/components/photo-gallery"
import { useDraft } from "@/hooks/use-draft"
import { db, saveFile, type Paper } from "@/lib/db"
import { useResolvedDark } from "@/lib/theme"
import { cn } from "@/lib/utils"
import type { SectionProps } from "./types"

type Mode = "type" | "write" | "voice"
const INKS = ["#1c1c1e", "#007aff", "#ff3b30", "#34c759", "#ff9500"]
/** Black ink is shown as white in dark mode so it stays readable. */
const shown = (c: string, dark: boolean) => (dark && c === "#1c1c1e" ? "#f5f5f7" : c)

function useDrawing(date: string) {
  const id = `drawing-${date}`
  const strokes =
    useLiveQuery(async () => {
      const f = await db.files.get(id)
      return f ? (JSON.parse(await f.blob.text()) as Stroke[]) : []
    }, [id]) ?? []
  const save = (next: Stroke[]) =>
    db.files.put({ id, date, blob: new Blob([JSON.stringify(next)], { type: "application/json" }), type: "application/json", createdAt: Date.now() })
  return { id, strokes, save }
}

function JournalText({ value, onCommit, readOnly, placeholder }: { value: string; onCommit: (v: string) => void; readOnly: boolean; placeholder: string }) {
  const d = useDraft(value, onCommit, 700)
  return (
    <textarea
      value={d.draft}
      onChange={(e) => d.change(e.target.value)}
      onBlur={d.flush}
      readOnly={readOnly}
      placeholder={placeholder}
      aria-label="Journal text"
      className="block field-sizing-content min-h-[55dvh] w-full resize-none bg-transparent px-5 pt-[0.35rem] font-serif text-[19px] leading-8 caret-primary outline-none placeholder:text-muted-foreground/60"
    />
  )
}

const ModeLabel = ({ icon: Icon, children }: { icon: typeof Keyboard; children: string }) => (
  <span className="flex items-center justify-center gap-1.5">
    <Icon className="size-4" /> {children}
  </span>
)

export function JournalSection({ date, entry, patch }: SectionProps) {
  const [mode, setMode] = useState<Mode>("type")
  const [ink, setInk] = useState(INKS[0])
  const [eraser, setEraser] = useState(false)
  const drawing = useDrawing(date)
  const dark = useResolvedDark()
  const paper = entry.journal.paper

  const voiceNotes = entry.journal.voiceIds.map((id, i) => (
    <VoiceNote
      key={id}
      id={id}
      index={i + 1}
      onDelete={() => {
        db.files.delete(id)
        patch((e) => void (e.journal.voiceIds = e.journal.voiceIds.filter((x) => x !== id)))
      }}
    />
  ))

  return (
    <>
      <div className="grid gap-3 md:col-span-2">
        <Segmented<Mode>
          label="Input mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "type", label: <ModeLabel icon={Keyboard}>Type</ModeLabel> },
            { value: "write", label: <ModeLabel icon={PenLine}>Write</ModeLabel> },
            { value: "voice", label: <ModeLabel icon={Mic}>Voice</ModeLabel> },
          ]}
        />

        {mode === "voice" && (
          <Group>
            <VoiceRecorder
              onSave={async (blob) => {
                const id = await saveFile(blob, date, "Voice note")
                patch((e) => void e.journal.voiceIds.push(id))
              }}
            />
            {voiceNotes}
          </Group>
        )}

        {/* The page: typed text underneath, handwriting canvas layered on top. */}
        <section
          className={cn("relative overflow-hidden rounded-[1.625rem] shadow-[0_1px_2px_rgb(0_0_0/0.05)]", `paper-${paper}`, mode === "write" && "ring-2 ring-primary/50")}
          data-no-swipe={mode === "write" ? "" : undefined}
        >
          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-1">
            <h3 className="text-[15px] font-semibold text-muted-foreground">Dear diary</h3>
            <Segmented<Paper>
              label="Paper"
              value={paper}
              onChange={(p) => patch((e) => void (e.journal.paper = p))}
              className="h-8 w-44"
              options={[
                { value: "lined", label: "Lined" },
                { value: "grid", label: "Grid" },
                { value: "plain", label: "Plain" },
              ]}
            />
          </div>
          <div className="relative">
            <JournalText
              value={entry.journal.text}
              onCommit={(v) => patch((e) => void (e.journal.text = v))}
              readOnly={mode === "write"}
              placeholder={mode === "type" ? "How was your day?" : ""}
            />
            <DrawingCanvas
              className="absolute inset-0 size-full"
              strokes={drawing.strokes.map((s) => ({ ...s, color: shown(s.color, dark) }))}
              active={mode === "write"}
              tool={{ color: shown(ink, dark), size: eraser ? 0.012 : 0.0055, eraser }}
              onStroke={(s) => {
                drawing.save([...drawing.strokes, { ...s, color: eraser ? s.color : ink }])
                if (!entry.journal.drawingId) patch((e) => void (e.journal.drawingId = drawing.id))
              }}
            />
          </div>

          {/* Floating tool palette, PencilKit-style */}
          {mode === "write" && (
            <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] z-10 flex justify-center px-3 pb-3 md:bottom-4">
              <div className="glass flex items-center gap-0.5 rounded-full p-1.5">
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
                    className="grid size-9 place-items-center rounded-full active:scale-90"
                  >
                    <span className={cn("size-6 rounded-full transition-all", !eraser && ink === c && "ring-2 ring-foreground/60 ring-offset-2 ring-offset-card")} style={{ background: shown(c, dark) }} />
                  </button>
                ))}
                <span className="mx-1 h-6 w-px bg-border" />
                <button
                  type="button"
                  aria-label="Eraser"
                  aria-pressed={eraser}
                  onClick={() => setEraser((e) => !e)}
                  className={cn("grid size-9 place-items-center rounded-full active:scale-90", eraser && "bg-primary text-primary-foreground")}
                >
                  <Eraser className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label="Undo stroke"
                  disabled={!drawing.strokes.length}
                  onClick={() => drawing.save(drawing.strokes.slice(0, -1))}
                  className="grid size-9 place-items-center rounded-full active:scale-90 disabled:opacity-30"
                >
                  <Undo2 className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label="Clear handwriting"
                  disabled={!drawing.strokes.length}
                  onClick={() => {
                    drawing.save([])
                    patch((e) => void (e.journal.drawingId = undefined))
                  }}
                  className="grid size-9 place-items-center rounded-full text-destructive active:scale-90 disabled:opacity-30"
                >
                  <Trash2 className="size-5" />
                </button>
              </div>
            </div>
          )}
        </section>

        {mode !== "voice" && voiceNotes.length > 0 && <Group header="Voice Notes">{voiceNotes}</Group>}
      </div>

      <Group header="Memories" className="md:col-span-2">
        <Cell>
          <PhotoGallery date={date} photos={entry.photos} onChange={(fn) => patch((e) => void (e.photos = fn(e.photos)))} />
        </Cell>
      </Group>
    </>
  )
}
