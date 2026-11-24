import type { BeadsData } from '../../lib/types'
import { countMaterials, detectImageType, gridDimensions, hexToRgb, PALETTE_NOTICE, physicalSize, quantizePixels, validateImageFile } from './beads'

export type PreviewMode = 'beads' | 'pixels'
export const PREVIEW_CELL = 28
export function previewPadding(mode: PreviewMode) {
  return mode === 'pixels' ? 32 : 16
}

function canvasWithContext(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width)
  canvas.height = Math.ceil(height)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前浏览器无法使用画布，请换用支持 Canvas 的浏览器。')
  return { canvas, context }
}

export async function decodeLocalImage(file: File): Promise<HTMLImageElement> {
  const error = validateImageFile(file)
  if (error) throw new Error(error)
  const type = detectImageType(new Uint8Array(await file.slice(0, 12).arrayBuffer()))
  if (!type || (file.type && file.type.toLowerCase() !== type)) {
    throw new Error('文件内容不是有效的 PNG、JPEG 或 WebP 图片，请勿只修改文件后缀。')
  }
  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const result = new Image()
      result.decoding = 'async'
      result.onload = () => resolve(result)
      result.onerror = () => reject(new Error('图片解码失败，文件可能已损坏，请换一张图片。'))
      result.src = url
    })
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('无法读取这张图片的尺寸。')
    if (image.naturalWidth * image.naturalHeight > 40_000_000) {
      throw new Error('图片分辨率超过 4000 万像素，请先缩小尺寸，避免浏览器内存不足。')
    }
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function sampleImage(image: HTMLImageElement, longestEdge: number, maxColors: number, sourceName: string, beadSize: number): BeadsData {
  const { columns, rows } = gridDimensions(image.naturalWidth, image.naturalHeight, longestEdge)
  // Allocate only the small target grid, never a full-resolution photo canvas.
  const { context } = canvasWithContext(columns, rows)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, columns, rows)
  const rgba = context.getImageData(0, 0, columns, rows).data
  return { ...quantizePixels(rgba, columns, rows, maxColors), sourceName, beadSize }
}

export function sourcePreview(image: HTMLImageElement): string {
  const { columns, rows } = gridDimensions(image.naturalWidth, image.naturalHeight, 128)
  const { canvas, context } = canvasWithContext(columns, rows)
  context.drawImage(image, 0, 0, columns, rows)
  return canvas.toDataURL('image/png')
}

function tint(hex: string, amount: number) {
  return `rgb(${hexToRgb(hex).map(channel => Math.round(channel + (amount > 0 ? 255 - channel : channel) * amount)).join(',')})`
}

function drawBead(context: CanvasRenderingContext2D, x: number, y: number, cell: number, color: string) {
  const radius = cell * 0.445
  const hole = cell * 0.18
  const gradient = context.createLinearGradient(x - radius, y - radius, x + radius, y + radius)
  gradient.addColorStop(0, tint(color, 0.42))
  gradient.addColorStop(0.32, color)
  gradient.addColorStop(0.75, tint(color, -0.08))
  gradient.addColorStop(1, tint(color, -0.26))
  context.fillStyle = gradient
  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2)
  context.arc(x, y, hole, 0, Math.PI * 2, true)
  context.fill('evenodd')
  context.lineWidth = Math.max(0.6, cell * 0.032)
  context.strokeStyle = tint(color, -0.3)
  context.beginPath()
  context.arc(x, y, radius - cell * 0.015, Math.PI * 0.15, Math.PI * 0.92)
  context.stroke()
  context.beginPath()
  context.arc(x, y, hole + 0.3, Math.PI * 1.05, Math.PI * 1.95)
  context.stroke()
  context.strokeStyle = tint(color, 0.68)
  context.lineWidth = Math.max(0.7, cell * 0.045)
  context.beginPath()
  context.arc(x, y, radius - cell * 0.08, Math.PI * 1.08, Math.PI * 1.72)
  context.stroke()
}

