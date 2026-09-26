import { useEffect, useRef, useState } from "react"
import { Link, NavLink, Outlet, useLocation } from "react-router"
import { BookOpen, CalendarDays, ChevronLeft, Search, Settings, UserRound, type LucideIcon } from "lucide-react"
import { todayISO } from "@/lib/date"
import { setNav } from "@/lib/nav"
import { cn } from "@/lib/utils"
import { useScrolled } from "@/hooks/use-scrolled"

const TABS = [
  { to: "/day", label: "Today", icon: BookOpen },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/more", label: "Settings", icon: Settings },
] as const

const isActive = (pathname: string, to: string) =>
  pathname.startsWith(to) || (to === "/more" && pathname.startsWith("/export"))

function TabItem({ to, label, icon: Icon, rail }: { to: string; label: string; icon: LucideIcon; rail?: boolean }) {
  const { pathname } = useLocation()
  const active = isActive(pathname, to)
  return (
    <NavLink
      to={to === "/day" ? `/day/${todayISO()}` : to}
      aria-current={active ? "page" : undefined}
      onClick={() => navigator.vibrate?.(6)}
      className={cn(
        "flex flex-col items-center justify-center gap-px rounded-full text-[10px] font-medium transition-[background-color,color,transform] duration-300 active:scale-[0.92]",
        rail ? "size-16 rounded-[1.25rem]" : "h-[54px] flex-1",
        active ? "bg-foreground/[0.07] text-primary dark:bg-white/[0.1]" : "text-foreground",
      )}
    >
      <Icon className="size-[23px]" strokeWidth={active ? 2.3 : 1.9} />
      {label}
    </NavLink>
  )
}

/**
 * Phone: floating Liquid Glass tab bar capsule (inset from the edges) with
 * Search as its own circular island, over a bottom fade edge.
 * Tablet (md+): glass sidebar rail.
 */
export function AppShell() {
  const { pathname } = useLocation()
  const searchActive = pathname.startsWith("/search")
  return (
    <div className="relative flex h-dvh overflow-hidden bg-background">
      <nav aria-label="Primary" className="tabbar no-print z-30 hidden p-3 pl-[max(env(safe-area-inset-left),12px)] md:flex">
        <div className="glass flex w-20 flex-col items-center gap-1.5 rounded-[1.75rem] py-3">
          {TABS.map((t) => (
            <TabItem key={t.to} {...t} rail />
          ))}
          <span className="my-1 h-px w-10 bg-border" />
          <TabItem to="/search" label="Search" icon={Search} rail />
        </div>
      </nav>

      <div className="vt-screen relative flex min-h-0 min-w-0 flex-1 flex-col bg-background md:pr-safe">
        <Outlet />
      </div>

      <div aria-hidden className="kb-hide edge-bottom pointer-events-none absolute inset-x-0 bottom-0 z-20 h-32 md:hidden" />
      <nav
        aria-label="Primary"
        className="kb-hide tabbar no-print pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-center gap-3 px-[21px] pb-[max(calc(env(safe-area-inset-bottom)-6px),16px)] md:hidden"
      >
        <div className="glass pointer-events-auto flex min-w-0 flex-1 items-center rounded-full p-1">
          {TABS.map((t) => (
            <TabItem key={t.to} {...t} />
          ))}
        </div>
        <NavLink
          to="/search"
          aria-label="Search"
          aria-current={searchActive ? "page" : undefined}
          onClick={() => navigator.vibrate?.(6)}
          className={cn(
            "glass pointer-events-auto grid size-[62px] shrink-0 place-items-center rounded-full transition-transform active:scale-[0.92]",
            searchActive ? "text-primary" : "text-foreground",
          )}
        >
          <Search className="size-6" strokeWidth={searchActive ? 2.4 : 2} />
        </NavLink>
      </nav>
    </div>
  )
}

/** Space reserved below content so it can scroll clear of the floating tab bar. */
export const TAB_BAR_SPACE = "pb-[calc(env(safe-area-inset-bottom)+7rem+var(--kb,0px))] md:pb-[calc(4rem+var(--kb,0px))]"

/** Round Liquid Glass bar button (icon) — the navigation-layer control style. */
export function BarButton({
  children,
  label,
  onClick,
  to,
  kind = "push",
  className,
}: {
  children: React.ReactNode
  label: string
  onClick?: () => void
  to?: string
  kind?: "push" | "pop" | "modal"
  className?: string
}) {
  const cls = cn(
    "glass flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2.5 text-[17px] font-medium text-foreground transition-transform active:scale-90 [&_svg]:size-[22px]",
    className,
  )
  if (to)
    return (
      <Link to={to} viewTransition aria-label={label} onClick={() => setNav(kind)} className={cls}>
        {children}
      </Link>
    )
  return (
    <button type="button" aria-label={label} onClick={onClick} className={cls}>
      {children}
    </button>
  )
}

/**
 * Standard screen. The navigation bar is transparent: its controls float as
 * glass, content scrolls beneath a soft scroll-edge effect, and the 34pt large
 * title scrolls with content until a 17pt inline title takes over.
 */
export function Page({
  title,
  actions,
  children,
  className,
  bar,
  back,
  wide,
  largeTitle = true,
}: {
  title?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  /** Extra content inside the bar under the buttons (e.g. a search field). */
  bar?: React.ReactNode
  /** Parent route; renders a glass back button. */
  back?: string
  /** Unused: iOS 26 back buttons are icon-only. Kept so call sites stay descriptive. */
  backLabel?: string
  wide?: boolean
  largeTitle?: boolean
}) {
  const scroller = useRef<HTMLElement>(null)
  const titleEl = useRef<HTMLHeadingElement>(null)
  const [collapsed, setCollapsed] = useState(!largeTitle)
  const scrolled = useScrolled(scroller)

  useEffect(() => {
    if (!largeTitle || !titleEl.current) return
    const io = new IntersectionObserver(([e]) => setCollapsed(!e.isIntersecting), {
      root: scroller.current,
      rootMargin: "-56px 0px 0px 0px",
    })
    io.observe(titleEl.current)
    return () => io.disconnect()
  }, [largeTitle])

  const width = cn("mx-auto w-full", wide ? "max-w-5xl" : "max-w-3xl")
  return (
    <main ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <header className="no-print sticky top-0 z-20 pt-safe">
        <div aria-hidden className={cn("edge-top transition-opacity duration-200", scrolled ? "opacity-100" : "opacity-0")} />
        <div className={cn(width, "grid h-[54px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 md:px-8")}>
          <div className="flex min-w-0">
            {back && (
              <BarButton to={back} label="Back" kind="pop">
                <ChevronLeft strokeWidth={2.4} />
              </BarButton>
            )}
          </div>
          <span
            className={cn("truncate text-[17px] font-semibold transition-opacity duration-200", collapsed ? "opacity-100" : "opacity-0")}
            aria-hidden={!collapsed}
          >
            {title}
          </span>
          <div className="flex min-w-0 items-center justify-end gap-2">{actions}</div>
        </div>
        {bar && <div className={cn(width, "px-4 pb-2 md:px-8")}>{bar}</div>}
      </header>
      <div className={cn(width, "px-4 md:px-8", TAB_BAR_SPACE, className)}>
        {largeTitle && title && (
          <h1 ref={titleEl} className="mt-1 mb-5 px-1 text-[34px] leading-[41px] font-bold tracking-[0.01em]">
            {title}
          </h1>
        )}
        {children}
      </div>
    </main>
  )
}
