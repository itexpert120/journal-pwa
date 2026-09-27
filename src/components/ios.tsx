/**
 * App-style building blocks modelled on iOS inset-grouped lists.
 * Screens are composed from Groups of Rows — not labelled web form boxes.
 */
import { useState } from "react"
import { Link } from "react-router"
import { Check, ChevronRight, CircleMinus, CirclePlus, Minus, Plus, type LucideIcon } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { format } from "date-fns"
import { DatePickerDrawer } from "@/components/date-picker-drawer"
import { TimePickerDrawer } from "@/components/time-picker-drawer"
import { useDraft } from "@/hooks/use-draft"
import { formatTime12, fromISO } from "@/lib/date"
import { cn } from "@/lib/utils"
import { setNav } from "@/lib/nav"

// ---------------------------------------------------------------- Group

export function Group({
  header,
  footer,
  action,
  children,
  className,
}: {
  header?: React.ReactNode
  footer?: React.ReactNode
  /** Small accessory at the right of the header (e.g. "Edit"). */
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("min-w-0", className)}>
      {(header || action) && (
        <div className="flex items-end justify-between px-4 pb-2">
          <h3 className="text-[0.9375rem] font-semibold text-muted-foreground">{header}</h3>
          {action && <div className="text-[0.9375rem] text-primary">{action}</div>}
        </div>
      )}
      <div className="overflow-hidden rounded-[1.625rem] bg-card [&>*+*]:relative [&>*+*]:before:pointer-events-none [&>*+*]:before:absolute [&>*+*]:before:top-0 [&>*+*]:before:right-0 [&>*+*]:before:left-4 [&>*+*]:before:h-px [&>*+*]:before:origin-top [&>*+*]:before:scale-y-50 [&>*+*]:before:bg-border [&>*+*]:before:content-['']">
        {children}
      </div>
      {footer && <p className="px-4 pt-1.5 text-[0.8125rem] leading-snug text-muted-foreground">{footer}</p>}
    </section>
  )
}

// ---------------------------------------------------------------- Icon tile

const TILE: Record<string, string> = {
  blue: "bg-[#007aff]",
  red: "bg-[#ff3b30]",
  green: "bg-[#34c759]",
  orange: "bg-[#ff9500]",
  yellow: "bg-[#ffcc00]",
  pink: "bg-[#ff2d55]",
  purple: "bg-[#af52de]",
  indigo: "bg-[#5856d6]",
  teal: "bg-[#30b0c7]",
  gray: "bg-[#8e8e93]",
}
export type TileColor = keyof typeof TILE

export function IconTile({ icon: Icon, color = "blue", className }: { icon: LucideIcon; color?: TileColor; className?: string }) {
  return (
    <span className={cn("grid size-[1.875rem] shrink-0 place-items-center rounded-[0.5rem] text-white", TILE[color], className)}>
      <Icon className="size-[1.125rem]" strokeWidth={2.2} />
    </span>
  )
}

// ---------------------------------------------------------------- Rows

const rowBase = "flex min-h-[3.25rem] w-full items-center gap-3 px-4 text-left text-[1.0625rem]"

type RowProps = {
  icon?: LucideIcon
  color?: TileColor
  label: React.ReactNode
  /** Secondary line under the label. */
  detail?: React.ReactNode
  /** Right-aligned grey value. */
  value?: React.ReactNode
  chevron?: boolean
  to?: string
  onClick?: () => void
  destructive?: boolean
  children?: React.ReactNode
  className?: string
}

/** Navigation / info row. Becomes a Link with `to`, a button with `onClick`. */
export function Row({ icon, color, label, detail, value, chevron, to, onClick, destructive, children, className }: RowProps) {
  const body = (
    <>
      {icon && <IconTile icon={icon} color={color} />}
      <span className="min-w-0 flex-1 py-2.5">
        <span className={cn("block truncate", destructive && "text-destructive")}>{label}</span>
        {detail && <span className="block text-[0.8125rem] leading-snug text-muted-foreground">{detail}</span>}
      </span>
      {value !== undefined && <span className="max-w-[55%] truncate text-right text-muted-foreground">{value}</span>}
      {children}
      {(chevron ?? !!to) && <ChevronRight className="size-5 shrink-0 text-muted-foreground/60" />}
    </>
  )
  const interactive = "transition-colors active:bg-muted"
  if (to)
    return (
      <Link to={to} viewTransition onClick={() => setNav("push")} className={cn(rowBase, interactive, className)}>
        {body}
      </Link>
    )
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cn(rowBase, interactive, className)}>
        {body}
      </button>
    )
  return <div className={cn(rowBase, className)}>{body}</div>
}

