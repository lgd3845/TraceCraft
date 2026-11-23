import { canvasPngBlob, decodeLocalImage, sourcePreview } from '../beads/beadsCanvas'
import {
  EMBROIDERY_SAFETY_NOTICE,
  FABRIC_PRESETS,
  quantizeImageToEmbroideryGrid,
  STITCH_MODE_INFO,
} from './embroidery'
import type {
  EmbroideryPlan,
  EmbroideryStitch,
  FabricPreset,
  QuantizedEmbroideryGrid,
} from './embroidery'

export { canvasPngBlob, decodeLocalImage, sourcePreview }

export type EmbroideryViewMode = 'realistic' | 'guide' | 'pattern'

export interface EmbroideryRenderOptions {
  mode: EmbroideryViewMode
  currentStep: number
  showGrid: boolean
  showGhost: boolean
}

function getContext(canvas: HTMLCanvasElement, width: number, height: number) {
  canvas.width = Math.round(width)
  canvas.height = Math.round(height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器无法使用画布，请换用支持 Canvas 的浏览器。')
  return ctx
}

export function readEmbroideryImageRgba(
  image: HTMLImageElement,
  targetMax = 128,
): { rgba: Uint8ClampedArray; width: number; height: number } {
  const nw = Math.max(1, image.naturalWidth)
  const nh = Math.max(1, image.naturalHeight)
  const scale = Math.min(1, targetMax / Math.max(nw, nh))
  const w = Math.max(16, Math.round(nw * scale))
  const h = Math.max(16, Math.round(nh * scale))
  const offscreen = document.createElement('canvas')
  const ctx = getContext(offscreen, w, h)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, 0, 0, w, h)
  return {
    rgba: ctx.getImageData(0, 0, w, h).data,
    width: w,
    height: h,
  }
}

export function sampleImageToEmbroideryGrid(
  image: HTMLImageElement,
  gridSize: number,
  maxColors: number,
  removeBg = true,
): QuantizedEmbroideryGrid {
  const { rgba, width, height } = readEmbroideryImageRgba(image, 128)
  return quantizeImageToEmbroideryGrid(rgba, width, height, gridSize, maxColors, removeBg)
}

const colorCache = new Map<string, [number, number, number]>()

function hexToRgb(hex: string): [number, number, number] {
  let cached = colorCache.get(hex)
  if (!cached) {
    const clean = hex.replace('#', '')
    const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean
    cached = [
      parseInt(full.slice(0, 2), 16) || 40,
      parseInt(full.slice(2, 4), 16) || 40,
      parseInt(full.slice(4, 6), 16) || 40,
    ]
    colorCache.set(hex, cached)
  }
  return cached
}

function tintHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  if (amount >= 0) {
    const nr = Math.min(255, Math.round(r + (255 - r) * amount))
    const ng = Math.min(255, Math.round(g + (255 - g) * amount))
    const nb = Math.min(255, Math.round(b + (255 - b) * amount))
    return `rgb(${nr},${ng},${nb})`
  }
  const f = Math.max(0, 1 + amount)
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`
}

function drawWoodenHoopAndFabric(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  hoopRadius: number,
  fabric: FabricPreset,
  isCrossStitchGrid: boolean,
  plan: EmbroideryPlan,
) {
  const scale = hoopRadius / 300
  const innerR = hoopRadius * 0.905

  // Top brass tightening hardware at 12 o'clock
  ctx.save()
  ctx.translate(cx, cy - hoopRadius - 6 * scale)
  ctx.fillStyle = '#a88446'
  ctx.strokeStyle = '#755928'
  ctx.lineWidth = Math.max(1, 1.4 * scale)
  ctx.beginPath()
  ctx.roundRect(-14 * scale, -10 * scale, 28 * scale, 16 * scale, 3 * scale)
  ctx.fill()
  ctx.stroke()
  // Threaded screw rod & brass thumb nut
  ctx.fillStyle = '#c9a65d'
  ctx.fillRect(-28 * scale, -5.5 * scale, 56 * scale, 5 * scale)
  ctx.beginPath()
  ctx.roundRect(22 * scale, -9 * scale, 9 * scale, 12 * scale, 2 * scale)
  ctx.fill()
  ctx.stroke()
  ctx.restore()

  // Outer drop shadow of wooden hoop
  ctx.save()
  ctx.shadowColor = 'rgba(42, 32, 20, 0.22)'
  ctx.shadowBlur = 22 * scale
  ctx.shadowOffsetY = 9 * scale
  ctx.beginPath()
  ctx.arc(cx, cy, hoopRadius, 0, Math.PI * 2)
  ctx.fillStyle = fabric.hoopRim
  ctx.fill()
  ctx.restore()

  // Beechwood hoop gradient ring
  const woodGrad = ctx.createRadialGradient(
    cx - hoopRadius * 0.25,
    cy - hoopRadius * 0.25,
    innerR,
    cx,
    cy,
    hoopRadius,
  )
  woodGrad.addColorStop(0, tintHex(fabric.hoopRim, -0.22))
  woodGrad.addColorStop(0.35, tintHex(fabric.hoopRim, 0.16))
  woodGrad.addColorStop(0.82, fabric.hoopRim)
  woodGrad.addColorStop(1, tintHex(fabric.hoopRim, -0.32))

  ctx.beginPath()
  ctx.arc(cx, cy, hoopRadius, 0, Math.PI * 2)
  ctx.fillStyle = woodGrad
  ctx.fill()

  // Subtle wood ring grain line
  ctx.beginPath()
  ctx.arc(cx, cy, hoopRadius * 0.955, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(72, 48, 22, 0.16)'
  ctx.lineWidth = Math.max(0.8, 1.2 * scale)
  ctx.stroke()

  // Inner tensioned fabric disk
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
  ctx.clip()

  ctx.fillStyle = fabric.board
  ctx.fillRect(cx - innerR, cy - innerR, innerR * 2, innerR * 2)

  // Procedural linen / Aida woven texture
  const activeR = innerR * 0.92
  if (isCrossStitchGrid) {
    const step = plan.cellSizeNorm * activeR
    const startX = cx - ((plan.gridWidth - 1) / 2 + 0.5) * step
    const startY = cy - ((plan.gridHeight - 1) / 2 + 0.5) * step
    ctx.strokeStyle = fabric.weave
    ctx.globalAlpha = fabric.darkFabric ? 0.42 : 0.58
    ctx.lineWidth = Math.max(0.45, 0.65 * scale)
    ctx.beginPath()
    for (let gx = 0; gx <= plan.gridWidth; gx++) {
      const x = startX + gx * step
      ctx.moveTo(x, startY)
      ctx.lineTo(x, startY + plan.gridHeight * step)
    }
    for (let gy = 0; gy <= plan.gridHeight; gy++) {
      const y = startY + gy * step
      ctx.moveTo(startX, y)
      ctx.lineTo(startX + plan.gridWidth * step, y)
    }
    ctx.stroke()

    // Crisp Aida needle pinholes at cell corners
    ctx.fillStyle = fabric.darkFabric ? 'rgba(8,10,16,0.45)' : 'rgba(92,76,54,0.22)'
    const dotR = Math.max(0.55, Math.min(1.3, step * 0.095))
    for (let gy = 0; gy <= plan.gridHeight; gy += 1) {
      const y = startY + gy * step
      if (Math.abs(y - cy) > innerR) continue
      for (let gx = 0; gx <= plan.gridWidth; gx += 1) {
        const x = startX + gx * step
        if ((x - cx) ** 2 + (y - cy) ** 2 > innerR * innerR) continue
        ctx.fillRect(x - dotR * 0.5, y - dotR * 0.5, dotR, dotR)
      }
    }
  } else {
    // Organic linen warp & weft micro-threads
    const weaveStep = Math.max(3.5, 5.2 * scale)
    ctx.strokeStyle = fabric.weave
    ctx.lineWidth = Math.max(0.45, 0.7 * scale)
    ctx.globalAlpha = fabric.darkFabric ? 0.35 : 0.45
    ctx.beginPath()
    for (let off = -innerR; off <= innerR; off += weaveStep) {
      ctx.moveTo(cx + off, cy - innerR)
      ctx.lineTo(cx + off, cy + innerR)
      ctx.moveTo(cx - innerR, cy + off)
      ctx.lineTo(cx + innerR, cy + off)
    }
    ctx.stroke()
  }

  // Soft interior bevel shadow cast by wooden inner ring onto cloth
  ctx.globalAlpha = 1
  const innerShadow = ctx.createRadialGradient(cx, cy, innerR * 0.87, cx, cy, innerR)
  innerShadow.addColorStop(0, 'rgba(0,0,0,0)')
  innerShadow.addColorStop(1, 'rgba(32, 22, 12, 0.24)')
  ctx.fillStyle = innerShadow
  ctx.beginPath()
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Crisp inner brass/wood seam edge
  ctx.beginPath()
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
  ctx.strokeStyle = tintHex(fabric.hoopRim, -0.35)
  ctx.lineWidth = Math.max(1.2, 2.0 * scale)
  ctx.stroke()
}

/**
 * Physically-inspired Kajiya-Kay / cylindrical thread strand renderer:
 * pinhole recess + cast drop shadow + shaded floss core + angle-dependent silk sheen ridge.
 */
function renderThreadSegment3D(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  width: number,
  angle: number,
  scale: number,
) {
  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.hypot(dx, dy)
  if (len < 0.5) return

  // Perpendicular normal toward upper-left key light (-45 deg)
  let nx = -dy / len
  let ny = dx / len
  if (nx + ny > 0) {
    nx = -nx
    ny = -ny
  }

  // 1. Subtle needle entry & exit cloth dimples
  ctx.fillStyle = 'rgba(24, 18, 12, 0.14)'
  const holeR = Math.max(0.4, width * 0.22)
  ctx.beginPath()
  ctx.arc(x0, y0, holeR, 0, Math.PI * 2)
  ctx.arc(x1, y1, holeR, 0, Math.PI * 2)
  ctx.fill()

  // 2. Soft lift shadow beneath floss thread
  const shOff = Math.max(0.45, width * 0.24)
  ctx.strokeStyle = 'rgba(20, 14, 10, 0.16)'
  ctx.lineWidth = width * 1.04
  ctx.beginPath()
  ctx.moveTo(x0 + shOff * 0.65, y0 + shOff)
  ctx.lineTo(x1 + shOff * 0.65, y1 + shOff)
  ctx.stroke()

  // 3. Softly contoured cylindrical edge & lush floss body
  ctx.strokeStyle = tintHex(color, -0.14)
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.stroke()

  ctx.strokeStyle = color
  ctx.lineWidth = width * 0.84
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.stroke()

  // 4. Anisotropic Kajiya-Kay mercerized silk sheen along center belly (natural silky highlight, not plastic glare)
  const sheen = 0.10 + 0.24 * Math.abs(Math.sin(angle - Math.PI * 0.25))
  const hxOff = nx * width * 0.14
  const hyOff = ny * width * 0.14
  ctx.strokeStyle = tintHex(color, sheen)
  ctx.lineWidth = Math.max(0.38, width * 0.30)
  ctx.beginPath()
  ctx.moveTo(x0 + dx * 0.14 + hxOff, y0 + dy * 0.14 + hyOff)
  ctx.lineTo(x0 + dx * 0.86 + hxOff, y0 + dy * 0.86 + hyOff)
  ctx.stroke()

  if (width >= 2.4 * scale && sheen > 0.24) {
    ctx.strokeStyle = tintHex(color, Math.min(0.44, sheen + 0.12))
    ctx.lineWidth = Math.max(0.28, width * 0.14)
    ctx.beginPath()
    ctx.moveTo(x0 + dx * 0.26 + hxOff * 1.1, y0 + dy * 0.26 + hyOff * 1.1)
    ctx.lineTo(x0 + dx * 0.74 + hxOff * 1.1, y0 + dy * 0.74 + hyOff * 1.1)
    ctx.stroke()
  }
}

function renderPunchLoop3D(
  ctx: CanvasRenderingContext2D,
  cxPt: number,
  cyPt: number,
  radius: number,
  angle: number,
  color: string,
) {
  ctx.save()
  ctx.translate(cxPt, cyPt)
  ctx.rotate(angle)

  const rx = radius * 1.28
  const ry = radius * 0.88

  // 1. Cozy wool tuft base shadow
  ctx.fillStyle = 'rgba(20, 14, 10, 0.18)'
  ctx.beginPath()
  ctx.ellipse(radius * 0.16, radius * 0.20, rx * 1.04, ry * 1.04, 0, 0, Math.PI * 2)
  ctx.fill()

  // 2. Plush wool-blend loop dome
  const grad = ctx.createRadialGradient(-rx * 0.26, -ry * 0.28, radius * 0.12, 0, 0, rx)
  grad.addColorStop(0, tintHex(color, 0.28))
  grad.addColorStop(0.58, color)
  grad.addColorStop(1, tintHex(color, -0.26))
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()

  // 3. Soft recessed loop fold crease
  ctx.strokeStyle = tintHex(color, -0.32)
  ctx.lineWidth = Math.max(0.55, radius * 0.18)
  ctx.beginPath()
  ctx.ellipse(0, ry * 0.12, rx * 0.44, ry * 0.32, 0, 0.15, Math.PI - 0.15)
  ctx.stroke()
  ctx.restore()
}

function drawGuideContours(
  ctx: CanvasRenderingContext2D,
  plan: EmbroideryPlan,
  fabric: FabricPreset,
  cx: number,
  cy: number,
  activeR: number,
  scale: number,
) {
  ctx.save()
  ctx.strokeStyle = fabric.darkFabric ? 'rgba(130, 178, 224, 0.34)' : 'rgba(54, 114, 166, 0.30)'
  ctx.lineWidth = Math.max(0.8, 1.15 * scale)
  ctx.setLineDash([4 * scale, 3 * scale])
  for (const pl of plan.contours) {
    if (pl.points.length < 2) continue
    ctx.beginPath()
    pl.points.forEach((pt, idx) => {
      const px = cx + pt.x * activeR
      const py = cy + pt.y * activeR
      if (idx === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    ctx.stroke()
  }
  ctx.restore()
}

function drawRemainingGhostStitches(
  ctx: CanvasRenderingContext2D,
  plan: EmbroideryPlan,
  fabric: FabricPreset,
  drawnCount: number,
  total: number,
  cx: number,
  cy: number,
  activeR: number,
  cellPx: number,
) {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.globalAlpha = fabric.darkFabric ? 0.16 : 0.13
  ctx.lineWidth = Math.max(1.2, cellPx * 0.35)
  for (let i = drawnCount; i < total; i++) {
    const s = plan.stitches[i]
    ctx.strokeStyle = s.color
    ctx.beginPath()
    ctx.moveTo(cx + s.x0 * activeR, cy + s.y0 * activeR)
    ctx.lineTo(cx + s.x1 * activeR, cy + s.y1 * activeR)
    ctx.stroke()
  }
  ctx.restore()
}

function drawSingleEmbroideryStitch(
  ctx: CanvasRenderingContext2D,
  s: EmbroideryStitch,
  cx: number,
  cy: number,
  activeR: number,
  cellPx: number,
  scale: number,
) {
  if (s.kind === 'punch-loop') {
    const mx = cx + ((s.x0 + s.x1) * 0.5) * activeR
    const my = cy + ((s.y0 + s.y1) * 0.5) * activeR
    renderPunchLoop3D(ctx, mx, my, Math.max(2.6, cellPx * 0.54), s.angle, s.color)
    return
  }

  const p0x = cx + s.x0 * activeR
  const p0y = cy + s.y0 * activeR
  const p1x = cx + s.x1 * activeR
  const p1y = cy + s.y1 * activeR

  if (s.kind === 'cross') {
    const legW = Math.max(1.6, cellPx * 0.32)
    renderThreadSegment3D(ctx, p0x, p1y, p1x, p0y, s.color, legW, -Math.PI / 4, scale)
    ctx.fillStyle = 'rgba(18, 12, 8, 0.22)'
    ctx.beginPath()
    ctx.arc((p0x + p1x) * 0.5, (p0y + p1y) * 0.5, legW * 0.56, 0, Math.PI * 2)
    ctx.fill()
    renderThreadSegment3D(ctx, p0x, p0y, p1x, p1y, s.color, legW, Math.PI / 4, scale)
    return
  }

  const strokeW = s.kind === 'backstitch'
    ? Math.max(1.3, cellPx * 0.34)
    : s.kind === 'satin'
      ? Math.max(2.0, cellPx * 0.56)
      : Math.max(2.4, cellPx * 0.68)
  renderThreadSegment3D(ctx, p0x, p0y, p1x, p1y, s.color, strokeW, s.angle, scale)
}

function drawActiveNeedleIndicator(
  ctx: CanvasRenderingContext2D,
  active: EmbroideryStitch,
  fabric: FabricPreset,
  cx: number,
  cy: number,
  activeR: number,
  scale: number,
) {
  const ax = cx + active.x0 * activeR
  const ay = cy + active.y0 * activeR
  const bx = cx + active.x1 * activeR
  const by = cy + active.y1 * activeR
  const accent = fabric.darkFabric ? '#ff9d66' : '#c7422f'
  ctx.save()
  ctx.strokeStyle = accent
  ctx.lineWidth = Math.max(2, 2.8 * scale)
  ctx.setLineDash([4 * scale, 2.5 * scale])
  ctx.beginPath()
  ctx.moveTo(ax, ay)
  ctx.lineTo(bx, by)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.arc(ax, ay, Math.max(3.5, 4.5 * scale), 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = Math.max(1.2, 1.6 * scale)
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(bx, by, Math.max(4, 5 * scale), 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = accent
  ctx.lineWidth = Math.max(2, 2.5 * scale)
  ctx.stroke()
  ctx.restore()
}

export function drawEmbroideryScene(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  hoopRadius: number,
  plan: EmbroideryPlan,
  fabric: FabricPreset,
  options: EmbroideryRenderOptions,
) {
  const scale = hoopRadius / 300
  const innerR = hoopRadius * 0.905
  const activeR = innerR * 0.92
  const cellPx = plan.cellSizeNorm * activeR

  drawWoodenHoopAndFabric(
    ctx,
    cx,
    cy,
    hoopRadius,
    fabric,
    options.showGrid || options.mode === 'pattern',
    plan,
  )

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, innerR - 1, 0, Math.PI * 2)
  ctx.clip()

  const toCanvas = (nx: number, ny: number) => ({
    x: cx + nx * activeR,
    y: cy + ny * activeR,
  })

  if (options.mode === 'pattern') {
    // Pattern view: water-soluble pen contours + stitch direction / cross-stitch symbols
    ctx.strokeStyle = fabric.darkFabric ? '#7ea3cc' : '#2f658e'
    ctx.lineWidth = Math.max(0.9, 1.4 * scale)
    for (const pl of plan.contours) {
      if (pl.points.length < 2) continue
      ctx.beginPath()
      pl.points.forEach((pt, idx) => {
        const p = toCanvas(pt.x, pt.y)
        if (idx === 0) ctx.moveTo(p.x, p.y)
        else ctx.lineTo(p.x, p.y)
      })
      ctx.stroke()
    }

    if (plan.stitchMode === 'cross-stitch') {
      ctx.font = `600 ${Math.max(7, Math.round(cellPx * 0.56))}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const s of plan.stitches) {
        if (s.kind !== 'cross') continue
        const m = toCanvas((s.x0 + s.x1) * 0.5, (s.y0 + s.y1) * 0.5)
        ctx.fillStyle = s.color
        ctx.globalAlpha = 0.22
        ctx.fillRect(m.x - cellPx * 0.45, m.y - cellPx * 0.45, cellPx * 0.9, cellPx * 0.9)
        ctx.globalAlpha = 0.92
        ctx.fillStyle = fabric.darkFabric ? '#f2eee4' : '#2d261e'
        ctx.fillText(s.symbol, m.x, m.y)
      }
      ctx.globalAlpha = 1
      ctx.lineWidth = Math.max(1.2, 1.8 * scale)
      for (const s of plan.stitches) {
        if (s.kind !== 'backstitch') continue
        const p0 = toCanvas(s.x0, s.y0)
        const p1 = toCanvas(s.x1, s.y1)
        ctx.strokeStyle = s.color
        ctx.beginPath()
        ctx.moveTo(p0.x, p0.y)
        ctx.lineTo(p1.x, p1.y)
        ctx.stroke()
      }
    } else {
      ctx.lineCap = 'round'
      for (const s of plan.stitches) {
        const p0 = toCanvas(s.x0, s.y0)
        const p1 = toCanvas(s.x1, s.y1)
        ctx.strokeStyle = s.color
        ctx.globalAlpha = 0.65
        ctx.lineWidth = Math.max(1.1, cellPx * 0.25)
        ctx.beginPath()
        ctx.moveTo(p0.x, p0.y)
        ctx.lineTo(p1.x, p1.y)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
    ctx.restore()
    return
  }

  // Water-soluble blue guide outline under stitches in guide mode
  if (options.mode === 'guide') {
    drawGuideContours(ctx, plan, fabric, cx, cy, activeR, scale)
  }

  const stitchCount = plan.stitches.length
  const total = Math.max(1, stitchCount)
  const clampStep = Math.max(1, Math.min(total, Math.trunc(options.currentStep)))
  const drawnCount = Math.min(stitchCount, options.mode === 'realistic' ? total : clampStep)

  // Optional ghost preview of remaining unstitched pattern in guide mode
  if (options.mode === 'guide' && options.showGhost && drawnCount < stitchCount) {
    drawRemainingGhostStitches(ctx, plan, fabric, drawnCount, stitchCount, cx, cy, activeR, cellPx)
  }

  ctx.lineCap = 'round'
  for (let i = 0; i < drawnCount; i++) {
    drawSingleEmbroideryStitch(ctx, plan.stitches[i], cx, cy, activeR, cellPx, scale)
  }

  // Highlight active needle entry/exit indicator in interactive step-by-step guide mode
  if (options.mode === 'guide' && stitchCount > 0) {
    drawActiveNeedleIndicator(ctx, plan.stitches[clampStep - 1], fabric, cx, cy, activeR, scale)
  }

  ctx.restore()
}

