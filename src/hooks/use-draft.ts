import { useEffect, useRef, useState } from "react"

/**
 * Local draft that follows the stored value until the user edits,
 * then commits after a short pause and on blur. Keeps typing lag-free
 * while IndexedDB round-trips happen in the background.
 */
export function useDraft<T>(value: T, commit: (v: T) => void, delay = 500) {
  const [draft, setDraft] = useState(value)
  const dirty = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const latest = useRef({ draft, commit })
  latest.current = { draft, commit }

  useEffect(() => {
    if (!dirty.current) setDraft(value)
  }, [value])

  const flush = () => {
    clearTimeout(timer.current)
    if (!dirty.current) return
    dirty.current = false
    latest.current.commit(latest.current.draft)
  }
  const change = (v: T) => {
    dirty.current = true
    setDraft(v)
    latest.current.draft = v
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, delay)
  }
  useEffect(() => () => flush(), [])
  return { draft, change, flush }
}

