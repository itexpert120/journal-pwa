/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching"
import { NavigationRoute, registerRoute } from "workbox-routing"
import { clientsClaim } from "workbox-core"

declare const self: ServiceWorkerGlobalScope

// A new version waits until the page tells it to take over (lib/pwa.ts picks a safe moment).
self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting()
})
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// SPA: every navigation is served the cached shell, so the app opens fully offline.
registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html")))

/**
 * Periodic Background Sync (installed PWAs on Android/Chromium) — lets the daily
 * journaling prompt fire without the app open. The page registers it; see lib/notify.
 */
self.addEventListener("periodicsync", (event: Event & { tag?: string; waitUntil?: (p: Promise<unknown>) => void }) => {
  if (event.tag !== "daily-prompt") return
  event.waitUntil?.(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window" })
      if (clients.some((c) => (c as WindowClient).visibilityState === "visible")) return
      const hour = new Date().getHours()
      if (hour < 18 || hour > 23) return
      await self.registration.showNotification("How was your day?", {
        body: "Take a minute to write in your journal.",
        icon: "/pwa-192.png",
        badge: "/pwa-192.png",
        tag: "daily-prompt",
        data: { url: "/" },
      })
    })(),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = (event.notification.data?.url as string) ?? "/"
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      const existing = clients[0] as WindowClient | undefined
      if (existing) {
        await existing.focus()
        existing.navigate(url).catch(() => {})
      } else await self.clients.openWindow(url)
    })(),
  )
})
