import { useEffect, useRef } from "react"

/**
 * Points are stored normalised to the canvas CSS width (x/W, y/W) so a page
 * written on one phone redraws correctly at any other width or orientation.
 */
export interface Stroke {
  color: string
  /** Line width as a fraction of canvas width. */
  size: number
  eraser?: boolean
  /** Flat [x, y, pressure, x, y, pressure, …] */
  pts: number[]
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke, W: number) {
  const p = s.pts
  if (p.length < 3) return
  ctx.globalCompositeOperation = s.eraser ? "destination-out" : "source-over"
  ctx.strokeStyle = s.color
  ctx.fillStyle = s.color
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  if (p.length === 3) {
    ctx.beginPath()
    ctx.arc(p[0] * W, p[1] * W, (s.size * W * (0.5 + p[2])) / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  // Variable width: draw segment by segment, midpoint-smoothed.
  for (let i = 3; i < p.length; i += 3) {
    const x0 = p[i - 3] * W,
      y0 = p[i - 2] * W,
      x1 = p[i] * W,
      y1 = p[i + 1] * W
    const pr = (p[i - 1] + p[i + 2]) / 2
    ctx.lineWidth = s.size * W * (s.eraser ? 4 : 0.5 + pr)
    ctx.beginPath()
    if (i >= 6) {
      const mx = (p[i - 6] * W + x0) / 2,
        my = (p[i - 5] * W + y0) / 2
      ctx.moveTo(mx, my)
      ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
    } else {
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
    }
    ctx.stroke()
  }
}

export function DrawingCanvas({
  strokes,
  onStroke,
  active,
  tool,
  className,
}: {
  strokes: Stroke[]
  onStroke: (s: Stroke) => void
  active: boolean
  tool: { color: string; size: number; eraser: boolean }
  className?: string
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const live = useRef<Stroke | null>(null)
  const penSeen = useRef(false)
  const latest = useRef({ strokes, tool, onStroke })
  latest.current = { strokes, tool, onStroke }

  const redraw = () => {
    const c = canvas.current
    if (!c) return
    const ctx = c.getContext("2d")!
    const W = c.clientWidth
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, c.width, c.height)
    const dpr = c.width / W
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    for (const s of latest.current.strokes) drawStroke(ctx, s, W)
    if (live.current) drawStroke(ctx, live.current, W)
  }

  // Match backing store to CSS size × devicePixelRatio (crisp ink on retina screens).
  useEffect(() => {
    const c = canvas.current!
    const ro = new ResizeObserver(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      c.width = Math.round(c.clientWidth * dpr)
      c.height = Math.round(c.clientHeight * dpr)
      redraw()
    })
    ro.observe(c)
    return () => ro.disconnect()
  }, [])

  useEffect(redraw, [strokes])

  useEffect(() => {
    const c = canvas.current!
    if (!active) return
    const pos = (e: PointerEvent) => {
      const r = c.getBoundingClientRect()
      const W = r.width
      // Mouse / finger report pressure 0.5 by default; pens report real pressure.
      const pr = e.pointerType === "pen" ? e.pressure || 0.5 : 0.5
      return [(e.clientX - r.left) / W, (e.clientY - r.top) / W, pr]
    }
    const down = (e: PointerEvent) => {
      if (e.pointerType === "pen") penSeen.current = true
      // Palm rejection: once a stylus is used, fingers no longer draw.
      if (penSeen.current && e.pointerType === "touch") return
      if (!e.isPrimary) return
      c.setPointerCapture(e.pointerId)
      const { tool } = latest.current
      live.current = { color: tool.color, size: tool.size, eraser: tool.eraser || undefined, pts: pos(e) }
      redraw()
    }
    const move = (e: PointerEvent) => {
      if (!live.current || !c.hasPointerCapture(e.pointerId)) return
      // Use coalesced events for smooth fast strokes (120 Hz pens).
      const evs = e.getCoalescedEvents?.() ?? [e]
      for (const ev of evs.length ? evs : [e]) live.current.pts.push(...pos(ev))
      redraw()
    }
    const up = (e: PointerEvent) => {
      if (!live.current) return
      if (c.hasPointerCapture(e.pointerId)) c.releasePointerCapture(e.pointerId)
      const s = live.current
      live.current = null
      // Round to 4 dp to keep stored JSON compact.
      s.pts = s.pts.map((n) => Math.round(n * 1e4) / 1e4)
      latest.current.onStroke(s)
    }
    c.addEventListener("pointerdown", down)
    c.addEventListener("pointermove", move)
    c.addEventListener("pointerup", up)
    c.addEventListener("pointercancel", up)
    return () => {
      c.removeEventListener("pointerdown", down)
      c.removeEventListener("pointermove", move)
      c.removeEventListener("pointerup", up)
      c.removeEventListener("pointercancel", up)
    }
  }, [active])

  return (
    <canvas
      ref={canvas}
      className={className}
      style={{ touchAction: active ? "none" : "auto", pointerEvents: active ? "auto" : "none" }}
      aria-label={active ? "Handwriting area" : undefined}
      aria-hidden={!active}
    />
  )
}
