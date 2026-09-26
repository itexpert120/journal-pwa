import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Mic, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// iOS Safari records AAC in MP4; Chrome/Android record Opus in WebM.
const MIME = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"]

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

export function VoiceRecorder({ onSave }: { onSave: (blob: Blob) => void }) {
  const [rec, setRec] = useState<MediaRecorder>()
  const [secs, setSecs] = useState(0)
  const [level, setLevel] = useState(0)
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

      // Live input level meter so users can see it's hearing them.
      const ac = new AudioContext()
      const an = ac.createAnalyser()
      an.fftSize = 256
      ac.createMediaStreamSource(stream).connect(an)
      const buf = new Uint8Array(an.frequencyBinCount)
      let raf = 0
      const tick = () => {
        an.getByteFrequencyData(buf)
        setLevel(buf.reduce((a, b) => a + b, 0) / buf.length / 128)
        raf = requestAnimationFrame(tick)
      }
      tick()
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
    setLevel(0)
    navigator.vibrate?.(15)
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border bg-background/60 p-3">
      <Button
        size="icon-lg"
        onClick={rec ? stop : start}
        aria-label={rec ? "Stop recording" : "Record voice note"}
        className={cn("size-14 rounded-full", rec && "bg-alert hover:bg-alert/90")}
        style={rec ? { boxShadow: `0 0 0 ${4 + level * 14}px color-mix(in oklch, var(--alert) 25%, transparent)` } : undefined}
      >
        {rec ? <Square className="size-5 fill-current" /> : <Mic className="size-6" />}
      </Button>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{rec ? "Recording…" : "Voice note"}</p>
        <p className="text-sm text-muted-foreground tabular-nums">{rec ? fmt(secs) : "Tap to record"}</p>
      </div>
    </div>
  )
}
