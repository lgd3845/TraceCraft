import {
  canvasPngBlob,
  decodeLocalImage,
  DEFAULT_PHOTO_FRAMING,
  photoCropRect,
  readCroppedImageRgba,
  renderPhotoFraming,
  sourcePreview,
} from '../wire-craft/stringArtCanvas'
import type { PhotoFraming } from '../wire-craft/stringArtCanvas'
import { COMPASS_ALGORITHM_INFO, COMPASS_PALETTES, COMPASS_SAFETY_NOTICE, padRing } from './compass'
import type {
  CompassArcStep,
  CompassContrastMode,
  CompassFieldInput,
  CompassPalette,
  CompassPlan,
} from './compass'
import { rgbaToCompassField } from './compass'

export {
  canvasPngBlob,
  decodeLocalImage,
  DEFAULT_PHOTO_FRAMING,
  photoCropRect,
  readCroppedImageRgba,
  renderPhotoFraming,
  sourcePreview,
}
export type { PhotoFraming }

export interface CompassRenderOptions {
  mode: 'guide' | 'full'
  currentStep: number
  showProtractor: boolean
  showGhost: boolean
}

function getContext(canvas: HTMLCanvasElement, width: number, height: number) {
  canvas.width = Math.round(width)
  canvas.height = Math.round(height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器无法使用画布，请换用支持 Canvas 的浏览器。')
  return ctx
}

export function sampleImageToCompassField(
  image: HTMLImageElement,
  mapSize: number,
  palette: CompassPalette = COMPASS_PALETTES[0],
  usePhotoColors = true,
  invert = false,
  contrastMode: CompassContrastMode = 'portrait',
  framing: PhotoFraming = DEFAULT_PHOTO_FRAMING,
): CompassFieldInput {
  const { sx, sy, side } = photoCropRect(image.naturalWidth, image.naturalHeight, framing)
  const offscreen = document.createElement('canvas')
  const ctx = getContext(offscreen, mapSize, mapSize)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, sx, sy, side, side, 0, 0, mapSize, mapSize)
  const rgba = ctx.getImageData(0, 0, mapSize, mapSize).data
  return rgbaToCompassField(rgba, mapSize, mapSize, mapSize, palette, usePhotoColors, invert, contrastMode)
}

function stepMaxWidthRatio(plan: CompassPlan): number {
  if (plan.algorithm === 'multi-center-intersect') return 0.44
  if (plan.algorithm === 'archimedean-spiral') return 0.68
  return 0.74
}

function traceArcStepRibbon(
  path: CanvasPath,
  step: CompassArcStep,
  cx: number,
  cy: number,
  drawRadius: number,
  plan: CompassPlan,
  scale: number,
  maxWidthCapPx: number,
  extraWidthScale = 1,
): boolean {
  const samples = step.samples
  if (samples.length < 2) return false
  const centerSpec = plan.centers.find(c => c.id === step.centerId) ?? plan.centers[0]
  const ocx = cx + (centerSpec?.nx ?? 0) * drawRadius
  const ocy = cy + (centerSpec?.ny ?? 0) * drawRadius
  const spacingPx = drawRadius * plan.ringSpacingNorm
  const widthRatio = stepMaxWidthRatio(plan)

  const n = samples.length
  const pxArr = new Float64Array(n)
  const pyArr = new Float64Array(n)
  const hwArr = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const s = samples[i]
    const rPx = s.radiusNorm * drawRadius
    pxArr[i] = ocx + Math.sin(s.angleRad) * rPx
    pyArr[i] = ocy - Math.cos(s.angleRad) * rPx
    const strokeW = Math.max(0.45 * scale, Math.min(maxWidthCapPx, s.widthNorm * spacingPx * widthRatio) * extraWidthScale)
    hwArr[i] = strokeW * 0.5
  }

  const lx = new Float64Array(n)
  const ly = new Float64Array(n)
  const rx = new Float64Array(n)
  const ry = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const prevIdx = i > 0 ? i - 1 : 0
    const nextIdx = i + 1 < n ? i + 1 : n - 1
    const dx = pxArr[nextIdx] - pxArr[prevIdx]
    const dy = pyArr[nextIdx] - pyArr[prevIdx]
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    const hw = hwArr[i]
    lx[i] = pxArr[i] + nx * hw
    ly[i] = pyArr[i] + ny * hw
    rx[i] = pxArr[i] - nx * hw
    ry[i] = pyArr[i] - ny * hw
  }

  path.moveTo(lx[0], ly[0])
  for (let i = 1; i < n; i++) path.lineTo(lx[i], ly[i])
  for (let i = n - 1; i >= 0; i--) path.lineTo(rx[i], ry[i])
  path.closePath()
  return true
}