function drawPixels(context: CanvasRenderingContext2D, data: BeadsData, cell: number, left: number, top: number, showCodes: boolean) {
  const palette = new Map(data.palette.map(color => [color.code, color.color]))
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `500 ${Math.round(cell * 0.31)}px sans-serif`
  for (let y = 0; y < data.rows; y++) {
    for (let x = 0; x < data.columns; x++) {
      const code = data.cells[y * data.columns + x]
      const color = palette.get(code)
      if (!color) continue
      context.fillStyle = color
      context.fillRect(left + x * cell, top + y * cell, cell, cell)
      if (showCodes) {
        const rgb = hexToRgb(color)
        context.fillStyle = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 > 155 ? '#30352c' : '#ffffff'
        context.fillText(code, left + (x + 0.5) * cell, top + (y + 0.5) * cell, cell - 3)
      }
    }
  }
  for (let x = 0; x <= data.columns; x++) {
    context.strokeStyle = x % 5 === 0 ? '#89917f' : '#bdc3b5'
    context.lineWidth = x % 5 === 0 ? 1.2 : 0.6
    context.beginPath(); context.moveTo(left + x * cell, top); context.lineTo(left + x * cell, top + data.rows * cell); context.stroke()
  }
  for (let y = 0; y <= data.rows; y++) {
    context.strokeStyle = y % 5 === 0 ? '#89917f' : '#bdc3b5'
    context.lineWidth = y % 5 === 0 ? 1.2 : 0.6
    context.beginPath(); context.moveTo(left, top + y * cell); context.lineTo(left + data.columns * cell, top + y * cell); context.stroke()
  }
  context.fillStyle = '#657057'
  context.font = `${Math.round(cell * 0.32)}px sans-serif`
  for (let x = 0; x < data.columns; x++) context.fillText(String(x + 1), left + (x + 0.5) * cell, top - cell * 0.52)
  for (let y = 0; y < data.rows; y++) context.fillText(String(y + 1), left - cell * 0.58, top + (y + 0.5) * cell)
}

interface PreviewRenderState {
  columns: number
  rows: number
  mode: PreviewMode
  showCodes: boolean
  paletteKey: string
  width: number
  height: number
  cells: string[]
}

const MAX_BEAD_SPRITE_CACHE = 256
const beadSpriteCache = new Map<string, HTMLCanvasElement>()
const previewStateCache = new WeakMap<HTMLCanvasElement, PreviewRenderState>()

function getBeadSprite(cell: number, color: string, targetCanvas: HTMLCanvasElement): HTMLCanvasElement | null {
  if (typeof document === 'undefined' || cell <= 0 || cell % 2 !== 0) return null
  const key = `${cell}|${color}`
  let cached = beadSpriteCache.get(key)
  if (cached) {
    if (cached === targetCanvas) return null
    return cached
  }
  const sprite = document.createElement('canvas')
  if (!sprite || sprite === targetCanvas) return null
  sprite.width = cell
  sprite.height = cell
  const sCtx = sprite.getContext('2d')
  if (!sCtx || typeof sCtx.createLinearGradient !== 'function') return null
  const half = cell * 0.5
  drawBead(sCtx, half, half, cell, color)
  if (beadSpriteCache.size >= MAX_BEAD_SPRITE_CACHE) {
    const oldest = beadSpriteCache.keys().next().value
    if (oldest !== undefined) beadSpriteCache.delete(oldest)
  }
  beadSpriteCache.set(key, sprite)
  return sprite
}

function paletteCacheKey(palette: BeadsData['palette']): string {
  return palette.map(c => `${c.code}:${c.color}`).join('|')
}

function drawPreviewBeadCell(
  context: CanvasRenderingContext2D,
  targetCanvas: HTMLCanvasElement,
  x: number,
  y: number,
  cell: number,
  padding: number,
  color: string | undefined,
) {
  const centerX = padding + (x + 0.5) * cell
  const centerY = padding + (y + 0.5) * cell
  context.fillStyle = '#dce0d3'
  context.beginPath()
  context.arc(centerX, centerY, 1.4, 0, Math.PI * 2)
  context.fill()
  if (!color) return
  const sprite = getBeadSprite(cell, color, targetCanvas)
  if (sprite && typeof context.drawImage === 'function') {
    const half = cell * 0.5
    context.drawImage(sprite, centerX - half, centerY - half)
  } else {
    drawBead(context, centerX, centerY, cell, color)
  }
}

