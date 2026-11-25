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
import { CARVING_ALGORITHM_INFO, CARVING_MATERIALS, CARVING_SAFETY_NOTICE, padCutStep, rgbaToCarvingField } from './carving'
import type {
  CarvingContrastMode,
  CarvingFieldInput,
  CarvingMaterialSpec,
  CarvingPlan,
} from './carving'

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

export interface CarvingRenderOptions {
  mode: 'realistic' | 'draft' | 'guide'
  currentStep: number
  showBridges: boolean
  showGhost: boolean
}

function getContext(canvas: HTMLCanvasElement, width: number, height: number) {
  canvas.width = Math.round(width)
  canvas.height = Math.round(height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器无法使用画布，请换用支持 Canvas 的浏览器。')
  return ctx
}

export function sampleImageToCarvingField(
  image: HTMLImageElement,
  gridSize: number,
  invert = false,
  contrastMode: CarvingContrastMode = 'portrait',
  framing: PhotoFraming = DEFAULT_PHOTO_FRAMING,
): CarvingFieldInput {
  const { sx, sy, side } = photoCropRect(image.naturalWidth, image.naturalHeight, framing)
  const offscreen = document.createElement('canvas')
  const ctx = getContext(offscreen, gridSize, gridSize)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, sx, sy, side, side, 0, 0, gridSize, gridSize)
  const rgba = ctx.getImageData(0, 0, gridSize, gridSize).data
  return rgbaToCarvingField(rgba, gridSize, gridSize, gridSize, invert, contrastMode)
}

const vectorLayerCache = new WeakMap<CarvingPlan, Map<string, HTMLCanvasElement>>()

function getCachedVectorLayerCanvas(
  plan: CarvingPlan,
  cacheKey: string,
  steps: CarvingPlan['steps'],
  artSizePx: number,
  fillHex: string,
  highlightRim = false,
): HTMLCanvasElement {
  const size = Math.max(8, Math.round(artSizePx))
  const fullKey = `${cacheKey}|${size}|${fillHex}|${highlightRim ? 1 : 0}`
  let byKey = vectorLayerCache.get(plan)
  if (!byKey) {
    byKey = new Map()
    vectorLayerCache.set(plan, byKey)
  }
  let cached = byKey.get(fullKey)
  if (!cached) {
    cached = createVectorLayerCanvas(steps, size, fillHex, highlightRim)
    byKey.set(fullKey, cached)
  }
  return cached
}

function createVectorLayerCanvas(
  steps: CarvingPlan['steps'],
  artSizePx: number,
  fillHex: string,
  highlightRim = false,
): HTMLCanvasElement {
  const size = Math.max(8, Math.round(artSizePx))
  const canvas = document.createElement('canvas')
  const ctx = getContext(canvas, size, size)
  const half = size / 2
  ctx.fillStyle = fillHex
  ctx.fillRect(0, 0, size, size)

  if (highlightRim) {
    ctx.save()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)'
    ctx.lineWidth = Math.max(1.2, size / 320)
    for (const step of steps) {
      traceLoopsPath(ctx, step.loops, half + 0.6, half + 0.8, half)
      ctx.stroke()
    }
    ctx.restore()
  }

  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = '#000000'
  for (const step of steps) {
    traceLoopsPath(ctx, step.loops, half, half, half)
    ctx.fill('evenodd')
  }
  return canvas
}

function traceLoopsPath(
  ctx: CanvasRenderingContext2D,
  loops: Array<Array<{ nx: number; ny: number }>>,
  cx: number,
  cy: number,
  halfSize: number,
) {
  ctx.beginPath()
  for (const loop of loops) {
    const n = loop.length
    if (n < 3) continue
    const midX = (i: number) => cx + ((loop[i % n].nx + loop[(i + 1) % n].nx) * 0.5) * halfSize
    const midY = (i: number) => cy + ((loop[i % n].ny + loop[(i + 1) % n].ny) * 0.5) * halfSize
    ctx.moveTo(midX(n - 1), midY(n - 1))
    for (let i = 0; i < n; i++) {
      const ctrl = loop[i]
      ctx.quadraticCurveTo(cx + ctrl.nx * halfSize, cy + ctrl.ny * halfSize, midX(i), midY(i))
    }
    ctx.closePath()
  }
}

