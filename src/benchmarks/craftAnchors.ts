import { getPortraitExampleRgba, PORTRAIT_EXAMPLE_SIZE } from '../lib/portraitExample'
import { countMaterials, hexToRgb, quantizePixels } from '../modules/beads/beads'
import {
  createCarvingExampleField,
  generateCarvingPlan,
} from '../modules/carving/carving'
import {
  COMPASS_PALETTES,
  createCompassExampleField,
  DEFAULT_COMPASS_MAP_SIZE,
  generateCompassPlan,
} from '../modules/compass/compass'
import {
  computeStructureFlowField,
  createEmbroideryExampleRgba,
  generateEmbroideryPlan,
  quantizeImageToEmbroideryGrid,
} from '../modules/embroidery/embroidery'
import {
  computeImportanceMap,
  createExampleLayers,
  DEFAULT_STRING_MAP_SIZE,
  generateStringArt,
  STRING_PALETTES,
  stringArtCoverage,
} from '../modules/wire-craft/stringArt'

export type AnchorStudio = 'beads' | 'embroidery' | 'wire-craft' | 'compass' | 'carving'
export type AnchorTier = 'default' | 'stress'

export interface AnchorCaseResult {
  id: string
  studio: AnchorStudio
  tier: AnchorTier
  outputHash: string
  metrics: Record<string, number>
  extraTimingsMs?: Record<string, number>
}

export interface AnchorCaseSpec {
  id: string
  studio: AnchorStudio
  tier: AnchorTier
  run: () => AnchorCaseResult
}

class HashBuilder {
  private h1 = 0x811c9dc5
  private h2 = 0x9e3779b1
  private readonly floatBuf = new ArrayBuffer(8)
  private readonly floatView = new DataView(this.floatBuf)
  private readonly floatBytes = new Uint8Array(this.floatBuf)

  private mixByte(byte: number) {
    const b = byte & 0xff
    this.h1 = Math.imul(this.h1 ^ b, 0x01000193) >>> 0
    this.h2 = Math.imul(this.h2 ^ (b ^ 0xa5), 0x85ebca6b) >>> 0
  }

  addInt(value: number) {
    this.mixByte(0x01)
    let v = value | 0
    for (let i = 0; i < 4; i++) {
      this.mixByte(v & 0xff)
      v >>= 8
    }
  }

  addFloat(value: number) {
    this.mixByte(0x02)
    const normalized = Object.is(value, -0) || value === 0 ? 0 : value
    this.floatView.setFloat64(0, normalized, true)
    for (let i = 0; i < 8; i++) {
      this.mixByte(this.floatBytes[i])
    }
  }

  addBool(value: boolean) {
    this.mixByte(0x03)
    this.mixByte(value ? 1 : 0)
  }

  addString(value: string) {
    this.mixByte(0x04)
    this.addInt(value.length)
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i)
      this.mixByte(code & 0xff)
      this.mixByte((code >> 8) & 0xff)
    }
  }

  addIntArray(values: ArrayLike<number>) {
    this.mixByte(0x05)
    this.addInt(values.length)
    for (let i = 0; i < values.length; i++) {
      this.addInt(values[i])
    }
  }

  digest(): string {
    let a = this.h1
    let b = this.h2
    a ^= a >>> 16
    a = Math.imul(a, 0x7feb352d) >>> 0
    a ^= a >>> 15
    a = Math.imul(a, 0x846ca68b) >>> 0
    a = (a ^ (a >>> 16)) >>> 0

    b ^= b >>> 16
    b = Math.imul(b, 0x7feb352d) >>> 0
    b ^= b >>> 15
    b = Math.imul(b, 0x846ca68b) >>> 0
    b = (b ^ (b >>> 16)) >>> 0

    return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0')
  }
}

function roundMetric(value: number, digits = 6): number {
  if (!Number.isFinite(value)) return value
  const factor = 10 ** digits
  const rounded = Math.round(value * factor) / factor
  return Object.is(rounded, -0) ? 0 : rounded
}

function redmeanDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const redMean = (r1 + r2) * 0.5
  const dr = r1 - r2
  const dg = g1 - g2
  const db = b1 - b2
  return Math.sqrt(
    (2 + redMean / 256) * dr * dr +
    4 * dg * dg +
    (2 + (255 - redMean) / 256) * db * db,
  )
}

export function downsampleRgba(
  rgba: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(dstW * dstH * 4)
  for (let y = 0; y < dstH; y++) {
    const sy0 = Math.floor((y / dstH) * srcH)
    const sy1 = Math.max(sy0 + 1, Math.floor(((y + 1) / dstH) * srcH))
    for (let x = 0; x < dstW; x++) {
      const sx0 = Math.floor((x / dstW) * srcW)
      const sx1 = Math.max(sx0 + 1, Math.floor(((x + 1) / dstW) * srcW))
      let rSum = 0
      let gSum = 0
      let bSum = 0
      let aSum = 0
      let count = 0
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const idx = (sy * srcW + sx) * 4
          const alpha = rgba[idx + 3] / 255
          rSum += rgba[idx] * alpha
          gSum += rgba[idx + 1] * alpha
          bSum += rgba[idx + 2] * alpha
          aSum += alpha
          count++
        }
      }
      const dstIdx = (y * dstW + x) * 4
      const avgAlpha = count ? aSum / count : 0
      out[dstIdx + 3] = Math.round(avgAlpha * 255)
      if (aSum > 0) {
        out[dstIdx] = Math.round(rSum / aSum)
        out[dstIdx + 1] = Math.round(gSum / aSum)
        out[dstIdx + 2] = Math.round(bSum / aSum)
      }
    }
  }
  return out
}

function bresenhamPixels(x0: number, y0: number, x1: number, y1: number, mapSize: number): number[] {
  let x = x0
  let y = y0
  const dx = Math.abs(x1 - x)
  const dy = Math.abs(y1 - y)
  const sx = x < x1 ? 1 : -1
  const sy = y < y1 ? 1 : -1
  let err = dx - dy
  const pixels: number[] = []
  while (true) {
    if (x >= 0 && x < mapSize && y >= 0 && y < mapSize) {
      pixels.push(y * mapSize + x)
    }
    if (x === x1 && y === y1) return pixels
    const e2 = err * 2
    if (e2 > -dy) {
      err -= dy
      x += sx
    }
    if (e2 < dx) {
      err += dx
      y += sy
    }
  }
}

function is4ConnectedToFrame(mask: Uint8Array, size: number): boolean {
  if (!mask[0]) return false
  const visited = new Uint8Array(mask.length)
  const queue = new Int32Array(mask.length)
  let head = 0
  let tail = 0
  queue[tail++] = 0
  visited[0] = 1
  while (head < tail) {
    const curr = queue[head++]
    const cx = curr % size
    const cy = Math.floor(curr / size)
    if (cx > 0 && mask[curr - 1] && !visited[curr - 1]) {
      visited[curr - 1] = 1
      queue[tail++] = curr - 1
    }
    if (cx < size - 1 && mask[curr + 1] && !visited[curr + 1]) {
      visited[curr + 1] = 1
      queue[tail++] = curr + 1
    }
    if (cy > 0 && mask[curr - size] && !visited[curr - size]) {
      visited[curr - size] = 1
      queue[tail++] = curr - size
    }
    if (cy < size - 1 && mask[curr + size] && !visited[curr + size]) {
      visited[curr + size] = 1
      queue[tail++] = curr + size
    }
  }
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] && !visited[i]) return false
  }
  return true
}

