import { useSyncExternalStore } from "react"

export type Theme = "system" | "light" | "dark"
const mq = matchMedia("(prefers-color-scheme: dark)")
const listeners = new Set<() => void>()

const read = (): Theme => {
  try {
    return (localStorage.getItem("theme") as Theme) || "system"
  } catch {
    return "system"
  }
}
const isDark = (t: Theme) => t === "dark" || (t === "system" && mq.matches)

function apply() {
  const dark = isDark(read())
  document.documentElement.classList.toggle("dark", dark)
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.setAttribute("content", dark ? "#1c1814" : "#f7f2e9")
    m.removeAttribute("media")
  })
  listeners.forEach((l) => l())
}
mq.addEventListener("change", apply)

export function setTheme(t: Theme) {
  try {
    localStorage.setItem("theme", t)
  } catch {
    /* private mode */
  }
  apply()
}
export const initTheme = apply
export const useTheme = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    read,
  )
export const useResolvedDark = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => isDark(read()),
  )
