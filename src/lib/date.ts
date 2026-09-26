import { addDays, format, parseISO, isValid } from "date-fns"

/** ISO-8601 calendar date (YYYY-MM-DD). The only key we index days by — no year tables. */
export type ISODate = string

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

export const toISO = (d: Date): ISODate => format(d, "yyyy-MM-dd")
export const todayISO = (): ISODate => toISO(new Date())
export const fromISO = (iso: ISODate): Date => parseISO(iso)
export const isISODate = (s: string | undefined): s is ISODate =>
  !!s && ISO_RE.test(s) && isValid(parseISO(s))
export const shiftISO = (iso: ISODate, days: number): ISODate =>
  toISO(addDays(fromISO(iso), days))
/** "MM-DD" — used to match annually repeating occasions. */
export const monthDay = (iso: ISODate) => iso.slice(5)

export const nowHHMM = () => format(new Date(), "HH:mm")

export function formatTime12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  const d = new Date()
  d.setHours(h, m)
  return format(d, "h:mm a")
}

export function ageFrom(dob: ISODate | undefined) {
  if (!isISODate(dob)) return undefined
  const b = fromISO(dob)
  const n = new Date()
  let age = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) age--
  return age
}
