import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Horizontal scroller whose edges fade out only where more content is
 * hidden — the scroll "shadow" cue used by native tab strips.
 */
export function ScrollFade({
  children,
  className,
  scrollRef,
}: {
  children: React.ReactNode
  className?: string
  scrollRef?: React.RefObject<HTMLDivElement | null>
}) {
  const own = useRef<HTMLDivElement>(null)
  const ref = scrollRef ?? own
  const [edges, setEdges] = useState({ start: false, end: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () =>
      setEdges({ start: el.scrollLeft > 2, end: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 })
    update()
    el.addEventListener("scroll", update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", update)
      ro.disconnect()
    }
  }, [ref])

  const fade = "1.75rem"
  const mask = `linear-gradient(to right, ${edges.start ? "transparent" : "#000"}, #000 ${fade}, #000 calc(100% - ${fade}), ${edges.end ? "transparent" : "#000"})`
  return (
    <div
      ref={ref}
      className={cn("overflow-x-auto scrollbar-none", className)}
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      {children}
    </div>
  )
}