/** Blue (or red) text action row — "Add Reading", "Delete". */
export function ActionRow({
  children,
  onClick,
  destructive,
  icon: Icon,
}: {
  children: React.ReactNode
  onClick: () => void
  destructive?: boolean
  icon?: LucideIcon
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(rowBase, "gap-2 text-primary transition-colors active:bg-muted", destructive && "justify-center text-destructive")}
    >
      {Icon && <Icon className="size-5" />}
      {children}
    </button>
  )
}

const bareInput =
  "min-w-0 flex-1 bg-transparent py-3 text-right text-[1.0625rem] text-foreground caret-primary outline-none placeholder:text-muted-foreground/60"

/** Label on the left, borderless control on the right. */
export function FieldRow({ label, children, unit }: { label: React.ReactNode; children: React.ReactNode; unit?: string }) {
  return (
    <label className={cn(rowBase, "gap-2")}>
      <span className="shrink-0">{label}</span>
      {children}
      {unit && <span className="shrink-0 text-muted-foreground">{unit}</span>}
    </label>
  )
}

type InputBase = Omit<React.ComponentProps<"input">, "value" | "onChange" | "type">

export function TextRow({
  label,
  value,
  onCommit,
  type = "text",
  ...props
}: InputBase & { label: React.ReactNode; value: string | undefined; onCommit: (v: string) => void; type?: string }) {
  const d = useDraft(value ?? "", onCommit)
  return (
    <FieldRow label={label}>
      <input {...props} type={type} value={d.draft} onChange={(e) => d.change(e.target.value)} onBlur={d.flush} className={bareInput} />
    </FieldRow>
  )
}

export function NumberRow({
  label,
  value,
  onCommit,
  unit,
  decimal,
  ...props
}: InputBase & {
  label: React.ReactNode
  value: number | undefined
  onCommit: (v: number | undefined) => void
  unit?: string
  decimal?: boolean
}) {
  const d = useDraft(value === undefined ? "" : String(value), (s) => {
    const n = parseFloat(s.replace(",", "."))
    onCommit(Number.isFinite(n) ? n : undefined)
  })
  return (
    <FieldRow label={label} unit={unit}>
      <input
        {...props}
        inputMode={decimal ? "decimal" : "numeric"}
        enterKeyHint="done"
        value={d.draft}
        onChange={(e) => d.change(e.target.value)}
        onBlur={d.flush}
        className={cn(bareInput, "tabular-nums")}
      />
    </FieldRow>
  )
}

/** Full-width multi-line text inside a group. */
export function NoteRow({
  value,
  onCommit,
  placeholder,
  rows = 3,
}: {
  value: string | undefined
  onCommit: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  const d = useDraft(value ?? "", onCommit, 700)
  return (
    <textarea
      rows={rows}
      value={d.draft}
      onChange={(e) => d.change(e.target.value)}
      onBlur={d.flush}
      placeholder={placeholder}
      className="block field-sizing-content min-h-24 w-full resize-none bg-transparent px-4 py-3 text-[1.0625rem] caret-primary outline-none placeholder:text-muted-foreground/60"
    />
  )
}

/**
 * Date or time shown as a trailing capsule; tapping opens our own picker sheet.
 * (Native <input type=date|time> pickers don't open on some Android browsers.)
 */
export function DateTimeRow({
  label,
  type,
  value,
  onChange,
  icon,
  color,
  clearable,
}: {
  label: React.ReactNode
  type: "date" | "time"
  value: string | undefined
  onChange: (v: string) => void
  icon?: LucideIcon
  color?: TileColor
  /** Offer a Clear button, which reports "". */
  clearable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const shown = value ? (type === "date" ? format(fromISO(value), "d MMM yyyy") : formatTime12(value)) : "Not Set"
  const onClear = clearable ? () => onChange("") : undefined
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn(rowBase, "gap-3 transition-colors active:bg-muted")}>
        {icon && <IconTile icon={icon} color={color} />}
        <span className="flex-1">{label}</span>
        <span className={cn("rounded-full bg-muted px-3 py-1.5 tabular-nums", !value && "text-muted-foreground")}>{shown}</span>
      </button>
      {type === "date" ? (
        <DatePickerDrawer open={open} onOpenChange={setOpen} title={label} value={value} onPick={onChange} onClear={onClear} />
      ) : (
        <TimePickerDrawer open={open} onOpenChange={setOpen} title={label} value={value} onPick={onChange} onClear={onClear} />
      )}
    </>
  )
}