function runBeadsCase(id: string, tier: AnchorTier, size: number, maxColors: number): AnchorCaseResult {
  const portrait = getPortraitExampleRgba()
  const sampled = downsampleRgba(portrait, PORTRAIT_EXAMPLE_SIZE, PORTRAIT_EXAMPLE_SIZE, size, size)
  const quantized = quantizePixels(sampled, size, size, maxColors)

  const paletteRgb = new Map(quantized.palette.map(c => [c.code, hexToRgb(c.color)]))
  const errors: number[] = []
  const srcVisible = new Uint8Array(size * size)
  const srcR = new Uint8Array(size * size)
  const srcG = new Uint8Array(size * size)
  const srcB = new Uint8Array(size * size)

  for (let i = 0; i < size * size; i++) {
    const off = i * 4
    const alpha = sampled[off + 3] / 255
    if (alpha < 0.5) continue
    srcVisible[i] = 1
    const r = Math.round(sampled[off] * alpha + 255 * (1 - alpha))
    const g = Math.round(sampled[off + 1] * alpha + 255 * (1 - alpha))
    const b = Math.round(sampled[off + 2] * alpha + 255 * (1 - alpha))
    srcR[i] = r
    srcG[i] = g
    srcB[i] = b
    const code = quantized.cells[i]
    const pRgb = paletteRgb.get(code)
    if (pRgb) {
      errors.push(redmeanDist(r, g, b, pRgb[0], pRgb[1], pRgb[2]))
    }
  }

  errors.sort((a, b) => a - b)
  const meanRedmeanError = errors.length
    ? errors.reduce((sum, v) => sum + v, 0) / errors.length
    : 0
  const p95RedmeanError = errors.length
    ? errors[Math.min(errors.length - 1, Math.floor(errors.length * 0.95))]
    : 0

  let edgePairs = 0
  let preservedPairs = 0
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      if (!srcVisible[i]) continue
      if (x + 1 < size && srcVisible[i + 1]) {
        if (redmeanDist(srcR[i], srcG[i], srcB[i], srcR[i + 1], srcG[i + 1], srcB[i + 1]) > 45) {
          edgePairs++
          if (quantized.cells[i] !== quantized.cells[i + 1]) preservedPairs++
        }
      }
      if (y + 1 < size && srcVisible[i + size]) {
        if (redmeanDist(srcR[i], srcG[i], srcB[i], srcR[i + size], srcG[i + size], srcB[i + size]) > 45) {
          edgePairs++
          if (quantized.cells[i] !== quantized.cells[i + size]) preservedPairs++
        }
      }
    }
  }

  const materials = countMaterials(quantized)
  const beadCount = materials.reduce((sum, item) => sum + item.count, 0)

  const hb = new HashBuilder()
  hb.addInt(quantized.columns)
  hb.addInt(quantized.rows)
  hb.addInt(quantized.cells.length)
  for (const cell of quantized.cells) hb.addString(cell)
  hb.addInt(quantized.palette.length)
  for (const color of quantized.palette) {
    hb.addString(color.code)
    hb.addString(color.color)
  }

  return {
    id,
    studio: 'beads',
    tier,
    outputHash: hb.digest(),
    metrics: {
      beadCount,
      paletteSize: quantized.palette.length,
      meanRedmeanError: roundMetric(meanRedmeanError, 4),
      p95RedmeanError: roundMetric(p95RedmeanError, 4),
      edgeDetailPreservation: roundMetric(edgePairs > 0 ? preservedPairs / edgePairs : 1, 6),
    },
  }
}

