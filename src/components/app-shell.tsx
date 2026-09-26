import { useEffect, useRef, useState } from "react"
import { Link, NavLink, Outlet, useLocation } from "react-router"
import { BookOpen, CalendarDays, ChevronLeft, Search, Settings, UserRound } from "lucide-react"
import { todayISO } from "@/lib/date"
import { cn } from "@/lib/utils"

const NAV = [
  { to: "/day", label: "Today", icon: BookOpen },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/search", label: "Search", icon: Search },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/more", label: "Settings", icon: Settings },
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
 * Standard screen: one scroll container, a sticky glass nav bar, and an iOS
 * large title that collapses into the bar as you scroll.
 */
export function Page({
  title,
  actions,
  children,
  className,
  bar,
  back,
  backLabel,
  wide,
  largeTitle = true,
}: {
  title?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  /** Replace the default nav bar entirely. */
  bar?: React.ReactNode
  /** Parent route; renders "‹ Back" at the left of the bar. */
  back?: string
  backLabel?: string
  /** Let content use the full tablet width instead of a reading column. */
  wide?: boolean
  largeTitle?: boolean
}) {
  const scroller = useRef<HTMLElement>(null)
  const titleEl = useRef<HTMLHeadingElement>(null)
  const [collapsed, setCollapsed] = useState(!largeTitle)

  useEffect(() => {
    if (!largeTitle || !titleEl.current) return
    const io = new IntersectionObserver(([e]) => setCollapsed(!e.isIntersecting), {
      root: scroller.current,
      rootMargin: "-60px 0px 0px 0px",
    })
    io.observe(titleEl.current)
    return () => io.disconnect()
  }, [largeTitle])

  const width = cn("mx-auto w-full px-4 md:px-8", !wide && "max-w-3xl")
  return (
    <main ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {bar ?? (
        <header
          className={cn(
            "no-print sticky top-0 z-20 pt-safe transition-[background-color,box-shadow,backdrop-filter] duration-200",
            collapsed ? "glass-bar" : "bg-background",
          )}
        >
          <div className={cn(width, "grid h-12 grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 md:px-6")}>
            <div className="min-w-0">
              {back && (
                <Link
                  to={back}
                  viewTransition
                  className="-ml-1 flex h-11 w-fit max-w-full items-center rounded-full pr-2 text-[17px] text-primary active:opacity-50"
                >
                  <ChevronLeft className="size-7 shrink-0" strokeWidth={2.2} />
                  <span className="truncate">{backLabel ?? "Back"}</span>
                </Link>
              )}
            </div>
            <span
              className={cn(
                "truncate text-[17px] font-semibold transition-opacity duration-200",
                collapsed ? "opacity-100" : "opacity-0",
              )}
              aria-hidden={!collapsed}
            >
              {title}
            </span>
            <div className="flex min-w-0 items-center justify-end gap-1">{actions}</div>
          </div>
        </header>
      )}
      <div className={cn(width, "pt-1", TAB_BAR_SPACE, className)}>
        {largeTitle && title && (
          <h1 ref={titleEl} className="mb-4 px-1 text-[2.125rem] leading-tight md:text-[2.5rem]">
            {title}
          </h1>
        )}
        {children}
      </div>
    </main>
  )
}