function buildArcRibbonPath(
  step: CompassArcStep,
  cx: number,
  cy: number,
  drawRadius: number,
  plan: CompassPlan,
  scale: number,
  maxWidthCapPx: number,
  extraWidthScale = 1,
): Path2D | null {
  if (typeof Path2D === 'undefined' || step.samples.length < 2) return null
  const path = new Path2D()
  return traceArcStepRibbon(path, step, cx, cy, drawRadius, plan, scale, maxWidthCapPx, extraWidthScale) ? path : null
}

function drawArcStepRibbon(
  ctx: CanvasRenderingContext2D,
  step: CompassArcStep,
  cx: number,
  cy: number,
  drawRadius: number,
  plan: CompassPlan,
  scale: number,
  maxWidthCapPx: number,
  overrideColor?: string,
  extraWidthScale = 1,
) {
  if (step.samples.length < 2) return
  ctx.fillStyle = overrideColor ?? step.color
  ctx.beginPath()
  if (traceArcStepRibbon(ctx, step, cx, cy, drawRadius, plan, scale, maxWidthCapPx, extraWidthScale)) {
    ctx.fill()
  }
}

function drawCompassBackdrop(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  boardRadius: number,
  palette: CompassPalette,
  scale: number,
) {
  // Outer drafting board rim + shadow
  ctx.save()
  ctx.shadowColor = 'rgba(42, 36, 26, 0.16)'
  ctx.shadowBlur = 22 * scale
  ctx.shadowOffsetY = 8 * scale
  ctx.beginPath()
  ctx.arc(cx, cy, boardRadius, 0, Math.PI * 2)
  ctx.fillStyle = palette.rim
  ctx.fill()
  ctx.restore()

  ctx.beginPath()
  ctx.arc(cx, cy, boardRadius - 4 * scale, 0, Math.PI * 2)
  ctx.fillStyle = palette.paper
  ctx.fill()
  ctx.lineWidth = Math.max(1.5, 4 * scale)
  ctx.strokeStyle = palette.rim
  ctx.stroke()
}

function drawCompassProtractorRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  drawRadius: number,
  palette: CompassPalette,
  scale: number,
) {
  ctx.save()
  ctx.strokeStyle = palette.darkPaper ? 'rgba(226, 236, 246, 0.24)' : 'rgba(72, 79, 63, 0.22)'
  ctx.lineWidth = Math.max(0.7, 0.9 * scale)
  ctx.beginPath()
  ctx.arc(cx, cy, drawRadius + 3 * scale, 0, Math.PI * 2)
  ctx.stroke()

  ctx.font = `600 ${Math.round(Math.max(8, 9.2 * scale))}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let deg = 0; deg < 360; deg += 15) {
    const rad = (deg * Math.PI) / 180
    const major = deg % 30 === 0
    const r0 = drawRadius + 3 * scale
    const r1 = drawRadius + (major ? 10.5 * scale : 6.5 * scale)
    ctx.beginPath()
    ctx.moveTo(cx + Math.sin(rad) * r0, cy - Math.cos(rad) * r0)
    ctx.lineTo(cx + Math.sin(rad) * r1, cy - Math.cos(rad) * r1)
    ctx.strokeStyle = palette.darkPaper
      ? major ? 'rgba(232, 240, 248, 0.55)' : 'rgba(232, 240, 248, 0.25)'
      : major ? 'rgba(72, 79, 63, 0.55)' : 'rgba(72, 79, 63, 0.22)'
    ctx.stroke()
    if (major) {
      const lr = drawRadius + 19.5 * scale
      ctx.fillStyle = palette.darkPaper ? 'rgba(232, 240, 248, 0.72)' : 'rgba(72, 79, 63, 0.72)'
      ctx.fillText(`${deg}°`, cx + Math.sin(rad) * lr, cy - Math.cos(rad) * lr)
    }
  }
  ctx.restore()
}

function drawCompassCenterPins(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  drawRadius: number,
  plan: CompassPlan,
  palette: CompassPalette,
  scale: number,
  activeCenterId?: string,
) {
  ctx.save()
  ctx.font = `700 ${Math.round(Math.max(9, 10 * scale))}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const c of plan.centers) {
    const px = cx + c.nx * drawRadius
    const py = cy + c.ny * drawRadius
    const isCurrentCenter = activeCenterId === c.id
    ctx.beginPath()
    ctx.moveTo(px - 6 * scale, py)
    ctx.lineTo(px + 6 * scale, py)
    ctx.moveTo(px, py - 6 * scale)
    ctx.lineTo(px, py + 6 * scale)
    ctx.strokeStyle = isCurrentCenter ? '#c74b37' : palette.darkPaper ? '#f1cf88' : '#8c533c'
    ctx.lineWidth = isCurrentCenter ? 2 * scale : 1.1 * scale
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(px, py, isCurrentCenter ? 4 * scale : 2.3 * scale, 0, Math.PI * 2)
    ctx.fillStyle = isCurrentCenter ? '#c74b37' : palette.paper
    ctx.fill()
    ctx.stroke()

    if (plan.centers.length > 1 || isCurrentCenter) {
      ctx.fillStyle = isCurrentCenter ? '#c74b37' : palette.darkPaper ? '#f1cf88' : '#8c533c'
      ctx.fillText(c.id, px, py - 12 * scale)
    }
  }
  ctx.restore()
}

