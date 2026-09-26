import { NavLink, Outlet, useLocation } from "react-router"
import { BookOpen, CalendarDays, Menu, Search, UserRound } from "lucide-react"
import { todayISO } from "@/lib/date"
import { cn } from "@/lib/utils"

const NAV = [
  { to: "/day", label: "Today", icon: BookOpen, match: (p: string) => p.startsWith("/day") },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/search", label: "Search", icon: Search },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/more", label: "More", icon: Menu },
] as const

/**
 * Full-height column: routes scroll inside <main>, the tab bar stays pinned in the thumb zone.
 * Using an inner scroller (not the document) keeps iOS from bouncing the tab bar away.
 */
export function AppShell() {
  const { pathname } = useLocation()
  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col overflow-hidden bg-background">
      <Outlet />
      <nav
        aria-label="Primary"
        className="no-print z-30 shrink-0 border-t bg-background/95 pb-safe backdrop-blur supports-backdrop-filter:bg-background/80"
      >
        <ul className="grid grid-cols-5">
          {NAV.map(({ to, label, icon: Icon, ...rest }) => {
            const active = "match" in rest ? rest.match(pathname) : pathname.startsWith(to)
            return (
              <li key={to}>
                <NavLink
                  to={to === "/day" ? `/day/${todayISO()}` : to}
                  viewTransition
                  className={cn(
                    "flex h-15 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground transition-colors active:bg-muted",
                    active && "text-primary",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className={cn("size-6", active && "stroke-[2.25]")} />
                  {label}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

/** Standard page scaffold: sticky title bar + scrolling body. */
export function Page({
  title,
  actions,
  children,
  className,
  bar,
}: {
  title?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  /** Replace the default title bar entirely. */
  bar?: React.ReactNode
}) {
  return (
    <>
      {bar ?? (
        <header className="no-print z-20 shrink-0 border-b bg-background/95 pt-safe backdrop-blur">
          <div className="flex h-14 items-center gap-2 px-4">
            <h1 className="min-w-0 flex-1 truncate text-3xl leading-none">{title}</h1>
            {actions}
          </div>
        </header>
      )}
      <main
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-10 [scrollbar-gutter:stable]",
          className,
        )}
      >
        {children}
      </main>
    </>
  )
}
