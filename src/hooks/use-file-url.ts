import { useEffect, useState } from "react"
import { db } from "@/lib/db"

/** Object URL for a stored blob; revoked on unmount / id change. */
export function useFileUrl(id: string | undefined) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!id) {
      setUrl(undefined)
      return
    }
    let objectUrl: string | undefined
    let cancelled = false
    db.files.get(id).then((f) => {
      if (cancelled || !f) return
      objectUrl = URL.createObjectURL(f.blob)
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])
  return url
}