function drawActiveCompassArm(
  ctx: CanvasRenderingContext2D,
  active: CompassArcStep,
  cx: number,
  cy: number,
  drawRadius: number,
  plan: CompassPlan,
  palette: CompassPalette,
  scale: number,
) {
  if (active.samples.length === 0) return
  const centerSpec = plan.centers.find(c => c.id === active.centerId) ?? plan.centers[0]
  const ocx = cx + (centerSpec?.nx ?? 0) * drawRadius
  const ocy = cy + (centerSpec?.ny ?? 0) * drawRadius
  const endSample = active.samples[active.samples.length - 1]
  const rPx = endSample.radiusNorm * drawRadius
  const ux = Math.sin(endSample.angleRad)
  const uy = -Math.cos(endSample.angleRad)
  const ex = ocx + ux * rPx
  const ey = ocy + uy * rPx
  const badgeX = rPx < 54 * scale ? ex + ux * 44 * scale : (ocx + ex) * 0.5
  const badgeY = rPx < 54 * scale ? ey + uy * 24 * scale : (ocy + ey) * 0.5
  const accent = palette.darkPaper ? '#ff9d66' : '#c74b37'

  ctx.save()
  ctx.strokeStyle = accent
  ctx.lineWidth = 1.6 * scale
  ctx.setLineDash([5 * scale, 4 * scale])
  ctx.beginPath()
  ctx.moveTo(ocx, ocy)
  ctx.lineTo(ex, ey)
  ctx.stroke()
  ctx.setLineDash([])

  // Pen tip dot on the end of active arc
  ctx.beginPath()
  ctx.arc(ex, ey, 4.5 * scale, 0, Math.PI * 2)
  ctx.fillStyle = accent
  ctx.fill()

  // Radius pill badge
  const badge = `R=${active.radiusMm}mm`
  const bw = 66 * scale
  const bh = 20 * scale
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.roundRect(badgeX - bw / 2, badgeY - bh / 2, bw, bh, 6 * scale)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 ${Math.round(10 * scale)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(badge, badgeX, badgeY + 0.5 * scale)
  ctx.restore()
}

export function drawCompassScene(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  boardRadius: number,
  plan: CompassPlan,
  palette: CompassPalette,
  options: CompassRenderOptions,
) {
  const scale = boardRadius / 320
  const drawRadius = boardRadius * 0.855

  drawCompassBackdrop(ctx, cx, cy, boardRadius, palette, scale)

  // Clip all compass arcs cleanly to drafting paper circle
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, drawRadius + 2 * scale, 0, Math.PI * 2)
  ctx.clip()

  const totalSteps = plan.steps.length
  const clampStep = Math.max(1, Math.min(totalSteps, Math.trunc(options.currentStep)))
  const drawnCount = options.mode === 'full' ? totalSteps : Math.max(0, clampStep - 1)

  if (options.mode === 'guide' && options.showGhost && totalSteps > 0) {
    ctx.save()
    ctx.globalAlpha = palette.darkPaper ? 0.12 : 0.08
    for (let i = drawnCount; i < totalSteps; i++) {
      drawArcStepRibbon(ctx, plan.steps[i], cx, cy, drawRadius, plan, scale, 3.6 * scale)
    }
    ctx.restore()
  }

  const maxCap = plan.algorithm === 'multi-center-intersect' ? 2.8 * scale : 4.5 * scale
  const baseAlpha = plan.algorithm === 'multi-center-intersect' ? (palette.darkPaper ? 0.88 : 0.82) : 0.96

  if (drawnCount > 0) {
    ctx.save()
    ctx.globalAlpha = baseAlpha
    for (let i = 0; i < drawnCount; i++) {
      drawArcStepRibbon(ctx, plan.steps[i], cx, cy, drawRadius, plan, scale, maxCap)
    }
    ctx.restore()
  }

  const active = options.mode === 'guide' && totalSteps > 0 ? plan.steps[clampStep - 1] : null
  if (active) {
    const accent = palette.darkPaper ? '#ff9d66' : '#c74b37'
    ctx.save()
    ctx.globalAlpha = 1
    drawArcStepRibbon(ctx, active, cx, cy, drawRadius, plan, scale, 5.2 * scale, accent, 1.35)
    ctx.restore()
  }

  ctx.restore() // end disk clip

  // Optional protractor ring and drafting center pinholes
  if (options.showProtractor) {
    drawCompassProtractorRing(ctx, cx, cy, drawRadius, palette, scale)
    drawCompassCenterPins(ctx, cx, cy, drawRadius, plan, palette, scale, active?.centerId)
  }

  // Virtual compass arm overlay in guide mode pointing from active center to current arc
  if (active) {
    drawActiveCompassArm(ctx, active, cx, cy, drawRadius, plan, palette, scale)
  }
}

