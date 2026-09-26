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
          "group flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground transition-colors",
          rail ? "h-18 w-full" : "h-16 flex-1",
          active && "text-foreground",
        )}
      >
        {/* Material 3–style active indicator pill */}
        <span
          className={cn(
            "grid h-8 w-14 place-items-center rounded-full transition-all duration-200 group-active:scale-90",
            active ? "bg-primary/15 text-primary" : "",
          )}
        >
          <Icon className={cn("size-[22px]", active && "stroke-[2.4]")} />
        </span>
        {label}
      </NavLink>
    )
  })
}

/**
 * Phone: content column + bottom tab bar in the thumb zone.
 * Tablet (md+): navigation rail on the left edge, content fills the rest.
 * Routes scroll inside their own <main>, so bars never bounce away on iOS.
 */
export function AppShell() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background md:flex-row">
      <nav
        aria-label="Primary"
        className="no-print z-30 hidden w-24 shrink-0 flex-col items-center gap-2 border-r bg-card/60 pt-safe pb-safe pl-safe md:flex"
      >
        <img src="/favicon.svg" alt="" className="mt-4 mb-4 size-10 rounded-xl" />
        <NavItems rail />
      </nav>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:pr-safe">
        <Outlet />
      </div>
      <nav
        aria-label="Primary"
        className="no-print z-30 flex shrink-0 border-t bg-background/90 pb-safe backdrop-blur-xl md:hidden"
      >
        <NavItems />
      </nav>
    </div>
  )
}

/** Standard page scaffold: title bar + scrolling body with a readable max width on tablets. */
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
    <>
      {bar ?? (
        <header className="no-print z-20 shrink-0 border-b bg-background/90 pt-safe backdrop-blur-xl">
          <div className={cn("mx-auto flex h-14 w-full items-center gap-2 px-4 md:h-16 md:px-8", back && "pl-1 md:pl-4", !wide && "max-w-3xl")}>
            {back && (
              <Link to={back} viewTransition aria-label="Back" className="-mr-1 grid size-11 place-items-center rounded-full active:bg-muted">
                <ChevronLeft className="size-7" />
              </Link>
            )}
            <h1 className="min-w-0 flex-1 truncate text-[2rem] leading-none md:text-4xl">{title}</h1>
            {actions}
          </div>
        </header>
      )}
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className={cn("mx-auto w-full px-4 pt-4 pb-12 md:px-8 md:pt-6", !wide && "max-w-3xl", className)}>{children}</div>
      </main>
    </>
  )
}
