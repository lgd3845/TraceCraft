import { getMediaBlob, isMediaRef, parseMediaRef } from './mediaStore'

export function canvasThumbnailDataUrl(canvas: HTMLCanvasElement, size = 240): string {
  const thumb = document.createElement('canvas')
  thumb.width = size
  thumb.height = size
  const ctx = thumb.getContext('2d')
  if (!ctx) return ''
  ctx.fillStyle = '#fcf9f4'
  ctx.fillRect(0, 0, size, size)
  if (canvas.width > 0 && canvas.height > 0) {
    ctx.drawImage(canvas, 0, 0, size, size)
  }
  return thumb.toDataURL('image/jpeg', 0.84)
}

function tryEncodeDataUrl(canvas: HTMLCanvasElement, mime: string, quality: number): string | null {
  try {
    const url = canvas.toDataURL(mime, quality)
    return typeof url === 'string' && url.startsWith(`data:${mime}`) ? url : null
  } catch {
    return null
  }
}

export function compressImageForStorage(image: HTMLImageElement, maxEdge = 640): string {
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight, 1))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, 0, 0, width, height)

  let hasAlpha = true
  try {
    const { data } = ctx.getImageData(0, 0, width, height)
    hasAlpha = false
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        hasAlpha = true
        break
      }
    }
  } catch {
    hasAlpha = true
  }

  if (!hasAlpha) {
    return (
      tryEncodeDataUrl(canvas, 'image/webp', 0.86) ??
      tryEncodeDataUrl(canvas, 'image/jpeg', 0.86) ??
      canvas.toDataURL('image/png')
    )
  }
  return tryEncodeDataUrl(canvas, 'image/webp', 0.9) ?? canvas.toDataURL('image/png')
}

function decodeImageSrc(src: string, onSettled?: () => void): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      onSettled?.()
      resolve(img)
    }
    img.onerror = () => {
      onSettled?.()
      reject(new Error('无法恢复已保存的源图预览。'))
    }
    img.src = src
  })
}

export async function loadImageFromDataUrl(dataUrlOrRef: string): Promise<HTMLImageElement> {
  const mediaId = parseMediaRef(dataUrlOrRef)
  if (!mediaId) {
    return decodeImageSrc(dataUrlOrRef)
  }
  const blob = await getMediaBlob(mediaId)
  if (!blob) {
    throw new Error('无法恢复已保存的源图预览。')
  }
  const objectUrl = URL.createObjectURL(blob)
  return decodeImageSrc(objectUrl, () => URL.revokeObjectURL(objectUrl))
}

export async function loadStoredPhoto(dataUrlOrRef: string): Promise<{ image: HTMLImageElement; preview: string }> {
  const image = await loadImageFromDataUrl(dataUrlOrRef)
  const preview = isMediaRef(dataUrlOrRef) ? compressImageForStorage(image, 128) : dataUrlOrRef
  return { image, preview }
}
