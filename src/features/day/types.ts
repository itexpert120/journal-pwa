import type { Entry } from "@/lib/db"
import type { ISODate } from "@/lib/date"

export interface SectionProps {
  date: ISODate
  entry: Entry
  patch: (mutate: (e: Entry) => void) => Promise<void>
}