export function renderPreview(canvas: HTMLCanvasElement, data: BeadsData, mode: PreviewMode, showCodes: boolean) {
  const cell = PREVIEW_CELL
  const padding = previewPadding(mode)
  const width = data.columns * cell + padding * 2
  const height = data.rows * cell + padding * 2
  const dimensionsChanged = canvas.width !== width || canvas.height !== height
  if (dimensionsChanged) {
    canvas.width = width
    canvas.height = height
  }
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前浏览器无法显示画布预览。')

  const palKey = paletteCacheKey(data.palette)
  const prev = !dimensionsChanged ? previewStateCache.get(canvas) : undefined
  if (
    prev &&
    prev.columns === data.columns &&
    prev.rows === data.rows &&
    prev.mode === mode &&
    prev.showCodes === showCodes &&
    prev.paletteKey === palKey &&
    prev.cells.length === data.cells.length
  ) {
    const changed: number[] = []
    for (let i = 0; i < data.cells.length; i++) {
      if (data.cells[i] !== prev.cells[i]) changed.push(i)
    }
    if (changed.length === 0) return
    if (mode === 'beads' && changed.length <= 64) {
      const palette = new Map(data.palette.map(color => [color.code, color.color]))
      for (const idx of changed) {
        const code = data.cells[idx]
        prev.cells[idx] = code
        const x = idx % data.columns
        const y = Math.floor(idx / data.columns)
        context.clearRect(padding + x * cell, padding + y * cell, cell, cell)
        drawPreviewBeadCell(context, canvas, x, y, cell, padding, palette.get(code))
      }
      return
    }
  }

  context.clearRect(0, 0, canvas.width, canvas.height)
  if (mode === 'pixels') {
    drawPixels(context, data, cell, padding, padding, showCodes)
  } else {
    const palette = new Map(data.palette.map(color => [color.code, color.color]))
    for (let y = 0; y < data.rows; y++) {
      for (let x = 0; x < data.columns; x++) {
        drawPreviewBeadCell(context, canvas, x, y, cell, padding, palette.get(data.cells[y * data.columns + x]))
      }
    }
  }

  previewStateCache.set(canvas, {
    columns: data.columns,
    rows: data.rows,
    mode,
    showCodes,
    paletteKey: palKey,
    width,
    height,
    cells: data.cells.slice(),
  })
}

export function thumbnailPng(data: BeadsData): string {
  const occupied = data.cells.map((code, index) => code ? index : -1).filter(index => index >= 0)
  if (!occupied.length) throw new Error('图纸目前没有拼豆，请换张图片或调整参数。')
  const xs = occupied.map(index => index % data.columns)
  const ys = occupied.map(index => Math.floor(index / data.columns))
  const left = Math.min(...xs)
  const top = Math.min(...ys)
  const columns = Math.max(...xs) - left + 1
  const rows = Math.max(...ys) - top + 1
  const cell = Math.min(24, 480 / Math.max(columns, rows))
  const padding = 4
  const { canvas, context } = canvasWithContext(columns * cell + padding * 2, rows * cell + padding * 2)
  const palette = new Map(data.palette.map(color => [color.code, color.color]))
  // Intentionally no background, pegboard, labels, or shadows. Even the holes
  // remain transparent so the artwork composes naturally into a gift box.
  for (const index of occupied) {
    const color = palette.get(data.cells[index])
    if (color) drawBead(context, padding + (index % data.columns - left + 0.5) * cell, padding + (Math.floor(index / data.columns) - top + 0.5) * cell, cell, color)
  }
  return canvas.toDataURL('image/png')
}

