import { csvCell, sanitizeFilename } from '../../lib/export'
import { getPortraitExampleRgba, PORTRAIT_EXAMPLE_SIZE } from '../../lib/portraitExample'

export const RING_COUNTS = [28, 40, 52, 64] as const
export const PAPER_SIZES_CM = [16, 20, 25] as const
export const DEFAULT_COMPASS_MAP_SIZE = 240
export const COMPASS_SAFETY_NOTICE =
  '使用圆规时请垫好防滑垫板或厚卡纸，调节与收纳圆规针尖时注意护住手指；儿童请在成人陪同下使用安全圆规。'

export type RingCount = typeof RING_COUNTS[number]
export type PaperSizeCm = typeof PAPER_SIZES_CM[number]
export type CompassAlgorithm = 'concentric-arcs' | 'archimedean-spiral' | 'multi-center-intersect'
export type CompassColorMode = 'mono' | 'multi'
export type CompassContrastMode = 'soft' | 'portrait' | 'dramatic'
export type CompassExampleId = 'portrait' | 'moon' | 'rose' | 'cat' | 'eye' | 'sunflower'

export const COMPASS_ALGORITHM_INFO: Record<
  CompassAlgorithm,
  { label: string; badge: string; summary: string; tip: string }
> = {
  'concentric-arcs': {
    label: '同心圆分段弧',
    badge: '手绘圆规首选',
    summary: '单圆心定针，逐圈递增半径，仅在暗部角度区落笔并随明暗控压，亮部抬笔留白。',
    tip: '固定中心圆心 O，按清单每次将圆规张开至对应毫米半径，对照量角刻度在起止角度间轻重控笔。',
  },
  'archimedean-spiral': {
    label: '一笔阿基米德螺线',
    badge: '黑胶铜版画风',
    summary: '由圆心向外一笔连续旋出等距螺线，用图像明暗同步调制径向波幅与线宽，形成版画波纹。',
    tip: '从中心 O 起笔顺时针连续外旋，深色区加大笔压并微幅高频摆动，浅色区保持极细匀线。',
  },
  'multi-center-intersect': {
    label: '三圆心叠交网格',
    badge: '莫尔交织光影',
    summary: '在画幅外缘设立 A/B/C 三个定点圆心，三组同心圆弧按 60° 交叉叠织出立体菱形网纹。',
    tip: '先将圆规针尖扎入圆心 A 画完第一组弧，再依次移针至圆心 B、C 换色或叠画，三向交汇处自然聚影。',
  },
}

export interface CompassPenSpec {
  code: string
  name: string
  color: string
}

export interface CompassPalette {
  id: string
  name: string
  paper: string
  rim: string
  darkPaper: boolean
  pens: readonly [CompassPenSpec, CompassPenSpec, CompassPenSpec]
}

export const COMPASS_PALETTES: readonly CompassPalette[] = [
  {
    id: 'classic-draft',
    name: '工程蓝图 · 象牙白卡',
    paper: '#fcf9f2',
    rim: '#dfd7c5',
    darkPaper: false,
    pens: [
      { code: 'P1', name: '普鲁士墨蓝', color: '#1b314b' },
      { code: 'P2', name: '矢车菊蓝', color: '#3b6796' },
      { code: 'P3', name: '晨雾灰蓝', color: '#8ba4bd' },
    ],
  },
  {
    id: 'vintage-sepia',
    name: '达芬奇手稿 · 羊皮纸',
    paper: '#f6ebd7',
    rim: '#d4c19e',
    darkPaper: false,
    pens: [
      { code: 'P1', name: '浓焦茶褐', color: '#3a2315' },
      { code: 'P2', name: '熟赭棕', color: '#824b2c' },
      { code: 'P3', name: '淡金棕', color: '#be8a58' },
    ],
  },
  {
    id: 'royal-blueprint',
    name: '建筑晒图 · 普鲁士蓝底',
    paper: '#163554',
    rim: '#2d5378',
    darkPaper: true,
    pens: [
      { code: 'P1', name: '制图纯白', color: '#f7f9fc' },
      { code: 'P2', name: '冰晶浅蓝', color: '#a6d2f5' },
      { code: 'P3', name: '银霜高光', color: '#d7e7f5' },
    ],
  },
  {
    id: 'rose-copper',
    name: '玫瑰铜版 · 宣纸白',
    paper: '#fbf6f3',
    rim: '#e2cfc8',
    darkPaper: false,
    pens: [
      { code: 'P1', name: '深酒红墨', color: '#5c1f28' },
      { code: 'P2', name: '干枯玫瑰', color: '#b24b58' },
      { code: 'P3', name: '暖桃金粉', color: '#df9489' },
    ],
  },
  {
    id: 'emerald-botanical',
    name: '植物图鉴 · 鼠尾草纸',
    paper: '#f3f6f0',
    rim: '#cfdac8',
    darkPaper: false,
    pens: [
      { code: 'P1', name: '深松针绿', color: '#214231' },
      { code: 'P2', name: '苔藓橄榄', color: '#4d7a57' },
      { code: 'P3', name: '金穗芥黄', color: '#c49645' },
    ],
  },
  {
    id: 'obsidian-gold',
    name: '黑胶流金 · 曜石黑卡',
    paper: '#1b1a18',
    rim: '#443c32',
    darkPaper: true,
    pens: [
      { code: 'P1', name: '赤金箔墨', color: '#ecc772' },
      { code: 'P2', name: '暖铜金', color: '#cc8846' },
      { code: 'P3', name: '珍珠象牙', color: '#f3ede0' },
    ],
  },
]

export interface CompassExampleMeta {
  id: CompassExampleId
  label: string
  title: string
  sourceName: string
  recommendedAlgorithm: CompassAlgorithm
  recommendedColorMode: CompassColorMode
  defaultPaletteId: string
}

