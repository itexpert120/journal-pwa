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
    <section className={cn("min-w-0 rounded-[1.4rem] bg-card p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] md:p-5 dark:shadow-none", className)}>
      <div className="mb-3 flex min-h-9 items-center gap-2.5">
        {Icon && (
          <span className="grid size-8 place-items-center rounded-[9px] bg-primary text-primary-foreground">
            <Icon className="size-[18px]" />
          </span>
        )}
        <h2 className="flex-1 text-xl leading-none">{title}</h2>
        {action}
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  )
}

export function AddButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <Button variant="ghost" className="w-full justify-start rounded-xl px-2 text-primary active:bg-muted" onClick={onClick}>
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
  return (
    <div
      className={cn(
        "grid gap-3 rounded-2xl bg-background p-3 dark:bg-black/40 [&_[data-slot=input]]:bg-card [&_[data-slot=select-trigger]]:bg-card [&_[data-slot=textarea]]:bg-card",
        className,
      )}
    >
      {children}
    </div>
  )
}