interface CompassBoardCache {
  sizePx: number
  cx: number
  cy: number
  boardRadius: number
  drawRadius: number
  scale: number
  maxCap: number
  baseAlpha: number
  backdrop: HTMLCanvasElement
  protractor: HTMLCanvasElement
  drawnLayer: HTMLCanvasElement
  drawnCtx: CanvasRenderingContext2D
  drawnCount: number
  basePaths: Array<Path2D | null>
  ghostPaths: Array<Path2D | null>
}

const compassBoardCache = new WeakMap<CompassPlan, Map<string, CompassBoardCache>>()

function createOffscreenCanvas(targetCanvas: HTMLCanvasElement, sizePx: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined' || typeof Path2D === 'undefined') return null
  const canvas = document.createElement('canvas')
  if (!canvas || canvas === targetCanvas) return null
  canvas.width = sizePx
  canvas.height = sizePx
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  return { canvas, ctx }
}

function getCompassBoardCache(
  targetCanvas: HTMLCanvasElement,
  plan: CompassPlan,
  palette: CompassPalette,
  sizePx: number,
): CompassBoardCache | null {
  const key = `${sizePx}|${palette.id}`
  let byKey = compassBoardCache.get(plan)
  if (byKey) {
    const existing = byKey.get(key)
    if (existing) return existing
  }

  const backdropRes = createOffscreenCanvas(targetCanvas, sizePx)
  const protractorRes = createOffscreenCanvas(targetCanvas, sizePx)
  const drawnRes = createOffscreenCanvas(targetCanvas, sizePx)
  if (!backdropRes || !protractorRes || !drawnRes) return null

  const cx = sizePx / 2
  const cy = sizePx / 2
  const boardRadius = sizePx * 0.455
  const scale = boardRadius / 320
  const drawRadius = boardRadius * 0.855
  const maxCap = plan.algorithm === 'multi-center-intersect' ? 2.8 * scale : 4.5 * scale
  const baseAlpha = plan.algorithm === 'multi-center-intersect' ? (palette.darkPaper ? 0.88 : 0.82) : 0.96

  drawCompassBackdrop(backdropRes.ctx, cx, cy, boardRadius, palette, scale)
  drawCompassProtractorRing(protractorRes.ctx, cx, cy, drawRadius, palette, scale)

  // Persistent clip for incremental ribbon commits onto drawnLayer
  drawnRes.ctx.save()
  drawnRes.ctx.beginPath()
  drawnRes.ctx.arc(cx, cy, drawRadius + 2 * scale, 0, Math.PI * 2)
  drawnRes.ctx.clip()

  const cache: CompassBoardCache = {
    sizePx,
    cx,
    cy,
    boardRadius,
    drawRadius,
    scale,
    maxCap,
    baseAlpha,
    backdrop: backdropRes.canvas,
    protractor: protractorRes.canvas,
    drawnLayer: drawnRes.canvas,
    drawnCtx: drawnRes.ctx,
    drawnCount: 0,
    basePaths: new Array<Path2D | null>(plan.steps.length).fill(null),
    ghostPaths: new Array<Path2D | null>(plan.steps.length).fill(null),
  }
  if (!byKey) {
    byKey = new Map()
    compassBoardCache.set(plan, byKey)
  }
  byKey.set(key, cache)
  return cache
}

