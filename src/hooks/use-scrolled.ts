import { useEffect, useState, type RefObject } from "react"

/** True once the scroll container has content scrolled under its top bar. */
export function useScrolled(ref: RefObject<HTMLElement | null>, threshold = 4) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const on = () => setScrolled(el.scrollTop > threshold)
    on()
    el.addEventListener("scroll", on, { passive: true })
    return () => el.removeEventListener("scroll", on)
  }, [ref, threshold])
  return scrolled
}
