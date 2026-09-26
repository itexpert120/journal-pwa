import { useLiveQuery } from "dexie-react-hooks"
import { db, emptyEntry, patchEntry, type Entry } from "@/lib/db"
import type { ISODate } from "@/lib/date"

/**
 * Last-known copy of recently viewed/prefetched days. Seeding useLiveQuery with it
 * means a page flip renders the destination day immediately instead of a blank frame.
 */
const cache = new Map<ISODate, Entry>()

export async function prefetchEntry(date: ISODate) {
  cache.set(date, (await db.entries.get(date)) ?? emptyEntry(date))
}

export function useEntry(date: ISODate) {
  const entry = useLiveQuery(
    async () => {
      const e = (await db.entries.get(date)) ?? emptyEntry(date)
      cache.set(date, e)
      return e
    },
    [date],
    cache.get(date),
  )
  const patch = (mutate: (e: Entry) => void) => patchEntry(date, mutate)
  return { entry, patch }
}