function getBaseRibbonPath(cache: CompassBoardCache, plan: CompassPlan, idx: number): Path2D | null {
  return cache.basePaths[idx] ??= buildArcRibbonPath(
    plan.steps[idx],
    cache.cx,
    cache.cy,
    cache.drawRadius,
    plan,
    cache.scale,
    cache.maxCap,
  )
}

function getGhostRibbonPath(cache: CompassBoardCache, plan: CompassPlan, idx: number): Path2D | null {
  return cache.ghostPaths[idx] ??= buildArcRibbonPath(
    plan.steps[idx],
    cache.cx,
    cache.cy,
    cache.drawRadius,
    plan,
    cache.scale,
    3.6 * cache.scale,
  )
}

export function renderCompassBoard(
  canvas: HTMLCanvasElement,
  plan: CompassPlan,
  palette: CompassPalette,
  options: CompassRenderOptions,
  sizePx = 720,
) {
  const ctx = getContext(canvas, sizePx, sizePx)
  ctx.clearRect(0, 0, sizePx, sizePx)

  const cache = getCompassBoardCache(canvas, plan, palette, sizePx)
  if (!cache || typeof ctx.fill !== 'function' || typeof ctx.drawImage !== 'function') {
    drawCompassScene(ctx, sizePx / 2, sizePx / 2, sizePx * 0.455, plan, palette, options)
    return
  }

  const { cx, cy, drawRadius, scale } = cache
  const totalSteps = plan.steps.length
  const clampStep = Math.max(1, Math.min(totalSteps, Math.trunc(options.currentStep)))
  const targetDrawn = options.mode === 'full' ? totalSteps : Math.max(0, clampStep - 1)

  if (targetDrawn < cache.drawnCount) {
    cache.drawnCtx.clearRect(0, 0, cache.sizePx, cache.sizePx)
    cache.drawnCount = 0
  }
  if (targetDrawn > cache.drawnCount) {
    const dCtx = cache.drawnCtx
    dCtx.save()
    dCtx.globalAlpha = cache.baseAlpha
    for (let i = cache.drawnCount; i < targetDrawn; i++) {
      const path = getBaseRibbonPath(cache, plan, i)
      if (!path) continue
      dCtx.fillStyle = plan.steps[i].color
      dCtx.fill(path)
    }
    dCtx.restore()
    cache.drawnCount = targetDrawn
  }

  ctx.drawImage(cache.backdrop, 0, 0)

  const active = options.mode === 'guide' && totalSteps > 0 ? plan.steps[clampStep - 1] : null
  const needsClippedOverlay = (options.mode === 'guide' && options.showGhost && totalSteps > targetDrawn) || Boolean(active)

  if (options.mode === 'guide' && options.showGhost && totalSteps > targetDrawn) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, drawRadius + 2 * scale, 0, Math.PI * 2)
    ctx.clip()
    ctx.globalAlpha = palette.darkPaper ? 0.12 : 0.08
    for (let i = targetDrawn; i < totalSteps; i++) {
      const path = getGhostRibbonPath(cache, plan, i)
      if (!path) continue
      ctx.fillStyle = plan.steps[i].color
      ctx.fill(path)
    }
    ctx.restore()
  }

  if (targetDrawn > 0) {
    ctx.drawImage(cache.drawnLayer, 0, 0)
  }

  if (active) {
    ctx.save()
    if (needsClippedOverlay) {
      ctx.beginPath()
      ctx.arc(cx, cy, drawRadius + 2 * scale, 0, Math.PI * 2)
      ctx.clip()
    }
    const accent = palette.darkPaper ? '#ff9d66' : '#c74b37'
    ctx.globalAlpha = 1
    const activePath = buildArcRibbonPath(active, cx, cy, drawRadius, plan, scale, 5.2 * scale, 1.35)
    if (activePath) {
      ctx.fillStyle = accent
      ctx.fill(activePath)
    }
    ctx.restore()
  }

  if (options.showProtractor) {
    ctx.drawImage(cache.protractor, 0, 0)
    drawCompassCenterPins(ctx, cx, cy, drawRadius, plan, palette, scale, active?.centerId)
  }

  if (active) {
    drawActiveCompassArm(ctx, active, cx, cy, drawRadius, plan, palette, scale)
  }
}