function isLightHex(hex: string): boolean {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return false
  const r = Number.parseInt(clean.slice(0, 2), 16)
  const g = Number.parseInt(clean.slice(2, 4), 16)
  const b = Number.parseInt(clean.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62
}

export function drawCarvingScene(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  boardSize: number,
  plan: CarvingPlan,
  material: CarvingMaterialSpec,
  options: CarvingRenderOptions,
) {
  const scale = boardSize / 640
  const isGuide = options.mode === 'guide'
  const padLeft = Math.round((isGuide ? 30 : 18) * scale)
  const padRight = Math.round((isGuide ? 14 : 18) * scale)
  const padTop = Math.round((isGuide ? 16 : 18) * scale)
  const padBottom = Math.round((isGuide ? 28 : 18) * scale)
  const artX = x0 + padLeft
  const artY = y0 + padTop
  const artSize = Math.min(boardSize - padLeft - padRight, boardSize - padTop - padBottom)
  const half = artSize / 2
  const cx = artX + half
  const cy = artY + half

  // Outer mounting frame & drop shadow
  ctx.save()
  ctx.shadowColor = 'rgba(42, 36, 26, 0.16)'
  ctx.shadowBlur = 20 * scale
  ctx.shadowOffsetY = 8 * scale
  ctx.fillStyle = '#ede8db'
  ctx.beginPath()
  ctx.roundRect(x0, y0, boardSize, boardSize, 14 * scale)
  ctx.fill()
  ctx.restore()

  const artRadius = isGuide ? 0 : 6 * scale
  ctx.fillStyle = options.mode === 'draft' ? '#ffffff' : material.backing
  ctx.beginPath()
  ctx.roundRect(artX, artY, artSize, artSize, artRadius)
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  ctx.roundRect(artX, artY, artSize, artSize, artRadius)
  ctx.clip()

  if (options.mode === 'realistic') {
    if (plan.algorithm === 'layered-shadowbox' && plan.layers.length >= 2) {
      // Warm backlit paper shadow-box glow behind L4..L1
      const glow = ctx.createRadialGradient(cx, cy - artSize * 0.08, artSize * 0.06, cx, cy, artSize * 0.72)
      glow.addColorStop(0, material.isLightbox ? '#fff8df' : material.backing)
      glow.addColorStop(0.55, material.isLightbox ? '#ffd98e' : material.backing)
      glow.addColorStop(1, material.isLightbox ? '#d99a4a' : material.backing)
      ctx.fillStyle = glow
      ctx.fillRect(artX, artY, artSize, artSize)

      const layerShades = material.isLightbox
        ? ['#fcf9f2', '#f8f2e4', '#f3ead6', '#ebdec2']
        : [material.paper, material.paper, material.paper, material.paper]

      // Render back-to-front so frontmost L1 sits atop L2..L4 with crisp vector shadows
      for (let idx = plan.layers.length - 1; idx >= 0; idx--) {
        const layerSteps = plan.steps.filter(s => s.layerIndex === idx)
        const layerCanvas = getCachedVectorLayerCanvas(plan, `layer:${idx}`, layerSteps, artSize, layerShades[idx] ?? material.paper, true)
        ctx.save()
        ctx.globalAlpha = material.isLightbox ? 1 : idx === 0 ? 1 : 0.72
        ctx.shadowColor = material.shadow
        ctx.shadowBlur = (10 - idx * 1.5) * scale
        ctx.shadowOffsetX = 1.5 * scale
        ctx.shadowOffsetY = (5.5 - idx) * scale
        ctx.drawImage(layerCanvas, artX, artY, artSize, artSize)
        ctx.restore()
      }
    } else if (plan.layers.length > 0) {
      // Single-layer positive stencil or woodcut relief cut block
      if (plan.algorithm === 'woodcut-relief') {
        // Subtle woodgrain lines in carved relief background
        ctx.strokeStyle = 'rgba(92, 68, 42, 0.08)'
        ctx.lineWidth = Math.max(0.8, scale)
        for (let gy = artY + 6 * scale; gy < artY + artSize; gy += 11 * scale) {
          ctx.beginPath()
          ctx.moveTo(artX, gy)
          ctx.bezierCurveTo(cx - half * 0.3, gy + 2 * scale, cx + half * 0.3, gy - 2 * scale, artX + artSize, gy)
          ctx.stroke()
        }
      }
      const layerCanvas = getCachedVectorLayerCanvas(plan, 'single', plan.steps, artSize, material.paper, !material.isLightbox)
      ctx.save()
      ctx.shadowColor = material.shadow
      ctx.shadowBlur = 9 * scale
      ctx.shadowOffsetX = 1.5 * scale
      ctx.shadowOffsetY = 4.5 * scale
      ctx.drawImage(layerCanvas, artX, artY, artSize, artSize)
      ctx.restore()
    }
  } else if (options.mode === 'draft') {
    // 1:1 technical line draft with grey hatched hollow cut areas & step entry marks
    const total = plan.steps.length
    const clampStep = Math.max(1, Math.min(total, Math.trunc(options.currentStep)))
    const activeLayerIdx = total > 0 ? (plan.steps[clampStep - 1]?.layerIndex ?? 0) : 0
    const draftSteps = plan.steps.filter(s => s.layerIndex === activeLayerIdx)
    const draftBridges = plan.bridges.filter(b => b.layerIndex === activeLayerIdx)

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(artX, artY, artSize, artSize)

    for (const step of draftSteps) {
      traceLoopsPath(ctx, step.loops, cx, cy, half)
      ctx.fillStyle = '#ebe9df'
      ctx.fill('evenodd')
      ctx.lineWidth = Math.max(0.9, 1.35 * scale)
      ctx.strokeStyle = '#2d342a'
      ctx.stroke()
    }

    if (options.showBridges) {
      for (const bridge of draftBridges) {
        const x1 = cx + (bridge.fromXMm / (plan.frameWidthMm / 2)) * half
        const y1 = cy + (bridge.fromYMm / (plan.frameWidthMm / 2)) * half
        const x2 = cx + (bridge.toXMm / (plan.frameWidthMm / 2)) * half
        const y2 = cy + (bridge.toYMm / (plan.frameWidthMm / 2)) * half
        ctx.save()
        ctx.strokeStyle = '#277a5e'
        ctx.lineWidth = Math.max(2.6, 3.6 * scale)
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
        ctx.restore()
      }
    }

    // Entry point step tags for primary regions
    const maxBadges = 36
    for (let i = 0; i < Math.min(maxBadges, draftSteps.length); i++) {
      const s = draftSteps[i]
      if (i > 18 && s.areaMm2 < 65) continue
      const sx = cx + s.startNx * half
      const sy = cy + s.startNy * half
      ctx.fillStyle = '#b94434'
      ctx.beginPath()
      ctx.arc(sx, sy, 3.2 * scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.font = `700 ${Math.round(Math.max(8, 9.5 * scale))}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`#${padCutStep(s.step, plan.steps.length)}`, sx, sy - 4 * scale)
    }
  } else {
    // Interactive step-by-step guide mode
    const total = plan.steps.length
    const clampStep = Math.max(1, Math.min(total, Math.trunc(options.currentStep)))
    const active = total > 0 ? plan.steps[clampStep - 1] : null
    const activeLayer = plan.layers[active?.layerIndex ?? 0]

    // Draw solid base sheet for active layer first
    const lightboxLayerShades = ['#fcf9f2', '#f7f1e3', '#f2e8d4', '#eadcc0']
    const sheetColor =
      plan.algorithm === 'layered-shadowbox' && material.isLightbox
        ? (lightboxLayerShades[activeLayer?.index ?? 0] ?? material.paper)
        : material.paper
    const lightSheet = isLightHex(sheetColor)
    ctx.fillStyle = sheetColor
    ctx.fillRect(artX, artY, artSize, artSize)
    ctx.strokeStyle = lightSheet ? 'rgba(92, 76, 52, 0.34)' : 'rgba(255, 255, 255, 0.14)'
    ctx.lineWidth = Math.max(1, 1.2 * scale)
    ctx.strokeRect(artX + 0.5, artY + 0.5, artSize - 1, artSize - 1)

    // Coarse subtle First-Quadrant reference grid inside the cutting sheet
    const totalMm = Math.max(10, plan.frameWidthMm || plan.frameSizeCm * 10)
    const gridStepMm = totalMm <= 150 ? 25 : totalMm <= 180 ? 30 : 40
    ctx.save()
    ctx.strokeStyle = lightSheet ? 'rgba(110, 104, 92, 0.14)' : 'rgba(255, 255, 255, 0.12)'
    ctx.lineWidth = Math.max(0.75, 0.9 * scale)
    for (let mm = gridStepMm; mm < totalMm - 0.1; mm += gridStepMm) {
      const ratio = mm / totalMm
      const gx = artX + ratio * artSize
      const gy = artY + artSize - ratio * artSize
      ctx.beginPath()
      ctx.moveTo(gx, artY)
      ctx.lineTo(gx, artY + artSize)
      ctx.moveTo(artX, gy)
      ctx.lineTo(artX + artSize, gy)
      ctx.stroke()
    }
    ctx.restore()

    // Carve out steps belonging to the current layer
    const layerSteps = plan.steps.filter(s => s.layerIndex === (activeLayer?.index ?? 0))
    for (const step of layerSteps) {
      traceLoopsPath(ctx, step.loops, cx, cy, half)
      if (step.step < clampStep) {
        // Already carved hole reveals the backing mat
        ctx.fillStyle = lightSheet ? (material.isLightbox ? '#e7b96a' : '#3d4741') : material.backing
        ctx.fill('evenodd')
        ctx.lineWidth = Math.max(0.8, 1.1 * scale)
        ctx.strokeStyle = lightSheet ? 'rgba(92, 64, 30, 0.5)' : 'rgba(52, 46, 36, 0.35)'
        ctx.stroke()
      } else if (step.step === clampStep) {
        ctx.fillStyle = 'rgba(205, 76, 56, 0.24)'
        ctx.fill('evenodd')
        ctx.lineWidth = Math.max(2.0, 2.8 * scale)
        ctx.strokeStyle = '#c74b37'
        ctx.stroke()
      } else if (options.showGhost) {
        ctx.fillStyle = lightSheet ? 'rgba(72, 62, 48, 0.13)' : 'rgba(255, 255, 255, 0.16)'
        ctx.fill('evenodd')
        ctx.setLineDash([4 * scale, 3 * scale])
        ctx.lineWidth = Math.max(0.7, 1 * scale)
        ctx.strokeStyle = lightSheet ? 'rgba(72, 62, 48, 0.52)' : 'rgba(255, 255, 255, 0.55)'
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    if (options.showBridges) {
      const layerBridges = plan.bridges.filter(b => b.layerIndex === (activeLayer?.index ?? 0))
      for (const b of layerBridges) {
        const x1 = cx + (b.fromXMm / (plan.frameWidthMm / 2)) * half
        const y1 = cy + (b.fromYMm / (plan.frameWidthMm / 2)) * half
        const x2 = cx + (b.toXMm / (plan.frameWidthMm / 2)) * half
        const y2 = cy + (b.toYMm / (plan.frameWidthMm / 2)) * half
        ctx.save()
        ctx.strokeStyle = '#33a37e'
        ctx.lineWidth = Math.max(2.8, 3.8 * scale)
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
        ctx.restore()
      }
    }

    if (active) {
      // Virtual craft knife pointer at active step's start cut point
      const sx = cx + active.startNx * half
      const sy = cy + active.startNy * half
      ctx.save()
      ctx.fillStyle = '#c74b37'
      ctx.beginPath()
      ctx.arc(sx, sy, 5.2 * scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.6 * scale
      ctx.stroke()

      // Stylized craft knife angled into the cut entry point
      const kx = sx + 28 * scale
      const ky = sy - 34 * scale
      ctx.strokeStyle = '#474f48'
      ctx.lineWidth = 3.2 * scale
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(sx + 6 * scale, sy - 7 * scale)
      ctx.lineTo(kx, ky)
      ctx.stroke()
      ctx.strokeStyle = '#b98952'
      ctx.lineWidth = 5.5 * scale
      ctx.beginPath()
      ctx.moveTo(kx, ky)
      ctx.lineTo(kx + 22 * scale, ky - 26 * scale)
      ctx.stroke()

      // Entry pill badge
      const badgeText = `#${padCutStep(active.step, total)} 起刀`
      const bw = 64 * scale
      const bh = 21 * scale
      const bx = Math.max(artX + bw / 2 + 4, Math.min(artX + artSize - bw / 2 - 4, sx))
      const by = sy + 20 * scale < artY + artSize - 14 ? sy + 20 * scale : sy - 24 * scale
      ctx.fillStyle = '#c74b37'
      ctx.beginPath()
      ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, 6 * scale)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = `700 ${Math.round(10 * scale)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(badgeText, bx, by + 0.5 * scale)
      ctx.restore()
    }
  }

  ctx.restore() // end art clip

  ctx.strokeStyle = 'rgba(68, 72, 58, 0.28)'
  ctx.lineWidth = Math.max(1.2, 1.8 * scale)
  ctx.beginPath()
  ctx.roundRect(artX, artY, artSize, artSize, artRadius)
  ctx.stroke()

  if (isGuide) {
    const totalMm = Math.max(10, plan.frameWidthMm || plan.frameSizeCm * 10)
    const gridStepMm = totalMm <= 150 ? 25 : totalMm <= 180 ? 30 : 40
    const labelStepMm = gridStepMm * 2
    const tickLen = 3.5 * scale

    ctx.save()
    ctx.strokeStyle = 'rgba(116, 122, 108, 0.42)'
    ctx.lineWidth = Math.max(1, 1.3 * scale)
    ctx.beginPath()
    ctx.moveTo(artX, artY)
    ctx.lineTo(artX, artY + artSize)
    ctx.lineTo(artX + artSize, artY + artSize)
    ctx.stroke()

    ctx.fillStyle = 'rgba(104, 110, 96, 0.78)'
    ctx.font = `500 ${Math.max(9, Math.round(9.5 * scale))}px sans-serif`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'top'
    ctx.fillText('0', artX - 4 * scale, artY + artSize + 5 * scale)

    for (let mm = labelStepMm; mm <= totalMm + 0.01; mm += labelStepMm) {
      const clampedMm = Math.min(totalMm, mm)
      const ratio = clampedMm / totalMm
      const gx = artX + ratio * artSize
      const gy = artY + artSize - ratio * artSize

      ctx.beginPath()
      ctx.moveTo(gx, artY + artSize)
      ctx.lineTo(gx, artY + artSize + tickLen)
      ctx.moveTo(artX - tickLen, gy)
      ctx.lineTo(artX, gy)
      ctx.stroke()

      ctx.textAlign = clampedMm >= totalMm - 0.1 ? 'right' : 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(String(Math.round(clampedMm)), gx, artY + artSize + tickLen + 2 * scale)

      ctx.textAlign = 'right'
      ctx.textBaseline = clampedMm >= totalMm - 0.1 ? 'top' : 'middle'
      ctx.fillText(String(Math.round(clampedMm)), artX - tickLen - 3 * scale, gy)
    }
    ctx.restore()
  }
}

export function renderCarvingBoard(
  canvas: HTMLCanvasElement,
  plan: CarvingPlan,
  material: CarvingMaterialSpec = CARVING_MATERIALS[0],
  options: CarvingRenderOptions,
  sizePx = 720,
) {
  const ctx = getContext(canvas, sizePx, sizePx)
  ctx.clearRect(0, 0, sizePx, sizePx)
  drawCarvingScene(ctx, 20, 20, sizePx - 40, plan, material, options)
}

export function carvingSheetCanvas(
  plan: CarvingPlan,
  material: CarvingMaterialSpec,
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

  const safeTitle = title.trim() || '雕刻画底稿作品'
  const algInfo = CARVING_ALGORITHM_INFO[plan.algorithm]

  ctx.textAlign = 'left'
  ctx.fillStyle = '#8b5742'
  ctx.font = '600 14px sans-serif'
  ctx.fillText(`TRACECRAFT · PAPER CARVING · 雕刻画工坊图纸（${algInfo.label}）`, 52, 60)

  ctx.fillStyle = '#333a2d'
  ctx.font = '700 32px sans-serif'
  ctx.fillText(safeTitle, 52, 102, 740)

  ctx.fillStyle = '#6f7764'
  ctx.font = '16px sans-serif'
  ctx.fillText(
    `${plan.frameSizeCm}×${plan.frameSizeCm} cm · ${plan.steps.length} 刀 · ${plan.layers.length} 层 · 刻线约 ${plan.totalPerimeterMeters} m`,
    52,
    136,
    920,
  )

  drawCarvingScene(ctx, 64, 184, 710, plan, material, {
    mode: 'realistic',
    currentStep: plan.steps.length,
    showBridges: false,
    showGhost: false,
  })

  const panelX = 830
  const panelW = 516
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(panelX, 184, panelW, 756, 16)
  ctx.fill()
  ctx.strokeStyle = '#e5e6dc'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = '#353c2f'
  ctx.font = '700 17px sans-serif'
  ctx.fillText('图层结构摘要', panelX + 26, 222)

  plan.layers.forEach((layer, idx) => {
    const y = 244 + idx * 58
    ctx.fillStyle = '#f8f8f3'
    ctx.beginPath()
    ctx.roundRect(panelX + 26, y, panelW - 52, 48, 10)
    ctx.fill()

    ctx.fillStyle = plan.algorithm === 'layered-shadowbox' ? layer.tint : material.paper
    ctx.beginPath()
    ctx.roundRect(panelX + 38, y + 14, 20, 20, 4)
    ctx.fill()
    ctx.strokeStyle = '#d4d6ca'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.fillStyle = '#333a2d'
    ctx.font = '600 14px sans-serif'
    ctx.fillText(layer.name, panelX + 70, y + 20, panelW - 110)
    ctx.fillStyle = '#757d69'
    ctx.font = '12px sans-serif'
    ctx.fillText(
      layer.stepCount > 0 ? `第 ${layer.startStep}–${layer.endStep} 刀 · 刻线 ${layer.perimeterMeters} m` : '整版底板层 · 无需镂空',
      panelX + 70,
      y + 38,
      panelW - 110,
    )
  })

  const previewTop = 264 + Math.max(1, plan.layers.length) * 58
  ctx.fillStyle = '#353c2f'
  ctx.font = '700 16px sans-serif'
  ctx.fillText('前 12 步雕刻步骤速查（第一象限起刀）', panelX + 26, previewTop)

  const colW = (panelW - 64) / 2
  const sampleCount = Math.min(12, plan.steps.length)
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

    ctx.fillStyle = '#b04434'
    ctx.beginPath()
    ctx.arc(bx + 15, by + 16.5, 4.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#404738'
    ctx.font = '600 11.5px monospace'
    ctx.fillText(`#${padCutStep(s.step, plan.steps.length)} (${s.startXMm}, ${s.startYMm})mm · ${s.areaMm2}mm²`, bx + 26, by + 20, colW - 32)
  }

  ctx.fillStyle = '#8b6447'
  ctx.font = '12px sans-serif'
  ctx.fillText(`安全提示：${CARVING_SAFETY_NOTICE}`, 52, 988, 960)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#77806b'
  ctx.fillText('由 TraceCraft 雕刻画工坊在本地生成', width - 52, 988)
  ctx.textAlign = 'left'
  return canvas
}
