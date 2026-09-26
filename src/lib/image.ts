/**
 * Downscale camera photos before storing — phone photos are 3–12 MB,
 * and IndexedDB quota on iOS is tight. Non-images pass through untouched.
 */
export async function compressImage(file: Blob, maxSide = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" })
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
    const w = Math.round(bmp.width * scale)
    const h = Math.round(bmp.height * scale)
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h)
    bmp.close()
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality))
    return out && out.size < file.size ? out : file
  } catch {
    return file
  }
}