export function compassSheetCanvas(
  plan: CompassPlan,
  palette: CompassPalette,
  title: string,
): HTMLCanvasElement {
  const width = 1400
  const height = 1040
  const canvas = document.createElement('canvas')
  const ctx = getContext(canvas, width, height)

  ctx.fillStyle = '#faf8f2'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = '#e4e5d9'
  ctx.lineWidth = 2
  ctx.strokeRect(20, 20, width - 40, height - 40)

  const safeTitle = title.trim() || '圆规画作品'
  const algInfo = COMPASS_ALGORITHM_INFO[plan.algorithm]

  ctx.textAlign = 'left'
  ctx.fillStyle = '#5c7c6d'
  ctx.font = '600 14px sans-serif'
  ctx.fillText(`TRACECRAFT · COMPASS HALFTONE · 圆规画工坊图纸（${algInfo.label}）`, 52, 60)

  ctx.fillStyle = '#333a2d'
  ctx.font = '700 32px sans-serif'
  ctx.fillText(safeTitle, 52, 102, 740)

  ctx.fillStyle = '#6f7764'
  ctx.font = '16px sans-serif'
  ctx.fillText(
    `${plan.paperSizeCm} cm 画幅 · ${plan.ringCount} 圈 · ${plan.steps.length} 步画弧 · ${plan.layers.length} 色 · 约 ${plan.totalLengthMeters} m`,
    52,
    136,
    920,
  )

  drawCompassScene(ctx, 430, 560, 340, plan, palette, {
    mode: 'full',
    currentStep: plan.steps.length,
    showProtractor: true,
    showGhost: false,
  })

  const panelX = 830
  const panelW = 516
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(panelX, 174, panelW, 766, 16)
  ctx.fill()
  ctx.strokeStyle = '#e5e6dc'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = '#353c2f'
  ctx.font = '700 17px sans-serif'
  ctx.fillText('画笔色层与圆心规格', panelX + 26, 212)

  plan.layers.forEach((layer, idx) => {
    const y = 236 + idx * 58
    ctx.fillStyle = '#f8f8f3'
    ctx.beginPath()
    ctx.roundRect(panelX + 26, y, panelW - 52, 48, 10)
    ctx.fill()

    ctx.fillStyle = layer.color
    ctx.beginPath()
    ctx.arc(panelX + 48, y + 24, 10, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#333a2d'
    ctx.font = '600 14px sans-serif'
    ctx.fillText(layer.name, panelX + 70, y + 20)
    ctx.fillStyle = '#757d69'
    ctx.font = '12px sans-serif'
    ctx.fillText(`第 ${layer.startStep}–${layer.endStep} 步 · ${layer.stepCount} 笔 · 约 ${layer.lengthMeters} m`, panelX + 70, y + 38)
  })

  const previewTop = 250 + Math.max(1, plan.layers.length) * 58
  ctx.fillStyle = '#353c2f'
  ctx.font = '700 16px sans-serif'
  ctx.fillText('前 14 步圆环角度速查', panelX + 26, previewTop)

  const colW = (panelW - 64) / 2
  const sampleCount = Math.min(14, plan.steps.length)
  for (let i = 0; i < sampleCount; i++) {
    const s = plan.steps[i]
    const col = i % 2
    const row = Math.floor(i / 2)
    const bx = panelX + 26 + col * (colW + 12)
    const by = previewTop + 16 + row * 40
    ctx.fillStyle = '#f8f7f2'
    ctx.beginPath()
    ctx.roundRect(bx, by, colW, 33, 8)
    ctx.fill()

    ctx.fillStyle = s.color
    ctx.beginPath()
    ctx.arc(bx + 15, by + 16.5, 4.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#404738'
    ctx.font = '600 12px monospace'
    const centerPrefix = plan.centers.length > 1 ? `${s.centerId} ` : ''
    ctx.fillText(
      `#${padRing(s.step, plan.steps.length)} ${centerPrefix}${s.radiusMm.toFixed(1)}mm ${Math.round(s.startDeg)}°–${Math.round(s.endDeg)}°`,
      bx + 26,
      by + 20,
      colW - 32,
    )
  }

  ctx.fillStyle = '#8b6447'
  ctx.font = '12px sans-serif'
  ctx.fillText(`安全提示：${COMPASS_SAFETY_NOTICE}`, 52, 988, 960)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#77806b'
  ctx.fillText('由 TraceCraft 圆规画工坊在本地生成', width - 52, 988)
  ctx.textAlign = 'left'
  return canvas
}