function runEmbroideryCase(
  id: string,
  tier: AnchorTier,
  sourceKind: 'portrait' | 'camellia' | 'strawberry',
  stitchMode: 'long-short' | 'cross-stitch' | 'punch-needle',
  gridSize: number,
  maxColors: number,
): AnchorCaseResult {
  const { rgba, width, height } = sourceKind === 'portrait'
    ? { rgba: getPortraitExampleRgba(), width: PORTRAIT_EXAMPLE_SIZE, height: PORTRAIT_EXAMPLE_SIZE }
    : createEmbroideryExampleRgba(sourceKind, 112)

  const grid = quantizeImageToEmbroideryGrid(rgba, width, height, gridSize, maxColors, true)
  const plan = generateEmbroideryPlan(grid, stitchMode, 15, false)

  const paletteRgb = grid.palette.map(c => hexToRgb(c.color))
  let colorErrSum = 0
  let fgCount = 0
  for (let i = 0; i < grid.cells.length; i++) {
    const c = grid.cells[i]
    if (c < 0) continue
    fgCount++
    const p = paletteRgb[c]
    colorErrSum += redmeanDist(grid.rgb[i * 3], grid.rgb[i * 3 + 1], grid.rgb[i * 3 + 2], p[0], p[1], p[2])
  }

  const covered = new Uint8Array(grid.gridWidth * grid.gridHeight)
  for (const s of plan.stitches) {
    if (s.gridX !== undefined && s.gridY !== undefined) {
      if (s.gridX >= 0 && s.gridX < grid.gridWidth && s.gridY >= 0 && s.gridY < grid.gridHeight) {
        covered[s.gridY * grid.gridWidth + s.gridX] = 1
      }
    }
  }
  let coveredFg = 0
  for (let i = 0; i < grid.cells.length; i++) {
    if (grid.cells[i] >= 0 && covered[i]) coveredFg++
  }

  let meanFlowAlignmentDeg = 0
  if (stitchMode === 'long-short') {
    const flow = computeStructureFlowField(grid)
    let angleSumDeg = 0
    let angleCount = 0
    for (const s of plan.stitches) {
      if ((s.kind === 'long-short' || s.kind === 'satin') && s.gridX !== undefined && s.gridY !== undefined) {
        const flowAngle = flow.angles[s.gridY * grid.gridWidth + s.gridX]
        let diff = Math.abs(s.angle - flowAngle) % Math.PI
        if (diff > Math.PI * 0.5) diff = Math.PI - diff
        angleSumDeg += (diff * 180) / Math.PI
        angleCount++
      }
    }
    meanFlowAlignmentDeg = angleCount > 0 ? angleSumDeg / angleCount : 0
  }

  const jumpsInCells: number[] = []
  for (let i = 1; i < plan.stitches.length; i++) {
    const prev = plan.stitches[i - 1]
    const curr = plan.stitches[i]
    if (prev.layerIndex !== curr.layerIndex) continue
    jumpsInCells.push(Math.hypot(curr.x0 - prev.x1, curr.y0 - prev.y1) / plan.cellSizeNorm)
  }
  jumpsInCells.sort((a, b) => a - b)
  const medianIntraLayerJumpCells = jumpsInCells.length
    ? jumpsInCells[Math.floor(jumpsInCells.length / 2)]
    : 0
  const threshold = stitchMode === 'long-short' ? 3.0 : 2.5
  const localRoutingRatio = jumpsInCells.length
    ? jumpsInCells.filter(d => d <= threshold).length / jumpsInCells.length
    : 1

  const hb = new HashBuilder()
  hb.addInt(plan.gridWidth)
  hb.addInt(plan.gridHeight)
  hb.addInt(plan.totalStitches)
  hb.addFloat(plan.totalMeters)
  hb.addInt(plan.layers.length)
  for (const layer of plan.layers) {
    hb.addInt(layer.index)
    hb.addString(layer.dmcCode)
    hb.addInt(layer.startStep)
    hb.addInt(layer.endStep)
    hb.addInt(layer.stitchCount)
    hb.addFloat(layer.lengthMeters)
  }
  hb.addInt(plan.stitches.length)
  for (const s of plan.stitches) {
    hb.addString(s.kind)
    hb.addFloat(s.x0)
    hb.addFloat(s.y0)
    hb.addFloat(s.x1)
    hb.addFloat(s.y1)
    hb.addFloat(s.angle)
    hb.addFloat(s.lengthMm)
    hb.addString(s.dmcCode)
    hb.addInt(s.strands)
    hb.addInt(s.layerIndex)
  }

  return {
    id,
    studio: 'embroidery',
    tier,
    outputHash: hb.digest(),
    metrics: {
      totalStitches: plan.totalStitches,
      layerCount: plan.layers.length,
      totalMeters: plan.totalMeters,
      meanRedmeanError: roundMetric(fgCount > 0 ? colorErrSum / fgCount : 0, 4),
      foregroundCoverageRatio: roundMetric(fgCount > 0 ? coveredFg / fgCount : 1, 6),
      meanFlowAlignmentDeg: roundMetric(meanFlowAlignmentDeg, 4),
      medianIntraLayerJumpCells: roundMetric(medianIntraLayerJumpCells, 4),
      localRoutingRatio: roundMetric(localRoutingRatio, 6),
    },
  }
}