export function SwitchRow({
  label,
  detail,
  checked,
  onChange,
  icon,
  color,
}: {
  label: React.ReactNode
  detail?: React.ReactNode
  checked: boolean
  onChange: (v: boolean) => void
  icon?: LucideIcon
  color?: TileColor
}) {
  return (
    <label className={cn(rowBase)}>
      {icon && <IconTile icon={icon} color={color} />}
      <span className="min-w-0 flex-1 py-2.5">
        <span className="block">{label}</span>
        {detail && <span className="block text-[0.8125rem] text-muted-foreground">{detail}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

export type Option = string | { value: string; label: string }
const norm = (o: Option) => (typeof o === "string" ? { value: o, label: o } : o)

/** Row showing the current choice; tapping opens a bottom-sheet list. */
export function SelectRow({
  label,
  value,
  options,
  onChange,
  icon,
  color,
  placeholder = "None",
}: {
  label: string
  value: string | undefined
  options: readonly Option[]
  onChange: (v: string) => void
  icon?: LucideIcon
  color?: TileColor
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const opts = options.map(norm)
  const cur = opts.find((o) => o.value === value)
  return (
    <>
      <Row icon={icon} color={color} label={label} value={cur?.label ?? placeholder} chevron onClick={() => setOpen(true)} />
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <SheetBar title={label} />
          <div className="overflow-y-auto px-4 pb-4">
            <Group>
              {opts.map((o) => (
                <Row
                  key={o.value}
                  label={o.label}
                  onClick={() => {
                    navigator.vibrate?.(8)
                    onChange(o.value)
                    setOpen(false)
                  }}
                >
                  {o.value === value && <Check className="size-5 text-primary" strokeWidth={2.6} />}
                </Row>
              ))}
            </Group>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}

// ---------------------------------------------------------------- Sheets

/** iOS sheet navigation bar: Cancel · Title · Done. */
export function SheetBar({
  title,
  onCancel,
  onDone,
  doneLabel = "Done",
  doneDisabled,
}: {
  title: React.ReactNode
  onCancel?: () => void
  onDone?: () => void
  doneLabel?: string
  doneDisabled?: boolean
}) {
  return (
    <div className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center px-2">
      <div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="h-11 rounded-full px-3 text-[1.0625rem] text-primary active:opacity-60">
            Cancel
          </button>
        )}
      </div>
      <h2 className="truncate text-[1.0625rem] font-semibold tracking-normal">{title}</h2>
      <div className="flex justify-end">
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            disabled={doneDisabled}
            className="h-11 rounded-full px-3 text-[1.0625rem] font-semibold text-primary active:opacity-60 disabled:opacity-40"
          >
            {doneLabel}
          </button>
        )}
      </div>
    </div>
  )
}

/** Bottom sheet for editing one item: grey grouped background, Done in the bar. */
export function EditSheet({
  open,
  onOpenChange,
  title,
  children,
  onDelete,
  deleteLabel = "Delete",
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: React.ReactNode
  children: React.ReactNode
  onDelete?: () => void
  deleteLabel?: string
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh]">
        <SheetBar title={title} onDone={() => onOpenChange(false)} />
        <div className="grid gap-6 overflow-y-auto overscroll-contain px-4 pt-1 pb-6">
          {children}
          {onDelete && (
            <Group>
              <ActionRow
                destructive
                onClick={() => {
                  onDelete()
                  onOpenChange(false)
                }}
              >
                {deleteLabel}
              </ActionRow>
            </Group>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

// ---------------------------------------------------------------- Misc

/** Grey centered empty state used inside screens. */
export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className="grid place-items-center gap-2 px-8 py-14 text-center">
      <Icon className="mb-1 size-12 text-muted-foreground/50" strokeWidth={1.5} />
      <p className="text-xl font-semibold">{title}</p>
      {children && <div className="text-[0.9375rem] text-muted-foreground">{children}</div>}
    </div>
  )
}

/**
 * Inline editable list of short strings (allergies, conditions…):
 * red minus to remove, green plus row to add — like iOS list editing.
 */
export function ListEditor({
  items,
  onChange,
  placeholder,
  tone,
}: {
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
  tone?: "alert"
}) {
  const [draft, setDraft] = useState("")
  const add = () => {
    const t = draft.trim()
    if (t && !items.includes(t)) onChange([...items, t])
    setDraft("")
  }
  return (
    <>
      {items.map((it) => (
        <div key={it} className="flex min-h-[3.25rem] items-center gap-3 pr-4 pl-3">
          <button
            type="button"
            aria-label={`Remove ${it}`}
            onClick={() => onChange(items.filter((x) => x !== it))}
            className="grid size-8 place-items-center active:scale-90"
          >
            <CircleMinus className="size-[1.375rem] fill-destructive text-white" />
          </button>
          <span className={cn("flex-1 text-[1.0625rem]", tone === "alert" && "font-semibold text-alert")}>{it}</span>
        </div>
      ))}
      <form
        className="flex min-h-[3.25rem] items-center gap-3 pl-3"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <CirclePlus className="m-[0.3125rem] size-[1.375rem] shrink-0 fill-success text-white" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={add}
          placeholder={placeholder}
          enterKeyHint="done"
          className="min-w-0 flex-1 bg-transparent py-3 pr-4 text-[1.0625rem] outline-none placeholder:text-muted-foreground/60"
        />
      </form>
    </>
  )
}

/** Checklist row with a round check (Reminders style). */
export function CheckRow({
  checked,
  onChange,
  label,
  detail,
  trailing,
}: {
  checked: boolean
  onChange: (c: boolean) => void
  label: React.ReactNode
  detail?: React.ReactNode
  trailing?: React.ReactNode
}) {
  return (
    <label className={cn(rowBase, "cursor-pointer active:bg-muted")}>
      <Checkbox
        checked={checked}
        onCheckedChange={(c) => {
          navigator.vibrate?.(8)
          onChange(!!c)
        }}
      />
      <span className="min-w-0 flex-1 py-2.5">
        <span className={cn("block transition-colors", checked && "text-muted-foreground line-through decoration-muted-foreground/50")}>{label}</span>
        {detail && <span className="block text-[0.8125rem] text-muted-foreground">{detail}</span>}
      </span>
      {trailing}
    </label>
  )
}

/** iOS stepper: − | + capsule. */
export function Stepper({ onDecrement, onIncrement, label }: { onDecrement: () => void; onIncrement: () => void; label: string }) {
  const btn = "grid h-8 w-12 place-items-center text-foreground active:bg-foreground/10"
  return (
    <div className="flex items-center overflow-hidden rounded-full bg-muted" role="group" aria-label={label}>
      <button type="button" aria-label={`Decrease ${label}`} className={btn} onClick={onDecrement}>
        <Minus className="size-5" />
      </button>
      <span className="h-4 w-px bg-border" />
      <button type="button" aria-label={`Increase ${label}`} className={btn} onClick={onIncrement}>
        <Plus className="size-5" />
      </button>
    </div>
  )
}

/** SwiftUI `.pickerStyle(.segmented)` — capsule track, capsule thumb. */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T | undefined
  options: readonly { value: T; label: React.ReactNode }[]
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex h-9 rounded-full bg-muted p-[0.1875rem]", className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => {
            navigator.vibrate?.(6)
            onChange(o.value)
          }}
          className={cn(
            "flex-1 rounded-full px-2 text-[0.8125rem] font-semibold transition-[background-color,box-shadow] duration-200",
            o.value === value && "bg-card shadow-[0_2px_6px_rgb(0_0_0/0.12)] dark:bg-[#636366]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Section wrapper row for arbitrary content with standard insets. */
export function Cell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-4 py-3", className)}>{children}</div>
}
