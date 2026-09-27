/**
 * Downscale camera photos before storing — phone photos are 3–12 MB,
 * and IndexedDB quota on iOS is tight. Non-images pass through untouched.
 *
 * iPhone Safari usually hands the page a JPEG (or can paint HEIC itself).
 * Samsung Chrome / Samsung Internet cannot decode HEIC/HEIF at all, so those
 * files are transcoded to JPEG here. Conversion never throws: a photo that
 * can't be decoded is stored as-is so adding it still succeeds.
 */
export async function compressImage(file: Blob, maxSide = 1600, quality = 0.82): Promise<Blob> {
  try {
    if (file.type === "image/gif" || file.type === "image/svg+xml") return file

    const heic = await fileIsHeic(file)
    if (!heic && !file.type.startsWith("image/")) return file

    if (!heic) {
      const jpeg = await downscaleToJpeg(file, maxSide, quality)
      // Keep the original when re-encoding isn't smaller. JPEG/PNG/WebP already display everywhere.
      return jpeg && jpeg.size < file.size ? jpeg : file
    }

    // Safari can decode HEIC. Samsung browsers can't — fall through to libheif.
    const native = await downscaleToJpeg(file, maxSide, quality)
    if (native) return native

    return (await decodeHeic(file, maxSide, quality)) ?? file
  } catch (err) {
    console.warn("Image compression failed", err)
    return file
  }
}

/** Major / compatible brands for still HEIC and HEIF. AVIF (`avif`) is intentionally absent. */
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"])

/**
 * Samsung Gallery often labels HEIF as `image/heif`, leaves the type empty, or
 * (rarely) calls the file a JPEG. Sniff the ISO-BMFF `ftyp` box either way.
 */
async function fileIsHeic(file: Blob): Promise<boolean> {
  const type = file.type.toLowerCase()
  if (type.includes("heic") || type.includes("heif")) return true
  const name = file instanceof File ? file.name.toLowerCase() : ""
  if (name.endsWith(".heic") || name.endsWith(".heif")) return true
  try {
    const header = new Uint8Array(await file.slice(0, 32).arrayBuffer())
    return ftypIsHeic(header)
  } catch {
    return false
  }
}

function ftypIsHeic(buf: Uint8Array): boolean {
  if (buf.length < 12) return false
  if (ascii(buf, 4) !== "ftyp") return false
  for (let i = 8; i + 4 <= buf.length; i += 4) {
    if (HEIC_BRANDS.has(ascii(buf, i))) return true
  }
  return false
}

function ascii(buf: Uint8Array, offset: number): string {
  return String.fromCharCode(buf[offset] ?? 0, buf[offset + 1] ?? 0, buf[offset + 2] ?? 0, buf[offset + 3] ?? 0).toLowerCase()
}

async function downscaleToJpeg(file: Blob, maxSide: number, quality: number): Promise<Blob | null> {
  const bmp = await loadBitmap(file)
  if (bmp) {
    try {
      return await bitmapToJpeg(bmp, maxSide, quality)
    } finally {
      bmp.close()
    }
  }
  return drawElement(file, maxSide, quality)
}

async function loadBitmap(file: Blob): Promise<ImageBitmap | null> {
  try {
    // Older Samsung Internet rejects the options object; retry without it.
    return await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    try {
      return await createImageBitmap(file)
    } catch {
      return null
    }
  }
}

function bitmapToJpeg(bmp: ImageBitmap | HTMLImageElement, maxSide: number, quality: number): Promise<Blob | null> {
  // An off-DOM <img> reports its real size on naturalWidth; `.width` can be 0.
  const width = bmp instanceof HTMLImageElement ? bmp.naturalWidth : bmp.width
  const height = bmp instanceof HTMLImageElement ? bmp.naturalHeight : bmp.height
  if (!width || !height) return Promise.resolve(null)
  const scale = Math.min(1, maxSide / Math.max(width, height))
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) return Promise.resolve(null)
  ctx.drawImage(bmp, 0, 0, w, h)
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality))
}

/** Second chance for formats createImageBitmap rejects. Resolves null — never rejects. */
function drawElement(file: Blob, maxSide: number, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    const done = (blob: Blob | null) => {
      URL.revokeObjectURL(url)
      resolve(blob)
    }
    img.onload = () => {
      void bitmapToJpeg(img, maxSide, quality).then(done)
    }
    img.onerror = () => done(null)
    img.src = url
  })
}

/** libheif, loaded only when the browser itself can't decode the file. */
async function decodeHeic(file: Blob, maxSide: number, quality: number): Promise<Blob | null> {
  try {
    const { heicTo } = await import("heic-to")
    try {
      const bmp = await heicTo({ blob: file, type: "bitmap" })
      try {
        const jpeg = await bitmapToJpeg(bmp, maxSide, quality)
        if (jpeg) return jpeg
      } finally {
        bmp.close()
      }
    } catch {
      // Bitmap path failed; try a direct JPEG encode below.
    }
    const out = await heicTo({ blob: file, type: "image/jpeg", quality })
    if (!(out instanceof Blob) || out.size === 0) return null
    return out.type === "image/jpeg" ? out : new Blob([out], { type: "image/jpeg" })
  } catch (err) {
    console.warn("HEIC conversion failed", err)
    return null
  }
}
