import { csvCell, sanitizeFilename } from '../../lib/export'
import { getPortraitExampleRgba, PORTRAIT_EXAMPLE_SIZE } from '../../lib/portraitExample'

export const GRID_RESOLUTIONS = [96, 128, 160] as const
export const FRAME_SIZES_CM = [15, 18, 24] as const
export const BRIDGE_WIDTHS_MM = [1.2, 1.8, 2.4] as const
export const DEFAULT_CARVING_RESOLUTION: CarvingResolution = 128
export const CARVING_SAFETY_NOTICE =
  '使用笔刀或木刻刀时请务必在底部垫好专业切割垫板，运刀方向远离非持刀手，废旧刀片请放入密封刀片盒；儿童请在成人陪同下操作。'

export type CarvingResolution = typeof GRID_RESOLUTIONS[number]
export type FrameSizeCm = typeof FRAME_SIZES_CM[number]
export type BridgeWidthMm = typeof BRIDGE_WIDTHS_MM[number]
export type CarvingAlgorithm = 'positive-stencil' | 'woodcut-relief' | 'layered-shadowbox'
export type CarvingContrastMode = 'soft' | 'portrait' | 'dramatic'
export type CarvingExampleId = 'portrait' | 'cat' | 'rose' | 'deer' | 'lantern' | 'whale'

export const CARVING_ALGORITHM_INFO: Record<
  CarvingAlgorithm,
  { label: string; badge: string; summary: string; tip: string }
> = {
  'positive-stencil': {
    label: '阳刻连桥刻纸',
    badge: '自动防掉孤岛',
    summary: '提取五官与明暗主轮廓为保留纸基，自动检测悬空孤岛并生成最短连接桥，防止镂空后散架掉落。',
    tip: '严格遵循「先内后外、先小后大」顺序：先用笔刀尖刻出眼部与五官细孔，最后再裁切外围大块镂空。',
  },
  'woodcut-relief': {
    label: '阴刻版画木刻',
    badge: '木刻 / 橡皮章',
    summary: '模拟木刻版画与橡皮章排线刀触，亮部顺应结构转为可变宽排线刻槽，暗部保留完整受墨块面。',
    tip: '若用于橡皮章或木刻拓印，请勾选「印章镜像翻转」，用三角刀刻出细排线、圆刀清底。',
  },
  'layered-shadowbox': {
    label: '多层光影纸雕',
    badge: '4 层叠影纸雕灯',
    summary: '按明暗景深拆分为前景框、中景轮廓、远景柔影与背光细节 4 张独立套刻底稿，叠合后呈现立体光影。',
    tip: '用 200g 白卡纸分别刻出 L1–L4 四张底稿，层间用 3mm 泡棉胶条垫高并置于暖光灯带前即可成画。',
  },
}

export interface CarvingMaterialSpec {
  id: string
  name: string
  paper: string
  backing: string
  shadow: string
  isLightbox: boolean
  darkBacking: boolean
}

export const CARVING_MATERIALS: readonly CarvingMaterialSpec[] = [
  {
    id: 'vermilion-paper',
    name: '朱砂红宣 · 传统刻纸',
    paper: '#b6392e',
    backing: '#fbf6ec',
    shadow: 'rgba(84, 24, 18, 0.22)',
    isLightbox: false,
    darkBacking: false,
  },
  {
    id: 'indigo-card',
    name: '黛蓝卡纸 · 现代剪影',
    paper: '#233b56',
    backing: '#f7f8fa',
    shadow: 'rgba(18, 32, 48, 0.22)',
    isLightbox: false,
    darkBacking: false,
  },
  {
    id: 'ivory-shadowbox',
    name: '暖光白卡 · 纸雕灯箱',
    paper: '#fcf9f2',
    backing: '#ffd285',
    shadow: 'rgba(148, 92, 34, 0.24)',
    isLightbox: true,
    darkBacking: false,
  },
  {
    id: 'walnut-woodcut',
    name: '胡桃木板 · 版画拓印',
    paper: '#5b3922',
    backing: '#e6d3b3',
    shadow: 'rgba(42, 24, 12, 0.28)',
    isLightbox: false,
    darkBacking: false,
  },
  {
    id: 'matcha-stamp',
    name: '抹茶果冻 · 橡皮印章',
    paper: '#4d7c5b',
    backing: '#eff3ea',
    shadow: 'rgba(34, 62, 43, 0.20)',
    isLightbox: false,
    darkBacking: false,
  },
  {
    id: 'obsidian-gold',
    name: '曜石黑金 · 镂空金卡',
    paper: '#1d1e20',
    backing: '#e4be6c',
    shadow: 'rgba(0, 0, 0, 0.42)',
    isLightbox: false,
    darkBacking: true,
  },
]

export interface CarvingExampleMeta {
  id: CarvingExampleId
  label: string
  title: string
  sourceName: string
  recommendedAlgorithm: CarvingAlgorithm
  defaultMaterialId: string
}

export const CARVING_EXAMPLES: readonly CarvingExampleMeta[] = [
  {
    id: 'portrait',
    label: '光影人像',
    title: '阳刻连桥人像 · 雕刻底稿',
    sourceName: '光影人像刻纸 · 原创示例',
    recommendedAlgorithm: 'positive-stencil',
    defaultMaterialId: 'vermilion-paper',
  },
  {
    id: 'cat',
    label: '窗台猫咪',
    title: '窗台月影猫咪 · 雕刻底稿',
    sourceName: '窗台猫咪 · 原创示例',
    recommendedAlgorithm: 'positive-stencil',
    defaultMaterialId: 'indigo-card',
  },
  {
    id: 'rose',
    label: '镂空玫瑰',
    title: '版画玫瑰拓印 · 雕刻底稿',
    sourceName: '镂空玫瑰 · 原创示例',
    recommendedAlgorithm: 'woodcut-relief',
    defaultMaterialId: 'walnut-woodcut',
  },
  {
    id: 'deer',
    label: '林间鹿影',
    title: '林间鹿影灯箱 · 纸雕底稿',
    sourceName: '林间鹿影 · 原创示例',
    recommendedAlgorithm: 'layered-shadowbox',
    defaultMaterialId: 'ivory-shadowbox',
  },
  {
    id: 'lantern',
    label: '古风花灯',
    title: '花灯剪影刻纸 · 雕刻底稿',
    sourceName: '古风花灯 · 原创示例',
    recommendedAlgorithm: 'positive-stencil',
    defaultMaterialId: 'obsidian-gold',
  },
  {
    id: 'whale',
    label: '星海飞鲸',
    title: '星海鲸跃灯箱 · 纸雕底稿',
    sourceName: '星海飞鲸 · 原创示例',
    recommendedAlgorithm: 'layered-shadowbox',
    defaultMaterialId: 'ivory-shadowbox',
  },
]

export interface CarvingBridge {
  id: number
  layerIndex: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  fromXMm: number
  fromYMm: number
  toXMm: number
  toYMm: number
  lengthMm: number
  widthMm: number
}

export interface CarvingStep {
  step: number
  layerIndex: number
  layerName: string
  category: '细微五官孔' | '精细内镂空' | '主体轮廓区' | '外围大留白'
  toolHint: '笔刀尖精修' | '笔刀连续游走' | '三角刀排线' | '圆刀大面清底'
  centroidNx: number
  centroidNy: number
  startNx: number
  startNy: number
  startXMm: number
  startYMm: number
  areaPx: number
  areaMm2: number
  perimeterCm: number
  cumulativeMeters: number
  nearBridge: boolean
  loops: Array<Array<{ nx: number; ny: number }>>
}

export interface CarvingLayerOutput {
  index: number
  name: string
  tint: string
  retainedMask: Uint8Array
  bridgeMask: Uint8Array
  floatingIslandsBridged: number
  bridges: CarvingBridge[]
  startStep: number
  endStep: number
  stepCount: number
  perimeterMeters: number
}

export interface CarvingFieldInput {
  gridSize: number
  darkness: Float32Array
  edgeStrength: Float32Array
  xdogDetail?: Float32Array
  localTone?: Float32Array
  flowAngle?: Float32Array
}

export interface CarvingPlan {
  algorithm: CarvingAlgorithm
  contrastMode: CarvingContrastMode
  gridSize: number
  frameSizeCm: FrameSizeCm
  frameWidthMm: number
  bridgeWidthMm: BridgeWidthMm
  floatingIslandsBridged: number
  bridges: CarvingBridge[]
  layers: CarvingLayerOutput[]
  steps: CarvingStep[]
  totalPerimeterMeters: number
  mirrorPrint: boolean
}