export const COMPASS_EXAMPLES: readonly CompassExampleMeta[] = [
  {
    id: 'portrait',
    label: '光影肖像',
    title: '同心圆光影肖像 · 圆规画',
    sourceName: '光影人物肖像 · 原创示例',
    recommendedAlgorithm: 'concentric-arcs',
    recommendedColorMode: 'mono',
    defaultPaletteId: 'classic-draft',
  },
  {
    id: 'moon',
    label: '月相星轨',
    title: '阿基米德月相 · 圆规画',
    sourceName: '月相星轨 · 原创示例',
    recommendedAlgorithm: 'archimedean-spiral',
    recommendedColorMode: 'mono',
    defaultPaletteId: 'obsidian-gold',
  },
  {
    id: 'rose',
    label: '几何玫瑰',
    title: '三心叠交玫瑰 · 圆规画',
    sourceName: '古典几何玫瑰 · 原创示例',
    recommendedAlgorithm: 'multi-center-intersect',
    recommendedColorMode: 'multi',
    defaultPaletteId: 'rose-copper',
  },
  {
    id: 'cat',
    label: '灵动猫咪',
    title: '同心圆萌宠猫咪 · 圆规画',
    sourceName: '灵动猫咪 · 原创示例',
    recommendedAlgorithm: 'concentric-arcs',
    recommendedColorMode: 'multi',
    defaultPaletteId: 'vintage-sepia',
  },
  {
    id: 'eye',
    label: '深邃之眼',
    title: '铜版螺线之眼 · 圆规画',
    sourceName: '深邃之眼 · 原创示例',
    recommendedAlgorithm: 'archimedean-spiral',
    recommendedColorMode: 'mono',
    defaultPaletteId: 'royal-blueprint',
  },
  {
    id: 'sunflower',
    label: '向阳花开',
    title: '三心交织向日葵 · 圆规画',
    sourceName: '向阳花开 · 原创示例',
    recommendedAlgorithm: 'multi-center-intersect',
    recommendedColorMode: 'multi',
    defaultPaletteId: 'emerald-botanical',
  },
]

export interface CompassCenterSpec {
  id: 'O' | 'A' | 'B' | 'C'
  label: string
  nx: number
  ny: number
  xMm: number
  yMm: number
}

export interface CompassSamplePoint {
  angleRad: number
  radiusNorm: number
  widthNorm: number
}

export interface CompassArcStep {
  step: number
  centerId: 'O' | 'A' | 'B' | 'C'
  centerLabel: string
  ringIndex: number
  radiusNorm: number
  radiusMm: number
  startDeg: number
  endDeg: number
  sweepDeg: number
  pressureLabel: '轻描细线' | '适中控笔' | '重压加深'
  lengthCm: number
  cumulativeMeters: number
  layerIndex: number
  color: string
  colorName: string
  isPenChange: boolean
  isCenterChange: boolean
  samples: CompassSamplePoint[]
}

export interface CompassLayerSummary {
  index: number
  name: string
  color: string
  startStep: number
  endStep: number
  stepCount: number
  lengthMeters: number
}

export interface CompassFieldInput {
  mapSize: number
  darkness: Float32Array
  layerColors: readonly [CompassPenSpec, CompassPenSpec, CompassPenSpec]
  layerMaps: readonly [Float32Array, Float32Array, Float32Array]
}

export interface CompassPlan {
  algorithm: CompassAlgorithm
  colorMode: CompassColorMode
  contrastMode: CompassContrastMode
  mapSize: number
  ringCount: number
  paperSizeCm: number
  maxRadiusMm: number
  ringSpacingNorm: number
  centers: CompassCenterSpec[]
  steps: CompassArcStep[]
  layers: CompassLayerSummary[]
  totalLengthMeters: number
}

export function safeCompassFilename(title: string): string {
  return sanitizeFilename(title, 'TraceCraft-圆规画')
}

export function padRing(index: number, total = 64): string {
  const width = total >= 100 ? 3 : 2
  return String(index).padStart(width, '0')
}

function pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (!lenSq) return Math.hypot(px - ax, py - ay)
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function contrastSettings(mode: CompassContrastMode) {
  if (mode === 'dramatic') return { gamma: 1.38, highlightCut: 0.72, sharpen: 0.44, cutFloor: 0.14 }
  if (mode === 'soft') return { gamma: 0.92, highlightCut: 0.90, sharpen: 0.24, cutFloor: 0.04 }
  return { gamma: 1.12, highlightCut: 0.82, sharpen: 0.34, cutFloor: 0.08 }
}

function compassToCartesian(nxCenter: number, nyCenter: number, rNorm: number, angleRad: number) {
  return {
    nx: nxCenter + Math.sin(angleRad) * rNorm,
    ny: nyCenter - Math.cos(angleRad) * rNorm,
  }
}

function computeDetailBoostMap(map: Float32Array, size: number, sharpen: number): Float32Array {
  const out = new Float32Array(map.length)
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const idx = y * size + x
      const centerVal = map[idx]
      let sum5 = 0
      let count = 0
      for (let dy = -2; dy <= 2; dy++) {
        const sy = Math.max(0, Math.min(size - 1, y + dy))
        for (let dx = -2; dx <= 2; dx++) {
          const sx = Math.max(0, Math.min(size - 1, x + dx))
          sum5 += map[sy * size + sx]
          count++
        }
      }
      const localMean = sum5 / count
      const gx =
        map[(y - 1) * size + (x + 1)] +
        2 * map[y * size + (x + 1)] +
        map[(y + 1) * size + (x + 1)] -
        map[(y - 1) * size + (x - 1)] -
        2 * map[y * size + (x - 1)] -
        map[(y + 1) * size + (x - 1)]
      const gy =
        map[(y + 1) * size + (x - 1)] +
        2 * map[(y + 1) * size + x] +
        map[(y + 1) * size + (x + 1)] -
        map[(y - 1) * size + (x - 1)] -
        2 * map[(y - 1) * size + x] -
        map[(y - 1) * size + (x + 1)]
      const edge = Math.min(0.4, Math.hypot(gx, gy) * 0.22)
      out[idx] = Math.min(1, Math.max(0, centerVal + sharpen * (centerVal - localMean) + edge * 0.35))
    }
  }
  return out
}

