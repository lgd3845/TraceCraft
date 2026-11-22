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

export function compressImageForStorage(image: HTMLImageElement, maxEdge = 320): string {
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight, 1))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/png')
}

export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('无法恢复已保存的源图预览。'))
    img.src = dataUrl
  })
}