export function safeCarvingFilename(title: string): string {
  return sanitizeFilename(title, 'TraceCraft-雕刻画')
}

export function padCutStep(step: number, total = 99): string {
  const digits = total >= 100 ? 3 : 2
  return String(step).padStart(digits, '0')
}

function pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (!lenSq) return Math.hypot(px - ax, py - ay)
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function contrastSettings(mode: CarvingContrastMode) {
  if (mode === 'dramatic') return { gamma: 1.32, highlightCut: 0.72, sharpen: 0.45, cutThreshold: 0.42 }
  if (mode === 'soft') return { gamma: 0.90, highlightCut: 0.90, sharpen: 0.24, cutThreshold: 0.28 }
  return { gamma: 1.08, highlightCut: 0.82, sharpen: 0.34, cutThreshold: 0.35 }
}

function gaussianBlur2D(src: Float32Array, size: number, sigma: number): Float32Array {
  const radius = Math.max(1, Math.ceil(sigma * 2.2))
  const kernel = new Float32Array(radius * 2 + 1)
  let weightSum = 0
  const twoSigmaSq = 2 * sigma * sigma
  for (let k = -radius; k <= radius; k++) {
    const w = Math.exp(-(k * k) / twoSigmaSq)
    kernel[k + radius] = w
    weightSum += w
  }
  for (let k = 0; k < kernel.length; k++) kernel[k] /= weightSum

  const horiz = new Float32Array(src.length)
  for (let y = 0; y < size; y++) {
    const rowOff = y * size
    for (let x = 0; x < size; x++) {
      let acc = 0
      for (let k = -radius; k <= radius; k++) {
        const sx = Math.max(0, Math.min(size - 1, x + k))
        acc += src[rowOff + sx] * kernel[k + radius]
      }
      horiz[rowOff + x] = acc
    }
  }

  const out = new Float32Array(src.length)
  for (let y = 0; y < size; y++) {
    const rowOff = y * size
    for (let x = 0; x < size; x++) {
      let acc = 0
      for (let k = -radius; k <= radius; k++) {
        const sy = Math.max(0, Math.min(size - 1, y + k))
        acc += horiz[sy * size + x] * kernel[k + radius]
      }
      out[rowOff + x] = acc
    }
  }
  return out
}

function computeEdgesAndDetail(toned: Float32Array, size: number, sharpen: number) {
  const len = toned.length
  const darkness = new Float32Array(len)
  const edgeStrength = new Float32Array(len)
  const xdogDetail = new Float32Array(len)
  const localTone = new Float32Array(len)
  const flowAngle = new Float32Array(len)

  let maxVal = 0
  for (let i = 0; i < len; i++) {
    if (toned[i] > maxVal) maxVal = toned[i]
  }
  if (maxVal <= 1e-4) {
    return { darkness, edgeStrength, xdogDetail, localTone, flowAngle }
  }

  const g1 = gaussianBlur2D(toned, size, 0.85)
  const g2 = gaussianBlur2D(toned, size, 2.05)
  const g3 = gaussianBlur2D(toned, size, 4.2)

  const jxx = new Float32Array(len)
  const jxy = new Float32Array(len)
  const jyy = new Float32Array(len)

  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const idx = y * size + x
      const gx =
        g1[(y - 1) * size + (x + 1)] +
        2 * g1[y * size + (x + 1)] +
        g1[(y + 1) * size + (x + 1)] -
        g1[(y - 1) * size + (x - 1)] -
        2 * g1[y * size + (x - 1)] -
        g1[(y + 1) * size + (x - 1)]
      const gy =
        g1[(y + 1) * size + (x - 1)] +
        2 * g1[(y + 1) * size + x] +
        g1[(y + 1) * size + (x + 1)] -
        g1[(y - 1) * size + (x - 1)] -
        2 * g1[(y - 1) * size + x] -
        g1[(y - 1) * size + (x + 1)]
      const rawGx =
        toned[(y - 1) * size + (x + 1)] +
        2 * toned[y * size + (x + 1)] +
        toned[(y + 1) * size + (x + 1)] -
        toned[(y - 1) * size + (x - 1)] -
        2 * toned[y * size + (x - 1)] -
        toned[(y + 1) * size + (x - 1)]
      const rawGy =
        toned[(y + 1) * size + (x - 1)] +
        2 * toned[(y + 1) * size + x] +
        toned[(y + 1) * size + (x + 1)] -
        toned[(y - 1) * size + (x - 1)] -
        2 * toned[(y - 1) * size + x] -
        toned[(y - 1) * size + (x + 1)]

      jxx[idx] = gx * gx
      jxy[idx] = gx * gy
      jyy[idx] = gy * gy

      edgeStrength[idx] = Math.min(1, Math.hypot(rawGx, rawGy) * 0.48)
      xdogDetail[idx] = g1[idx] - g2[idx]
      localTone[idx] = g3[idx]
      darkness[idx] = Math.min(1, Math.max(0, toned[idx] + sharpen * (toned[idx] - g2[idx])))
    }
  }

  const sxx = gaussianBlur2D(jxx, size, 1.8)
  const sxy = gaussianBlur2D(jxy, size, 1.8)
  const syy = gaussianBlur2D(jyy, size, 1.8)
  for (let i = 0; i < len; i++) {
    flowAngle[i] = 0.5 * Math.atan2(2 * sxy[i], sxx[i] - syy[i]) + Math.PI * 0.5
  }

  return { darkness, edgeStrength, xdogDetail, localTone, flowAngle }
}

export function rgbaToCarvingField(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  gridSize: number = DEFAULT_CARVING_RESOLUTION,
  invert = false,
  contrastMode: CarvingContrastMode = 'portrait',
  mirrorPrint = false,
): CarvingFieldInput {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('图片尺寸无效，无法生成雕刻画底稿。')
  }
  let opaqueCount = 0
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] >= 16) opaqueCount++
  }
  if (opaqueCount === 0) {
    throw new Error('这张图片全部透明，无法生成雕刻画底稿，请换一张主体清晰的图片。')
  }

  const len = gridSize * gridSize
  const lum = new Float32Array(len)
  const samples: number[] = []
  const side = Math.min(width, height)
  const startX = Math.floor((width - side) / 2)
  const startY = Math.floor((height - side) / 2)

  for (let y = 0; y < gridSize; y++) {
    const ny = y / (gridSize - 1)
    const sy = Math.min(height - 1, startY + Math.floor(ny * side))
    for (let x = 0; x < gridSize; x++) {
      const nx = mirrorPrint ? 1 - x / (gridSize - 1) : x / (gridSize - 1)
      const sx = Math.min(width - 1, startX + Math.floor(nx * side))
      const idx = (sy * width + sx) * 4
      const alpha = rgba[idx + 3] / 255
      const r = rgba[idx] * alpha + 255 * (1 - alpha)
      const g = rgba[idx + 1] * alpha + 255 * (1 - alpha)
      const b = rgba[idx + 2] * alpha + 255 * (1 - alpha)
      const val = 0.299 * r + 0.587 * g + 0.114 * b
      lum[y * gridSize + x] = val
      samples.push(val)
    }
  }

  samples.sort((a, b) => a - b)
  const lo = samples[Math.floor(samples.length * 0.02)] ?? 0
  const hi = samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.98))] ?? 255
  const span = Math.max(8, hi - lo)
  const stretch = Math.max(0, Math.min(1, (hi - lo - 24) / 72))
  const { gamma, highlightCut, sharpen } = contrastSettings(contrastMode)

  const toned = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    const stretched = Math.max(0, Math.min(1, (lum[i] - lo) / span))
    const norm = stretched * stretch + (lum[i] / 255) * (1 - stretch)
    const rawLight = invert ? 1 - norm : norm
    if (rawLight > highlightCut) {
      toned[i] = 0
    } else {
      const scaled = Math.max(0, Math.min(1, 1 - rawLight / highlightCut))
      toned[i] = scaled < 0.025 ? 0 : Math.pow(scaled, gamma)
    }
  }

  const { darkness, edgeStrength, xdogDetail, localTone, flowAngle } = computeEdgesAndDetail(toned, gridSize, sharpen)
  return { gridSize, darkness, edgeStrength, xdogDetail, localTone, flowAngle }
}