function toHexColor(r: number, g: number, b: number, darkPaper: boolean): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  let cr = r
  let cg = g
  let cb = b
  if (!darkPaper && lum > 195) {
    const scale = 195 / lum
    cr *= scale
    cg *= scale
    cb *= scale
  } else if (darkPaper && lum < 110) {
    const boost = 110 - lum
    cr += boost
    cg += boost
    cb += boost
  }
  return `#${[clamp(cr), clamp(cg), clamp(cb)].map(c => c.toString(16).padStart(2, '0')).join('')}`
}

export function rgbaToCompassField(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  mapSize = DEFAULT_COMPASS_MAP_SIZE,
  palette: CompassPalette = COMPASS_PALETTES[0],
  usePhotoColors = true,
  invert = false,
  contrastMode: CompassContrastMode = 'portrait',
): CompassFieldInput {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('图片尺寸无效，无法提取圆规画光影。')
  }
  let opaqueCount = 0
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] >= 16) opaqueCount++
  }
  if (opaqueCount === 0) {
    throw new Error('这张图片全部透明，无法提取圆规画，请换一张主体清晰的图片。')
  }

  const len = mapSize * mapSize
  const lum = new Float32Array(len)
  const rgbSamples: Array<[number, number, number]> = new Array(len)
  const center = (mapSize - 1) / 2
  const radius = mapSize / 2 - 4
  const side = Math.min(width, height)
  const startX = Math.floor((width - side) / 2)
  const startY = Math.floor((height - side) / 2)
  const diskSamples: number[] = []

  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      const nx = (x - center) / (2 * radius) + 0.5
      const ny = (y - center) / (2 * radius) + 0.5
      const i = y * mapSize + x
      let val = 255
      let r = 255
      let g = 255
      let b = 255
      if (nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1) {
        const sx = Math.min(width - 1, startX + Math.floor(nx * side))
        const sy = Math.min(height - 1, startY + Math.floor(ny * side))
        const idx = (sy * width + sx) * 4
        const alpha = rgba[idx + 3] / 255
        r = rgba[idx] * alpha + 255 * (1 - alpha)
        g = rgba[idx + 1] * alpha + 255 * (1 - alpha)
        b = rgba[idx + 2] * alpha + 255 * (1 - alpha)
        val = 0.299 * r + 0.587 * g + 0.114 * b
      } else if (invert) {
        val = 0
        r = g = b = 0
      }
      lum[i] = val
      rgbSamples[i] = [r, g, b]
      if ((x - center) ** 2 + (y - center) ** 2 <= radius * radius) {
        diskSamples.push(val)
      }
    }
  }

  diskSamples.sort((a, b) => a - b)
  const lo = diskSamples.length ? diskSamples[Math.floor(diskSamples.length * 0.02)] : 0
  const hi = diskSamples.length ? diskSamples[Math.min(diskSamples.length - 1, Math.floor(diskSamples.length * 0.98))] : 255
  const span = Math.max(8, hi - lo)
  const stretch = Math.max(0, Math.min(1, (hi - lo - 24) / 72))
  const { gamma, highlightCut, sharpen } = contrastSettings(contrastMode)

  const toned = new Float32Array(len)
  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      if ((x - center) ** 2 + (y - center) ** 2 > radius * radius) continue
      const i = y * mapSize + x
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
  }

  const darkness = computeDetailBoostMap(toned, mapSize, sharpen)
  const m0 = new Float32Array(len)
  const m1 = new Float32Array(len)
  const m2 = new Float32Array(len)
  const sums = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]

  for (let i = 0; i < len; i++) {
    const val = darkness[i]
    if (val <= 0.03) continue
    const [pr, pg, pb] = rgbSamples[i]
    if (val >= 0.56) {
      m0[i] = val
      sums[0][0] += pr; sums[0][1] += pg; sums[0][2] += pb; sums[0][3]++
    } else if (val >= 0.24) {
      m1[i] = val
      sums[1][0] += pr; sums[1][1] += pg; sums[1][2] += pb; sums[1][3]++
    } else {
      m2[i] = val
      sums[2][0] += pr; sums[2][1] += pg; sums[2][2] += pb; sums[2][3]++
    }
  }

  const labels = ['深韵主线', '中调过渡', '高光微笔']
  const layerColors: [CompassPenSpec, CompassPenSpec, CompassPenSpec] = [0, 1, 2].map(idx => {
    const acc = sums[idx]
    const preset = palette.pens[idx]
    const color =
      usePhotoColors && acc[3] > 0
        ? toHexColor(acc[0] / acc[3], acc[1] / acc[3], acc[2] / acc[3], palette.darkPaper)
        : preset.color
    return {
      code: preset.code,
      name: usePhotoColors && acc[3] > 0 ? `${labels[idx]}（照片近似色）` : preset.name,
      color,
    }
  }) as [CompassPenSpec, CompassPenSpec, CompassPenSpec]

  return {
    mapSize,
    darkness,
    layerColors,
    layerMaps: [m0, m1, m2],
  }
}