function runWireCase(
  id: string,
  tier: AnchorTier,
  exampleId: 'portrait' | 'cat',
  layoutMode: 'ring' | 'contour',
  colorWeaveMode: 'mono' | 'multi',
  pegCount: number,
  stepCount: number,
): AnchorCaseResult {
  const palette = exampleId === 'cat'
    ? (STRING_PALETTES.find(p => p.id === 'calico-cat') ?? STRING_PALETTES[0])
    : STRING_PALETTES[0]
  const layers = createExampleLayers(exampleId, DEFAULT_STRING_MAP_SIZE, palette, colorWeaveMode, 'portrait')
  const plan = generateStringArt(layers, DEFAULT_STRING_MAP_SIZE, pegCount, stepCount, 20, layoutMode, palette)

  const rebuildStart = performance.now()
  const coverages = stringArtCoverage(plan, plan.steps.length)
  const wireCoverageRebuildMs = performance.now() - rebuildStart

  let weightedLossRatio = 0
  if (layoutMode === 'ring' && layers.length > 0 && coverages.length > 0) {
    const target = layers[0].map
    const importance = layers[0].importance ?? computeImportanceMap(target, DEFAULT_STRING_MAP_SIZE)
    const field = coverages[0]
    let initial = 0
    let loss = 0
    for (let i = 0; i < target.length; i++) {
      initial += importance[i] * target[i] * target[i]
      const diff = target[i] - field[i]
      loss += importance[i] * diff * diff
    }
    weightedLossRatio = initial > 0 ? loss / initial : 0
  }

  let outOfMaskPixels = 0
  if (layoutMode === 'contour') {
    const activeLayers = layers.filter(layer => layer.map.some(v => v > 0.01))
    for (const step of plan.steps) {
      const layer = activeLayers[step.layerIndex]
      const mask = layer.regionMask ?? layer.map
      const from = plan.pegs[step.from - 1]
      const to = plan.pegs[step.to - 1]
      for (const pixel of bresenhamPixels(from.x, from.y, to.x, to.y, plan.mapSize)) {
        if (!(mask[pixel] > 0.15)) outOfMaskPixels++
      }
    }
  }

  const hb = new HashBuilder()
  hb.addInt(plan.pegCount)
  hb.addInt(plan.stepCount)
  hb.addFloat(plan.totalLengthMeters)
  hb.addInt(plan.pegs.length)
  for (const peg of plan.pegs) {
    hb.addInt(peg.number)
    hb.addInt(peg.x)
    hb.addInt(peg.y)
    hb.addInt(peg.layerIndex)
  }
  hb.addInt(plan.steps.length)
  for (const s of plan.steps) {
    hb.addInt(s.from)
    hb.addInt(s.to)
    hb.addInt(s.layerIndex)
    hb.addString(s.kind)
    hb.addBool(s.isColorChange)
    hb.addBool(s.isRestart)
  }
  hb.addInt(plan.layers.length)
  for (const layer of plan.layers) {
    hb.addInt(layer.index)
    hb.addString(layer.name)
    hb.addString(layer.color)
    hb.addInt(layer.startStep)
    hb.addInt(layer.endStep)
    hb.addInt(layer.stepCount)
    hb.addFloat(layer.lengthMeters)
  }
  hb.addInt(plan.contourLoops.length)
  for (const loop of plan.contourLoops) {
    hb.addIntArray(loop)
  }

  return {
    id,
    studio: 'wire-craft',
    tier,
    outputHash: hb.digest(),
    metrics: {
      stepCount: plan.stepCount,
      pegCount: plan.pegCount,
      layerCount: plan.layers.length,
      totalLengthMeters: plan.totalLengthMeters,
      weightedLossRatio: roundMetric(weightedLossRatio, 6),
      outOfMaskPixels,
    },
    extraTimingsMs: {
      wireCoverageRebuildMs: roundMetric(wireCoverageRebuildMs, 3),
    },
  }
}