function sampleCarvingExamplePoint(kind: CarvingExampleId, nxRaw: number, nyRaw: number): number {
  const nx = nxRaw
  const ny = nyRaw

  // Corner floral scroll ornament anchored neatly inside frame corners
  const cornerDist = Math.hypot(Math.abs(nx) - 0.88, Math.abs(ny) - 0.88)

  if (kind === 'cat') {
    const sill = ny > 0.62 ? 0.9 : 0
    // Circular lattice moon-window border & hanging vine leaves
    const ringDist = Math.hypot(nx, ny - 0.02)
    const moonWindow = ringDist > 0.78 && ringDist < 0.88
    const latticeBars = ringDist >= 0.78 && (Math.abs(nx) < 0.022 || Math.abs(ny + 0.36) < 0.022)
    const vineLeaf1 = Math.hypot((nx + 0.56) * 1.3 + (ny + 0.46) * 0.6, (ny + 0.46) * 1.4 - (nx + 0.56) * 0.7) < 0.10
    const vineLeaf2 = Math.hypot((nx - 0.58) * 1.3 - (ny + 0.52) * 0.6, (ny + 0.52) * 1.4 + (nx - 0.58) * 0.7) < 0.09
    const moon = Math.hypot(nx + 0.38, ny + 0.34) < 0.165 && !(Math.hypot(nx + 0.30, ny + 0.38) < 0.13)
    const star = Math.max(Math.abs(nx - 0.42), Math.abs(ny + 0.36)) < 0.055 && (Math.abs(nx - 0.42) < 0.015 || Math.abs(ny + 0.36) < 0.015)

    // Cat anatomy
    const bodyDist = ((nx - 0.02) / 0.32) ** 2 + ((ny - 0.33) / 0.35) ** 2
    const body = bodyDist <= 1
    const head = (nx / 0.255) ** 2 + ((ny + 0.16) / 0.23) ** 2 <= 1
    const earL = nx < -0.04 && nx > -0.27 && ny < -0.20 && ny > -0.52 + Math.abs(nx + 0.16) * 2.4
    const earR = nx > 0.04 && nx < 0.27 && ny < -0.20 && ny > -0.52 + Math.abs(nx - 0.16) * 2.4
    const eyeL = Math.hypot((nx + 0.10) * 0.85, ny + 0.175) < 0.044
    const eyeR = Math.hypot((nx - 0.10) * 0.85, ny + 0.175) < 0.044
    const pupilL = Math.abs(nx + 0.10) < 0.015 && Math.abs(ny + 0.175) < 0.036
    const pupilR = Math.abs(nx - 0.10) < 0.015 && Math.abs(ny + 0.175) < 0.036
    const nose = Math.hypot(nx, (ny + 0.10) * 1.4) < 0.024
    const collar = Math.abs(ny - 0.06 - nx * nx * 0.6) < 0.024 && Math.abs(nx) < 0.18
    const bell = Math.hypot(nx, ny - 0.115) < 0.038
    const tail = Math.hypot(nx - 0.34, (ny - 0.45) * 1.35) < 0.19 && Math.hypot(nx - 0.30, (ny - 0.41) * 1.35) > 0.115

    // Folk paper-cut decorative floral crescent cutouts inside cat torso
    const folkLotus1 = Math.abs(Math.hypot(nx - 0.02, ny - 0.36) - 0.11) < 0.022 && ny < 0.41
    const folkLotus2 = Math.abs(Math.hypot(nx - 0.02, ny - 0.36) - 0.048) < 0.018
    const whiskers =
      (pointToSegmentDist(Math.abs(nx), ny, 0.11, -0.09, 0.29, -0.12) < 0.010 ||
        pointToSegmentDist(Math.abs(nx), ny, 0.11, -0.06, 0.30, -0.05) < 0.010) &&
      head

    // Small potted flower beside cat on windowsill
    const pot = Math.abs(nx + 0.48) < 0.085 - (ny - 0.45) * 0.15 && ny > 0.44 && ny < 0.62
    const stem = Math.abs(nx + 0.48) < 0.014 && ny > 0.24 && ny < 0.45
    const flowerHead = Math.hypot(nx + 0.48, ny - 0.21) < 0.07

    if (pupilL || pupilR) return 0.94
    if (nose) return 0.92
    if (eyeL || eyeR || whiskers || collar) return 0.12
    if (bell) return 0.90
    if (body && (folkLotus1 || folkLotus2)) return 0.14
    if (head || earL || earR || body || tail) return 0.84
    if (pot || stem || flowerHead) return 0.80
    if (sill || moonWindow || latticeBars) return 0.88
    if (vineLeaf1 || vineLeaf2 || moon || star) return 0.72
    return 0
  }

  if (kind === 'rose') {
    const cx = 0
    const cy = -0.07
    const r = Math.hypot(nx - cx, ny - cy)
    const ang = Math.atan2(ny - cy, nx - cx)

    // Medallion border frame
    const frameEllip = (nx / 0.84) ** 2 + (ny / 0.88) ** 2
    const frameRing = Math.abs(frameEllip - 1) < 0.045

    // 5 concentric whorls of cupped rose petals with tonal gradients for curved gouge cuts
    let roseTone = 0
    const whorlRadii = [0.11, 0.21, 0.32, 0.43, 0.54]
    const whorlPetals = [3, 5, 5, 7, 7]
    for (let w = 0; w < whorlRadii.length; w++) {
      const wr = whorlRadii[w]
      const count = whorlPetals[w]
      const phase = w * 0.75 + Math.sin(r * 6) * 0.35
      const scallop = Math.cos(ang * count + phase)
      const petalRim = wr + 0.055 * Math.pow(Math.max(0, scallop), 0.75)
      if (r <= petalRim && r >= wr - 0.115) {
        const localDepth = 1 - (petalRim - r) / 0.165
        const rimHighlight = petalRim - r < 0.022 ? 0.18 : 0.92 - localDepth * 0.55
        roseTone = Math.max(roseTone, rimHighlight)
      }
    }
    if (r < 0.075) roseTone = 0.94

    // S-curved thorny stem & veined serrated leaves
    const stemCurveX = Math.sin((ny - 0.32) * 3.2) * 0.055
    const stem = Math.abs(nx - stemCurveX) < 0.036 && ny > 0.22 && ny < 0.84
    const thorn = pointToSegmentDist(nx, ny, stemCurveX + 0.03, 0.56, stemCurveX + 0.09, 0.51) < 0.015

    const evalLeaf = (lx: number, ly: number, dir: number) => {
      const rx = (nx - lx) * 0.85 + dir * (ny - ly) * 0.48
      const ry = (ny - ly) * 1.45 - dir * (nx - lx) * 0.48
      const dist = rx * rx + ry * ry
      if (dist > 0.044) return 0
      const vein = Math.abs(ry) < 0.011 || Math.abs((rx * 18 - Math.abs(ry) * 24) % 1 - 0.5) < 0.12
      return vein ? 0.18 : 0.72 - dist * 6.5
    }
    const leafL = evalLeaf(-0.24, 0.52, -1)
    const leafR = evalLeaf(0.24, 0.44, 1)

    return Math.min(1, Math.max(frameRing ? 0.85 : 0, roseTone, stem || thorn ? 0.84 : 0, leafL, leafR))
  }

  if (kind === 'deer') {
    // 4-tier depth scene for backlit 4-layer Shadow Box
    const moon = Math.hypot(nx - 0.34, ny + 0.38) < 0.145 ? 0.24 : 0
    const moonHalo = Math.abs(Math.hypot(nx - 0.34, ny + 0.38) - 0.20) < 0.018 ? 0.22 : 0
    const star = Math.max(Math.abs(nx + 0.42), Math.abs(ny + 0.44)) < 0.04 && (Math.abs(nx + 0.42) < 0.01 || Math.abs(ny + 0.44) < 0.01) ? 0.24 : 0

    // Far peaks (L4/L3) & spruce forest mid-layer (L2/L3)
    const peakLine = -0.02 + Math.abs(((nx * 2.2) % 1) - 0.5) * 0.36 + Math.sin(nx * 5) * 0.06
    const farPeak = ny > peakLine ? 0.26 : 0
    const spruce1 = Math.abs(nx - 0.52) < Math.max(0, (ny + 0.42) * 0.28) && ny > -0.42 ? 0.54 : 0
    const spruce2 = Math.abs(nx + 0.48) < Math.max(0, (ny + 0.36) * 0.26) && ny > -0.36 ? 0.54 : 0
    const ridgeMid = ny > 0.25 + Math.cos(nx * 2.8 + 0.7) * 0.08 ? 0.58 : 0

    // Foreground cliff (L1) & birch/pine boughs framing top corners
    const ridgeFront = ny > 0.50 - Math.sin(nx * 3.1) * 0.08 ? 0.90 : 0
    const boughL = ny < -0.45 && nx < -0.15 && Math.sin(nx * 22 + ny * 18) > -0.15 && ((nx + 0.85) / 0.72) ** 2 + ((ny + 0.85) / 0.42) ** 2 <= 1
    const boughR = ny < -0.48 && nx > 0.22 && Math.sin(nx * 22 - ny * 18) > -0.15 && ((nx - 0.85) / 0.68) ** 2 + ((ny + 0.85) / 0.38) ** 2 <= 1
    const treeL = Math.abs(nx + 0.72) < 0.055 && ny > -0.85
    const treeR = Math.abs(nx - 0.74) < 0.05 && ny > -0.85

    // Proud stag with multi-point curved antlers & sculpted legs
    const deerBody = ((nx + 0.04) / 0.19) ** 2 + ((ny - 0.25) / 0.115) ** 2 <= 1
    const deerNeck = pointToSegmentDist(nx, ny, -0.16, 0.20, -0.23, -0.02) < 0.05
    const deerHead = Math.hypot((nx + 0.255) * 0.9, (ny + 0.06) * 1.35) < 0.072
    const leg1 = pointToSegmentDist(nx, ny, -0.14, 0.33, -0.16, 0.54) < 0.022
    const leg2 = pointToSegmentDist(nx, ny, 0.08, 0.33, 0.11, 0.53) < 0.022
    const antler =
      pointToSegmentDist(nx, ny, -0.24, -0.10, -0.35, -0.35) < 0.016 ||
      pointToSegmentDist(nx, ny, -0.29, -0.22, -0.21, -0.34) < 0.014 ||
      pointToSegmentDist(nx, ny, -0.22, -0.10, -0.12, -0.31) < 0.016 ||
      pointToSegmentDist(nx, ny, -0.17, -0.21, -0.08, -0.25) < 0.013

    if (deerBody || deerNeck || deerHead || leg1 || leg2 || antler || treeL || treeR || boughL || boughR) return 0.92
    return Math.max(ridgeFront, ridgeMid, spruce1, spruce2, farPeak, moon, moonHalo, star)
  }

  if (kind === 'lantern') {
    const bodyEllip = (nx / 0.48) ** 2 + ((ny + 0.02) / 0.38) ** 2
    const body = bodyEllip <= 1
    const topCap = Math.abs(nx) < 0.26 - Math.max(0, (-0.36 - ny) * 0.4) && ny < -0.34 && ny > -0.48
    const botCap = Math.abs(nx) < 0.24 && ny > 0.31 && ny < 0.42
    const rib = Math.abs((Math.abs(nx) / 0.13) - Math.round(Math.abs(nx) / 0.13)) < 0.16
    const centerRing = Math.abs(Math.hypot(nx, ny + 0.02) - 0.16) < 0.025
    const lotusPetal = Math.hypot(nx, ny + 0.02) < 0.14 && Math.cos(Math.atan2(ny + 0.02, nx) * 6) > 0.25
    const swirlCloud = cornerDist < 0.30 && Math.abs(cornerDist - 0.18) < 0.03
    const tasselCenter = pointToSegmentDist(nx, ny, 0, 0.42, 0, 0.80) < 0.024
    const tasselBead = Math.hypot(nx, ny - 0.48) < 0.052
    const tasselSide = pointToSegmentDist(Math.abs(nx), ny, 0.04, 0.49, 0.085, 0.77) < 0.016
    const ring = Math.hypot(nx, ny + 0.62) < 0.12 && Math.hypot(nx, ny + 0.62) > 0.065

    if (topCap || botCap || tasselCenter || tasselBead || tasselSide || ring || swirlCloud) return 0.9
    if (body) {
      if (Math.abs(bodyEllip - 0.94) < 0.08 || centerRing || lotusPetal || rib) return 0.88
      return 0.16
    }
    return 0
  }

  // whale
  const wave1 = ny > 0.46 + Math.sin(nx * 5.2) * 0.075 ? 0.90 : 0
  const wave2 = ny > 0.28 + Math.cos(nx * 4.5 + 1.1) * 0.085 ? 0.56 : 0
  const waveCurl = Math.hypot(nx + 0.54, ny - 0.36) < 0.14 && Math.hypot(nx + 0.51, ny - 0.38) > 0.075 ? 0.86 : 0
  const whaleArc = ((nx + 0.04) / 0.44) ** 2 + ((ny + 0.06) / 0.22) ** 2 <= 1 && ny < 0.06 - nx * 0.14
  const flipper = pointToSegmentDist(nx, ny, -0.05, 0.03, -0.18, 0.22) < 0.055
  const fluke =
    pointToSegmentDist(nx, ny, 0.36, -0.02, 0.58, -0.24) < 0.06 ||
    pointToSegmentDist(nx, ny, 0.36, -0.02, 0.60, 0.06) < 0.05
  const bellyGroove = whaleArc && ny > -0.02 && Math.abs(Math.sin((ny - nx * 0.15) * 42)) > 0.7
  const eye = Math.hypot(nx + 0.24, ny + 0.06) < 0.028
  const stars = Math.hypot(nx - 0.34, ny + 0.48) < 0.055 || Math.hypot(nx + 0.46, ny + 0.44) < 0.04
  const planet = Math.hypot(nx - 0.48, ny + 0.30) < 0.09 ? 0.28 : 0

  if (eye) return 0
  if (bellyGroove) return 0.16
  if (whaleArc || flipper || fluke || waveCurl) return 0.88
  if (stars || planet) return 0.34
  return Math.max(wave1, wave2)
}