function sampleExampleTriplet(kind: CompassExampleId, nx: number, ny: number): [number, number, number] {
  const r = Math.hypot(nx, ny)
  const ang = Math.atan2(ny, nx)

  if (kind === 'moon') {
    const outerMoon = Math.hypot(nx + 0.06, ny) < 0.56
    const cutHole = Math.hypot(nx - 0.21, ny + 0.08) < 0.44
    const inMoon = outerMoon && !cutHole
    const crater1 = Math.exp(-(((nx + 0.28) ** 2 + (ny - 0.08) ** 2) / 0.012)) * 0.45
    const crater2 = Math.exp(-(((nx + 0.12) ** 2 + (ny - 0.31) ** 2) / 0.008)) * 0.4
    const orbit = Math.exp(-((r - 0.72) ** 2 / 0.0005)) * 0.7
    const starA = Math.exp(-((Math.abs(nx - 0.34) / 0.018) ** 2 + (Math.abs(ny + 0.24) / 0.11) ** 2)) +
      Math.exp(-((Math.abs(ny + 0.24) / 0.018) ** 2 + (Math.abs(nx - 0.34) / 0.11) ** 2))
    const starB = Math.exp(-((Math.abs(nx - 0.54) / 0.014) ** 2 + (Math.abs(ny - 0.18) / 0.07) ** 2)) +
      Math.exp(-((Math.abs(ny - 0.18) / 0.014) ** 2 + (Math.abs(nx - 0.54) / 0.07) ** 2))
    const v0 = inMoon ? Math.min(1, 0.62 + crater1 + crater2) : 0
    const v1 = Math.min(1, Math.max(orbit, starA * 0.85, starB * 0.72))
    const v2 = r < 0.84 && !inMoon ? Math.max(0, 0.22 * (1 - r / 0.84)) : 0
    return [v0, v1, v2]
  }

  if (kind === 'rose') {
    const swirl = 0.5 + 0.5 * Math.sin(r * 25 - ang * 4.2)
    const core = r < 0.16 ? 0.78 + 0.18 * swirl : 0
    const mid = r >= 0.16 && r < 0.46 ? 0.48 + 0.42 * swirl : 0
    const outer = r >= 0.46 && r < 0.62 && Math.sin(ang * 5) > -0.25 ? 0.4 + 0.35 * swirl : 0
    const stem = Math.abs(nx) < 0.045 && ny > 0.45 && ny < 0.86 ? 0.75 : 0
    const leafL = ((nx + 0.22) * 0.9 + (ny - 0.62) * 0.4) ** 2 + ((ny - 0.62) * 1.4 - (nx + 0.22) * 0.5) ** 2 < 0.032 ? 0.65 : 0
    const leafR = ((nx - 0.22) * 0.9 - (ny - 0.58) * 0.4) ** 2 + ((ny - 0.58) * 1.4 + (nx - 0.22) * 0.5) ** 2 < 0.032 ? 0.62 : 0
    return [Math.max(core, stem * 0.9), Math.max(mid, leafL, leafR), outer]
  }

  if (kind === 'cat') {
    const head = (nx / 0.5) ** 2 + ((ny - 0.08) / 0.44) ** 2 <= 1
    const earL = nx < -0.1 && ny < -0.15 && Math.abs(nx + 0.28 + (ny + 0.58) * 0.24) < (-0.12 - ny) * 0.46 && ny > -0.66
    const earR = nx > 0.1 && ny < -0.15 && Math.abs(nx - 0.28 - (ny + 0.58) * 0.24) < (-0.12 - ny) * 0.46 && ny > -0.66
    const eyeL = Math.hypot(nx + 0.18, ny - 0.03)
    const eyeR = Math.hypot(nx - 0.18, ny - 0.03)
    const nose = Math.hypot(nx * 1.3, (ny - 0.16) * 1.6) < 0.055
    const whiskerL = [0.06, 0.16, 0.26].some(wy => pointToSegmentDist(nx, ny, -0.26, wy, -0.66, wy - 0.04) < 0.013)
    const whiskerR = [0.06, 0.16, 0.26].some(wy => pointToSegmentDist(nx, ny, 0.26, wy, 0.66, wy - 0.04) < 0.013)
    const pupil = Math.abs(nx + 0.18) < 0.025 && Math.abs(ny - 0.03) < 0.055 || Math.abs(nx - 0.18) < 0.025 && Math.abs(ny - 0.03) < 0.055
    const v0 = pupil || nose || whiskerL || whiskerR ? 0.9 : 0
    const v1 = head && !eyeL && !eyeR ? 0.42 : head ? (eyeL > 0.095 && eyeR > 0.095 ? 0.36 + 0.22 * r : 0) : 0
    const v2 = earL || earR ? 0.68 : 0
    return [v0, Math.max(v1, eyeL < 0.092 || eyeR < 0.092 ? (pupil ? 0.9 : 0.2) : 0), v2]
  }

  if (kind === 'eye') {
    const lidTop = -0.34 * (1 - (nx / 0.72) ** 2)
    const lidBot = 0.34 * (1 - (nx / 0.72) ** 2)
    const inEye = Math.abs(nx) <= 0.72 && ny >= lidTop && ny <= lidBot
    const brow = pointToSegmentDist(nx, ny, -0.64, -0.34, 0.0, -0.49) < 0.038 || pointToSegmentDist(nx, ny, 0.0, -0.49, 0.65, -0.32) < 0.036
    const rimDist = inEye ? Math.min(Math.abs(ny - lidTop), Math.abs(ny - lidBot)) : 1
    const irisD = r
    const catchlight = Math.hypot(nx + 0.08, ny + 0.07) < 0.055
    let v0 = brow || rimDist < 0.035 ? 0.88 : 0
    let v1 = 0
    let v2 = 0
    if (inEye && !catchlight) {
      if (irisD < 0.12) v0 = 0.96
      else if (irisD < 0.30) v1 = 0.52 + 0.35 * (0.5 + 0.5 * Math.cos(ang * 24))
      else v2 = 0.12
    }
    return [v0, v1, v2]
  }

  // sunflower
  const centerSeed = r < 0.24 ? 0.68 + 0.24 * Math.sin(r * 45 + ang * 13) : 0
  const petalWave = 0.24 + 0.54 * Math.pow(Math.abs(Math.cos(ang * 8)), 0.7)
  const inPetal = r >= 0.22 && r <= petalWave
  const v0 = centerSeed
  const v1 = inPetal ? 0.45 + 0.35 * (1 - (r - 0.22) / 0.56) : 0
  const v2 = inPetal && r > 0.52 ? 0.58 : 0
  return [v0, v1, v2]
}

