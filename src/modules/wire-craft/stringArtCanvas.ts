import { canvasPngBlob, decodeLocalImage, sourcePreview } from '../beads/beadsCanvas'
import {
  DEFAULT_STRING_MAP_SIZE,
  padPeg,
  rgbaToDarknessMap,
  rgbaToPhotoLayers,
  stringArtCoverage,
  STRING_PALETTES,
  STRING_SAFETY_NOTICE,
} from './stringArt'
import type { ColorWeaveMode, ContrastMode, StringArtPlan, StringLayerInput, StringPalette } from './stringArt'

export { canvasPngBlob, decodeLocalImage, sourcePreview }

export interface StringArtRenderOptions {
  mode: 'guide' | 'full'
  currentStep: number
  showNumbers: boolean
  showGhost: boolean
}

function getContext(canvas: HTMLCanvasElement, width: number, height: number) {
  canvas.width = Math.round(width)
  canvas.height = Math.round(height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器无法使用画布，请换用支持 Canvas 的浏览器。')
  return ctx
}

export interface PhotoFraming { zoom: number; x: number; y: number }
export const DEFAULT_PHOTO_FRAMING: PhotoFraming = { zoom: 1, x: 0.5, y: 0.5 }

export function photoCropRect(width: number, height: number, framing = DEFAULT_PHOTO_FRAMING) {
  const side = Math.min(width, height) / Math.max(1, Math.min(3, framing.zoom))
  return {
    sx: Math.max(0, Math.min(width - side, framing.x * width - side / 2)),
    sy: Math.max(0, Math.min(height - side, framing.y * height - side / 2)),
    side,
  }
}

export function renderPhotoFraming(canvas: HTMLCanvasElement, image: HTMLImageElement, framing: PhotoFraming) {
  const ctx = getContext(canvas, 200, 200)
  const { sx, sy, side } = photoCropRect(image.naturalWidth, image.naturalHeight, framing)
  ctx.drawImage(image, sx, sy, side, side, 0, 0, 200, 200)
  ctx.fillStyle = 'rgba(255,255,255,.6)'
  ctx.beginPath()
  ctx.rect(0, 0, 200, 200)
  ctx.arc(100, 100, 99, 0, Math.PI * 2, true)
  ctx.fill('evenodd')
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(100, 100, 99, 0, Math.PI * 2)
  ctx.stroke()
}

function readCroppedImageRgba(image: HTMLImageElement, mapSize: number, framing = DEFAULT_PHOTO_FRAMING): Uint8ClampedArray {
  const { sx, sy, side } = photoCropRect(image.naturalWidth, image.naturalHeight, framing)
  const offscreen = document.createElement('canvas')
  const ctx = getContext(offscreen, mapSize, mapSize)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, sx, sy, side, side, 0, 0, mapSize, mapSize)
  return ctx.getImageData(0, 0, mapSize, mapSize).data
}

export function sampleImageToDarkness(
  image: HTMLImageElement,
  mapSize = DEFAULT_STRING_MAP_SIZE,
  invert = false,
  contrastMode: ContrastMode = 'portrait',
): Float32Array {
  const rgba = readCroppedImageRgba(image, mapSize)
  return rgbaToDarknessMap(rgba, mapSize, mapSize, mapSize, invert, contrastMode)
}

export function sampleImageToLayers(
  image: HTMLImageElement,
  mapSize = DEFAULT_STRING_MAP_SIZE,
  palette: StringPalette = STRING_PALETTES[0],
  usePhotoColors = true,
  invert = false,
  colorWeaveMode: ColorWeaveMode = 'mono',
  contrastMode: ContrastMode = 'portrait',
  framing: PhotoFraming = DEFAULT_PHOTO_FRAMING,
): StringLayerInput[] {
  const rgba = readCroppedImageRgba(image, mapSize, framing)
  return rgbaToPhotoLayers(rgba, mapSize, mapSize, mapSize, palette, usePhotoColors, invert, colorWeaveMode, contrastMode)
}

