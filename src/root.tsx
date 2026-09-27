import { useEffect } from "react"
import { Outlet, useLocation } from "react-router"
import { Toaster } from "@/components/ui/sonner"
import { LockScreen } from "@/components/lock-screen"
import { useLocked } from "@/lib/lock"
import { runDueReminders } from "@/lib/notify"

export function Root() {
  const locked = useLocked()
  const { pathname } = useLocation()

  useEffect(() => {
    if (locked) return
    runDueReminders()
    const onVisible = () => document.visibilityState === "visible" && runDueReminders()
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [locked])

  return (
    <>
      {locked && pathname !== "/emergency" ? <LockScreen /> : <Outlet />}
      <Toaster position="top-center" offset={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }} />
    </>
  )
}