export function createCompassExampleField(
  kind: CompassExampleId,
  mapSize = DEFAULT_COMPASS_MAP_SIZE,
  palette: CompassPalette = COMPASS_PALETTES[0],
  contrastMode: CompassContrastMode = 'portrait',
): CompassFieldInput {
  if (kind === 'portrait') {
    return rgbaToCompassField(
      getPortraitExampleRgba(),
      PORTRAIT_EXAMPLE_SIZE,
      PORTRAIT_EXAMPLE_SIZE,
      mapSize,
      palette,
      false,
      palette.darkPaper,
      contrastMode,
    )
  }
  const len = mapSize * mapSize
  const center = (mapSize - 1) / 2
  const radius = mapSize / 2 - 4
  const { gamma, cutFloor } = contrastSettings(contrastMode)
  const darkness = new Float32Array(len)
  const m0 = new Float32Array(len)
  const m1 = new Float32Array(len)
  const m2 = new Float32Array(len)

  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      const dx = x - center
      const dy = y - center
      if (dx * dx + dy * dy > radius * radius) continue
      const [r0, r1, r2] = sampleExampleTriplet(kind, dx / radius, dy / radius)
      const i = y * mapSize + x
      const tone = (val: number) => (val <= cutFloor ? 0 : Math.pow(Math.min(1, val), gamma * 0.74))
      m0[i] = tone(r0)
      m1[i] = tone(r1)
      m2[i] = tone(r2)
      darkness[i] = Math.max(m0[i], m1[i], m2[i])
    }
  }

  return {
    mapSize,
    darkness,
    layerColors: palette.pens,
    layerMaps: [m0, m1, m2],
  }
}

function sampleFieldBilinear(field: Float32Array, mapSize: number, nx: number, ny: number): number {
  if (nx * nx + ny * ny > 1) return 0
  const center = (mapSize - 1) / 2
  const radius = mapSize / 2 - 4
  const u = center + nx * radius
  const v = center + ny * radius
  const x0 = Math.max(0, Math.min(mapSize - 1, Math.floor(u)))
  const y0 = Math.max(0, Math.min(mapSize - 1, Math.floor(v)))
  const x1 = Math.min(mapSize - 1, x0 + 1)
  const y1 = Math.min(mapSize - 1, y0 + 1)
  const tx = Math.max(0, Math.min(1, u - x0))
  const ty = Math.max(0, Math.min(1, v - y0))
  const c00 = field[y0 * mapSize + x0]
  const c10 = field[y0 * mapSize + x1]
  const c01 = field[y1 * mapSize + x0]
  const c11 = field[y1 * mapSize + x1]
  return (c00 * (1 - tx) + c10 * tx) * (1 - ty) + (c01 * (1 - tx) + c11 * tx) * ty
}

function pressureFromWidth(avgWidth: number): '轻描细线' | '适中控笔' | '重压加深' {
  if (avgWidth >= 0.62) return '重压加深'
  if (avgWidth >= 0.34) return '适中控笔'
  return '轻描细线'
}