interface EmbroideryBoardCache {
  backdrop: HTMLCanvasElement
  stitchesLayer: HTMLCanvasElement
  stitchesCtx: CanvasRenderingContext2D
  renderedCount: number
}

const embroideryBoardCache = new WeakMap<EmbroideryPlan, Map<string, EmbroideryBoardCache>>()

function getEmbroideryBoardCache(
  plan: EmbroideryPlan,
  fabric: FabricPreset,
  mode: 'realistic' | 'guide',
  showGrid: boolean,
  size: number,
  cx: number,
  cy: number,
  hoopRadius: number,
  innerR: number,
  activeR: number,
  scale: number,
): EmbroideryBoardCache | null {
  if (typeof document === 'undefined') return null
  let byKey = embroideryBoardCache.get(plan)
  if (!byKey) {
    byKey = new Map()
    embroideryBoardCache.set(plan, byKey)
  }
  const key = `${size}|${fabric.id}|${mode}|${showGrid ? 1 : 0}`
  let entry = byKey.get(key)
  if (!entry) {
    const backdrop = document.createElement('canvas')
    const stitchesLayer = document.createElement('canvas')
    const bCtx = backdrop.getContext('2d')
    const stitchesCtx = stitchesLayer.getContext('2d')
    if (!bCtx || !stitchesCtx || typeof bCtx.drawImage !== 'function') return null
    backdrop.width = size
    backdrop.height = size
    stitchesLayer.width = size
    stitchesLayer.height = size

    drawWoodenHoopAndFabric(bCtx, cx, cy, hoopRadius, fabric, showGrid, plan)
    if (mode === 'guide') {
      bCtx.save()
      bCtx.beginPath()
      bCtx.arc(cx, cy, innerR - 1, 0, Math.PI * 2)
      bCtx.clip()
      drawGuideContours(bCtx, plan, fabric, cx, cy, activeR, scale)
      bCtx.restore()
    }

    entry = { backdrop, stitchesLayer, stitchesCtx, renderedCount: 0 }
    byKey.set(key, entry)
  }
  return entry
}

