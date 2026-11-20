import type { BeadsData } from '../../lib/types'
import { countMaterials, detectImageType, gridDimensions, hexToRgb, PALETTE_NOTICE, physicalSize, quantizePixels, validateImageFile } from './beads'

export type PreviewMode = 'beads' | 'pixels'

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
  gradient.addColorStop(0, tint(color, 0.35))
  gradient.addColorStop(0.35, color)
  gradient.addColorStop(1, tint(color, -0.18))
  context.fillStyle = gradient
  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2)
  context.arc(x, y, hole, 0, Math.PI * 2, true)
  context.fill('evenodd')
  context.lineWidth = Math.max(0.6, cell * 0.028)
  context.strokeStyle = tint(color, -0.23)
  context.beginPath()
  context.arc(x, y, hole + 0.2, Math.PI * 1.05, Math.PI * 1.95)
  context.stroke()
  context.strokeStyle = tint(color, 0.6)
  context.beginPath()
  context.arc(x, y, radius - cell * 0.07, Math.PI * 1.07, Math.PI * 1.75)
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

export function renderPreview(canvas: HTMLCanvasElement, data: BeadsData, mode: PreviewMode, showCodes: boolean) {
  const cell = 28
  const padding = mode === 'pixels' ? 32 : 16
  canvas.width = data.columns * cell + padding * 2
  canvas.height = data.rows * cell + padding * 2
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前浏览器无法显示画布预览。')
  context.clearRect(0, 0, canvas.width, canvas.height)
  if (mode === 'pixels') { drawPixels(context, data, cell, padding, padding, showCodes); return }
  const palette = new Map(data.palette.map(color => [color.code, color.color]))
  for (let y = 0; y < data.rows; y++) {
    for (let x = 0; x < data.columns; x++) {
      const centerX = padding + (x + 0.5) * cell
      const centerY = padding + (y + 0.5) * cell
      context.fillStyle = '#dce0d3'
      context.beginPath(); context.arc(centerX, centerY, 1.4, 0, Math.PI * 2); context.fill()
      const color = palette.get(data.cells[y * data.columns + x])
      if (color) drawBead(context, centerX, centerY, cell, color)
    }
  }
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
  const margin = 48
  const gridTop = 162
  const width = Math.max(760, data.columns * cell + margin * 2)
  const materials = countMaterials(data)
  const legendTop = gridTop + data.rows * cell + 60
  const footerTop = legendTop + Math.ceil(materials.length / 3) * 38 + 32
  const { canvas, context } = canvasWithContext(width, footerTop + 120)
  const size = physicalSize(data.columns, data.rows, data.beadSize)
  const total = materials.reduce((sum, material) => sum + material.count, 0)
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.textAlign = 'left'
  context.fillStyle = '#b86b4b'
  context.font = '12px sans-serif'
  context.fillText('GIFTCRAFT / 拼豆制作图纸', margin, 30)
  context.fillStyle = '#35392f'
  context.font = '600 26px sans-serif'
  context.fillText(name.trim() || '我的拼豆作品', margin, 68, width - margin * 2)
  context.font = '14px sans-serif'
  context.fillText(`${data.columns} 列 × ${data.rows} 行   ·   ${data.beadSize} mm 拼豆   ·   约 ${size.widthMm} × ${size.heightMm} mm   ·   ${total} 颗 / ${materials.length} 色`, margin, 100, width - margin * 2)
  context.fillStyle = '#758068'
  context.font = '12px sans-serif'
  context.fillText(`来源：${data.sourceName}   |   正面图纸 · 左上角起数 · 空白格不放豆`, margin, 124, width - margin * 2)
  drawPixels(context, data, cell, (width - data.columns * cell) / 2, gridTop, true)
  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
  context.fillStyle = '#35392f'
  context.font = '600 17px sans-serif'
  context.fillText('材料色卡 / 数量不含备用损耗', margin, legendTop - 18)
  const legendWidth = (width - margin * 2) / 3
  for (let index = 0; index < materials.length; index++) {
    const material = materials[index]
    const x = margin + (index % 3) * legendWidth
    const y = legendTop + Math.floor(index / 3) * 38
    context.fillStyle = material.color
    context.fillRect(x, y, 22, 22)
    context.strokeStyle = '#d6dacf'
    context.lineWidth = 1
    context.strokeRect(x, y, 22, 22)
    context.fillStyle = '#444b3d'
    context.font = '13px sans-serif'
    context.fillText(`${material.code} ${material.name} · ${material.count} 颗`, x + 31, y + 16, legendWidth - 42)
  }
  context.fillStyle = '#a15d43'
  context.font = '13px sans-serif'
  context.fillText(PALETTE_NOTICE, margin, footerTop, width - margin * 2)
  context.fillStyle = '#758068'
  context.font = '12px sans-serif'
  context.fillText('按网格外框估算尺寸；熨烫后尺寸可能变化。屏幕预览与实物可能存在色差。', margin, footerTop + 26, width - margin * 2)
  context.fillText('请用配套隔热纸，由成人按材料说明熨烫，保持通风，冷却后再取下。小颗粒远离幼儿。', margin, footerTop + 51, width - margin * 2)
  context.fillText('照片仅在本机处理，不上传。建议按色分豆、逐行核对，先检查孤立色块能否连接。', margin, footerTop + 76, width - margin * 2)
  return canvas
}

export function canvasPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG 生成失败，请重试。')), 'image/png')
  })
}
