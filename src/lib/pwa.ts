import { toast } from "sonner"
import { registerSW } from "virtual:pwa-register"

const CHECK_EVERY = 30 * 60_000

/**
 * Automatic updates without surprise reloads:
 * - checks for a new version on launch, every 30 min, and whenever the app is foregrounded;
 * - a downloaded update is applied the next time the app goes to the background
 *   (nothing on screen is lost), or immediately if the user taps "Update".
 */
export function setupPWA() {
  let pending = false
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      pending = true
      toast("Update ready", {
        description: "A new version of Journal is ready.",
        action: { label: "Update", onClick: () => updateSW(true) },
        duration: 10_000,
      })
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return
      setInterval(() => reg.update().catch(() => {}), CHECK_EVERY)
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") reg.update().catch(() => {})
      })
    },
  })
  document.addEventListener("visibilitychange", () => {
    if (pending && document.visibilityState === "hidden") updateSW(true)
  })
}