export function renderEmbroideryBoard(
  canvas: HTMLCanvasElement,
  plan: EmbroideryPlan,
  fabric: FabricPreset,
  options: EmbroideryRenderOptions,
  size = 720,
) {
  const ctx = getContext(canvas, size, size)
  ctx.clearRect(0, 0, size, size)
  const cx = size / 2
  const cy = size / 2 + 6
  const hoopRadius = size * 0.43

  if (options.mode === 'pattern') {
    drawEmbroideryScene(ctx, cx, cy, hoopRadius, plan, fabric, options)
    return
  }

  const scale = hoopRadius / 300
  const innerR = hoopRadius * 0.905
  const activeR = innerR * 0.92
  const cellPx = plan.cellSizeNorm * activeR
  const cache = getEmbroideryBoardCache(
    plan,
    fabric,
    options.mode,
    options.showGrid,
    size,
    cx,
    cy,
    hoopRadius,
    innerR,
    activeR,
    scale,
  )

  if (!cache) {
    drawEmbroideryScene(ctx, cx, cy, hoopRadius, plan, fabric, options)
    return
  }

  const stitchCount = plan.stitches.length
  const total = Math.max(1, stitchCount)
  const clampStep = Math.max(1, Math.min(total, Math.trunc(options.currentStep)))
  const drawnCount = Math.min(stitchCount, options.mode === 'realistic' ? total : clampStep)

  if (drawnCount < cache.renderedCount) {
    cache.stitchesCtx.clearRect(0, 0, size, size)
    cache.renderedCount = 0
  }
  if (drawnCount > cache.renderedCount) {
    const sCtx = cache.stitchesCtx
    sCtx.save()
    sCtx.beginPath()
    sCtx.arc(cx, cy, innerR - 1, 0, Math.PI * 2)
    sCtx.clip()
    sCtx.lineCap = 'round'
    for (let i = cache.renderedCount; i < drawnCount; i++) {
      drawSingleEmbroideryStitch(sCtx, plan.stitches[i], cx, cy, activeR, cellPx, scale)
    }
    sCtx.restore()
    cache.renderedCount = drawnCount
  }

  ctx.drawImage(cache.backdrop, 0, 0)

  if (options.mode === 'guide' && stitchCount > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, innerR - 1, 0, Math.PI * 2)
    ctx.clip()
    if (options.showGhost && drawnCount < stitchCount) {
      drawRemainingGhostStitches(ctx, plan, fabric, drawnCount, stitchCount, cx, cy, activeR, cellPx)
    }
    ctx.restore()
  }

  ctx.drawImage(cache.stitchesLayer, 0, 0)

  if (options.mode === 'guide' && stitchCount > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, innerR - 1, 0, Math.PI * 2)
    ctx.clip()
    drawActiveNeedleIndicator(ctx, plan.stitches[clampStep - 1], fabric, cx, cy, activeR, scale)
    ctx.restore()
  }
}

