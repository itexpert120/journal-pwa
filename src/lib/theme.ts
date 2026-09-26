import { useSyncExternalStore } from "react"

/** The app always follows the system light/dark setting — there's no in-app override. */
const mq = matchMedia("(prefers-color-scheme: dark)")

function apply() {
  document.documentElement.classList.toggle("dark", mq.matches)
}

export function initTheme() {
  apply()
  mq.addEventListener("change", apply)
}

export const useResolvedDark = () =>
  useSyncExternalStore(
    (l) => {
      mq.addEventListener("change", l)
      return () => mq.removeEventListener("change", l)
    },
    () => mq.matches,
  )