export function generateCompassPlan(
  field: CompassFieldInput,
  algorithm: CompassAlgorithm = 'concentric-arcs',
  ringCount = 40,
  paperSizeCm: PaperSizeCm = 20,
  colorMode: CompassColorMode = 'mono',
  contrastMode: CompassContrastMode = 'portrait',
): CompassPlan {
  const safeRings = Math.max(16, Math.min(80, Math.round(ringCount)))
  const maxRadiusMm = Number(((paperSizeCm * 10) * 0.43).toFixed(1))
  const ringSpacingNorm = 1 / safeRings

  let maxVal = 0
  for (let i = 0; i < field.darkness.length; i++) {
    if (field.darkness[i] > maxVal) maxVal = field.darkness[i]
  }

  const singleCenter: CompassCenterSpec[] = [{ id: 'O', label: '中心圆心 O', nx: 0, ny: 0, xMm: 0, yMm: 0 }]
  const triRadius = 0.76
  const triAnglesDeg = [300, 60, 180] as const
  const triLabels = ['圆心 A · 左上', '圆心 B · 右上', '圆心 C · 正下'] as const
  const triIds = ['A', 'B', 'C'] as const
  const triCenters: CompassCenterSpec[] = triIds.map((id, idx) => {
    const rad = (triAnglesDeg[idx] * Math.PI) / 180
    const nx = Number((Math.sin(rad) * triRadius).toFixed(4))
    const ny = Number((-Math.cos(rad) * triRadius).toFixed(4))
    return {
      id,
      label: triLabels[idx],
      nx,
      ny,
      xMm: Number((nx * maxRadiusMm).toFixed(1)),
      yMm: Number((ny * maxRadiusMm).toFixed(1)),
    }
  })

  const centers = algorithm === 'multi-center-intersect' ? triCenters : singleCenter

  if (maxVal <= 0.02) {
    return {
      algorithm,
      colorMode,
      contrastMode,
      mapSize: field.mapSize,
      ringCount: safeRings,
      paperSizeCm,
      maxRadiusMm,
      ringSpacingNorm,
      centers,
      steps: [],
      layers: [],
      totalLengthMeters: 0,
    }
  }

  const threshold = contrastMode === 'dramatic' ? 0.14 : contrastMode === 'soft' ? 0.04 : 0.08
  const rawSteps: Omit<CompassArcStep, 'step' | 'cumulativeMeters' | 'isPenChange' | 'isCenterChange'>[] = []

  const dominantLayerAt = (nx: number, ny: number): number => {
    if (colorMode === 'mono') return 0
    const w0 = sampleFieldBilinear(field.layerMaps[0], field.mapSize, nx, ny)
    const w1 = sampleFieldBilinear(field.layerMaps[1], field.mapSize, nx, ny)
    const w2 = sampleFieldBilinear(field.layerMaps[2], field.mapSize, nx, ny)
    if (w0 >= w1 && w0 >= w2 && w0 > 0) return 0
    if (w1 >= w2 && w1 > 0) return 1
    return w2 > 0 ? 2 : 0
  }

  if (algorithm === 'concentric-arcs') {
    const angleStepDeg = 2
    const totalAngles = 360 / angleStepDeg
    const maxSpanDeg = 120

    for (let ringIdx = 1; ringIdx <= safeRings; ringIdx++) {
      const rNorm = ringIdx / safeRings
      const rMm = Number((rNorm * maxRadiusMm).toFixed(1))

      const pointWidths: number[] = []
      const pointLayers: number[] = []
      for (let ai = 0; ai < totalAngles; ai++) {
        const rad = (ai * angleStepDeg * Math.PI) / 180
        const { nx, ny } = compassToCartesian(0, 0, rNorm, rad)
        const d = sampleFieldBilinear(field.darkness, field.mapSize, nx, ny)
        pointWidths.push(d > threshold ? Math.min(1, Math.max(0.14, d)) : 0)
        pointLayers.push(d > threshold ? dominantLayerAt(nx, ny) : 0)
      }

      let curSpan: number[] = []
      let curLayer = 0

      const flushSpan = () => {
        if (curSpan.length < 2) {
          curSpan = []
          return
        }
        const samples: CompassSamplePoint[] = curSpan.map(ai => ({
          angleRad: (ai * angleStepDeg * Math.PI) / 180,
          radiusNorm: rNorm,
          widthNorm: pointWidths[ai % totalAngles],
        }))
        const startDeg = (curSpan[0] % totalAngles) * angleStepDeg
        const sweepDeg = (curSpan.length - 1) * angleStepDeg
        const endDeg = (startDeg + sweepDeg) % 360
        const avgW = samples.reduce((s, p) => s + p.widthNorm, 0) / samples.length
        const pen = field.layerColors[curLayer]
        const lengthCm = Number((((rMm / 10) * (sweepDeg * Math.PI)) / 180).toFixed(2))
        rawSteps.push({
          centerId: 'O',
          centerLabel: '中心圆心 O',
          ringIndex: ringIdx,
          radiusNorm: rNorm,
          radiusMm: rMm,
          startDeg,
          endDeg,
          sweepDeg,
          pressureLabel: pressureFromWidth(avgW),
          lengthCm,
          layerIndex: curLayer,
          color: pen.color,
          colorName: pen.name,
          samples,
        })
        curSpan = []
      }

      // Rotate scan start to an inactive angle so rings crossing 0 deg never split with a vertical gap.
      const firstGap = pointWidths.findIndex(w => w === 0)
      const startOffset = firstGap >= 0 ? firstGap : 0
      const scanSteps = firstGap >= 0 ? totalAngles : totalAngles + 1
      for (let stepIdx = 0; stepIdx < scanSteps; stepIdx++) {
        const ai = startOffset + stepIdx
        const modAi = ai % totalAngles
        const active = pointWidths[modAi] > 0
        const layer = pointLayers[modAi]
        if (!active) {
          flushSpan()
          continue
        }
        if (curSpan.length === 0) {
          curLayer = layer
          curSpan.push(ai)
        } else if ((colorMode === 'multi' && layer !== curLayer) || (curSpan.length - 1) * angleStepDeg >= maxSpanDeg) {
          curSpan.push(ai)
          flushSpan()
          curLayer = layer
          curSpan.push(ai)
        } else {
          curSpan.push(ai)
        }
      }
      flushSpan()
    }
  } else if (algorithm === 'archimedean-spiral') {
    const angleStepDeg = 2
    const stepsPerTurn = 360 / angleStepDeg
    const rippleFreq = 26

    for (let turn = 1; turn <= safeRings; turn++) {
      const turnSamples: CompassSamplePoint[] = []
      let maxTurnDarkness = 0
      const layerVotes = [0, 0, 0]
      const turnCount = turn === 1 ? stepsPerTurn - 18 : stepsPerTurn

      for (let s = 0; s <= turnCount; s++) {
        const thetaTurns = turn === 1 ? 0.1 + (s / turnCount) * 0.9 : turn - 1 + s / turnCount
        const angleRad = thetaTurns * Math.PI * 2
        const baseR = thetaTurns / safeRings
        const { nx, ny } = compassToCartesian(0, 0, Math.min(0.98, baseR), angleRad)
        const d = sampleFieldBilinear(field.darkness, field.mapSize, nx, ny)
        if (d > maxTurnDarkness) maxTurnDarkness = d
        if (d > threshold) layerVotes[dominantLayerAt(nx, ny)] += d

        const amp = d > threshold ? Math.pow(d, 1.05) * ringSpacingNorm * 0.28 : 0
        const wave = Math.sin(thetaTurns * rippleFreq * Math.PI)
        const modulatedR = Math.max(0.015, Math.min(0.99, baseR + amp * wave))
        const widthNorm = d > threshold ? Math.min(1, 0.14 + d * 0.86) : 0.08
        turnSamples.push({ angleRad, radiusNorm: modulatedR, widthNorm })
      }

      if (maxTurnDarkness <= threshold * 0.5 && turn > safeRings * 0.72) continue

      const midRadiusNorm = Math.min(0.98, (turn - 0.5) / safeRings)
      const radiusMm = Number((midRadiusNorm * maxRadiusMm).toFixed(1))
      const dominantLayer =
        colorMode === 'mono'
          ? 0
          : layerVotes[1] > layerVotes[0] && layerVotes[1] >= layerVotes[2]
            ? 1
            : layerVotes[2] > layerVotes[0] && layerVotes[2] > layerVotes[1]
              ? 2
              : 0
      const pen = field.layerColors[dominantLayer]
      const avgW = turnSamples.reduce((s, p) => s + p.widthNorm, 0) / turnSamples.length
      const lengthCm = Number((2 * Math.PI * (radiusMm / 10)).toFixed(2))

      rawSteps.push({
        centerId: 'O',
        centerLabel: '中心圆心 O',
        ringIndex: turn,
        radiusNorm: midRadiusNorm,
        radiusMm,
        startDeg: 0,
        endDeg: 360,
        sweepDeg: 360,
        pressureLabel: pressureFromWidth(avgW),
        lengthCm,
        layerIndex: dominantLayer,
        color: pen.color,
        colorName: pen.name,
        samples: turnSamples,
      })
    }
  } else {
    // Three-center intersecting compass Moire grid
    const angleStepDeg = 2.5
    const totalAngles = Math.round(360 / angleStepDeg)
    const minCrossR = 0.22
    const maxCrossR = 1.72

    centers.forEach((centerSpec, centerIdx) => {
      const pen = field.layerColors[colorMode === 'multi' ? centerIdx : 0]
      const targetLayerIdx = colorMode === 'multi' ? centerIdx : 0
      const layerField = field.layerMaps[centerIdx]
      const hasLayerEnergy = colorMode === 'multi' && layerField.some(v => v > threshold)

      for (let ringIdx = 1; ringIdx <= safeRings; ringIdx++) {
        const rNorm = minCrossR + ((ringIdx - 0.5) / safeRings) * (maxCrossR - minCrossR)
        const rMm = Number((rNorm * maxRadiusMm).toFixed(1))
        let span: CompassSamplePoint[] = []
        let spanStartDeg = 0

        const flushCrossSpan = () => {
          if (span.length < 3) {
            span = []
            return
          }
          const sweepDeg = Number(((span.length - 1) * angleStepDeg).toFixed(1))
          const endDeg = Number(((spanStartDeg + sweepDeg) % 360).toFixed(1))
          const avgW = span.reduce((s, p) => s + p.widthNorm, 0) / span.length
          const lengthCm = Number((((rMm / 10) * (sweepDeg * Math.PI)) / 180).toFixed(2))
          rawSteps.push({
            centerId: centerSpec.id,
            centerLabel: centerSpec.label,
            ringIndex: ringIdx,
            radiusNorm: rNorm,
            radiusMm: rMm,
            startDeg: Number(spanStartDeg.toFixed(1)),
            endDeg,
            sweepDeg,
            pressureLabel: pressureFromWidth(avgW),
            lengthCm,
            layerIndex: targetLayerIdx,
            color: pen.color,
            colorName: pen.name,
            samples: span,
          })
          span = []
        }

        for (let ai = 0; ai < totalAngles; ai++) {
          const deg = ai * angleStepDeg
          const rad = (deg * Math.PI) / 180
          const { nx, ny } = compassToCartesian(centerSpec.nx, centerSpec.ny, rNorm, rad)
          const insidePaper = Math.hypot(nx, ny) <= 0.98
          if (!insidePaper) {
            flushCrossSpan()
            continue
          }
          const dBase = sampleFieldBilinear(field.darkness, field.mapSize, nx, ny)
          const dLayer = hasLayerEnergy ? sampleFieldBilinear(layerField, field.mapSize, nx, ny) : 0
          const d = colorMode === 'multi' ? Math.max(dLayer, dBase * 0.72) : dBase
          if (d <= threshold * 0.85) {
            flushCrossSpan()
            continue
          }
          if (span.length === 0) spanStartDeg = deg
          span.push({
            angleRad: rad,
            radiusNorm: rNorm,
            widthNorm: Math.min(1, 0.18 + d * 0.82),
          })
          if ((span.length - 1) * angleStepDeg >= 105) {
            flushCrossSpan()
          }
        }
        flushCrossSpan()
      }
    })
  }

  // Group concentric-arcs into clean pen layers when in multi-color mode so pen swaps happen only 1-2 times.
  const ordered =
    colorMode === 'multi' && algorithm === 'concentric-arcs'
      ? [...rawSteps].sort((a, b) => a.layerIndex - b.layerIndex || a.ringIndex - b.ringIndex || a.startDeg - b.startDeg)
      : rawSteps

  let cumCm = 0
  const steps: CompassArcStep[] = ordered.map((item, idx) => {
    cumCm += item.lengthCm
    const prev = idx > 0 ? ordered[idx - 1] : null
    return {
      ...item,
      step: idx + 1,
      cumulativeMeters: Number((cumCm / 100).toFixed(2)),
      isPenChange: Boolean(prev && prev.layerIndex !== item.layerIndex),
      isCenterChange: Boolean(prev && prev.centerId !== item.centerId),
    }
  })

  const layers: CompassLayerSummary[] = []
  for (let l = 0; l < 3; l++) {
    const matching = steps.filter(s => s.layerIndex === l)
    if (!matching.length) continue
    const lenCm = matching.reduce((s, item) => s + item.lengthCm, 0)
    layers.push({
      index: l,
      name: field.layerColors[l].name,
      color: field.layerColors[l].color,
      startStep: matching[0].step,
      endStep: matching[matching.length - 1].step,
      stepCount: matching.length,
      lengthMeters: Number((lenCm / 100).toFixed(2)),
    })
  }

  return {
    algorithm,
    colorMode,
    contrastMode,
    mapSize: field.mapSize,
    ringCount: safeRings,
    paperSizeCm,
    maxRadiusMm,
    ringSpacingNorm,
    centers,
    steps,
    layers,
    totalLengthMeters: Number((cumCm / 100).toFixed(2)),
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

export function buildCompassTemplateSvg(plan: CompassPlan, title: string, palette: CompassPalette): string {
  const widthMm = plan.paperSizeCm * 10 + 36
  const heightMm = plan.paperSizeCm * 10 + 52
  const cx = widthMm / 2
  const cy = 24 + plan.paperSizeCm * 5
  const paperR = plan.paperSizeCm * 5
  const drawR = plan.maxRadiusMm
  const safeTitle = escapeXml(title.trim() || '圆规画图纸')
  const algInfo = COMPASS_ALGORITHM_INFO[plan.algorithm]

  const degreeTicksSvg = Array.from({ length: 72 }, (_, idx) => {
    const deg = idx * 5
    const rad = (deg * Math.PI) / 180
    const isMajor = deg % 30 === 0
    const isMed = deg % 15 === 0
    const r0 = drawR + 0.5
    const r1 = drawR + (isMajor ? 4.2 : isMed ? 2.8 : 1.6)
    const x0 = (cx + Math.sin(rad) * r0).toFixed(2)
    const y0 = (cy - Math.cos(rad) * r0).toFixed(2)
    const x1 = (cx + Math.sin(rad) * r1).toFixed(2)
    const y1 = (cy - Math.cos(rad) * r1).toFixed(2)
    const lx = (cx + Math.sin(rad) * (drawR + 7.4)).toFixed(2)
    const ly = (cy - Math.cos(rad) * (drawR + 7.4)).toFixed(2)
    return `<g>
      <line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${isMajor ? '#434b3c' : '#9aa18e'}" stroke-width="${isMajor ? '0.45' : '0.25'}" />
      ${isMajor ? `<text x="${lx}" y="${ly}" font-size="2.7" font-weight="600" fill="#4f5747" text-anchor="middle" dominant-baseline="central">${deg}°</text>` : ''}
    </g>`
  }).join('\n  ')

  const refRingsSvg = [0.25, 0.5, 0.75, 1.0].map(ratio => {
    const r = (drawR * ratio).toFixed(2)
    return `<circle cx="${cx}" cy="${cy}" r="${r}" stroke="#c9cec0" stroke-width="0.3" stroke-dasharray="2 2" />`
  }).join('\n  ')

  const centersSvg = plan.centers.map(c => {
    const px = Number((cx + c.nx * drawR).toFixed(2))
    const py = Number((cy + c.ny * drawR).toFixed(2))
    return `<g>
      <path d="M${px - 4} ${py}H${px + 4}M${px} ${py - 4}V${py + 4}" stroke="#b04a38" stroke-width="0.45" />
      <circle cx="${px}" cy="${py}" r="1.4" fill="none" stroke="#b04a38" stroke-width="0.45" />
      <circle cx="${px}" cy="${py}" r="0.35" fill="#b04a38" />
      <text x="${px}" y="${(py - 5.2).toFixed(2)}" font-size="2.7" font-weight="700" fill="#b04a38" text-anchor="middle">★ ${escapeXml(c.label)}</text>
    </g>`
  }).join('\n  ')

  const scaleY = heightMm - 15
  const footerY = heightMm - 6

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${widthMm} ${heightMm}" fill="none">
  <title>${safeTitle} · 1:1 圆规量角底稿</title>
  <desc>TraceCraft 圆规画工坊 1:1 实际尺寸底稿与量角定位模板（${algInfo.label}），含 50 mm 比例尺与针尖圆心。</desc>
  <rect width="${widthMm}" height="${heightMm}" fill="#ffffff" />
  <text x="16" y="10.5" font-size="4.4" font-weight="600" fill="#343a2e">${safeTitle} · 1:1 圆规量角底稿</text>
  <text x="${widthMm - 16}" y="10.5" font-size="3.1" fill="#707766" text-anchor="end">${plan.paperSizeCm} cm 画幅 · ${escapeXml(algInfo.label)} · ${plan.ringCount} 圈 · ${plan.steps.length} 步 · ${escapeXml(palette.name)}</text>
  <circle cx="${cx}" cy="${cy}" r="${paperR}" stroke="#9ea494" stroke-width="0.4" stroke-dasharray="2.5 2" />
  ${refRingsSvg}
  ${degreeTicksSvg}
  ${centersSvg}
  <g>
    <path d="M16 ${scaleY - 1.5}V${scaleY + 1.5}M16 ${scaleY}H66M66 ${scaleY - 1.5}V${scaleY + 1.5}" stroke="#35392f" stroke-width="0.45" />
    <text x="71" y="${scaleY + 1}" font-size="2.9" font-weight="600" fill="#35392f">50 mm 比例尺 · 打印请选「100% 实际大小」并垫防滑垫板</text>
  </g>
  <text x="16" y="${footerY}" font-size="2.6" fill="#8d533d">安全提示：${COMPASS_SAFETY_NOTICE}</text>
</svg>`
}

export function compassStepsCsv(plan: CompassPlan, title: string, paletteName: string): string {
  const safeTitle = title.trim() || '圆规画作品'
  const algLabel = COMPASS_ALGORITHM_INFO[plan.algorithm].label
  const rows: (string | number)[][] = [
    ['作品名称', safeTitle],
    ['圆规画法', algLabel],
    ['画幅直径 (cm)', plan.paperSizeCm],
    ['有效最大半径 (mm)', plan.maxRadiusMm],
    ['参考圈数', plan.ringCount],
    ['总绘制步数', plan.steps.length],
    ['预计线条总长 (m)', plan.totalLengthMeters],
    ['参考配色', paletteName],
    [],
    ['画笔色层', 'HEX', '起始步', '结束步', '步数', '累计线长 (m)'],
    ...plan.layers.map(l => [l.name, l.color, l.startStep, l.endStep, l.stepCount, l.lengthMeters]),
    [],
    ['步数', '所属圆心', '圈号', '圆规半径(mm)', '起始角度(°)', '结束角度(°)', '扫过角度(°)', '画笔颜色', 'HEX', '控笔压力', '单步弧长(cm)', '累计弧长(m)', '操作提示'],
    ...plan.steps.map(s => [
      s.step,
      s.centerLabel,
      padRing(s.ringIndex, plan.ringCount),
      s.radiusMm,
      s.startDeg,
      s.endDeg,
      s.sweepDeg,
      s.colorName,
      s.color,
      s.pressureLabel,
      s.lengthCm,
      s.cumulativeMeters,
      s.isPenChange ? '换色画笔' : s.isCenterChange ? '移针换圆心' : '连续稳腕画弧',
    ]),
  ]
  return `\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`
}