function pegPoint(plan: StringArtPlan, pegNumber: number, cx: number, cy: number, pegR: number) {
  const peg = plan.pegs[Math.max(0, Math.min(plan.pegs.length - 1, pegNumber - 1))]
  return { x: cx + peg.nx * pegR, y: cy + peg.ny * pegR, nx: peg.nx, ny: peg.ny, color: peg.color }
}

function drawOptimizedThreads(ctx: CanvasRenderingContext2D, cx: number, cy: number, pegR: number, plan: StringArtPlan, drawnCount: number) {
  const fields = stringArtCoverage(plan, drawnCount)
  const raster = document.createElement('canvas')
  const rasterContext = getContext(raster, plan.mapSize, plan.mapSize)
  const pixelScale = pegR / (plan.mapSize / 2 - 4)
  const offset = plan.mapSize / 2 * pixelScale
  ctx.save()
  ctx.imageSmoothingEnabled = true
  for (let layer = 0; layer < fields.length; layer++) {
    const rgb = plan.layers[layer].color.match(/[\da-f]{2}/gi)!.map(value => parseInt(value, 16))
    const image = rasterContext.createImageData(plan.mapSize, plan.mapSize)
    for (let i = 0; i < fields[layer].length; i++) {
      image.data[i * 4] = rgb[0]
      image.data[i * 4 + 1] = rgb[1]
      image.data[i * 4 + 2] = rgb[2]
      image.data[i * 4 + 3] = Math.round(fields[layer][i] * 255)
    }
    rasterContext.putImageData(image, 0, 0)
    ctx.drawImage(raster, cx - offset, cy - offset, plan.mapSize * pixelScale, plan.mapSize * pixelScale)
  }
  ctx.restore()
}