export function patternCanvas(data: BeadsData, name: string): HTMLCanvasElement {
  const cell = 30
  const margin = 52
  const gridInnerPad = 36
  const gridWidth = data.columns * cell
  const gridHeight = data.rows * cell
  const gridCardW = Math.max(856, gridWidth + gridInnerPad * 2)
  const gridCardH = gridHeight + gridInnerPad * 2 + 12
  const width = Math.max(960, gridCardW + margin * 2)
  const gridCardY = 166
  const drawTop = gridCardY + gridInnerPad + 8
  const drawLeft = (width - gridWidth) / 2
  const materials = countMaterials(data)
  const legendCardY = gridCardY + gridCardH + 22
  const legendStartY = legendCardY + 62
  const legendRows = Math.max(1, Math.ceil(materials.length / 3))
  const legendCardH = 74 + legendRows * 38 + 16
  const footerY = legendCardY + legendCardH + 34
  const height = footerY + 56
  const { canvas, context } = canvasWithContext(width, height)
  const size = physicalSize(data.columns, data.rows, data.beadSize)
  const total = materials.reduce((sum, material) => sum + material.count, 0)

  context.fillStyle = '#faf8f2'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = '#e4e5d9'
  context.lineWidth = 2
  context.strokeRect(20, 20, canvas.width - 40, canvas.height - 40)

  context.textAlign = 'left'
  context.fillStyle = '#b86b4b'
  context.font = '600 13px sans-serif'
  context.fillText('TRACECRAFT · PERLER BEADS · 拼豆工坊图纸', margin, 56, width - margin * 2)
  context.fillStyle = '#333a2d'
  context.font = '700 30px sans-serif'
  context.fillText(name.trim() || '我的拼豆作品', margin, 96, width - margin * 2)
  context.fillStyle = '#5e6653'
  context.font = '15px sans-serif'
  context.fillText(
    `${data.columns} × ${data.rows} 格   ·   ${data.beadSize} mm 拼豆   ·   约 ${size.widthMm} × ${size.heightMm} mm   ·   ${total} 颗 / ${materials.length} 色`,
    margin,
    126,
    width - margin * 2,
  )
  context.fillStyle = '#7b846f'
  context.font = '12px sans-serif'
  context.fillText(`来源：${data.sourceName}   ·   正面左起计数 · 空白格不放豆`, margin, 148, width - margin * 2)

  context.fillStyle = '#ffffff'
  context.beginPath()
  context.roundRect((width - gridCardW) / 2, gridCardY, gridCardW, gridCardH, 16)
  context.fill()
  context.strokeStyle = '#e5e6dc'
  context.lineWidth = 1.5
  context.stroke()

  drawPixels(context, data, cell, drawLeft, drawTop, true)

  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
  const legendCardX = margin
  const legendCardW = width - margin * 2
  context.fillStyle = '#ffffff'
  context.beginPath()
  context.roundRect(legendCardX, legendCardY, legendCardW, legendCardH, 16)
  context.fill()
  context.strokeStyle = '#e5e6dc'
  context.lineWidth = 1.5
  context.stroke()

  context.fillStyle = '#353c2f'
  context.font = '700 17px sans-serif'
  context.fillText(`材料色卡（共 ${materials.length} 色）`, legendCardX + 24, legendCardY + 36)

  const legendWidth = (legendCardW - 48) / 3
  for (let index = 0; index < materials.length; index++) {
    const material = materials[index]
    const x = legendCardX + 24 + (index % 3) * legendWidth
    const y = legendStartY + Math.floor(index / 3) * 38
    context.fillStyle = material.color
    context.beginPath()
    context.roundRect(x, y, 22, 22, 5)
    context.fill()
    context.strokeStyle = '#d6dacf'
    context.lineWidth = 1
    context.stroke()
    context.fillStyle = '#444b3d'
    context.font = '13px sans-serif'
    context.fillText(`${material.code} ${material.name} · ${material.count} 颗`, x + 31, y + 16, legendWidth - 42)
  }

  context.fillStyle = '#a15d43'
  context.font = '12px sans-serif'
  context.fillText(PALETTE_NOTICE, margin, footerY, width - margin * 2 - 230)
  context.textAlign = 'right'
  context.fillStyle = '#77806b'
  context.fillText('由 TraceCraft 拼豆工坊在本地生成', width - margin, footerY)
  context.textAlign = 'left'
  context.fillStyle = '#758068'
  context.fillText('请用配套隔热纸由成人按说明熨烫，冷却后再取下；小颗粒远离幼儿。', margin, footerY + 24, width - margin * 2)
  return canvas
}

export function canvasPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG 生成失败，请重试。')), 'image/png')
  })
}