export function createCarvingExampleField(
  kind: CarvingExampleId,
  gridSize: number = DEFAULT_CARVING_RESOLUTION,
  contrastMode: CarvingContrastMode = 'portrait',
  mirrorPrint = false,
): CarvingFieldInput {
  if (kind === 'portrait') {
    return rgbaToCarvingField(
      getPortraitExampleRgba(),
      PORTRAIT_EXAMPLE_SIZE,
      PORTRAIT_EXAMPLE_SIZE,
      gridSize,
      false,
      contrastMode,
      mirrorPrint,
    )
  }
  const len = gridSize * gridSize
  const toned = new Float32Array(len)
  const { gamma, cutThreshold } = contrastSettings(contrastMode)
  const center = (gridSize - 1) / 2
  const radius = gridSize / 2 - 4

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const sampleX = mirrorPrint ? gridSize - 1 - x : x
      const nx = (sampleX - center) / radius
      const ny = (y - center) / radius
      const raw = sampleCarvingExamplePoint(kind, nx, ny)
      toned[y * gridSize + x] = raw < cutThreshold * 0.25 ? 0 : Math.pow(Math.min(1, raw), gamma * 0.8)
    }
  }

  const { darkness, edgeStrength, xdogDetail, localTone, flowAngle } = computeEdgesAndDetail(toned, gridSize, 0.28)
  return { gridSize, darkness, edgeStrength, xdogDetail, localTone, flowAngle }
}

function removeSmallSpeckles(mask: Uint8Array, size: number, minPixels = 4) {
  const visited = new Uint8Array(mask.length)
  const queue = new Int32Array(mask.length)
  const comp = new Int32Array(mask.length)

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue
    let head = 0
    let tail = 0
    queue[tail++] = start
    visited[start] = 1

    while (head < tail) {
      const curr = queue[head++]
      comp[head - 1] = curr
      const cx = curr % size
      const cy = Math.floor(curr / size)
      if (cx > 0 && mask[curr - 1] && !visited[curr - 1]) { visited[curr - 1] = 1; queue[tail++] = curr - 1 }
      if (cx < size - 1 && mask[curr + 1] && !visited[curr + 1]) { visited[curr + 1] = 1; queue[tail++] = curr + 1 }
      if (cy > 0 && mask[curr - size] && !visited[curr - size]) { visited[curr - size] = 1; queue[tail++] = curr - size }
      if (cy < size - 1 && mask[curr + size] && !visited[curr + size]) { visited[curr + size] = 1; queue[tail++] = curr + size }
    }

    if (tail < minPixels) {
      for (let k = 0; k < tail; k++) mask[comp[k]] = 0
    }
  }
}

