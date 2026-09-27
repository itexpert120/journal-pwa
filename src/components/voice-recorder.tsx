import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Pause, Play, Trash2 } from "lucide-react"
import { useFileUrl } from "@/hooks/use-file-url"
import { cn } from "@/lib/utils"

// iOS Safari records AAC in MP4; Chrome/Android record Opus in WebM.
const MIME = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"]
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

/** Voice Memos-style record row: big red record button, live timer and level. */
export function VoiceRecorder({ onSave }: { onSave: (blob: Blob) => void }) {
  const [rec, setRec] = useState<MediaRecorder>()
  const [secs, setSecs] = useState(0)
  const [levels, setLevels] = useState<number[]>([])
  const chunks = useRef<Blob[]>([])
  const cleanup = useRef<() => void>(undefined)

  useEffect(() => () => cleanup.current?.(), [])

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      toast.error("Voice recording isn't supported in this browser.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      const mimeType = MIME.find((m) => MediaRecorder.isTypeSupported(m))
      const r = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 64_000 } : undefined)
      chunks.current = []
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      r.onstop = () => {
        const blob = new Blob(chunks.current, { type: r.mimeType || mimeType || "audio/webm" })
        if (blob.size) onSave(blob)
      }
      const ac = new AudioContext()
      const an = ac.createAnalyser()
      an.fftSize = 256
      ac.createMediaStreamSource(stream).connect(an)
      const buf = new Uint8Array(an.frequencyBinCount)
      let raf = 0
      let last = 0
      const tick = (t: number) => {
        if (t - last > 80) {
          an.getByteFrequencyData(buf)
          const lvl = Math.min(1, buf.reduce((a, b) => a + b, 0) / buf.length / 90)
          setLevels((l) => [...l.slice(-39), lvl])
          last = t
        }
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
      const t0 = Date.now()
      const iv = setInterval(() => setSecs((Date.now() - t0) / 1000), 250)
      cleanup.current = () => {
        cancelAnimationFrame(raf)
        clearInterval(iv)
        stream.getTracks().forEach((t) => t.stop())
        ac.close()
      }
      r.start(1000)
      setSecs(0)
      setLevels([])
      setRec(r)
      navigator.vibrate?.(15)
    } catch {
      toast.error("Microphone permission is needed to record voice notes.")
    }
  }

  const stop = () => {
    rec?.stop()
    cleanup.current?.()
    cleanup.current = undefined
    setRec(undefined)
    navigator.vibrate?.(15)
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <button
        type="button"
        onClick={rec ? stop : start}
        aria-label={rec ? "Stop recording" : "Record voice note"}
        className="grid size-14 shrink-0 place-items-center rounded-full border-[3px] border-muted-foreground/40 active:scale-95"
      >
        <span className={cn("bg-[#ff3b30] transition-all duration-300", rec ? "size-6 rounded-md" : "size-10 rounded-full")} />
      </button>
      <div className="min-w-0 flex-1">
        {rec ? (
          <>
            <div className="flex h-8 items-center gap-[2px]" aria-hidden>
              {levels.map((l, i) => (
                <span key={i} className="w-[3px] rounded-full bg-[#ff3b30]" style={{ height: `${Math.max(8, l * 100)}%` }} />
              ))}
            </div>
            <p className="text-[15px] text-[#ff3b30] tabular-nums">{fmt(secs)}</p>
          </>
        ) : (
          <>
            <p className="text-[17px]">New Recording</p>
            <p className="text-[13px] text-muted-foreground">Tap to record a voice note</p>
          </>
        )}
      </div>
    </div>
  )
}

/** Playback row for a saved voice note with a scrubber-less progress bar. */
export function VoiceNote({ id, index, onDelete }: { id: string; index: number; onDelete: () => void }) {
  const url = useFileUrl(id)
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  return (
    <div className="flex min-h-[60px] items-center gap-3 px-4">
      <button
        type="button"
        aria-label={playing ? "Pause" : "Play"}
        onClick={() => (playing ? audio.current?.pause() : audio.current?.play())}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground active:scale-90"
      >
        {playing ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[17px]">Voice Note {index}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
          </div>
          <span className="text-[13px] text-muted-foreground tabular-nums">{fmt(duration && Number.isFinite(duration) ? duration - progress : 0)}</span>
        </div>
      </div>
      <button type="button" aria-label="Delete voice note" onClick={onDelete} className="grid size-9 place-items-center rounded-full text-muted-foreground active:bg-muted">
        <Trash2 className="size-[18px]" />
      </button>
      {url && (
        <audio
          ref={audio}
          src={url}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false)
            setProgress(0)
          }}
          onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        />
      )}
    </div>
  )
}
