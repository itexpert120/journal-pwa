import { useState } from "react"
import { X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** Free-text list edited as removable chips (allergies, conditions…). */
export function ChipList({
  items,
  onChange,
  placeholder,
  tone = "default",
}: {
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
  tone?: "default" | "alert"
}) {
  const [v, setV] = useState("")
  const add = () => {
    const t = v.trim()
    if (t && !items.includes(t)) onChange([...items, t])
    setV("")
  }
  return (
    <div className="grid gap-2">
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {items.map((it) => (
            <li
              key={it}
              className={cn(
                "flex h-9 items-center gap-1 rounded-full pr-1 pl-3 text-sm font-medium",
                tone === "alert" ? "bg-alert text-white" : "bg-secondary text-secondary-foreground",
              )}
            >
              {it}
              <button
                type="button"
                aria-label={`Remove ${it}`}
                onClick={() => onChange(items.filter((x) => x !== it))}
                className="grid size-7 place-items-center rounded-full"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <Input value={v} onChange={(e) => setV(e.target.value)} onBlur={add} placeholder={placeholder} enterKeyHint="done" />
      </form>
    </div>
  )
}