export function connectFloatingIslands(
  retainedInput: Uint8Array,
  gridSize: number,
  frameSizeCm: FrameSizeCm,
  bridgeWidthMm: BridgeWidthMm,
  layerIndex = 0,
): {
  retainedMask: Uint8Array
  bridgeMask: Uint8Array
  floatingIslandsBridged: number
  bridges: CarvingBridge[]
} {
  const len = gridSize * gridSize
  const retained = new Uint8Array(retainedInput)
  const bridgeMask = new Uint8Array(len)
  const margin = Math.max(3, Math.round(gridSize * 0.045))

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (x < margin || x >= gridSize - margin || y < margin || y >= gridSize - margin) {
        retained[y * gridSize + x] = 1
      }
    }
  }

  // Remove dust speckles so auto-bridges anchor meaningful structural islands.
  removeSmallSpeckles(retained, gridSize, 4)

  const compLabel = new Int32Array(len).fill(-1)
  const queue = new Int32Array(len)
  const components: number[][] = []
  const boundaryCells: number[][] = []

  for (let i = 0; i < len; i++) {
    if (!retained[i] || compLabel[i] >= 0) continue
    const label = components.length
    const cells: number[] = []
    const edges: number[] = []
    let head = 0
    let tail = 0
    queue[tail++] = i
    compLabel[i] = label

    while (head < tail) {
      const curr = queue[head++]
      cells.push(curr)
      const cx = curr % gridSize
      const cy = Math.floor(curr / gridSize)
      let isEdge = false
      const neighbors = [
        cx > 0 ? curr - 1 : -1,
        cx < gridSize - 1 ? curr + 1 : -1,
        cy > 0 ? curr - gridSize : -1,
        cy < gridSize - 1 ? curr + gridSize : -1,
      ]
      for (const n of neighbors) {
        if (n < 0 || !retained[n]) {
          isEdge = true
        } else if (compLabel[n] < 0) {
          compLabel[n] = label
          queue[tail++] = n
        }
      }
      if (isEdge) edges.push(curr)
    }
    components.push(cells)
    boundaryCells.push(edges)
  }

  const islandsCount = Math.max(0, components.length - 1)
  const bridges: CarvingBridge[] = []
  if (islandsCount === 0) {
    return {
      retainedMask: retained,
      bridgeMask,
      floatingIslandsBridged: 0,
      bridges,
    }
  }

  const mmPerCell = (frameSizeCm * 10) / gridSize
  const bridgeRadiusCells = Math.max(0.7, (bridgeWidthMm / mmPerCell) * 0.5)
  const merged = new Uint8Array(components.length)
  merged[0] = 1
  const mainlandEdges = [...boundaryCells[0]]

  const stampBridgeCell = (px: number, py: number) => {
    const rCeil = Math.ceil(bridgeRadiusCells)
    for (let dy = -rCeil; dy <= rCeil; dy++) {
      for (let dx = -rCeil; dx <= rCeil; dx++) {
        if (dx * dx + dy * dy > bridgeRadiusCells * bridgeRadiusCells) continue
        const xx = Math.max(0, Math.min(gridSize - 1, px + dx))
        const yy = Math.max(0, Math.min(gridSize - 1, py + dy))
        const index = yy * gridSize + xx
        if (!retained[index]) {
          retained[index] = 1
          bridgeMask[index] = 1
          mainlandEdges.push(index)
        }
      }
    }
  }

  for (let pass = 0; pass < islandsCount; pass++) {
    let bestIsland = -1
    let bestDistSq = Infinity
    let bestFromIdx = 0
    let bestToIdx = 0

    for (let ci = 1; ci < components.length; ci++) {
      if (merged[ci]) continue
      const islandEdges = boundaryCells[ci]
      const iStride = Math.max(1, Math.floor(islandEdges.length / 80))
      const mStride = Math.max(1, Math.floor(mainlandEdges.length / 260))

      for (let a = 0; a < islandEdges.length; a += iStride) {
        const idxA = islandEdges[a]
        const ax = idxA % gridSize
        const ay = Math.floor(idxA / gridSize)
        for (let b = 0; b < mainlandEdges.length; b += mStride) {
          const idxB = mainlandEdges[b]
          const bx = idxB % gridSize
          const by = Math.floor(idxB / gridSize)
          const dSq = (ax - bx) ** 2 + (ay - by) ** 2
          if (dSq < bestDistSq) {
            bestDistSq = dSq
            bestIsland = ci
            bestFromIdx = idxA
            bestToIdx = idxB
          }
        }
      }
    }

    if (bestIsland < 0) break

    // Refine exact minimum pair inside full boundary sets of the chosen island
    let ax = bestFromIdx % gridSize
    let ay = Math.floor(bestFromIdx / gridSize)
    let bx = bestToIdx % gridSize
    let by = Math.floor(bestToIdx / gridSize)
    const islandEdges = boundaryCells[bestIsland]
    for (const idxA of islandEdges) {
      const ix = idxA % gridSize
      const iy = Math.floor(idxA / gridSize)
      for (const idxB of mainlandEdges) {
        const mx = idxB % gridSize
        const my = Math.floor(idxB / gridSize)
        const dSq = (ix - mx) ** 2 + (iy - my) ** 2
        if (dSq < bestDistSq) {
          bestDistSq = dSq
          ax = ix
          ay = iy
          bx = mx
          by = my
        }
      }
    }

    // Bresenham walk + cardinal elbow guarantee 4-connectivity even if bridgeWidthMm is slim
    let cx = ax
    let cy = ay
    const dx = Math.abs(bx - ax)
    const dy = Math.abs(by - ay)
    const sx = ax < bx ? 1 : -1
    const sy = ay < by ? 1 : -1
    let err = dx - dy
    stampBridgeCell(cx, cy)
    while (cx !== bx || cy !== by) {
      const e2 = 2 * err
      if (e2 > -dy) {
        err -= dy
        cx += sx
        stampBridgeCell(cx, cy)
      }
      if (e2 < dx) {
        err += dx
        cy += sy
        stampBridgeCell(cx, cy)
      }
    }

    merged[bestIsland] = 1
    for (const edgeIdx of boundaryCells[bestIsland]) mainlandEdges.push(edgeIdx)

    const toNorm = (v: number) => (v / (gridSize - 1)) * 2 - 1
    const halfMm = (frameSizeCm * 10) / 2
    const fNx = toNorm(ax)
    const fNy = toNorm(ay)
    const tNx = toNorm(bx)
    const tNy = toNorm(by)

    bridges.push({
      id: bridges.length + 1,
      layerIndex,
      fromX: ax,
      fromY: ay,
      toX: bx,
      toY: by,
      fromXMm: Number((fNx * halfMm).toFixed(1)),
      fromYMm: Number((fNy * halfMm).toFixed(1)),
      toXMm: Number((tNx * halfMm).toFixed(1)),
      toYMm: Number((tNy * halfMm).toFixed(1)),
      lengthMm: Number((Math.hypot(bx - ax, by - ay) * mmPerCell).toFixed(1)),
      widthMm: bridgeWidthMm,
    })
  }

  return {
    retainedMask: retained,
    bridgeMask,
    floatingIslandsBridged: islandsCount,
    bridges,
  }
}

