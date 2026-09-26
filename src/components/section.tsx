import type { LucideIcon } from "lucide-react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Section({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string
  icon?: LucideIcon
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-2xl border bg-card p-4 shadow-xs", className)}>
      <div className="mb-3 flex min-h-8 items-center gap-2">
        {Icon && <Icon className="size-5 text-primary" />}
        <h2 className="flex-1 text-2xl leading-none">{title}</h2>
        {action}
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  )
}

export function AddButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <Button variant="outline" className="w-full border-dashed text-muted-foreground" onClick={onClick}>
      <Plus /> {children}
    </Button>
  )
}

export function RemoveButton({ onClick, label = "Remove" }: { onClick: () => void; label?: string }) {
  return (
    <Button variant="ghost" size="icon" aria-label={label} className="shrink-0 text-muted-foreground" onClick={onClick}>
      <Trash2 />
    </Button>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-1 text-sm text-muted-foreground">{children}</p>
}

/** A bordered sub-card for one repeated item (a reading, a workout, …). */
export function Item({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-3 rounded-xl border bg-background/60 p-3", className)}>{children}</div>
}