export function embroiderySheetCanvas(
  plan: EmbroideryPlan,
  title: string,
  fabric: FabricPreset,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const width = 1400
  const height = 1040
  const ctx = getContext(canvas, width, height)

  ctx.fillStyle = '#faf8f2'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = '#e4e5d9'
  ctx.lineWidth = 2
  ctx.strokeRect(20, 20, width - 40, height - 40)

  const modeInfo = STITCH_MODE_INFO[plan.stitchMode]
  ctx.textAlign = 'left'
  ctx.fillStyle = '#9c6e4e'
  ctx.font = '600 14px sans-serif'
  ctx.fillText(`TRACECRAFT · HAND EMBROIDERY · 刺绣工坊图纸（${modeInfo.name}）`, 52, 60)

  ctx.fillStyle = '#333a2d'
  ctx.font = '700 32px sans-serif'
  ctx.fillText(title.trim() || '手工刺绣图纸', 52, 102, 740)

  ctx.fillStyle = '#6f7764'
  ctx.font = '16px sans-serif'
  ctx.fillText(
    `${modeInfo.name} · ${plan.hoopSizeCm} cm 绣绷 · ${plan.totalStitches} 针 · ${plan.layers.length} 色 · 约 ${plan.totalMeters} m 绣线 · ${fabric.name}`,
    52,
    136,
    920,
  )

  // Left: finished 3D embroidery preview
  drawEmbroideryScene(ctx, 415, 560, 340, plan, fabric, {
    mode: 'realistic',
    currentStep: plan.totalStitches,
    showGrid: plan.stitchMode === 'cross-stitch',
    showGhost: false,
  })

  // Right top: water-soluble pattern chart
  const panelX = 800
  const panelW = 546
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#e5e6dc'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(panelX, 174, panelW, 380, 16)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#353c2f'
  ctx.font = '700 16px sans-serif'
  ctx.fillText('水消笔描图底稿', panelX + 26, 206)

  drawEmbroideryScene(ctx, 1073, 382, 148, plan, FABRIC_PRESETS[2], {
    mode: 'pattern',
    currentStep: plan.totalStitches,
    showGrid: true,
    showGhost: false,
  })

  // Right bottom: complete DMC thread list (supports up to 16 colors cleanly)
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(panelX, 572, panelW, 368, 16)
  ctx.fill()
  ctx.strokeStyle = '#e5e6dc'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = '#353c2f'
  ctx.font = '700 17px sans-serif'
  ctx.fillText(`DMC 绣线色序（共 ${plan.layers.length} 色）`, panelX + 26, 608)

  const twoCols = plan.layers.length > 8
  const rowStep = 34
  for (let i = 0; i < plan.layers.length; i++) {
    const l = plan.layers[i]
    if (twoCols) {
      const col = Math.floor(i / 8)
      const row = i % 8
      if (col >= 2) break
      const colX = panelX + 24 + col * 252
      const y = 644 + row * rowStep
      ctx.fillStyle = l.color
      ctx.beginPath()
      ctx.arc(colX + 9, y - 5, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#c9beab'
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.fillStyle = '#2d261e'
      ctx.font = '600 13px sans-serif'
      ctx.fillText(`${l.symbol} ${l.dmcCode.replace('DMC ', '')} ${l.colorName}`, colX + 22, y, 118)
      ctx.fillStyle = '#6f7764'
      ctx.font = '12px sans-serif'
      ctx.fillText(`${l.strands}股·${l.stitchCount}针·${l.lengthMeters}m`, colX + 144, y, 98)
    } else {
      const y = 644 + i * rowStep
      ctx.fillStyle = l.color
      ctx.beginPath()
      ctx.arc(panelX + 36, y - 5, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#c9beab'
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.fillStyle = '#2d261e'
      ctx.font = '600 14px sans-serif'
      ctx.fillText(`${l.symbol} ${l.dmcCode} ${l.colorName}`, panelX + 54, y, 224)
      ctx.fillStyle = '#6f7764'
      ctx.font = '13px sans-serif'
      ctx.fillText(`${l.strands}股 · ${l.stitchCount} 针 · 约 ${l.lengthMeters} m`, panelX + 290, y, 228)
    }
  }

  ctx.fillStyle = '#8b6447'
  ctx.font = '12px sans-serif'
  ctx.fillText(`安全提示：${EMBROIDERY_SAFETY_NOTICE}`, 52, 990, 960)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#77806b'
  ctx.fillText('由 TraceCraft 刺绣工坊在本地生成', width - 52, 990)
  ctx.textAlign = 'left'

  return canvas
}