function fairContourLoop(
  rawPts: Array<{ x: number; y: number }>,
  gridSize: number,
): Array<{ nx: number; ny: number }> {
  const nRaw = rawPts.length
  if (nRaw < 4) return []

  // Stage 1: Dual edge-midpoint conversion eliminates diagonal staircase teeth immediately
  let pts = rawPts.map((pt, i) => {
    const next = rawPts[(i + 1) % nRaw]
    return { x: (pt.x + next.x) * 0.5, y: (pt.y + next.y) * 0.5 }
  })

  // Detect sustained structural corners (e.g., frame corners, ear tips) before fairing
  const n = pts.length
  const cornerMask = new Uint8Array(n)
  if (n >= 8) {
    for (let i = 0; i < n; i++) {
      const pPrev = pts[(i - 2 + n) % n]
      const pCurr = pts[i]
      const pNext = pts[(i + 2) % n]
      const v1x = pCurr.x - pPrev.x
      const v1y = pCurr.y - pPrev.y
      const v2x = pNext.x - pCurr.x
      const v2y = pNext.y - pCurr.y
      const len1 = Math.hypot(v1x, v1y)
      const len2 = Math.hypot(v2x, v2y)
      if (len1 >= 1.6 && len2 >= 1.6) {
        const cosTheta = (v1x * v2x + v1y * v2y) / (len1 * len2)
        if (cosTheta < 0.31) cornerMask[i] = 1
      }
    }
  }

  // Stage 2: Volume-preserving Taubin (lambda/mu) fairing removes raster ripples without shrinking holes
  const taubinPass = (arr: Array<{ x: number; y: number }>, factor: number) =>
    arr.map((pt, i) => {
      const prev = arr[(i - 1 + n) % n]
      const next = arr[(i + 1) % n]
      const w = cornerMask[i] ? 0.14 : 1.0
      const lx = 0.5 * (prev.x + next.x) - pt.x
      const ly = 0.5 * (prev.y + next.y) - pt.y
      return {
        x: Math.max(0, Math.min(gridSize, pt.x + factor * w * lx)),
        y: Math.max(0, Math.min(gridSize, pt.y + factor * w * ly)),
      }
    })

  for (let iter = 0; iter < 6; iter++) {
    pts = taubinPass(pts, 0.5)
    pts = taubinPass(pts, -0.52)
  }

  // Stage 3: Curvature-adaptive decimation keeping corners & curve inflections clean
  const kept: Array<{ x: number; y: number }> = []
  for (let i = 0; i < n; i++) {
    const pt = pts[i]
    if (cornerMask[i] || kept.length === 0) {
      kept.push(pt)
      continue
    }
    const prev = kept[kept.length - 1]
    const next = pts[(i + 1) % n]
    const segLen = Math.hypot(next.x - prev.x, next.y - prev.y)
    if (segLen >= 5.5) {
      kept.push(pt)
      continue
    }
    const perpDist = pointToSegmentDist(pt.x, pt.y, prev.x, prev.y, next.x, next.y)
    if (perpDist >= 0.065) {
      kept.push(pt)
    }
  }

  const finalPts = kept.length >= 4 ? kept : pts
  return finalPts.map(pt => ({
    nx: Number(((pt.x / gridSize) * 2 - 1).toFixed(4)),
    ny: Number(((pt.y / gridSize) * 2 - 1).toFixed(4)),
  }))
}

function loopToSvgSplinePath(
  loop: Array<{ nx: number; ny: number }>,
  cx: number,
  cy: number,
  halfMm: number,
): string {
  const n = loop.length
  if (n < 3) return ''
  const midX = (i: number) => cx + ((loop[i % n].nx + loop[(i + 1) % n].nx) * 0.5) * halfMm
  const midY = (i: number) => cy + ((loop[i % n].ny + loop[(i + 1) % n].ny) * 0.5) * halfMm
  const startX = midX(n - 1).toFixed(2)
  const startY = midY(n - 1).toFixed(2)
  const segs: string[] = [`M ${startX} ${startY}`]
  for (let i = 0; i < n; i++) {
    const px = (cx + loop[i].nx * halfMm).toFixed(2)
    const py = (cy + loop[i].ny * halfMm).toFixed(2)
    const mx = midX(i).toFixed(2)
    const my = midY(i).toFixed(2)
    segs.push(`Q ${px} ${py} ${mx} ${my}`)
  }
  segs.push('Z')
  return segs.join(' ')
}

interface GridEdge {
  sx: number
  sy: number
  ex: number
  ey: number
  dx: number
  dy: number
  used?: boolean
}

function extractHollowCutRegions(
  retainedMask: Uint8Array,
  bridgeMask: Uint8Array,
  gridSize: number,
  frameSizeCm: FrameSizeCm,
  layerIndex: number,
  layerName: string,
  algorithm: CarvingAlgorithm,
) {
  const len = gridSize * gridSize
  const visited = new Uint8Array(len)
  const queue = new Int32Array(len)
  const mmPerCell = (frameSizeCm * 10) / gridSize
  const cellAreaMm2 = mmPerCell * mmPerCell
  const halfMm = (frameSizeCm * 10) / 2

  const regions: Omit<CarvingStep, 'step' | 'cumulativeMeters'>[] = []

  for (let start = 0; start < len; start++) {
    if (retainedMask[start] || visited[start]) continue
    let head = 0
    let tail = 0
    const compCells: number[] = []
    queue[tail++] = start
    visited[start] = 1

    while (head < tail) {
      const curr = queue[head++]
      compCells.push(curr)
      const cx = curr % gridSize
      const cy = Math.floor(curr / gridSize)
      if (cx > 0 && !retainedMask[curr - 1] && !visited[curr - 1]) { visited[curr - 1] = 1; queue[tail++] = curr - 1 }
      if (cx < gridSize - 1 && !retainedMask[curr + 1] && !visited[curr + 1]) { visited[curr + 1] = 1; queue[tail++] = curr + 1 }
      if (cy > 0 && !retainedMask[curr - gridSize] && !visited[curr - gridSize]) { visited[curr - gridSize] = 1; queue[tail++] = curr - gridSize }
      if (cy < gridSize - 1 && !retainedMask[curr + gridSize] && !visited[curr + gridSize]) { visited[curr + gridSize] = 1; queue[tail++] = curr + gridSize }
    }

    if (compCells.length < 4) continue

    const regionMap = new Uint8Array(len)
    let sumX = 0
    let sumY = 0
    let nearBridge = false
    for (const c of compCells) {
      regionMap[c] = 1
      const px = c % gridSize
      const py = Math.floor(c / gridSize)
      sumX += px
      sumY += py
      if (!nearBridge) {
        if (
          (px > 0 && bridgeMask[c - 1]) ||
          (px < gridSize - 1 && bridgeMask[c + 1]) ||
          (py > 0 && bridgeMask[c - gridSize]) ||
          (py < gridSize - 1 && bridgeMask[c + gridSize])
        ) {
          nearBridge = true
        }
      }
    }

    // Extract boundary edge loops (including internal island holes if any)
    const edgesByStart = new Map<string, GridEdge[]>()
    const addEdge = (sx: number, sy: number, ex: number, ey: number) => {
      const key = `${sx},${sy}`
      const edge: GridEdge = { sx, sy, ex, ey, dx: ex - sx, dy: ey - sy }
      const existing = edgesByStart.get(key)
      if (existing) existing.push(edge)
      else edgesByStart.set(key, [edge])
    }

    const isHollow = (x: number, y: number) =>
      x >= 0 && x < gridSize && y >= 0 && y < gridSize && regionMap[y * gridSize + x] === 1

    for (const c of compCells) {
      const x = c % gridSize
      const y = Math.floor(c / gridSize)
      if (!isHollow(x, y - 1)) addEdge(x, y, x + 1, y)
      if (!isHollow(x + 1, y)) addEdge(x + 1, y, x + 1, y + 1)
      if (!isHollow(x, y + 1)) addEdge(x + 1, y + 1, x, y + 1)
      if (!isHollow(x - 1, y)) addEdge(x, y + 1, x, y)
    }

    const loops: Array<Array<{ nx: number; ny: number }>> = []
    let perimeterCells = 0

    for (const list of edgesByStart.values()) {
      for (const startEdge of list) {
        if (startEdge.used) continue
        const pts: Array<{ x: number; y: number }> = []
        let curr: GridEdge | undefined = startEdge
        while (curr && !curr.used) {
          curr.used = true
          pts.push({ x: curr.sx, y: curr.sy })
          const candidates: GridEdge[] = (edgesByStart.get(`${curr.ex},${curr.ey}`) ?? []).filter(e => !e.used)
          if (!candidates.length) break
          if (candidates.length === 1) {
            curr = candidates[0]
          } else {
            const pdx = curr.dx
            const pdy = curr.dy
            curr = candidates.sort((a, b) => {
              const turnA = Math.atan2(pdx * a.dy - pdy * a.dx, pdx * a.dx + pdy * a.dy)
              const turnB = Math.atan2(pdx * b.dy - pdy * b.dx, pdx * b.dx + pdy * b.dy)
              return turnB - turnA
            })[0]
          }
        }
        if (pts.length >= 4) {
          perimeterCells += pts.length
          const faired = fairContourLoop(pts, gridSize)
          if (faired.length >= 4) loops.push(faired)
        }
      }
    }

    if (!loops.length) continue

    const centroidNx = Number((((sumX / compCells.length) / (gridSize - 1)) * 2 - 1).toFixed(3))
    const centroidNy = Number((((sumY / compCells.length) / (gridSize - 1)) * 2 - 1).toFixed(3))
    const startPt = loops[0][0]
    const areaMm2 = Number((compCells.length * cellAreaMm2).toFixed(1))
    const perimeterCm = Number(((perimeterCells * mmPerCell) / 10).toFixed(2))
    const radialDist = Math.hypot(centroidNx, centroidNy)

    const category: CarvingStep['category'] =
      areaMm2 <= 32 && radialDist < 0.55
        ? '细微五官孔'
        : areaMm2 <= 180
          ? '精细内镂空'
          : areaMm2 <= 950
            ? '主体轮廓区'
            : '外围大留白'

    const toolHint: CarvingStep['toolHint'] =
      algorithm === 'woodcut-relief'
        ? areaMm2 <= 140
          ? '三角刀排线'
          : '圆刀大面清底'
        : areaMm2 <= 90
          ? '笔刀尖精修'
          : '笔刀连续游走'

    regions.push({
      layerIndex,
      layerName,
      category,
      toolHint,
      centroidNx,
      centroidNy,
      startNx: startPt.nx,
      startNy: startPt.ny,
      startXMm: Number(((startPt.nx + 1) * halfMm).toFixed(1)),
      startYMm: Number(((1 - startPt.ny) * halfMm).toFixed(1)),
      areaPx: compCells.length,
      areaMm2,
      perimeterCm,
      nearBridge,
      loops,
    })
  }

  // Enforce physical inner-first, small-to-large carving order
  regions.sort((a, b) => {
    const scoreA = Math.hypot(a.centroidNx, a.centroidNy) * 0.58 + Math.log1p(a.areaMm2) * 0.42
    const scoreB = Math.hypot(b.centroidNx, b.centroidNy) * 0.58 + Math.log1p(b.areaMm2) * 0.42
    return scoreA - scoreB
  })

  return regions
}

