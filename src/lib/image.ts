/**
 * Downscale camera photos before storing — phone photos are 3–12 MB,
 * and IndexedDB quota on iOS is tight. Non-images pass through untouched.
 */
export async function compressImage(file: Blob, maxSide = 1600, quality = 0.82): Promise<Blob> {
  // Skip GIFs and SVGs (animation/vector preservation)
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file
  
  // Normalize MIME type: HEIC/HEIF from iPhones may have inconsistent types
  const normalizedType = normalizeImageType(file)
  const isImageLike = normalizedType.startsWith("image/") || isLikelyImage(file)
  
  if (!isImageLike) return file
  
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
    // Always encode as JPEG for consistent cross-browser display
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality))
    if (!out) throw new Error("Canvas toBlob failed")
    return out.size < file.size ? out : new Blob([out], { type: "image/jpeg" })
  } catch (err) {
    console.warn("Image compression failed, attempting fallback conversion:", err)
    // Fallback: try converting via <img> element for better format support
    return await convertViaImageElement(file, maxSide, quality)
  }
}

/**
 * Normalize MIME type — HEIC/HEIF images from iOS may have various types.
 * Some browsers report empty or incorrect MIME types for HEIC.
 */
function normalizeImageType(file: Blob): string {
  const type = file.type.toLowerCase()
  
  // HEIC/HEIF variations
  if (type.includes("heic") || type.includes("heif")) {
    return "image/heic"
  }
  
  // Return as-is if we have a type
  if (type) return type
  
  // If no MIME type, check file extension from name (if available)
  if ("name" in file && typeof (file as File).name === "string") {
    const name = (file as File).name.toLowerCase()
    if (name.endsWith(".heic") || name.endsWith(".heif")) return "image/heic"
    if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg"
    if (name.endsWith(".png")) return "image/png"
    if (name.endsWith(".webp")) return "image/webp"
  }
  
  return type
}

/**
 * Heuristic: if MIME type is missing/wrong, check if size suggests an image.
 * Photos are typically 100KB–20MB; documents are often different ranges.
 */
function isLikelyImage(file: Blob): boolean {
  // If we have a proper image MIME type, trust it
  if (file.type.startsWith("image/")) return true
  
  // Files between 10KB and 50MB might be photos
  const size = file.size
  return size >= 10_000 && size <= 50_000_000
}

/**
 * Fallback image conversion using <img> element.
 * This works for more formats than createImageBitmap on older browsers,
 * including HEIC on iOS Safari and some Android browsers.
 */
async function convertViaImageElement(file: Blob, maxSide: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    
    const cleanup = () => URL.revokeObjectURL(url)
    
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        
        const canvas = document.createElement("canvas")
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("Cannot get canvas context")
        
        ctx.drawImage(img, 0, 0, w, h)
        
        canvas.toBlob(
          (blob) => {
            cleanup()
            if (!blob) {
              reject(new Error("Canvas toBlob failed in fallback"))
            } else {
              // Always return as JPEG for consistency
              resolve(new Blob([blob], { type: "image/jpeg" }))
            }
          },
          "image/jpeg",
          quality,
        )
      } catch (err) {
        cleanup()
        reject(err)
      }
    }
    
    img.onerror = () => {
      cleanup()
      reject(new Error("Image failed to load in fallback converter"))
    }
    
    img.src = url
  })
}
