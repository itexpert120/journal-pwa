import { useEffect, useRef, useState, type ComponentProps } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

/**
 * Local draft that follows the stored value until the user edits,
 * then commits after a short pause and on blur. Keeps typing lag-free
 * while IndexedDB round-trips happen in the background.
 */
function useDraft<T>(value: T, commit: (v: T) => void, delay = 500) {
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

type BaseInput = Omit<ComponentProps<"input">, "value" | "onChange" | "type">

export function TextField({
  value,
  onCommit,
  ...props
}: BaseInput & { value: string | undefined; onCommit: (v: string) => void; type?: string }) {
  const { draft, change, flush } = useDraft(value ?? "", onCommit)
  return <Input {...props} value={draft} onChange={(e) => change(e.target.value)} onBlur={flush} />
}

export function NumberField({
  value,
  onCommit,
  decimal,
  ...props
}: BaseInput & { value: number | undefined; onCommit: (v: number | undefined) => void; decimal?: boolean }) {
  const { draft, change, flush } = useDraft(value === undefined ? "" : String(value), (s) => {
    const n = parseFloat(s.replace(",", "."))
    onCommit(Number.isFinite(n) ? n : undefined)
  })
  return (
    <Input
      {...props}
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      pattern={decimal ? "[0-9]*[.,]?[0-9]*" : "[0-9]*"}
      enterKeyHint="done"
      value={draft}
      onChange={(e) => change(e.target.value)}
      onBlur={flush}
      className={cn("tabular-nums", props.className)}
    />
  )
}

export function TextAreaField({
  value,
  onCommit,
  ...props
}: Omit<ComponentProps<"textarea">, "value" | "onChange"> & { value: string | undefined; onCommit: (v: string) => void }) {
  const { draft, change, flush } = useDraft(value ?? "", onCommit, 700)
  return <Textarea {...props} value={draft} onChange={(e) => change(e.target.value)} onBlur={flush} />
}

/** Labelled control. Wraps in <label> so tapping the caption focuses the input. */
export function Field({
  label,
  hint,
  children,
  className,
  group,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  className?: string
  /** Use for multi-control groups (buttons etc.) where a <label> wrapper would misroute taps. */
  group?: boolean
}) {
  const Comp = group ? "div" : "label"
  return (
    <Comp className={cn("grid min-w-0 gap-1.5", className)} role={group ? "group" : undefined} aria-label={group ? label : undefined}>
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
        {hint && <span className="ml-1 font-normal normal-case">({hint})</span>}
      </span>
      {children}
    </Comp>
  )
}