export function drawStringArtScene(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  boardRadius: number,
  plan: StringArtPlan,
  palette: StringPalette,
  options: StringArtRenderOptions,
) {
  const scale = boardRadius / 320
  const pegR = boardRadius * 0.875
  const isContour = plan.layoutMode === 'contour'

  // Outer board shadow & wooden/gallery rim
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
  ctx.fillStyle = palette.board
  ctx.fill()
  ctx.lineWidth = Math.max(1.5, 4 * scale)
  ctx.strokeStyle = palette.rim
  ctx.stroke()

  if (isContour && options.mode === 'guide' && plan.contourLoops.length > 0) {
    ctx.save()
    ctx.strokeStyle = palette.darkBoard ? 'rgba(255,255,255,0.12)' : 'rgba(130,122,102,0.18)'
    ctx.lineWidth = Math.max(0.8, 1.1 * scale)
    ctx.setLineDash([4 * scale, 4 * scale])
    for (const loop of plan.contourLoops) {
      if (loop.length < 3) continue
      ctx.beginPath()
      loop.forEach((pegNum, idx) => {
        const pt = pegPoint(plan, pegNum, cx, cy, pegR)
        if (idx === 0) ctx.moveTo(pt.x, pt.y)
        else ctx.lineTo(pt.x, pt.y)
      })
      ctx.closePath()
      ctx.stroke()
    }
    ctx.restore()
  }

  const totalSteps = plan.steps.length
  const clampStep = Math.max(1, Math.min(totalSteps, Math.trunc(options.currentStep)))
  const drawnCount = options.mode === 'full' ? totalSteps : Math.max(0, clampStep - 1)

  if (options.mode === 'guide' && options.showGhost && clampStep < totalSteps) {
    ctx.save()
    ctx.globalAlpha = isContour ? (palette.darkBoard ? 0.1 : 0.08) : 0.032
    ctx.lineWidth = Math.max(0.42, (isContour ? 0.8 : 0.55) * scale)
    for (let i = clampStep; i < totalSteps; i++) {
      const s = plan.steps[i]
      const a = pegPoint(plan, s.from, cx, cy, pegR)
      const b = pegPoint(plan, s.to, cx, cy, pegR)
      ctx.strokeStyle = s.color
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
    ctx.restore()
  }

  if (drawnCount > 0) {
    if (!isContour) {
      drawOptimizedThreads(ctx, cx, cy, pegR, plan, drawnCount)
    } else {
      const weaveAlpha = (plan.stepCount <= 400 ? 0.52 : plan.stepCount <= 800 ? 0.42 : 0.34) * (palette.darkBoard ? 1.12 : 1)
      ctx.save()
      ctx.lineCap = 'round'
      ctx.lineWidth = Math.max(0.7, 1.22 * scale)
      ctx.globalAlpha = weaveAlpha
      for (let i = 0; i < drawnCount; i++) {
        const s = plan.steps[i]
        if (s.kind !== '内部混绕') continue
        const a = pegPoint(plan, s.from, cx, cy, pegR)
        const b = pegPoint(plan, s.to, cx, cy, pegR)
        ctx.strokeStyle = s.color
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
      ctx.restore()

      ctx.save()
      ctx.lineCap = 'round'
      ctx.lineWidth = Math.max(1.2, 2.0 * scale)
      ctx.globalAlpha = palette.darkBoard ? 0.92 : 0.86
      for (let i = 0; i < drawnCount; i++) {
        const s = plan.steps[i]
        if (s.kind !== '轮廓锁边') continue
        const a = pegPoint(plan, s.from, cx, cy, pegR)
        const b = pegPoint(plan, s.to, cx, cy, pegR)
        ctx.strokeStyle = s.color
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  const active = options.mode === 'guide' && plan.steps.length > 0 ? plan.steps[clampStep - 1] : null
  if (active) {
    const a = pegPoint(plan, active.from, cx, cy, pegR)
    const b = pegPoint(plan, active.to, cx, cy, pegR)
    const accent = palette.darkBoard ? '#ff9d66' : '#c74b37'
    ctx.save()
    ctx.strokeStyle = accent
    ctx.lineWidth = Math.max(2.1, 3.2 * scale)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()

    const ax = a.x + (b.x - a.x) * 0.74
    const ay = a.y + (b.y - a.y) * 0.74
    const ang = Math.atan2(b.y - a.y, b.x - a.x)
    const headLen = 10.5 * scale
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(ax - Math.cos(ang - 0.42) * headLen, ay - Math.sin(ang - 0.42) * headLen)
    ctx.lineTo(ax - Math.cos(ang + 0.42) * headLen, ay - Math.sin(ang + 0.42) * headLen)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  const nailSize = Math.max(1.3, (plan.pegCount >= 180 ? 1.8 : plan.pegCount >= 100 ? 2.25 : 2.9) * scale)
  const placedLabels: Array<{ x: number; y: number }> = []
  const labelDistMin = 19 * scale

  for (let i = 0; i < plan.pegs.length; i++) {
    const peg = plan.pegs[i]
    const px = cx + peg.nx * pegR
    const py = cy + peg.ny * pegR
    const isFrom = active?.from === peg.number
    const isTo = active?.to === peg.number

    if (isFrom || isTo) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(px, py, nailSize * 3.1, 0, Math.PI * 2)
      ctx.fillStyle = isFrom ? 'rgba(47, 122, 98, 0.25)' : 'rgba(199, 75, 55, 0.26)'
      ctx.fill()
      ctx.lineWidth = 2 * scale
      ctx.strokeStyle = isFrom ? '#2f7a62' : '#c74b37'
      ctx.stroke()
      ctx.restore()
    }

    ctx.save()
    ctx.beginPath()
    ctx.arc(px + 0.5 * scale, py + 0.9 * scale, nailSize * 1.25, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(22, 18, 12, 0.18)'
    ctx.fill()
    if (isContour) {
      ctx.beginPath()
      ctx.arc(px, py, nailSize * 1.2, 0, Math.PI * 2)
      ctx.fillStyle = peg.color
      ctx.fill()
    }
    ctx.restore()

    const rHead = isFrom || isTo ? nailSize * 1.45 : nailSize
    const nGrad = ctx.createRadialGradient(px - rHead * 0.35, py - rHead * 0.35, rHead * 0.15, px, py, rHead)
    nGrad.addColorStop(0, '#fffdf6')
    nGrad.addColorStop(0.55, palette.nail)
    nGrad.addColorStop(1, '#4c3e2b')
    ctx.beginPath()
    ctx.arc(px, py, rHead, 0, Math.PI * 2)
    ctx.fillStyle = nGrad
    ctx.fill()
  }

  if (options.showNumbers) {
    const indices = plan.pegs.map((_, i) => i).sort((ia, ib) => {
      const pA = plan.pegs[ia].number
      const pB = plan.pegs[ib].number
      const prioA = (active?.from === pA || active?.to === pA) ? 0 : pA === 1 ? 1 : 2
      const prioB = (active?.from === pB || active?.to === pB) ? 0 : pB === 1 ? 1 : 2
      return prioA - prioB
    })

    const ringStride = plan.pegCount >= 180 ? 5 : plan.pegCount >= 100 ? 2 : 1
    for (const i of indices) {
      const peg = plan.pegs[i]
      const isFrom = active?.from === peg.number
      const isTo = active?.to === peg.number
      const isFirst = peg.number === 1
      const priority = isFrom || isTo || isFirst
      if (!isContour && ringStride > 1 && i % ringStride !== 0 && !priority) continue

      const px = cx + peg.nx * pegR
      const py = cy + peg.ny * pegR
      const normD = Math.hypot(peg.nx, peg.ny) || 1
      const stepOut = isContour ? 12.5 * scale : boardRadius * 0.068
      const lx = px + (peg.nx / normD) * stepOut
      const ly = py + (peg.ny / normD) * stepOut

      if (!priority && placedLabels.some(prev => Math.hypot(prev.x - lx, prev.y - ly) < labelDistMin)) {
        continue
      }
      placedLabels.push({ x: lx, y: ly })

      ctx.save()
      ctx.font = `${priority ? '700' : '500'} ${Math.round(Math.max(8, (priority ? 10 : 8.2) * scale))}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      if (isFrom || isTo) {
        ctx.fillStyle = isFrom ? '#2f7a62' : '#c74b37'
      } else if (isFirst) {
        ctx.fillStyle = palette.darkBoard ? '#f1cf88' : '#9c523c'
      } else {
        ctx.fillStyle = palette.darkBoard ? 'rgba(232,238,242,0.75)' : 'rgba(72,79,63,0.75)'
      }
      ctx.fillText(padPeg(peg.number, plan.pegCount), lx, ly)
      ctx.restore()
    }
  }

  if (active) {
    const badges: Array<{ peg: number; text: string; bg: string }> = [
      { peg: active.from, text: `起 ${padPeg(active.from, plan.pegCount)}`, bg: '#2f7a62' },
      { peg: active.to, text: `终 ${padPeg(active.to, plan.pegCount)}`, bg: '#c74b37' },
    ]
    for (const badge of badges) {
      const pt = pegPoint(plan, badge.peg, cx, cy, pegR)
      const normD = Math.hypot(pt.nx, pt.ny) || 1
      const bx = pt.x - (pt.nx / normD) * (20 * scale)
      const by = pt.y - (pt.ny / normD) * (20 * scale)
      const bw = 46 * scale
      const bh = 20 * scale
      ctx.save()
      ctx.fillStyle = badge.bg
      ctx.beginPath()
      ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, 6 * scale)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = `600 ${Math.round(10.5 * scale)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(badge.text, bx, by + 0.5 * scale)
      ctx.restore()
    }
  }
}

export function renderStringArtBoard(
  canvas: HTMLCanvasElement,
  plan: StringArtPlan,
  palette: StringPalette,
  options: StringArtRenderOptions,
  sizePx = 720,
) {
  const ctx = getContext(canvas, sizePx, sizePx)
  ctx.clearRect(0, 0, sizePx, sizePx)
  drawStringArtScene(ctx, sizePx / 2, sizePx / 2, sizePx * 0.455, plan, palette, options)
}

export function stringArtSheetCanvas(
  plan: StringArtPlan,
  palette: StringPalette,
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

  const safeTitle = title.trim() || '绕线画作品'
  const modeLabel = plan.layoutMode === 'contour' ? '自由轮廓布钉' : '外圈固定钉盘'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#9c6e4e'
  ctx.font = '600 14px sans-serif'
  ctx.fillText(`TRACECRAFT · STRING ART · 绕线画工坊图纸（${modeLabel}）`, 52, 60)

  ctx.fillStyle = '#333a2d'
  ctx.font = '700 32px sans-serif'
  ctx.fillText(safeTitle, 52, 102, 720)

  ctx.fillStyle = '#6f7764'
  ctx.font = '16px sans-serif'
  ctx.fillText(
    `${plan.boardSizeCm} cm 木板 · ${plan.pegCount} 颗钉子 · ${plan.stepCount} 步 · ${plan.layers.length} 色 · 约 ${plan.totalLengthMeters} m`,
    52,
    136,
    920,
  )

  drawStringArtScene(ctx, 430, 560, 340, plan, palette, {
    mode: 'full',
    currentStep: plan.steps.length,
    showNumbers: true,
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
  ctx.fillText('丝线规格与色卡', panelX + 26, 212)

  plan.layers.forEach((layer, idx) => {
    const ly = 236 + idx * 34
    ctx.fillStyle = layer.color
    ctx.beginPath()
    ctx.arc(panelX + 34, ly + 8, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#d4d6ca'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.fillStyle = '#3a4233'
    ctx.font = '600 13px sans-serif'
    ctx.fillText(`${layer.name}`, panelX + 52, ly + 12, 126)
    ctx.fillStyle = '#737c68'
    ctx.font = '12px sans-serif'
    ctx.fillText(`第 ${layer.startStep}–${layer.endStep} 步（${layer.stepCount} 步 · 约 ${layer.lengthMeters} m）`, panelX + 185, ly + 12, panelW - 211)
  })

  const guideTop = 250 + Math.max(1, plan.layers.length) * 34
  ctx.strokeStyle = '#eef0e6'
  ctx.beginPath()
  ctx.moveTo(panelX + 26, guideTop)
  ctx.lineTo(panelX + panelW - 26, guideTop)
  ctx.stroke()

  ctx.fillStyle = '#353c2f'
  ctx.font = '700 16px sans-serif'
  ctx.fillText('四步制作说明', panelX + 26, guideTop + 30)

  const guideLines = [
    '01. 下载 1:1 钉位模板 SVG，100% 原寸打印后贴板打钉。',
    '02. 选用细棉线/绣线（建议 2–3 股细线），在 ★01 号钉打双结起线。',
    '03. 按针号顺序表 CSV 逐步绕线；实物随线径与张力略有差异。',
    '04. 终步绕两圈打死结固定并修齐线头；注意用锤钉工具安全。',
  ]
  ctx.fillStyle = '#68715d'
  ctx.font = '13px sans-serif'
  guideLines.forEach((line, idx) => {
    ctx.fillText(line, panelX + 26, guideTop + 60 + idx * 25, panelW - 52)
  })

  const seqTop = guideTop + 174
  ctx.strokeStyle = '#eef0e6'
  ctx.beginPath()
  ctx.moveTo(panelX + 26, seqTop - 16)
  ctx.lineTo(panelX + panelW - 26, seqTop - 16)
  ctx.stroke()

  ctx.fillStyle = '#353c2f'
  ctx.font = '700 16px sans-serif'
  ctx.fillText(`起始 30 步针号顺序（共 ${plan.stepCount} 步）`, panelX + 26, seqTop + 12, panelW - 52)

  const previewSteps = plan.steps.slice(0, 30)
  ctx.font = '13px monospace'
  const colW = (panelW - 52) / 3
  previewSteps.forEach((step, idx) => {
    const col = idx % 3
    const row = Math.floor(idx / 3)
    const sx = panelX + 26 + col * colW
    const sy = seqTop + 46 + row * 32
    ctx.fillStyle = step.color
    ctx.beginPath()
    ctx.arc(sx + 5, sy - 4, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#8b927f'
    ctx.fillText(`#${String(step.step).padStart(2, '0')}`, sx + 14, sy)
    ctx.fillStyle = '#384031'
    ctx.fillText(`${padPeg(step.from, plan.pegCount)}→${padPeg(step.to, plan.pegCount)}`, sx + 48, sy)
  })

  ctx.fillStyle = '#8b6447'
  ctx.font = '12px sans-serif'
  ctx.fillText(`安全提示：${STRING_SAFETY_NOTICE}`, 52, 990, 960)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#77806b'
  ctx.fillText('由 TraceCraft 绕线画工坊在本地生成', width - 52, 990)
  ctx.textAlign = 'left'

  return canvas
}