export function generateCarvingPlan(
  field: CarvingFieldInput,
  algorithm: CarvingAlgorithm = 'positive-stencil',
  frameSizeCm: FrameSizeCm = 18,
  bridgeWidthMm: BridgeWidthMm = 1.8,
  contrastMode: CarvingContrastMode = 'portrait',
  mirrorPrint = false,
): CarvingPlan {
  const gridSize = field.gridSize
  const len = gridSize * gridSize
  const frameWidthMm = Number((frameSizeCm * 10).toFixed(1))

  let maxVal = 0
  for (let i = 0; i < len; i++) {
    if (field.darkness[i] > maxVal) maxVal = field.darkness[i]
  }

  if (maxVal <= 0.025) {
    return {
      algorithm,
      contrastMode,
      gridSize,
      frameSizeCm,
      frameWidthMm,
      bridgeWidthMm,
      floatingIslandsBridged: 0,
      bridges: [],
      layers: [],
      steps: [],
      totalPerimeterMeters: 0,
      mirrorPrint,
    }
  }

  const { cutThreshold } = contrastSettings(contrastMode)
  const margin = Math.max(3, Math.round(gridSize * 0.045))

  type RawLayerSpec = { name: string; tint: string; binary: Uint8Array }
  const specs: RawLayerSpec[] = []

  if (algorithm === 'positive-stencil') {
    const rawBin = new Uint8Array(len)
    for (let y = margin; y < gridSize - margin; y++) {
      for (let x = margin; x < gridSize - margin; x++) {
        const i = y * gridSize + x
        const fused = field.darkness[i] + field.edgeStrength[i] * 0.34
        const xdog = field.xdogDetail ? field.xdogDetail[i] : 0
        const hasLineRidge = xdog >= 0.048 && (field.darkness[i] >= cutThreshold * 0.36 || field.edgeStrength[i] >= 0.16)
        rawBin[i] = fused >= cutThreshold || hasLineRidge ? 1 : 0
      }
    }

    // Carve interior negative highlight relief grooves inside broad dark regions while preserving outer rim
    const bin = new Uint8Array(rawBin)
    if (field.xdogDetail && field.localTone) {
      for (let y = margin + 2; y < gridSize - margin - 2; y++) {
        for (let x = margin + 2; x < gridSize - margin - 2; x++) {
          const i = y * gridSize + x
          if (!rawBin[i] || field.localTone[i] < 0.44) continue
          if (field.xdogDetail[i] <= -0.042 && field.darkness[i] < 0.88) {
            let rimSafe = true
            for (let dy = -2; dy <= 2 && rimSafe; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                if (!rawBin[(y + dy) * gridSize + (x + dx)]) {
                  rimSafe = false
                  break
                }
              }
            }
            if (rimSafe) bin[i] = 0
          }
        }
      }
    }
    specs.push({ name: 'L1 · 阳刻主纸层', tint: '#1b2024', binary: bin })
  } else if (algorithm === 'woodcut-relief') {
    const bin = new Uint8Array(len)
    const freqScale = 128 / gridSize
    for (let y = margin; y < gridSize - margin; y++) {
      for (let x = margin; x < gridSize - margin; x++) {
        const i = y * gridSize + x
        const d = field.darkness[i]
        const edge = field.edgeStrength[i]
        const xdog = field.xdogDetail ? field.xdogDetail[i] : 0
        const gBase = field.localTone ? field.localTone[i] : d
        const theta = field.flowAngle ? field.flowAngle[i] : 0

        if (d >= 0.80 || edge >= 0.52 || (xdog >= 0.036 && d >= 0.16)) {
          bin[i] = 1
        } else if (xdog <= -0.045 && d < 0.78) {
          bin[i] = 0
        } else if (d >= 0.12) {
          // Ostromoukhov-inspired coherent curved woodcut gouge channels with grid-invariant pitch
          const u = x * freqScale
          const v = y * freqScale
          const contourWarp = gBase * 14.0
          const flowWarp = Math.sin(2 * theta) * 1.1
          const baseCarrier = u * 0.44 + v * 0.34 + Math.sin(v * 0.055) * 1.8
          const phase = baseCarrier + contourWarp * 0.42 + flowWarp
          const wave = 0.5 + 0.5 * Math.sin(phase)
          const fillRatio = (d - 0.12) / 0.68
          bin[i] = wave <= fillRatio * 0.92 ? 1 : 0
        } else {
          bin[i] = 0
        }
      }
    }
    specs.push({ name: 'L1 · 阴刻版画层', tint: '#3b2416', binary: bin })
  } else {
    // 4 depth-ordered Shadow Box cardstock layers (frontmost darkest -> backmost sunlit detail)
    const thresholds = [
      { thr: Math.min(0.84, cutThreshold + 0.32), name: 'L1 · 前景主框层', tint: '#f7f3eb', ridgeBoost: 0.068 },
      { thr: Math.min(0.68, cutThreshold + 0.14), name: 'L2 · 中景轮廓层', tint: '#fdfaf3', ridgeBoost: 0.052 },
      { thr: Math.max(0.16, cutThreshold - 0.10), name: 'L3 · 远景柔影层', tint: '#fffcf7', ridgeBoost: 0.045 },
      { thr: 0.07, name: 'L4 · 背光细节层', tint: '#fffdf9', ridgeBoost: 0.04 },
    ]
    thresholds.forEach(cfg => {
      const bin = new Uint8Array(len)
      for (let y = margin; y < gridSize - margin; y++) {
        for (let x = margin; x < gridSize - margin; x++) {
          const i = y * gridSize + x
          const fused = field.darkness[i] + field.edgeStrength[i] * 0.25
          const xdog = field.xdogDetail ? field.xdogDetail[i] : 0
          const hasDetailRidge = xdog >= cfg.ridgeBoost && field.darkness[i] >= cfg.thr * 0.58
          bin[i] = fused >= cfg.thr || hasDetailRidge ? 1 : 0
        }
      }
      specs.push({ name: cfg.name, tint: cfg.tint, binary: bin })
    })
  }

  const allBridges: CarvingBridge[] = []
  const allSteps: CarvingStep[] = []
  const layerOutputs: CarvingLayerOutput[] = []
  let totalFloatingBridged = 0
  let cumulativeCm = 0

  specs.forEach((spec, layerIdx) => {
    const bridged = connectFloatingIslands(spec.binary, gridSize, frameSizeCm, bridgeWidthMm, layerIdx)
    totalFloatingBridged += bridged.floatingIslandsBridged
    for (const b of bridged.bridges) {
      allBridges.push({ ...b, id: allBridges.length + 1 })
    }

    const regions = extractHollowCutRegions(
      bridged.retainedMask,
      bridged.bridgeMask,
      gridSize,
      frameSizeCm,
      layerIdx,
      spec.name,
      algorithm,
    )

    const startStep = regions.length ? allSteps.length + 1 : 0
    const startCumCm = cumulativeCm

    for (const region of regions) {
      cumulativeCm += region.perimeterCm
      allSteps.push({
        ...region,
        step: allSteps.length + 1,
        cumulativeMeters: Number((cumulativeCm / 100).toFixed(2)),
      })
    }

    const endStep = regions.length ? allSteps.length : 0
    layerOutputs.push({
      index: layerIdx,
      name: spec.name,
      tint: spec.tint,
      retainedMask: bridged.retainedMask,
      bridgeMask: bridged.bridgeMask,
      floatingIslandsBridged: bridged.floatingIslandsBridged,
      bridges: bridged.bridges,
      startStep,
      endStep,
      stepCount: regions.length,
      perimeterMeters: Number(((cumulativeCm - startCumCm) / 100).toFixed(2)),
    })
  })

  return {
    algorithm,
    contrastMode,
    gridSize,
    frameSizeCm,
    frameWidthMm,
    bridgeWidthMm,
    floatingIslandsBridged: totalFloatingBridged,
    bridges: allBridges,
    layers: layerOutputs,
    steps: allSteps,
    totalPerimeterMeters: Number((cumulativeCm / 100).toFixed(2)),
    mirrorPrint,
  }
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function buildCarvingTemplateSvg(
  plan: CarvingPlan,
  title: string,
  material: CarvingMaterialSpec,
): string {
  const sideMm = plan.frameWidthMm
  const widthMm = sideMm + 36
  const heightMm = sideMm + 52
  const ox = 18
  const oy = 22
  const cx = ox + sideMm / 2
  const cy = oy + sideMm / 2
  const halfMm = sideMm / 2
  const safeTitle = escapeXml(title.trim() || '雕刻画底稿')
  const algInfo = CARVING_ALGORITHM_INFO[plan.algorithm]

  const cutPathsSvg = plan.steps
    .map(step => {
      const d = step.loops
        .map(loop => loopToSvgSplinePath(loop, cx, cy, halfMm))
        .filter(Boolean)
        .join(' ')
      const sx = Number((cx + step.startNx * halfMm).toFixed(2))
      const sy = Number((cy + step.startNy * halfMm).toFixed(2))
      const showBadge = step.step <= 28 || step.areaMm2 >= 80
      return `<g>
        <path d="${d}" fill="#f1efe8" fill-rule="evenodd" stroke="#222720" stroke-width="0.32" />
        ${showBadge ? `<circle cx="${sx}" cy="${sy}" r="1.25" fill="#b04434" /><text x="${sx}" y="${(sy - 2.1).toFixed(2)}" font-size="2.3" font-weight="700" fill="#b04434" text-anchor="middle">#${padCutStep(step.step, plan.steps.length)}</text>` : ''}
      </g>`
    })
    .join('\n  ')

  const bridgesSvg = plan.bridges
    .map(b => {
      const x1 = (cx + b.fromXMm).toFixed(2)
      const y1 = (cy + b.fromYMm).toFixed(2)
      const x2 = (cx + b.toXMm).toFixed(2)
      const y2 = (cy + b.toYMm).toFixed(2)
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2f7a62" stroke-width="${Math.max(0.5, b.widthMm * 0.45).toFixed(2)}" stroke-dasharray="1.6 1" stroke-linecap="round" />`
    })
    .join('\n  ')

  const scaleY = heightMm - 15
  const footerY = heightMm - 6
  const mirrorNote = plan.mirrorPrint ? ' · 已镜像翻转(印章拓印)' : ''
  const midMm = Math.round(sideMm / 2)
  const axisSvg = `<g fill="#7d8373" font-size="2.2">
    <text x="${ox - 1.8}" y="${oy + sideMm + 3.8}" text-anchor="end">0</text>
    <text x="${ox + midMm}" y="${oy + sideMm + 4.2}" text-anchor="middle">${midMm}</text>
    <text x="${ox + sideMm}" y="${oy + sideMm + 4.2}" text-anchor="end">${sideMm}</text>
    <text x="${ox - 2}" y="${oy + midMm + 0.8}" text-anchor="end">${midMm}</text>
    <text x="${ox - 2}" y="${oy + 2.2}" text-anchor="end">${sideMm}</text>
  </g>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${widthMm} ${heightMm}" fill="none">
  <title>${safeTitle} · 1:1 雕刻画底稿</title>
  <desc>TraceCraft 雕刻画工坊 1:1 实际尺寸刻纸/版画/纸雕底稿（${algInfo.label}），含防掉连接桥与先内后外下刀编号。</desc>
  <rect width="${widthMm}" height="${heightMm}" fill="#ffffff" />
  <text x="18" y="10.5" font-size="4.4" font-weight="600" fill="#343a2e">${safeTitle} · 1:1 雕刻画底稿</text>
  <text x="${widthMm - 18}" y="10.5" font-size="3.1" fill="#707766" text-anchor="end">${plan.frameSizeCm}×${plan.frameSizeCm} cm · ${escapeXml(algInfo.label)} · ${plan.steps.length} 刀 · 连桥 ${plan.floatingIslandsBridged} 处${mirrorNote} · ${escapeXml(material.name)}</text>
  <rect x="${ox}" y="${oy}" width="${sideMm}" height="${sideMm}" stroke="#2e3529" stroke-width="0.55" fill="#ffffff" />
  ${axisSvg}
  ${cutPathsSvg}
  ${bridgesSvg}
  <g>
    <path d="M18 ${scaleY - 1.5}V${scaleY + 1.5}M18 ${scaleY}H68M68 ${scaleY - 1.5}V${scaleY + 1.5}" stroke="#35392f" stroke-width="0.45" />
    <text x="73" y="${scaleY + 1}" font-size="2.9" font-weight="600" fill="#35392f">50 mm 比例尺 · 灰区=镂空挖除 · 红号=★起刀点 · 绿虚线=防掉连接桥</text>
  </g>
  <text x="18" y="${footerY}" font-size="2.6" fill="#8d533d">安全提示：${CARVING_SAFETY_NOTICE}</text>
</svg>`
}