function runCompassCase(
  id: string,
  tier: AnchorTier,
  exampleId: 'portrait' | 'rose',
  algorithm: 'concentric-arcs' | 'archimedean-spiral' | 'multi-center-intersect',
  ringCount: number,
  paperSizeCm: 16 | 20 | 25,
  colorMode: 'mono' | 'multi',
  paletteIndex: number,
): AnchorCaseResult {
  const palette = COMPASS_PALETTES[paletteIndex] ?? COMPASS_PALETTES[0]
  const field = createCompassExampleField(exampleId, DEFAULT_COMPASS_MAP_SIZE, palette, 'portrait')
  const plan = generateCompassPlan(field, algorithm, ringCount, paperSizeCm, colorMode, 'portrait')

  const mapSize = field.mapSize
  const raster = new Float32Array(mapSize * mapSize)
  const centerCoord = (mapSize - 1) / 2
  const radiusPx = mapSize / 2 - 4
  const centerById = new Map(plan.centers.map(c => [c.id, c]))

  for (const step of plan.steps) {
    const c = centerById.get(step.centerId) ?? plan.centers[0]
    for (const sample of step.samples) {
      const nx = c.nx + Math.sin(sample.angleRad) * sample.radiusNorm
      const ny = c.ny - Math.cos(sample.angleRad) * sample.radiusNorm
      if (nx * nx + ny * ny > 1) continue
      const u = centerCoord + nx * radiusPx
      const v = centerCoord + ny * radiusPx
      const x0 = Math.floor(u)
      const y0 = Math.floor(v)
      const tx = u - x0
      const ty = v - y0
      const deposit = sample.widthNorm * 0.55
      for (let dy = 0; dy <= 1; dy++) {
        const py = y0 + dy
        if (py < 0 || py >= mapSize) continue
        const wy = dy === 0 ? 1 - ty : ty
        for (let dx = 0; dx <= 1; dx++) {
          const px = x0 + dx
          if (px < 0 || px >= mapSize) continue
          const wx = dx === 0 ? 1 - tx : tx
          const idx = py * mapSize + px
          raster[idx] = Math.min(1, raster[idx] + deposit * wx * wy)
        }
      }
    }
  }

  let weightedSqErrSum = 0
  let weightSum = 0
  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      const dx = x - centerCoord
      const dy = y - centerCoord
      if (dx * dx + dy * dy > radiusPx * radiusPx) continue
      const idx = y * mapSize + x
      const target = field.darkness[idx]
      const w = 1 + 2 * target
      const diff = target - raster[idx]
      weightedSqErrSum += w * diff * diff
      weightSum += w
    }
  }

  const shortCount = plan.steps.filter(s => s.sweepDeg < 6).length
  const penChangeCount = plan.steps.filter(s => s.isPenChange).length
  const centerChangeCount = plan.steps.filter(s => s.isCenterChange).length

  const hb = new HashBuilder()
  hb.addInt(plan.ringCount)
  hb.addFloat(plan.totalLengthMeters)
  hb.addInt(plan.centers.length)
  for (const c of plan.centers) {
    hb.addString(c.id)
    hb.addFloat(c.nx)
    hb.addFloat(c.ny)
    hb.addFloat(c.xMm)
    hb.addFloat(c.yMm)
  }
  hb.addInt(plan.layers.length)
  for (const layer of plan.layers) {
    hb.addInt(layer.index)
    hb.addString(layer.name)
    hb.addString(layer.color)
    hb.addInt(layer.startStep)
    hb.addInt(layer.endStep)
    hb.addInt(layer.stepCount)
    hb.addFloat(layer.lengthMeters)
  }
  hb.addInt(plan.steps.length)
  for (const s of plan.steps) {
    hb.addString(s.centerId)
    hb.addInt(s.ringIndex)
    hb.addFloat(s.startDeg)
    hb.addFloat(s.endDeg)
    hb.addFloat(s.sweepDeg)
    hb.addInt(s.layerIndex)
    hb.addFloat(s.lengthCm)
    hb.addInt(s.samples.length)
    for (const pt of s.samples) {
      hb.addFloat(pt.angleRad)
      hb.addFloat(pt.radiusNorm)
      hb.addFloat(pt.widthNorm)
    }
  }

  return {
    id,
    studio: 'compass',
    tier,
    outputHash: hb.digest(),
    metrics: {
      stepCount: plan.steps.length,
      layerCount: plan.layers.length,
      totalLengthMeters: plan.totalLengthMeters,
      rasterizedWeightedMse: roundMetric(weightSum > 0 ? weightedSqErrSum / weightSum : 0, 6),
      shortArcRatio: roundMetric(plan.steps.length > 0 ? shortCount / plan.steps.length : 0, 6),
      penChangeCount,
      centerChangeCount,
    },
  }
}

