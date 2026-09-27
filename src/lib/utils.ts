export { cn } from "cn"

/** rem → px at the current root font size, for APIs that only take pixels. */
export const remPx = (rem: number) => rem * parseFloat(getComputedStyle(document.documentElement).fontSize)
