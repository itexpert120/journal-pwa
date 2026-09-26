import { Link, NavLink, Outlet, useLocation } from "react-router"
import { BookOpen, CalendarDays, ChevronLeft, Menu, Search, UserRound } from "lucide-react"
import { todayISO } from "@/lib/date"
import { cn } from "@/lib/utils"

const NAV = [
  { to: "/day", label: "Today", icon: BookOpen },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/search", label: "Search", icon: Search },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/more", label: "More", icon: Menu },
] as const

function NavItems({ rail }: { rail?: boolean }) {
  const { pathname } = useLocation()
  return NAV.map(({ to, label, icon: Icon }) => {
    const active = pathname.startsWith(to) || (to === "/more" && pathname.startsWith("/export"))
    return (
      <NavLink
        key={to}
        to={to === "/day" ? `/day/${todayISO()}` : to}
        viewTransition
        aria-current={active ? "page" : undefined}
        onClick={() => navigator.vibrate?.(6)}
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-semibold text-foreground/70 transition-[background-color,color,transform] duration-200 active:scale-90",
          rail ? "h-16 w-16 rounded-2xl" : "h-[54px] flex-1",
          active && "bg-foreground/[0.07] text-primary dark:bg-white/10",
        )}
      >
        <Icon className={cn("size-6", active && "stroke-[2.3]")} />
        {label}
      </NavLink>
    )
  })
}

/** Height reserved at the bottom of scroll areas so content can scroll out from under the floating tab bar. */
export const TAB_BAR_SPACE = "pb-[calc(env(safe-area-inset-bottom)+6.5rem)] md:pb-12"

/**
 * Phone: floating glass capsule tab bar over the content (content scrolls beneath it).
 * Tablet (md+): glass navigation rail on the left.
 */
export function AppShell() {
  return (
    <div className="relative flex h-dvh overflow-hidden bg-background">
      <nav
        aria-label="Primary"
        className="no-print glass-bar z-30 hidden w-24 shrink-0 flex-col items-center gap-2 pt-safe pb-safe pl-safe shadow-[0.5px_0_0_0_var(--border)] md:flex"
      >
        <img src="/favicon.svg" alt="" className="mt-5 mb-3 size-10 rounded-[11px] shadow-sm" />
        <NavItems rail />
      </nav>
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col md:pr-safe">
        <Outlet />
      </div>
      <nav
        aria-label="Primary"
        className="no-print pointer-events-none absolute inset-x-0 bottom-0 z-30 px-4 pb-[max(env(safe-area-inset-bottom),12px)] md:hidden"
      >
        <div className="glass pointer-events-auto mx-auto flex max-w-md items-center rounded-full p-1">
          <NavItems />
        </div>
      </nav>
    </div>
  )
}

/**
 * Standard page: one scroll container with a sticky glass title bar,
 * so content blurs beneath the bar as it scrolls — like iOS navigation bars.
 */
export function Page({
  title,
  actions,
  children,
  className,
  bar,
  back,
  wide,
}: {
  title?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  /** Replace the default title bar entirely. */
  bar?: React.ReactNode
  /** Parent route; renders a back chevron before the title. */
  back?: string
  /** Let content use the full tablet width (grids) instead of a reading column. */
  wide?: boolean
}) {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {bar ?? (
        <header className="no-print glass-bar sticky top-0 z-20 pt-safe">
          <div className={cn("mx-auto flex h-14 w-full items-center gap-2 px-4 md:h-16 md:px-8", back && "pl-1 md:pl-4", !wide && "max-w-3xl")}>
            {back && (
              <Link to={back} viewTransition aria-label="Back" className="-mr-1 grid size-11 place-items-center rounded-full text-primary active:bg-muted">
                <ChevronLeft className="size-7" />
              </Link>
            )}
            <h1 className="min-w-0 flex-1 truncate text-[1.75rem] leading-none md:text-[2rem]">{title}</h1>
            {actions}
          </div>
        </header>
      )}
      <div className={cn("mx-auto w-full px-4 pt-4 md:px-8 md:pt-6", TAB_BAR_SPACE, !wide && "max-w-3xl", className)}>
        {children}
      </div>
    </main>
  )
}
