import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, Navigate, RouterProvider, useParams } from "react-router"
import "./index.css"
import { Root } from "./root"
import { AppShell } from "./components/app-shell"
import { DesktopGate, isDesktop } from "./components/desktop-gate"
import { RouteError } from "./components/route-error"
import { isISODate, todayISO } from "./lib/date"
import { initTheme } from "./lib/theme"
import { initLock } from "./lib/lock"

initTheme()

function DayRedirect() {
  const { date } = useParams()
  return isISODate(date) ? null : <Navigate to={`/day/${todayISO()}`} replace />
}

// Each screen is its own chunk; the Today page is prefetched right away since it's the landing view.
const day = () => import("./routes/day")
const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <RouteError />,
    children: [
      { path: "/emergency", lazy: () => import("./routes/emergency") },
      { path: "/print", lazy: () => import("./routes/print") },
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to={`/day/${todayISO()}`} replace /> },
          { path: "/day", element: <DayRedirect /> },
          { path: "/day/:date", lazy: day },
          { path: "/calendar", lazy: () => import("./routes/calendar") },
          { path: "/search", lazy: () => import("./routes/search") },
          { path: "/profile", lazy: () => import("./routes/profile") },
          { path: "/more", lazy: () => import("./routes/more") },
          { path: "/more/occasions", lazy: () => import("./routes/occasions") },
          { path: "/more/security", lazy: () => import("./routes/security") },
          { path: "/more/backup", lazy: () => import("./routes/backup") },
          { path: "/export", lazy: () => import("./routes/export") },
          { path: "*", element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])

const root = createRoot(document.getElementById("root")!)

if (isDesktop() && !import.meta.env.DEV) {
  root.render(<DesktopGate />)
} else {
  day()
  initLock().then(() =>
    root.render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    ),
  )
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    import("virtual:pwa-register").then(({ registerSW }) => registerSW({ immediate: true }))
  }
}