export function carvingStepsCsv(plan: CarvingPlan, title: string, materialName: string): string {
  const safeTitle = title.trim() || '雕刻画作品'
  const algLabel = CARVING_ALGORITHM_INFO[plan.algorithm].label
  const rows: (string | number)[][] = [
    ['作品名称', safeTitle],
    ['雕刻类型', algLabel],
    ['画幅尺寸 (cm)', `${plan.frameSizeCm} × ${plan.frameSizeCm}`],
    ['自动加固悬空孤岛数', plan.floatingIslandsBridged],
    ['连接桥宽度(mm)', plan.bridgeWidthMm],
    ['印章镜像模式', plan.mirrorPrint ? '已镜像翻转' : '正向原图'],
    ['总镂空下刀数', plan.steps.length],
    ['预计总刻线长 (m)', plan.totalPerimeterMeters],
    ['参考纸材', materialName],
    [],
    ['图层', '起止步数', '刀数', '防掉连桥数', '刻线长 (m)'],
    ...plan.layers.map(l => [
      l.name,
      l.stepCount > 0 ? `第 ${l.startStep}–${l.endStep} 步` : '0',
      l.stepCount,
      l.floatingIslandsBridged,
      l.perimeterMeters,
    ]),
    [],
    ['下刀步序', '所属图层', '镂空部位分类', '建议刀法', '起刀坐标X(mm)', '起刀坐标Y(mm)', '镂空面积(mm²)', '刻线周长(cm)', '累计刻线(m)', '防掉连桥提示'],
    ...plan.steps.map(s => [
      s.step,
      s.layerName,
      s.category,
      s.toolHint,
      s.startXMm,
      s.startYMm,
      s.areaMm2,
      s.perimeterCm,
      s.cumulativeMeters,
      s.nearBridge ? '邻近防掉连接桥·勿切断' : '独立镂空孔',
    ]),
  ]
  return `\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`
}