function runCarvingCase(
  id: string,
  tier: AnchorTier,
  algorithm: 'positive-stencil' | 'woodcut-relief' | 'layered-shadowbox',
  gridSize: number,
): AnchorCaseResult {
  const field = createCarvingExampleField('portrait', gridSize, 'portrait', false)
  const plan = generateCarvingPlan(field, algorithm, 18, 1.8, 'portrait', false)

  const allLayers4Connected = plan.layers.every(l => is4ConnectedToFrame(l.retainedMask, plan.gridSize)) ? 1 : 0

  // Primary layer IoU against portrait cutThreshold (0.35) inside the non-margin interior
  const margin = Math.max(3, Math.round(gridSize * 0.045))
  let intersection = 0
  let union = 0
  if (plan.layers.length > 0) {
    const primary = plan.layers[0]
    const cutThreshold = algorithm === 'layered-shadowbox' ? Math.min(0.84, 0.35 + 0.32) : 0.35
    for (let y = margin; y < gridSize - margin; y++) {
      for (let x = margin; x < gridSize - margin; x++) {
        const idx = y * gridSize + x
        const retainedNoBridge = primary.retainedMask[idx] === 1 && primary.bridgeMask[idx] === 0
        const target = field.darkness[idx] >= cutThreshold
        if (retainedNoBridge && target) intersection++
        if (retainedNoBridge || target) union++
      }
    }
  }
  const targetMaskIoU = union > 0 ? intersection / union : 1

  let bridgeRatioSum = 0
  for (const layer of plan.layers) {
    let bridgePixels = 0
    for (let i = 0; i < layer.bridgeMask.length; i++) {
      if (layer.bridgeMask[i]) bridgePixels++
    }
    bridgeRatioSum += bridgePixels / (gridSize * gridSize)
  }
  const bridgeAreaRatio = plan.layers.length > 0 ? bridgeRatioSum / plan.layers.length : 0
  const tinyCutRatio = plan.steps.length > 0
    ? plan.steps.filter(s => s.areaMm2 < 4).length / plan.steps.length
    : 0

  const hb = new HashBuilder()
  hb.addInt(plan.gridSize)
  hb.addInt(plan.floatingIslandsBridged)
  hb.addFloat(plan.totalPerimeterMeters)
  hb.addInt(plan.layers.length)
  for (const layer of plan.layers) {
    hb.addInt(layer.index)
    hb.addString(layer.name)
    hb.addIntArray(layer.retainedMask)
    hb.addIntArray(layer.bridgeMask)
    hb.addInt(layer.floatingIslandsBridged)
    hb.addInt(layer.startStep)
    hb.addInt(layer.endStep)
    hb.addInt(layer.stepCount)
    hb.addFloat(layer.perimeterMeters)
  }
  hb.addInt(plan.bridges.length)
  for (const b of plan.bridges) {
    hb.addInt(b.id)
    hb.addInt(b.layerIndex)
    hb.addInt(b.fromX)
    hb.addInt(b.fromY)
    hb.addInt(b.toX)
    hb.addInt(b.toY)
    hb.addFloat(b.lengthMm)
    hb.addFloat(b.widthMm)
  }
  hb.addInt(plan.steps.length)
  for (const s of plan.steps) {
    hb.addInt(s.layerIndex)
    hb.addFloat(s.startXMm)
    hb.addFloat(s.startYMm)
    hb.addInt(s.areaPx)
    hb.addFloat(s.perimeterCm)
    hb.addBool(s.nearBridge)
    hb.addInt(s.loops.length)
    for (const loop of s.loops) {
      hb.addInt(loop.length)
      for (const pt of loop) {
        hb.addFloat(pt.nx)
        hb.addFloat(pt.ny)
      }
    }
  }

  return {
    id,
    studio: 'carving',
    tier,
    outputHash: hb.digest(),
    metrics: {
      stepCount: plan.steps.length,
      layerCount: plan.layers.length,
      floatingIslandsBridged: plan.floatingIslandsBridged,
      allLayers4Connected,
      targetMaskIoU: roundMetric(targetMaskIoU, 6),
      bridgeAreaRatio: roundMetric(bridgeAreaRatio, 6),
      tinyCutRatio: roundMetric(tinyCutRatio, 6),
    },
  }
}

