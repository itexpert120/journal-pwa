import { db, kvGet, kvSet } from "./db"
import { monthDay, nowHHMM, todayISO } from "./date"
import { getProfile, getSettings } from "./profile"

/**
 * The web has no reliable "fire at 8:00 tomorrow" API. So reminders fire:
 *  - whenever the app is opened / foregrounded (catch-up for anything due),
 *  - via timers while the app stays open,
 *  - and via Periodic Background Sync for the daily prompt on installed Android PWAs.
 */

export const notificationsSupported = () => "Notification" in window

export async function requestNotifications() {
  if (!notificationsSupported()) return "unsupported" as const
  const p = await Notification.requestPermission()
  if (p === "granted") await registerPeriodicPrompt()
  return p
}

async function registerPeriodicPrompt() {
  try {
    const reg = await navigator.serviceWorker?.ready
    const ps = (reg as ServiceWorkerRegistration & { periodicSync?: { register(t: string, o: object): Promise<void> } })
      ?.periodicSync
    await ps?.register("daily-prompt", { minInterval: 12 * 60 * 60 * 1000 })
  } catch {
    /* unsupported or not installed — foreground reminders still work */
  }
}

async function show(title: string, body: string, tag: string, url = "/") {
  if (!notificationsSupported() || Notification.permission !== "granted") return
  const opts: NotificationOptions = { body, tag, icon: "/pwa-192.png", badge: "/pwa-192.png", data: { url } }
  const reg = await navigator.serviceWorker?.getRegistration()
  if (reg) await reg.showNotification(title, opts)
  else new Notification(title, opts)
}

/** Fire each reminder at most once per key per day. */
async function once(key: string, fn: () => Promise<void>) {
  const today = todayISO()
  const k = `notified:${today}`
  const sent = (await kvGet<string[]>(k)) ?? []
  if (sent.includes(key)) return
  await fn()
  await kvSet(k, [...sent, key])
}

let timer: ReturnType<typeof setTimeout> | undefined

export async function runDueReminders() {
  if (!notificationsSupported() || Notification.permission !== "granted") return
  const [settings, profile] = await Promise.all([getSettings(), getProfile()])
  const today = todayISO()
  const now = nowHHMM()
  const entry = await db.entries.get(today)

  if (settings.reminders.occasions) {
    const occ = await db.occasions.where("md").equals(monthDay(today)).toArray()
    for (const o of occ)
      await once(`occ:${o.id}`, () => show(`🎉 ${o.name}'s ${o.kind.toLowerCase()} today`, "Tap to open today's page.", `occ-${o.id}`))
  }

  let nextDue: string | undefined
  if (settings.reminders.meds) {
    for (const m of profile.medications)
      for (const t of m.times) {
        const key = `${m.id}@${t}`
        if (t <= now) {
          if (!entry?.medsTaken[key])
            await once(`med:${key}`, () =>
              show(`💊 Time for ${m.name}`, [m.dose, `scheduled ${t}`].filter(Boolean).join(" · "), `med-${key}`),
            )
        } else if (!nextDue || t < nextDue) nextDue = t
      }
  }

  const j = settings.reminders.journal
  if (j) {
    if (j <= now && !entry?.journal.text && !entry?.journal.drawingId)
      await once("journal", () => show("How was your day?", "Take a minute to write in your journal.", "daily-prompt"))
    else if (j > now && (!nextDue || j < nextDue)) nextDue = j
  }

  // While the app stays open, wake up for the next due item today.
  clearTimeout(timer)
  if (nextDue) {
    const [h, mi] = nextDue.split(":").map(Number)
    const at = new Date()
    at.setHours(h, mi, 5, 0)
    timer = setTimeout(runDueReminders, Math.max(1000, at.getTime() - Date.now()))
  }
}