export const CRAFT_ANCHOR_CASES: readonly AnchorCaseSpec[] = [
  {
    id: 'beads:portrait-32-16',
    studio: 'beads',
    tier: 'default',
    run: () => runBeadsCase('beads:portrait-32-16', 'default', 32, 16),
  },
  {
    id: 'beads:portrait-64-24',
    studio: 'beads',
    tier: 'stress',
    run: () => runBeadsCase('beads:portrait-64-24', 'stress', 64, 24),
  },
  {
    id: 'embroidery:camellia-long-short-36',
    studio: 'embroidery',
    tier: 'default',
    run: () => runEmbroideryCase('embroidery:camellia-long-short-36', 'default', 'camellia', 'long-short', 36, 12),
  },
  {
    id: 'embroidery:strawberry-punch-36',
    studio: 'embroidery',
    tier: 'default',
    run: () => runEmbroideryCase('embroidery:strawberry-punch-36', 'default', 'strawberry', 'punch-needle', 36, 10),
  },
  {
    id: 'embroidery:portrait-cross-46',
    studio: 'embroidery',
    tier: 'default',
    run: () => runEmbroideryCase('embroidery:portrait-cross-46', 'default', 'portrait', 'cross-stitch', 46, 12),
  },
  {
    id: 'embroidery:portrait-long-short-56',
    studio: 'embroidery',
    tier: 'stress',
    run: () => runEmbroideryCase('embroidery:portrait-long-short-56', 'stress', 'portrait', 'long-short', 56, 16),
  },
  {
    id: 'wire:portrait-ring-200-2000',
    studio: 'wire-craft',
    tier: 'default',
    run: () => runWireCase('wire:portrait-ring-200-2000', 'default', 'portrait', 'ring', 'mono', 200, 2000),
  },
  {
    id: 'wire:cat-contour-multi-120-800',
    studio: 'wire-craft',
    tier: 'default',
    run: () => runWireCase('wire:cat-contour-multi-120-800', 'default', 'cat', 'contour', 'multi', 120, 800),
  },
  {
    id: 'wire:portrait-ring-240-4000',
    studio: 'wire-craft',
    tier: 'stress',
    run: () => runWireCase('wire:portrait-ring-240-4000', 'stress', 'portrait', 'ring', 'mono', 240, 4000),
  },
  {
    id: 'compass:portrait-concentric-40',
    studio: 'compass',
    tier: 'default',
    run: () => runCompassCase('compass:portrait-concentric-40', 'default', 'portrait', 'concentric-arcs', 40, 20, 'mono', 0),
  },
  {
    id: 'compass:portrait-spiral-64',
    studio: 'compass',
    tier: 'stress',
    run: () => runCompassCase('compass:portrait-spiral-64', 'stress', 'portrait', 'archimedean-spiral', 64, 20, 'mono', 0),
  },
  {
    id: 'compass:rose-tri-multi-64',
    studio: 'compass',
    tier: 'stress',
    run: () => runCompassCase('compass:rose-tri-multi-64', 'stress', 'rose', 'multi-center-intersect', 64, 25, 'multi', 3),
  },
  {
    id: 'carving:portrait-stencil-128',
    studio: 'carving',
    tier: 'default',
    run: () => runCarvingCase('carving:portrait-stencil-128', 'default', 'positive-stencil', 128),
  },
  {
    id: 'carving:portrait-woodcut-160',
    studio: 'carving',
    tier: 'stress',
    run: () => runCarvingCase('carving:portrait-woodcut-160', 'stress', 'woodcut-relief', 160),
  },
  {
    id: 'carving:portrait-shadowbox-160',
    studio: 'carving',
    tier: 'stress',
    run: () => runCarvingCase('carving:portrait-shadowbox-160', 'stress', 'layered-shadowbox', 160),
  },
]
