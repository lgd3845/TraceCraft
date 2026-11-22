import { csvCell, sanitizeFilename } from '../../lib/export'
import { getPortraitExampleRgba, PORTRAIT_EXAMPLE_SIZE } from '../../lib/portraitExample'

export const RING_PEG_COUNTS = [120, 160, 200, 240] as const
export const RING_STEP_COUNTS = [1000, 2000, 3200, 4000] as const
export const CONTOUR_PEG_COUNTS = [60, 80, 100, 120] as const
export const CONTOUR_STEP_COUNTS = [300, 500, 800, 1200] as const
export const PEG_COUNTS = CONTOUR_PEG_COUNTS
export const STEP_COUNTS = CONTOUR_STEP_COUNTS
export const BOARD_SIZES_CM = [20, 25, 30] as const
export const DEFAULT_STRING_MAP_SIZE = 320
export const STRING_SAFETY_NOTICE = '锤钉时请固定好木板并护住手指，儿童请在成人陪同下操作；余线与线头剪齐后打双结固定。'

export type BoardSizeCm = typeof BOARD_SIZES_CM[number]
export type NailLayoutMode = 'ring' | 'contour'
export type ContrastMode = 'soft' | 'portrait' | 'dramatic'
export type ColorWeaveMode = 'mono' | 'multi'
export type StringExampleId = 'portrait' | 'rose' | 'heart' | 'tulip' | 'cat' | 'crescent' | 'bird' | 'paw'

export interface ThreadColorSpec {
  code: string
  name: string
  color: string
}

export interface StringPalette {
  id: string
  name: string
  thread: string
  threads: readonly [ThreadColorSpec, ThreadColorSpec, ThreadColorSpec]
  board: string
  nail: string
  rim: string
  darkBoard: boolean
}

export const STRING_PALETTES: readonly StringPalette[] = [
  {
    id: 'classic-ink',
    name: '经典肖像黑 · 暖白底',
    thread: '#181a18',
    threads: [
      { code: 'T1', name: '浓墨黑', color: '#181a18' },
      { code: 'T2', name: '石墨灰', color: '#474c48' },
      { code: 'T3', name: '暖棕灰', color: '#826b5c' },
    ],
    board: '#fbf8f1',
    nail: '#b69058',
    rim: '#dfd7c7',
    darkBoard: false,
  },
  {
    id: 'classic-warm',
    name: '绯红珊瑚 · 暖白底',
    thread: '#cf5346',
    threads: [
      { code: 'T1', name: '深茜红', color: '#8c2d2b' },
      { code: 'T2', name: '珊瑚红', color: '#cf5346' },
      { code: 'T3', name: '蜜桃金', color: '#eb9a72' },
    ],
    board: '#faf6ee',
    nail: '#b68d52',
    rim: '#dfd6c5',
    darkBoard: false,
  },
  {
    id: 'starlight-gold',
    name: '星夜流金 · 胡桃木',
    thread: '#ebc675',
    threads: [
      { code: 'T1', name: '琥珀铜', color: '#b87d3b' },
      { code: 'T2', name: '星芒金', color: '#ebc675' },
      { code: 'T3', name: '月光银', color: '#f2f4f7' },
    ],
    board: '#231f1d',
    nail: '#d9b56c',
    rim: '#463d37',
    darkBoard: true,
  },
  {
    id: 'calico-cat',
    name: '三花萌宠 · 原木底',
    thread: '#cf7842',
    threads: [
      { code: 'T1', name: '可可棕', color: '#4a372d' },
      { code: 'T2', name: '暖橘棕', color: '#cf7842' },
      { code: 'T3', name: '奶油杏', color: '#e6b888' },
    ],
    board: '#f5ede0',
    nail: '#a77e4e',
    rim: '#d9c9b1',
    darkBoard: false,
  },
  {
    id: 'spring-tulip',
    name: '春日郁金香 · 宣纸底',
    thread: '#c84b68',
    threads: [
      { code: 'T1', name: '松针绿', color: '#466b4c' },
      { code: 'T2', name: '胭脂粉', color: '#c84b68' },
      { code: 'T3', name: '柔雾粉', color: '#e890a4' },
    ],
    board: '#fbf5e9',
    nail: '#b88f56',
    rim: '#ded1ba',
    darkBoard: false,
  },
  {
    id: 'azure-bird',
    name: '青鸟飞羽 · 雾白底',
    thread: '#4b899e',
    threads: [
      { code: 'T1', name: '深靛蓝', color: '#2d4a6e' },
      { code: 'T2', name: '湖水青', color: '#4b899e' },
      { code: 'T3', name: '暖金羽', color: '#d9a44e' },
    ],
    board: '#f4f7f9',
    nail: '#98a6b5',
    rim: '#d1dce5',
    darkBoard: false,
  },
  {
    id: 'berry-paw',
    name: '粉嫩肉垫 · 樱粉底',
    thread: '#b54d6a',
    threads: [
      { code: 'T1', name: '摩卡棕', color: '#5c4338' },
      { code: 'T2', name: '玫瑰莓', color: '#b54d6a' },
      { code: 'T3', name: '樱花粉', color: '#e68fa8' },
    ],
    board: '#fcf3f4',
    nail: '#bf8e76',
    rim: '#e5ced2',
    darkBoard: false,
  },
]

export interface StringExampleMeta {
  id: StringExampleId
  label: string
  title: string
  sourceName: string
  defaultPaletteId: string
  recommendedLayout: NailLayoutMode
  recommendedColorMode: ColorWeaveMode
}

export const STRING_EXAMPLES: readonly StringExampleMeta[] = [
  { id: 'portrait', label: '人物肖像', title: '光影人物肖像 · 绕线画', sourceName: '人物肖像 · 原创示例', defaultPaletteId: 'classic-ink', recommendedLayout: 'ring', recommendedColorMode: 'mono' },
  { id: 'cat', label: '三花猫咪', title: '三花猫咪 · 绕线画', sourceName: '三花猫咪 · 原创示例', defaultPaletteId: 'calico-cat', recommendedLayout: 'contour', recommendedColorMode: 'multi' },
  { id: 'heart', label: '饱满爱心', title: '饱满爱心 · 多色绕线画', sourceName: '饱满爱心 · 原创示例', defaultPaletteId: 'classic-warm', recommendedLayout: 'contour', recommendedColorMode: 'multi' },
  { id: 'tulip', label: '春日郁金香', title: '春日郁金香 · 多色绕线画', sourceName: '春日郁金香 · 原创示例', defaultPaletteId: 'spring-tulip', recommendedLayout: 'contour', recommendedColorMode: 'multi' },
  { id: 'crescent', label: '新月繁星', title: '新月繁星 · 多色绕线画', sourceName: '新月繁星 · 原创示例', defaultPaletteId: 'starlight-gold', recommendedLayout: 'contour', recommendedColorMode: 'multi' },
  { id: 'rose', label: '古典玫瑰', title: '古典玫瑰 · 光影绕线画', sourceName: '古典玫瑰 · 原创示例', defaultPaletteId: 'classic-warm', recommendedLayout: 'ring', recommendedColorMode: 'mono' },
  { id: 'bird', label: '青鸟飞羽', title: '青鸟飞羽 · 多色绕线画', sourceName: '青鸟飞羽 · 原创示例', defaultPaletteId: 'azure-bird', recommendedLayout: 'contour', recommendedColorMode: 'multi' },
  { id: 'paw', label: '萌宠肉垫', title: '萌宠肉垫 · 多色绕线画', sourceName: '萌宠肉垫 · 原创示例', defaultPaletteId: 'berry-paw', recommendedLayout: 'contour', recommendedColorMode: 'multi' },
]

export interface StringLayerInput {
  name: string
  color: string
  map: Float32Array
  regionMask?: Float32Array
  importance?: Float32Array
}

export interface StringPeg {
  number: number
  x: number
  y: number
  nx: number
  ny: number
  angle: number
  layerIndex: number
  color: string
}

export interface StringArtStep {
  step: number
  from: number
  to: number
  direction: '顺时针' | '逆时针'
  span: number
  lengthCm: number
  cumulativeMeters: number
  layerIndex: number
  color: string
  colorName: string
  kind: '轮廓锁边' | '内部混绕' | '光影走线'
  isColorChange: boolean
  isRestart: boolean
}

export interface ThreadLayerSummary {
  index: number
  name: string
  color: string
  startStep: number
  endStep: number
  stepCount: number
  lengthMeters: number
}

export const DEFAULT_THREAD_DARKNESS = 0.04

export interface StringArtPlan {
  mapSize: number
  threadDarkness: number
  pegCount: number
  stepCount: number
  boardSizeCm: number
  pegRadiusCm: number
  layoutMode: NailLayoutMode
  pegs: StringPeg[]
  sequence: number[]
  steps: StringArtStep[]
  layers: ThreadLayerSummary[]
  contourLoops: number[][]
  totalLengthMeters: number
}

export function padPeg(peg: number, total = 100): string {
  const digits = total >= 100 ? 3 : 2
  return String(peg).padStart(digits, '0')
}

export function pegCoordinates(pegCount: number, mapSize: number, defaultColor = '#181a18'): StringPeg[] {
  const cx = (mapSize - 1) / 2
  const cy = (mapSize - 1) / 2
  const radius = mapSize / 2 - 4
  const pegs: StringPeg[] = []
  for (let i = 0; i < pegCount; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / pegCount
    const x = Math.max(0, Math.min(mapSize - 1, Math.round(cx + Math.cos(angle) * radius)))
    const y = Math.max(0, Math.min(mapSize - 1, Math.round(cy + Math.sin(angle) * radius)))
    pegs.push({
      number: i + 1,
      x,
      y,
      nx: (x - cx) / radius,
      ny: (y - cy) / radius,
      angle,
      layerIndex: 0,
      color: defaultColor,
    })
  }
  return pegs
}

function pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (!lenSq) return Math.hypot(px - ax, py - ay)
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function starShape(nx: number, ny: number, cx: number, cy: number, r: number): number {
  const dx = Math.abs(nx - cx)
  const dy = Math.abs(ny - cy)
  const cross = Math.exp(-((dx / (r * 0.23)) ** 2 + (dy / r) ** 2) * 1.9)
    + Math.exp(-((dy / (r * 0.23)) ** 2 + (dx / r) ** 2) * 1.9)
  return Math.min(1, cross)
}

function heartImplicit(nx: number, ny: number): number {
  const x = nx * 1.15
  const y = -(ny - 0.09) * 1.2
  return (x * x + y * y - 0.56) ** 3 - x * x * y ** 3
}

function sampleRosePoint(nx: number, ny: number): [number, number, number] {
  const r = Math.hypot(nx, ny + 0.08)
  const theta = Math.atan2(ny + 0.08, nx)
  const petalWave = Math.sin(r * 21 + theta * 2.5 + Math.sin(theta * 5) * 0.42)
  const crease = Math.max(0, 1 - Math.abs(petalWave) * 2.9)
  const inBloom = r < 0.47
  const outerCupR = 0.43 + 0.075 * Math.sin(theta * 5 + 0.4)
  const rimEdge = r < outerCupR + 0.03 ? Math.max(0, 1 - Math.abs(r - outerCupR) / 0.038) : 0
  const stem = Math.abs(nx - 0.02 * Math.sin(ny * 5)) < 0.035 && ny > 0.36 && ny < 0.78
  const leafL = pointToSegmentDist(nx, ny, -0.02, 0.60, -0.32, 0.44) < 0.062
  const leafR = pointToSegmentDist(nx, ny, 0.02, 0.64, 0.31, 0.48) < 0.058
  if (!inBloom && rimEdge <= 0.12 && !stem && !leafL && !leafR) return [0, 0, 0]
  if (stem || leafL || leafR) return [0.88, 0.32, 0]

  const coreSwirl = r < 0.12 ? Math.max(0.35, 0.94 - r * 4.5) : 0
  const deepCrease = Math.min(0.96, Math.max(coreSwirl, crease * 0.90, rimEdge * 0.84))
  const petalWash = (inBloom || rimEdge > 0.2) ? Math.min(0.86, 0.12 + crease * 0.56 + coreSwirl * 0.32) : 0
  const highlightFold = (inBloom && crease < 0.25 && r > 0.14) ? 0.24 : 0
  return [
    Math.max(inBloom ? 0.05 : 0, deepCrease),
    petalWash,
    highlightFold,
  ]
}

function sampleExamplePoint(kind: StringExampleId, nx: number, ny: number): [number, number, number] {
  if (kind === 'rose') {
    return sampleRosePoint(nx, ny)
  }
  if (kind === 'heart') {
    const f = heartImplicit(nx, ny)
    if (f > 0.015) return [0, 0, 0]
    const rim = Math.abs(f) < 0.07 ? 1 : 0.65
    const shadow = Math.max(0.24, Math.min(1, rim * (0.58 - nx * 0.32 + ny * 0.25)))
    const warmGlow = Math.max(0.22, Math.min(1, 0.56 + nx * 0.36 - ny * 0.32))
    return [shadow, 0.9, warmGlow]
  }

  if (kind === 'crescent') {
    const outer = Math.hypot(nx + 0.08, ny) <= 0.74
    const inner = Math.hypot(nx - 0.21, ny + 0.07) <= 0.56
    const inMoon = outer && !inner
    const rimDist = Math.min(Math.abs(Math.hypot(nx + 0.08, ny) - 0.74), Math.abs(Math.hypot(nx - 0.21, ny + 0.07) - 0.56))
    const s1 = starShape(nx, ny, 0.36, -0.32, 0.22) > 0.26 ? 0.96 : 0
    const s2 = starShape(nx, ny, 0.48, 0.14, 0.17) > 0.26 ? 0.94 : 0
    const starVal = Math.max(s1, s2)
    if (!inMoon && !starVal) return [0, 0, 0]
    return [
      inMoon ? (rimDist < 0.09 ? 0.98 : 0.58) : 0,
      inMoon ? 0.92 : 0,
      starVal || (inMoon && nx < -0.22 && Math.abs(ny) < 0.42 ? 0.82 : 0),
    ]
  }

  if (kind === 'cat') {
    const head = (nx / 0.54) ** 2 + ((ny - 0.16) / 0.44) ** 2 <= 1
    const earL = nx >= -0.49 && nx <= -0.1 && ny <= 0.02 && ny >= -0.68 && ny >= -0.66 + Math.abs(nx + 0.3) * 2.05
    const earR = nx <= 0.49 && nx >= 0.1 && ny <= 0.02 && ny >= -0.68 && ny >= -0.66 + Math.abs(nx - 0.3) * 2.05
    const inside = head || earL || earR
    if (!inside) return [0, 0, 0]
    const eyeL = Math.hypot(nx + 0.18, (ny - 0.11) * 1.2) <= 0.085
    const eyeR = Math.hypot(nx - 0.18, (ny - 0.11) * 1.2) <= 0.085
    if (eyeL || eyeR) return [1, 0.1, 0]
    const earInnerL = nx >= -0.41 && nx <= -0.18 && ny <= -0.05 && ny >= -0.53 && ny >= -0.52 + Math.abs(nx + 0.3) * 2.05
    const earInnerR = nx <= 0.41 && nx >= 0.18 && ny <= -0.05 && ny >= -0.53 && ny >= -0.52 + Math.abs(nx - 0.3) * 2.05
    const cheek = (nx / 0.32) ** 2 + ((ny - 0.32) / 0.2) ** 2 <= 1
    const tabby = (nx < 0.06 && ny < 0.08) || ((nx - 0.24) ** 2 + (ny - 0.05) ** 2 < 0.09)
    return [
      earL || earR || ny < -0.08 ? 0.92 : 0.48,
      tabby ? 0.94 : 0.42,
      cheek || earInnerL || earInnerR ? 0.92 : 0,
    ]
  }

  if (kind === 'tulip') {
    const cupBase = ny >= -0.22 && ny <= 0.15 && Math.abs(nx) <= 0.37 * Math.sqrt(Math.max(0, 1 - ((ny + 0.12) / 0.32) ** 2))
    const leftPetal = pointToSegmentDist(nx, ny, -0.18, 0.05, -0.3, -0.46) <= 0.13
    const midPetal = pointToSegmentDist(nx, ny, 0, 0.05, 0, -0.55) <= 0.13
    const rightPetal = pointToSegmentDist(nx, ny, 0.18, 0.05, 0.3, -0.46) <= 0.13
    const flower = cupBase || leftPetal || midPetal || rightPetal
    const stem = Math.abs(nx) <= 0.048 && ny >= 0.12 && ny <= 0.72
    const leafL = pointToSegmentDist(nx, ny, -0.02, 0.62, -0.44, 0.3) <= 0.095
    const leafR = pointToSegmentDist(nx, ny, 0.02, 0.62, 0.44, 0.3) <= 0.095
    const greenery = stem || leafL || leafR
    if (!flower && !greenery) return [0, 0, 0]
    const innerGlow = midPetal || ((nx / 0.18) ** 2 + ((ny + 0.22) / 0.26) ** 2 <= 1 && flower)
    return [
      greenery ? 0.96 : 0,
      flower ? 0.94 : 0,
      innerGlow ? 0.92 : 0,
    ]
  }

  if (kind === 'bird') {
    const body = ((nx + 0.04) * 0.86 + ny * 0.5) ** 2 / 0.21 + ((nx + 0.04) * 0.5 - ny * 0.86) ** 2 / 0.045 <= 1
    const head = Math.hypot(nx - 0.31, ny + 0.2) <= 0.145
    const beak = pointToSegmentDist(nx, ny, 0.4, -0.22, 0.59, -0.15) <= 0.038
    const wingUp = pointToSegmentDist(nx, ny, -0.02, -0.02, -0.26, -0.62) <= 0.14
    const wingMid = pointToSegmentDist(nx, ny, -0.05, 0.03, -0.47, -0.37) <= 0.12
    const tail = pointToSegmentDist(nx, ny, -0.22, 0.15, -0.6, 0.46) <= 0.095
    const inWing = wingUp || wingMid || tail
    const inBody = body || head || beak
    if (!inWing && !inBody) return [0, 0, 0]
    const breast = (inBody && (beak || (nx > 0.04 && ny > -0.18))) || Math.hypot(nx - 0.31, ny + 0.2) <= 0.11
    return [
      inWing || tail ? 0.94 : 0.4,
      inBody && !beak ? 0.92 : 0.45,
      breast ? 0.95 : 0,
    ]
  }

  // paw
  const mainPad = (nx / 0.39) ** 2 + ((ny - 0.25) / 0.28) ** 2 <= 1
  const toeBeans = [
    [-0.5, -0.15, -0.28],
    [-0.19, -0.46, -0.1],
    [0.19, -0.46, 0.1],
    [0.5, -0.15, 0.28],
  ].some(([cx, cy, rot]) => {
    const dx = nx - cx
    const dy = ny - cy
    const u = dx * Math.cos(rot) + dy * Math.sin(rot)
    const v = -dx * Math.sin(rot) + dy * Math.cos(rot)
    return (u / 0.112) ** 2 + (v / 0.16) ** 2 <= 1
  })
  if (!mainPad && !toeBeans) return [0, 0, 0]
  const outerPawRim = (mainPad && ((nx / 0.31) ** 2 + ((ny - 0.25) / 0.21) ** 2 > 1)) || !mainPad
  return [
    outerPawRim ? 0.9 : 0.45,
    mainPad ? 0.92 : 0,
    toeBeans ? 0.96 : 0,
  ]
}

export function computeImportanceMap(darknessMap: Float32Array, mapSize: number): Float32Array {
  const importance = new Float32Array(mapSize * mapSize)
  const center = (mapSize - 1) / 2
  const radius = mapSize / 2 - 4

  for (let y = 1; y < mapSize - 1; y++) {
    for (let x = 1; x < mapSize - 1; x++) {
      const idx = y * mapSize + x
      const rNorm = Math.hypot(x - center, y - center) / radius
      if (rNorm > 1) {
        importance[idx] = 1
        continue
      }
      const tl = darknessMap[(y - 1) * mapSize + (x - 1)]
      const t = darknessMap[(y - 1) * mapSize + x]
      const tr = darknessMap[(y - 1) * mapSize + (x + 1)]
      const l = darknessMap[y * mapSize + (x - 1)]
      const c = darknessMap[idx]
      const r = darknessMap[y * mapSize + (x + 1)]
      const bl = darknessMap[(y + 1) * mapSize + (x - 1)]
      const b = darknessMap[(y + 1) * mapSize + x]
      const br = darknessMap[(y + 1) * mapSize + (x + 1)]
      const gx = -tl + tr - 2 * l + 2 * r - bl + br
      const gy = -tl - 2 * t - tr + bl + 2 * b + br
      const grad = Math.min(1, Math.hypot(gx, gy) / 1.4)
      const localAvg = (tl + t + tr + l + r + bl + b + br) / 8
      const dog = Math.min(1, Math.abs(c - localAvg) * 3.4)
      const centerFocus = Math.exp(-8 * rNorm * rNorm)
      importance[idx] = 1 + 0.75 * grad + 0.4 * dog + 12 * centerFocus
    }
  }
  return importance
}

function contrastSettings(mode: ContrastMode) {
  if (mode === 'soft') return { gamma: 1, highlightCut: 0.97, sharpen: 0 }
  if (mode === 'dramatic') return { gamma: 1.35, highlightCut: 0.93, sharpen: 0.35 }
  return { gamma: 1.1, highlightCut: 0.96, sharpen: 0.15 }
}

export function createExampleLayers(
  kind: StringExampleId,
  mapSize = DEFAULT_STRING_MAP_SIZE,
  palette: StringPalette = STRING_PALETTES[0],
  colorWeaveMode: ColorWeaveMode = kind === 'portrait' || kind === 'rose' ? 'mono' : 'multi',
  contrastMode: ContrastMode = 'portrait',
): StringLayerInput[] {
  if (kind === 'portrait') {
    return rgbaToPhotoLayers(
      getPortraitExampleRgba(),
      PORTRAIT_EXAMPLE_SIZE,
      PORTRAIT_EXAMPLE_SIZE,
      mapSize,
      palette,
      false,
      palette.darkBoard,
      colorWeaveMode,
      contrastMode,
    )
  }
  const len = mapSize * mapSize
  const center = (mapSize - 1) / 2
  const radius = mapSize / 2 - 6

  if (colorWeaveMode === 'mono') {
    const map = new Float32Array(len)
    const mask = new Float32Array(len)
    for (let y = 0; y < mapSize; y++) {
      for (let x = 0; x < mapSize; x++) {
        const dx = x - center
        const dy = y - center
        if (dx * dx + dy * dy > radius * radius) continue
        const i = y * mapSize + x
        const [v0, v1, v2] = sampleExamplePoint(kind, dx / radius, dy / radius)
        const combined = kind === 'rose'
          ? Math.max(v0, v1 * 0.42)
          : Math.max(v0, v1 * 0.95, v2 * 0.85)
        map[i] = combined
        mask[i] = combined > 0.15 ? 1 : 0
      }
    }
    const finalImp = computeImportanceMap(map, mapSize)
    return [{
      name: palette.threads[0].name,
      color: palette.threads[0].color,
      map,
      regionMask: mask,
      importance: finalImp,
    }]
  }

  const m0 = new Float32Array(len)
  const m1 = new Float32Array(len)
  const m2 = new Float32Array(len)
  const r0 = new Float32Array(len)
  const r1 = new Float32Array(len)
  const r2 = new Float32Array(len)

  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      const dx = x - center
      const dy = y - center
      if (dx * dx + dy * dy > radius * radius) continue
      const [v0, v1, v2] = sampleExamplePoint(kind, dx / radius, dy / radius)
      const i = y * mapSize + x
      m0[i] = v0
      m1[i] = v1
      m2[i] = v2
      r0[i] = v0 > 0.15 ? 1 : 0
      r1[i] = v1 > 0.15 ? 1 : 0
      r2[i] = v2 > 0.15 ? 1 : 0
    }
  }

  return [
    { name: palette.threads[0].name, color: palette.threads[0].color, map: m0, regionMask: r0, importance: computeImportanceMap(m0, mapSize) },
    { name: palette.threads[1].name, color: palette.threads[1].color, map: m1, regionMask: r1, importance: computeImportanceMap(m1, mapSize) },
    { name: palette.threads[2].name, color: palette.threads[2].color, map: m2, regionMask: r2, importance: computeImportanceMap(m2, mapSize) },
  ].filter(layer => layer.regionMask!.some(v => v > 0))
}

export function createExampleDarknessMap(kind: StringExampleId, mapSize = DEFAULT_STRING_MAP_SIZE): Float32Array {
  const layers = createExampleLayers(kind, mapSize, STRING_PALETTES[0], 'mono')
  return layers[0]?.map ?? new Float32Array(mapSize * mapSize)
}

function photoSampleIndex(x: number, y: number, width: number, height: number, mapSize: number) {
  const center = (mapSize - 1) / 2
  const radius = mapSize / 2 - 4
  const nx = (x - center) / (2 * radius) + 0.5
  const ny = (y - center) / (2 * radius) + 0.5
  if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return -1
  const side = Math.min(width, height)
  const sx = Math.min(width - 1, Math.floor((width - side) / 2) + Math.floor(nx * side))
  const sy = Math.min(height - 1, Math.floor((height - side) / 2) + Math.floor(ny * side))
  return (sy * width + sx) * 4
}

export function rgbaToDarknessMap(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  mapSize = DEFAULT_STRING_MAP_SIZE,
  invert = false,
  contrastMode: ContrastMode = 'portrait',
): Float32Array {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('图片尺寸无效，无法提取绕线轮廓。')
  }
  let opaqueCount = 0
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] >= 16) opaqueCount++
  }
  if (opaqueCount === 0) {
    throw new Error('这张图片全部透明，无法提取绕线轮廓，请换一张主体清晰的图片。')
  }

  const lum = new Float32Array(mapSize * mapSize)
  const center = (mapSize - 1) / 2
  const radius = mapSize / 2 - 4
  const samples: number[] = []

  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      const idx = photoSampleIndex(x, y, width, height, mapSize)
      let val = 255
      if (idx >= 0) {
        const alpha = rgba[idx + 3] / 255
        const r = rgba[idx] * alpha + 255 * (1 - alpha)
        const g = rgba[idx + 1] * alpha + 255 * (1 - alpha)
        const b = rgba[idx + 2] * alpha + 255 * (1 - alpha)
        val = 0.299 * r + 0.587 * g + 0.114 * b
      } else if (invert) {
        val = 0
      }
      lum[y * mapSize + x] = val
      if ((x - center) ** 2 + (y - center) ** 2 <= radius ** 2) {
        samples.push(val)
      }
    }
  }

  // Robust 2%–98% percentile stretch prevents single dust pixels from crushing photo tonal range
  samples.sort((a, b) => a - b)
  const lo = samples.length ? samples[Math.floor(samples.length * 0.02)] : 0
  const hi = samples.length ? samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.98))] : 255
  const span = Math.max(8, hi - lo)
  // Near-flat photos keep their absolute brightness; auto-contrast fades in as the tonal range widens.
  const stretch = Math.max(0, Math.min(1, (hi - lo - 24) / 72))
  const { gamma, highlightCut, sharpen } = contrastSettings(contrastMode)

  const toned = new Float32Array(mapSize * mapSize)
  for (let i = 0; i < lum.length; i++) {
    const stretched = Math.max(0, Math.min(1, (lum[i] - lo) / span))
    const norm = stretched * stretch + (lum[i] / 255) * (1 - stretch)
    const rawLight = invert ? 1 - norm : norm
    if (rawLight > highlightCut) {
      toned[i] = 0
    } else {
      const scaled = Math.max(0, Math.min(1, 1 - rawLight / highlightCut))
      toned[i] = scaled < 0.02 ? 0 : Math.pow(scaled, gamma)
    }
  }

  const out = new Float32Array(mapSize * mapSize)
  for (let y = 1; y < mapSize - 1; y++) {
    for (let x = 1; x < mapSize - 1; x++) {
      const dist = Math.hypot(x - center, y - center)
      if (dist > radius) continue
      const idx = y * mapSize + x
      let sum5 = 0
      for (let dy = -2; dy <= 2; dy++) {
        const sy = Math.max(0, Math.min(mapSize - 1, y + dy))
        for (let dx = -2; dx <= 2; dx++) {
          const sx = Math.max(0, Math.min(mapSize - 1, x + dx))
          sum5 += toned[sy * mapSize + sx]
        }
      }
      const localMean = sum5 / 25
      out[idx] = Math.min(1, Math.max(0, toned[idx] + sharpen * (toned[idx] - localMean)))
    }
  }
  return out
}

function toHexColor(r: number, g: number, b: number, darkBoard: boolean): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  let cr = r
  let cg = g
  let cb = b
  if (!darkBoard && lum > 205) {
    const scale = 205 / lum
    cr *= scale
    cg *= scale
    cb *= scale
  } else if (darkBoard && lum < 85) {
    const boost = 85 - lum
    cr += boost
    cg += boost
    cb += boost
  }
  return `#${[clamp(cr), clamp(cg), clamp(cb)].map(c => c.toString(16).padStart(2, '0')).join('')}`
}

export function rgbaToPhotoLayers(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  mapSize = DEFAULT_STRING_MAP_SIZE,
  palette: StringPalette = STRING_PALETTES[0],
  usePhotoColors = true,
  invert = false,
  colorWeaveMode: ColorWeaveMode = 'mono',
  contrastMode: ContrastMode = 'portrait',
): StringLayerInput[] {
  const combined = rgbaToDarknessMap(rgba, width, height, mapSize, invert, contrastMode)
  const importance = computeImportanceMap(combined, mapSize)

  if (colorWeaveMode === 'mono') {
    const mask = new Float32Array(combined.length)
    for (let i = 0; i < combined.length; i++) mask[i] = combined[i] > 0.08 ? 1 : 0
    return [{
      name: palette.threads[0].name,
      color: palette.threads[0].color,
      map: combined,
      regionMask: mask,
      importance,
    }]
  }

  const side = Math.min(width, height)
  const startX = Math.floor((width - side) / 2)
  const startY = Math.floor((height - side) / 2)

  const borderSamples: [number, number, number][] = []
  for (const [bx, by] of [[2, 2], [side - 3, 2], [2, side - 3], [side - 3, side - 3]]) {
    const idx = ((startY + by) * width + (startX + bx)) * 4
    if (rgba[idx + 3] >= 128) borderSamples.push([rgba[idx], rgba[idx + 1], rgba[idx + 2]])
  }
  const hasBackdrop = borderSamples.length === 4 && borderSamples.every(c =>
    Math.hypot(c[0] - borderSamples[0][0], c[1] - borderSamples[0][1], c[2] - borderSamples[0][2]) < 26,
  )
  const bg = hasBackdrop ? borderSamples[0] : [255, 255, 255]

  const len = mapSize * mapSize
  const m0 = new Float32Array(len)
  const m1 = new Float32Array(len)
  const m2 = new Float32Array(len)
  const r0 = new Float32Array(len)
  const r1 = new Float32Array(len)
  const r2 = new Float32Array(len)

  const sums = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
  const center = (mapSize - 1) / 2
  const radius = mapSize / 2 - 5

  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      if ((x - center) ** 2 + (y - center) ** 2 > radius * radius) continue
      const pIdx = photoSampleIndex(x, y, width, height, mapSize)
      if (pIdx < 0) continue
      const alpha = rgba[pIdx + 3]
      const pr = rgba[pIdx]
      const pg = rgba[pIdx + 1]
      const pb = rgba[pIdx + 2]
      const i = y * mapSize + x
      const val = combined[i]

      const isSubject = alpha >= 64 && (!hasBackdrop || Math.hypot(pr - bg[0], pg - bg[1], pb - bg[2]) > 28)
      const strength = isSubject ? Math.max(val, 0.35) : (hasBackdrop ? 0 : val > 0.24 ? val : 0)
      if (strength <= 0.14) continue

      if (val >= 0.56) {
        m0[i] = val
        r0[i] = 1
        sums[0][0] += pr; sums[0][1] += pg; sums[0][2] += pb; sums[0][3]++
      }
      if (val >= 0.24 || isSubject) {
        m1[i] = Math.max(0.4, strength)
        r1[i] = 1
        sums[1][0] += pr; sums[1][1] += pg; sums[1][2] += pb; sums[1][3]++
      }
      const sat = Math.max(pr, pg, pb) - Math.min(pr, pg, pb)
      if ((sat > 38 && val < 0.72) || (val > 0.16 && val < 0.44)) {
        m2[i] = Math.max(0.45, strength * 0.9)
        r2[i] = 1
        sums[2][0] += pr; sums[2][1] += pg; sums[2][2] += pb; sums[2][3]++
      }
    }
  }

  const labels = ['深韵主色', '中调过渡', '亮部点缀']
  const out: StringLayerInput[] = []
  ;[
    [m0, r0, 0],
    [m1, r1, 1],
    [m2, r2, 2],
  ].forEach(([m, r, idx]) => {
    const mask = r as Float32Array
    if (!mask.some(v => v > 0)) return
    const layerIdx = idx as number
    const acc = sums[layerIdx]
    const photoHex = usePhotoColors && acc[3] > 0
      ? toHexColor(acc[0] / acc[3], acc[1] / acc[3], acc[2] / acc[3], palette.darkBoard)
      : palette.threads[layerIdx].color
    out.push({
      name: usePhotoColors ? `${labels[layerIdx]}（照片近似色）` : palette.threads[layerIdx].name,
      color: photoHex,
      map: m as Float32Array,
      regionMask: mask,
      importance,
    })
  })

  if (!out.length) {
    return [{
      name: palette.threads[0].name,
      color: palette.threads[0].color,
      map: combined,
      regionMask: combined.map(v => (v > 0.1 ? 1 : 0)),
      importance,
    }]
  }
  return out
}

function bresenhamLine(x0: number, y0: number, x1: number, y1: number, mapSize: number): Int32Array {
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy
  let cx = x0
  let cy = y0
  const maxLen = Math.max(dx, dy) + 1
  const indices = new Int32Array(maxLen)
  let count = 0
  while (true) {
    if (cx >= 0 && cx < mapSize && cy >= 0 && cy < mapSize) {
      indices[count++] = cy * mapSize + cx
    }
    if (cx === x1 && cy === y1) break
    const e2 = 2 * err
    if (e2 > -dy) { err -= dy; cx += sx }
    if (e2 < dx) { err += dx; cy += sy }
  }
  return indices.subarray(0, count)
}

export interface ThreadFootprint {
  indices: Int32Array
  coverage: Float32Array
}

export function threadFootprint(a: StringPeg, b: StringPeg, mapSize: number): ThreadFootprint {
  let x0 = a.x, y0 = a.y, x1 = b.x, y1 = b.y
  const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0)
  if (steep) { [x0, y0] = [y0, x0]; [x1, y1] = [y1, x1] }
  if (x0 > x1) { [x0, x1] = [x1, x0]; [y0, y1] = [y1, y0] }
  const gradient = (y1 - y0) / (x1 - x0 || 1)
  const indices: number[] = []
  const coverage: number[] = []
  for (let x = x0; x <= x1; x++) {
    const y = y0 + (x - x0) * gradient
    const low = Math.floor(y)
    const fraction = y - low
    for (let offset = 0; offset <= 1; offset++) {
      const weight = offset ? fraction : 1 - fraction
      const px = steep ? low + offset : x
      const py = steep ? x : low + offset
      if (weight <= 0 || px < 0 || py < 0 || px >= mapSize || py >= mapSize) continue
      indices.push(py * mapSize + px)
      coverage.push(weight)
    }
  }
  return { indices: new Int32Array(indices), coverage: new Float32Array(coverage) }
}

export function applyThread(field: Float32Array, footprint: ThreadFootprint, darkness: number) {
  for (let k = 0; k < footprint.indices.length; k++) {
    const index = footprint.indices[k]
    field[index] = Math.min(1, field[index] + darkness * footprint.coverage[k])
  }
}

export function threadGain(target: Float32Array, field: Float32Array, importance: Float32Array, footprint: ThreadFootprint, darkness: number) {
  let gain = 0
  for (let k = 0; k < footprint.indices.length; k++) {
    const index = footprint.indices[k]
    const delta = Math.min(1 - field[index], darkness * footprint.coverage[k])
    gain += importance[index] * delta * (2 * (target[index] - field[index]) - delta)
  }
  return gain
}

export function stringArtCoverage(plan: StringArtPlan, drawnCount = plan.steps.length): Float32Array[] {
  const fields = plan.layers.map(() => new Float32Array(plan.mapSize * plan.mapSize))
  const layers = new Map(plan.layers.map((layer, index) => [layer.index, index]))
  for (const step of plan.steps.slice(0, drawnCount)) {
    const field = fields[layers.get(step.layerIndex)!]
    applyThread(field, threadFootprint(plan.pegs[step.from - 1], plan.pegs[step.to - 1], plan.mapSize), plan.threadDarkness)
  }
  return fields
}

interface BoundaryEdge {
  sx: number
  sy: number
  ex: number
  ey: number
  dx: number
  dy: number
  used?: boolean
}

function extractMaskBoundaryLoops(mask: Float32Array, mapSize: number): Array<Array<{ x: number; y: number }>> {
  const isInside = (x: number, y: number) =>
    x >= 0 && x < mapSize && y >= 0 && y < mapSize && mask[y * mapSize + x] > 0.15

  const edgesByStart = new Map<string, BoundaryEdge[]>()
  const addEdge = (sx: number, sy: number, ex: number, ey: number) => {
    const key = `${sx},${sy}`
    const list = edgesByStart.get(key)
    const edge: BoundaryEdge = { sx, sy, ex, ey, dx: ex - sx, dy: ey - sy }
    if (list) list.push(edge)
    else edgesByStart.set(key, [edge])
  }

  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      if (!isInside(x, y)) continue
      if (!isInside(x, y - 1)) addEdge(x, y, x + 1, y)
      if (!isInside(x + 1, y)) addEdge(x + 1, y, x + 1, y + 1)
      if (!isInside(x, y + 1)) addEdge(x + 1, y + 1, x, y + 1)
      if (!isInside(x - 1, y)) addEdge(x, y + 1, x, y)
    }
  }

  const loops: Array<Array<{ x: number; y: number }>> = []
  for (const list of edgesByStart.values()) {
    for (const startEdge of list) {
      if (startEdge.used) continue
      const pts: Array<{ x: number; y: number }> = []
      let curr: BoundaryEdge | undefined = startEdge
      while (curr && !curr.used) {
        curr.used = true
        pts.push({ x: curr.sx, y: curr.sy })
        const nextList: BoundaryEdge[] = edgesByStart.get(`${curr.ex},${curr.ey}`)?.filter(e => !e.used) ?? []
        if (!nextList.length) break
        if (nextList.length === 1) {
          curr = nextList[0]
        } else {
          const prevDx = curr.dx
          const prevDy = curr.dy
          curr = nextList.sort((a, b) => {
            const turnA = Math.atan2(prevDx * a.dy - prevDy * a.dx, prevDx * a.dx + prevDy * a.dy)
            const turnB = Math.atan2(prevDx * b.dy - prevDy * b.dx, prevDx * b.dx + prevDy * b.dy)
            return turnB - turnA
          })[0]
        }
      }
      if (pts.length >= 6) {
        let smooth = pts
        for (let pass = 0; pass < 2; pass++) {
          smooth = smooth.map((pt, idx) => {
            const prev = smooth[(idx - 1 + smooth.length) % smooth.length]
            const next = smooth[(idx + 1) % smooth.length]
            return {
              x: prev.x * 0.25 + pt.x * 0.5 + next.x * 0.25,
              y: prev.y * 0.25 + pt.y * 0.5 + next.y * 0.25,
            }
          })
        }
        loops.push(smooth)
      }
    }
  }
  return loops
}

function buildContourPegsAndLoops(
  layers: StringLayerInput[],
  mapSize: number,
  targetPegCount: number,
): {
  pegs: StringPeg[]
  layerLoops: number[][][]
  layerPegSets: Set<number>[]
} {
  const layerRawLoops = layers.map(layer => {
    const mask = layer.regionMask ?? layer.map
    return extractMaskBoundaryLoops(mask, mapSize)
  })

  const loopPerimeters = layerRawLoops.map(group =>
    group.map(poly => {
      let len = 0
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i]
        const b = poly[(i + 1) % poly.length]
        len += Math.hypot(b.x - a.x, b.y - a.y)
      }
      return len
    }),
  )
  const totalPerimeter = loopPerimeters.flat().reduce((acc, v) => acc + v, 0)
  const baseSpacing = Math.max(4.5, totalPerimeter / Math.max(24, targetPegCount * 1.12))
  const mergeRadius = Math.max(3.0, baseSpacing * 0.65)

  const pegsRaw: Array<{ x: number; y: number; layerIndex: number; color: string }> = []
  const layerPegSets = layers.map(() => new Set<number>())
  const layerLoops: number[][][] = layers.map(() => [])

  const findOrAddPeg = (px: number, py: number, layerIndex: number, color: string, maxMergeDist: number): number => {
    const mask = layers[layerIndex].regionMask ?? layers[layerIndex].map
    let cx = -1
    let cy = -1
    let nearestDistanceSq = Infinity
    // Smoothed boundary samples stay close to their source pixels. Snap locally
    // to the nearest real interior pixel, including pixels at the map border.
    for (let y = Math.max(0, Math.floor(py) - 2); y <= Math.min(mapSize - 1, Math.ceil(py) + 2); y++) {
      for (let x = Math.max(0, Math.floor(px) - 2); x <= Math.min(mapSize - 1, Math.ceil(px) + 2); x++) {
        if (!(mask[y * mapSize + x] > 0.15)) continue
        const distanceSq = (x - px) ** 2 + (y - py) ** 2
        if (distanceSq < nearestDistanceSq) {
          nearestDistanceSq = distanceSq
          cx = x
          cy = y
        }
      }
    }
    if (cx < 0) return -1

    let bestIdx = -1
    let bestDist = maxMergeDist
    for (let i = 0; i < pegsRaw.length; i++) {
      const peg = pegsRaw[i]
      // A nearby peg from another layer is shareable only inside this mask too.
      if (!(mask[peg.y * mapSize + peg.x] > 0.15)) continue
      const d = Math.hypot(peg.x - cx, peg.y - cy)
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    }
    if (bestIdx >= 0) {
      layerPegSets[layerIndex].add(bestIdx)
      return bestIdx
    }
    const idx = pegsRaw.length
    pegsRaw.push({ x: cx, y: cy, layerIndex, color })
    layerPegSets[layerIndex].add(idx)
    return idx
  }

  for (let l = 0; l < layerRawLoops.length; l++) {
    for (let k = 0; k < layerRawLoops[l].length; k++) {
      const poly = layerRawLoops[l][k]
      const perim = loopPerimeters[l][k]
      const count = Math.max(8, Math.round(perim / baseSpacing))
      const effectiveMerge = Math.min(mergeRadius, Math.max(1.4, perim / (count * 1.4)))
      const stepLen = perim / count
      const loopPegs: number[] = []
      let accum = 0
      let nextTarget = 0

      for (let i = 0; i < poly.length; i++) {
        const a = poly[i]
        const b = poly[(i + 1) % poly.length]
        const seg = Math.hypot(b.x - a.x, b.y - a.y)
        while (nextTarget <= accum + seg && loopPegs.length < count) {
          const t = seg > 0 ? (nextTarget - accum) / seg : 0
          const sx = a.x + (b.x - a.x) * t
          const sy = a.y + (b.y - a.y) * t
          const pIdx = findOrAddPeg(sx, sy, l, layers[l].color, effectiveMerge)
          if (pIdx >= 0 && loopPegs[loopPegs.length - 1] !== pIdx) {
            loopPegs.push(pIdx)
          }
          nextTarget += stepLen
        }
        accum += seg
      }
      if (loopPegs.length >= 2 && loopPegs[loopPegs.length - 1] === loopPegs[0]) {
        loopPegs.pop()
      }
      if (loopPegs.length >= 3) {
        layerLoops[l].push(loopPegs)
      }
    }
  }

  const center = (mapSize - 1) / 2
  const radius = mapSize / 2 - 4
  const pegs: StringPeg[] = pegsRaw.map((raw, i) => ({
    number: i + 1,
    x: raw.x,
    y: raw.y,
    nx: (raw.x - center) / radius,
    ny: (raw.y - center) / radius,
    angle: Math.atan2(raw.y - center, raw.x - center),
    layerIndex: raw.layerIndex,
    color: raw.color,
  }))

  return { pegs, layerLoops, layerPegSets }
}

function normalizeLayersInput(
  input: Float32Array | StringLayerInput[],
  mapSize: number,
  palette: StringPalette,
): StringLayerInput[] {
  if (!(input instanceof Float32Array)) return input
  const imp = computeImportanceMap(input, mapSize)
  const mask = new Float32Array(input.length)
  for (let i = 0; i < input.length; i++) mask[i] = input[i] > 0.08 ? 1 : 0
  return [{
    name: palette.threads[0].name,
    color: palette.threads[0].color,
    map: input,
    regionMask: mask,
    importance: imp,
  }]
}

export function generateStringArt(
  input: Float32Array | StringLayerInput[],
  mapSize = DEFAULT_STRING_MAP_SIZE,
  pegCount = 200,
  stepCount = 2000,
  boardSizeCm = 20,
  layoutMode: NailLayoutMode = 'ring',
  palette: StringPalette = STRING_PALETTES[0],
  threadDarkness = DEFAULT_THREAD_DARKNESS,
): StringArtPlan {
  const safePegsRequested = Math.max(12, Math.min(280, Math.round(pegCount)))
  const safeSteps = Math.max(layoutMode === 'contour' ? 0 : 10, Math.min(4500, Math.round(stepCount)))
  const safeBoardCm = Math.max(10, Math.min(60, boardSizeCm))
  const pegRadiusCm = Number((safeBoardCm / 2 - 0.6).toFixed(2))
  const layersInput = normalizeLayersInput(input, mapSize, palette).filter(layer => layer.map.some(value => value > 0.01))

  const contourBuild = layoutMode === 'contour'
    ? buildContourPegsAndLoops(layersInput, mapSize, safePegsRequested)
    : null

  const pegs: StringPeg[] = contourBuild
    ? contourBuild.pegs
    : pegCoordinates(safePegsRequested, mapSize, layersInput[0]?.color ?? palette.thread)

  const actualPegCount = pegs.length
  const totalPairs = Math.max(1, (actualPegCount * (actualPegCount - 1)) / 2)
  const chordCache = new Array<Int32Array | null>(contourBuild ? totalPairs * 2 : totalPairs).fill(null)
  const pairIndex = (a: number, b: number) => {
    const lo = a < b ? a : b
    const hi = a < b ? b : a
    return (lo * (2 * actualPegCount - lo - 1)) / 2 + (hi - lo - 1)
  }
  // Bresenham tie pixels can differ in reverse. Contour validation must cache
  // each directed path, not accidentally reuse the opposite winding direction.
  const directedPairIndex = (a: number, b: number) => pairIndex(a, b) * 2 + (a > b ? 1 : 0)
  const getChord = (a: number, b: number) => {
    if (a === b) return new Int32Array(0)
    const idx = contourBuild ? directedPairIndex(a, b) : pairIndex(a, b)
    let cached = chordCache[idx]
    if (!cached) {
      cached = bresenhamLine(pegs[a].x, pegs[a].y, pegs[b].x, pegs[b].y, mapSize)
      chordCache[idx] = cached
    }
    return cached
  }

  const footprintCache = new Array<ThreadFootprint | undefined>(totalPairs)
  const getFootprint = (a: number, b: number) => {
    const index = pairIndex(a, b)
    return footprintCache[index] ??= threadFootprint(pegs[a], pegs[b], mapSize)
  }

  const loopAdj: Array<Array<{ from: number; to: number }>> = layersInput.map(() => [])
  if (contourBuild) {
    contourBuild.layerLoops.forEach((loops, l) => {
      for (const loop of loops) {
        for (let i = 0; i < loop.length; i++) {
          loopAdj[l].push({ from: loop[i], to: loop[(i + 1) % loop.length] })
        }
      }
    })
  }

  const outlineEdgeCount = contourBuild
    ? loopAdj.reduce((sum, list) => sum + list.length, 0)
    : 0
  const remainingSteps = Math.max(layersInput.length * 10, safeSteps - outlineEdgeCount)
  const layerEnergies = layersInput.map(layer => {
    let e = 0
    for (let i = 0; i < layer.map.length; i++) e += layer.map[i]
    return Math.max(1, e)
  })
  const totalEnergy = layerEnergies.reduce((a, b) => a + b, 0)
  const weaveBudgets = layerEnergies.map((energy, idx) =>
    idx === layerEnergies.length - 1
      ? Math.max(8, remainingSteps - layerEnergies.slice(0, -1).reduce((s, e2) => s + Math.max(8, Math.round((e2 / totalEnergy) * remainingSteps)), 0))
      : Math.max(8, Math.round((energy / totalEnergy) * remainingSteps)),
  )

  const usedGlobal = new Uint8Array(totalPairs)
  const sequence: number[] = []
  const steps: StringArtStep[] = []
  const layerSummaries: ThreadLayerSummary[] = []
  let cumulativeCm = 0

  const lineFade = 0.28

  const recordStep = (
    fromIdx: number,
    toIdx: number,
    layerIdx: number,
    kind: '轮廓锁边' | '内部混绕' | '光影走线',
    isFirstOfLayer: boolean,
  ) => {
    const fromPeg = pegs[fromIdx]
    const toPeg = pegs[toIdx]
    const cw = (toIdx - fromIdx + actualPegCount) % actualPegCount
    const ccw = (fromIdx - toIdx + actualPegCount) % actualPegCount
    const direction: '顺时针' | '逆时针' = cw <= ccw ? '顺时针' : '逆时针'
    const span = Math.min(cw, ccw)
    const lengthCm = Number((Math.hypot(toPeg.nx - fromPeg.nx, toPeg.ny - fromPeg.ny) * pegRadiusCm).toFixed(2))
    cumulativeCm += lengthCm
    if (!sequence.length) sequence.push(fromPeg.number)
    sequence.push(toPeg.number)
    steps.push({
      step: steps.length + 1,
      from: fromPeg.number,
      to: toPeg.number,
      direction,
      span,
      lengthCm,
      cumulativeMeters: Number((cumulativeCm / 100).toFixed(2)),
      layerIndex: layerIdx,
      color: layersInput[layerIdx].color,
      colorName: layersInput[layerIdx].name,
      kind,
      isColorChange: isFirstOfLayer && steps.length > 0,
      isRestart: steps.length > 0 && steps[steps.length - 1].to !== fromPeg.number,
    })
  }

  for (let l = 0; l < layersInput.length; l++) {
    const layer = layersInput[l]
    const regionMask = layer.regionMask ?? layer.map
    const importanceMap = layer.importance ?? computeImportanceMap(layer.map, mapSize)
    const layerStartIdx = steps.length
    const startCumCm = cumulativeCm

    const coverage = new Float32Array(layer.map.length)
    const ringUses = new Uint8Array(totalPairs)
    const residual = new Float32Array(layer.map.length)
    for (let i = 0; i < layer.map.length; i++) {
      residual[i] = regionMask[i] > 0.15 ? Math.max(layer.map[i], 0.25) : -0.42
    }

    const candidatePegs = contourBuild
      ? Array.from(contourBuild.layerPegSets[l])
      : pegs.map((_, i) => i)

    if (candidatePegs.length < 2) continue

    // Masks do not change during solving: validate every pixel once per layer
    // and directed chord, then reuse that result for outlines, hops and weaving.
    const chordValidity = contourBuild ? new Uint8Array(totalPairs * 2) : null
    const isInsideRegion = (from: number, to: number) => {
      if (from === to || !chordValidity) return false
      const index = directedPairIndex(from, to)
      if (!chordValidity[index]) {
        const line = getChord(from, to)
        chordValidity[index] = line.length > 0 && line.every(pixel => regionMask[pixel] > 0.15) ? 1 : 2
      }
      return chordValidity[index] === 1
    }

    let current = candidatePegs[0]
    let previous = -1
    const recentVisited: number[] = []
    let markedLayerChange = false

    if (contourBuild && contourBuild.layerLoops[l].length > 0) {
      for (const loop of contourBuild.layerLoops[l]) {
        if (steps.length >= safeSteps) break
        current = loop[0]
        for (let i = 0; i < loop.length && steps.length < safeSteps; i++) {
          const fromIdx = loop[i]
          const toIdx = loop[(i + 1) % loop.length]
          // Skip unsafe edges; recordStep marks the next disconnected start.
          if (!isInsideRegion(fromIdx, toIdx)) continue
          usedGlobal[pairIndex(fromIdx, toIdx)] = 1
          const line = getChord(fromIdx, toIdx)
          for (let p = 0; p < line.length; p++) {
            residual[line[p]] = Math.max(-0.35, residual[line[p]] - lineFade * 0.65)
          }
          recordStep(fromIdx, toIdx, l, '轮廓锁边', !markedLayerChange)
          markedLayerChange = true
          previous = fromIdx
          current = toIdx
        }
      }
    }

    const targetWeaveSteps = Math.max(0, Math.min(weaveBudgets[l], safeSteps - steps.length))
    const minPegSpan = layoutMode === 'ring' ? Math.max(8, Math.floor(actualPegCount * 0.075)) : 2

    const subGroups = contourBuild && contourBuild.layerLoops[l].length > 1
      ? contourBuild.layerLoops[l].map(loop => Array.from(new Set(loop)))
      : [candidatePegs]
    const totalGroupSize = subGroups.reduce((s, g) => s + g.length, 0) || 1
    let allocatedWeave = 0
    const subBudgets = subGroups.map((g, gi) => {
      if (gi === subGroups.length - 1) return Math.max(0, targetWeaveSteps - allocatedWeave)
      const part = Math.max(4, Math.round((g.length / totalGroupSize) * targetWeaveSteps))
      allocatedWeave += part
      return part
    })

    for (let gi = 0; gi < subGroups.length && steps.length < safeSteps; gi++) {
      const activePegs = subGroups[gi]
      if (activePegs.length < 3) continue
      const subBudget = Math.min(subBudgets[gi], safeSteps - steps.length)
      if (!activePegs.includes(current)) {
        current = activePegs[0]
        previous = -1
      }

      for (let w = 0; w < subBudget && steps.length < safeSteps; w++) {
        const pickChord = (allowUsed: boolean) => {
          let bestNext = -1
          let bestScore = -Infinity
          let bestLine: Int32Array | null = null
          const halfWeight = lineFade * 0.5

          for (let ci = 0; ci < activePegs.length; ci++) {
            const cand = activePegs[ci]
            if (cand === current || cand === previous) continue
            if (layoutMode === 'ring') {
              const diff = Math.abs(cand - current)
              if (Math.min(diff, actualPegCount - diff) < minPegSpan) continue
              if (!allowUsed && recentVisited.includes(cand)) continue
            } else {
              const distPx = Math.hypot(pegs[cand].x - pegs[current].x, pegs[cand].y - pegs[current].y)
              if (distPx < 6) continue
            }
            if (layoutMode === 'ring') {
              if (ringUses[pairIndex(current, cand)] >= 3) continue
            } else if (!allowUsed && usedGlobal[pairIndex(current, cand)] > 0) continue

            if (layoutMode === 'ring') {
              const footprint = getFootprint(current, cand)
              const score = threadGain(layer.map, coverage, importanceMap, footprint, threadDarkness) / Math.hypot(pegs[cand].x - pegs[current].x, pegs[cand].y - pegs[current].y)
              if (score > bestScore) { bestScore = score; bestNext = cand }
              continue
            }

            if (!isInsideRegion(current, cand)) continue
            const line = getChord(current, cand)
            if (line.length < 3) continue

            let sum = 0
            for (let k = 0; k < line.length; k++) {
              const idxPx = line[k]
              sum += importanceMap[idxPx] * (residual[idxPx] - halfWeight)
            }

            const score = sum / Math.pow(line.length, 0.85)
            if (score > bestScore) {
              bestScore = score
              bestNext = cand
              bestLine = line
            }
          }
          return { bestNext, bestLine, bestScore }
        }

        let found = pickChord(false)

        if (layoutMode === 'ring' && (found.bestNext < 0 || found.bestScore <= 0)) break

        if (found.bestNext < 0) {
          if (contourBuild) {
            const hop = loopAdj[l].find(edge => edge.from === current && edge.to !== previous
              && activePegs.includes(edge.to) && isInsideRegion(edge.from, edge.to))
            if (hop) {
              const hopLine = getChord(hop.from, hop.to)
              recordStep(hop.from, hop.to, l, '轮廓锁边', !markedLayerChange)
              markedLayerChange = true
              for (let p = 0; p < hopLine.length; p++) {
                residual[hopLine[p]] = Math.max(-0.35, residual[hopLine[p]] - lineFade * 0.4)
              }
              previous = hop.from
              current = hop.to
              continue
            }
          }
          found = pickChord(true)
        }
        // The budget is a ceiling, not a reason to bridge holes or white space.
        // Stop this group if no legal continuation exists; later groups restart.
        if (found.bestNext < 0) break
        if (!found.bestLine) found.bestLine = getChord(current, found.bestNext)

        usedGlobal[pairIndex(current, found.bestNext)] = 1
        if (layoutMode === 'ring') {
          ringUses[pairIndex(current, found.bestNext)]++
          applyThread(coverage, getFootprint(current, found.bestNext), threadDarkness)
        } else {
          for (let k = 0; k < found.bestLine.length; k++) {
            const p = found.bestLine[k]
            residual[p] = Math.max(-0.35, residual[p] - lineFade)
          }
        }

        recordStep(current, found.bestNext, l, layoutMode === 'ring' ? '光影走线' : '内部混绕', !markedLayerChange)
        markedLayerChange = true
        recentVisited.push(current)
        if (recentVisited.length > 12) recentVisited.shift()
        previous = current
        current = found.bestNext
      }
    }

    if (steps.length > layerStartIdx) {
      layerSummaries.push({
        index: l,
        name: layer.name,
        color: layer.color,
        startStep: layerStartIdx + 1,
        endStep: steps.length,
        stepCount: steps.length - layerStartIdx,
        lengthMeters: Number(((cumulativeCm - startCumCm) / 100).toFixed(2)),
      })
    }
  }

  const contourLoops = contourBuild
    ? contourBuild.layerLoops.flat().map(loop => loop.map(idx => pegs[idx].number))
    : []

  return {
    mapSize,
    threadDarkness,
    pegCount: actualPegCount,
    stepCount: steps.length,
    boardSizeCm: safeBoardCm,
    pegRadiusCm,
    layoutMode,
    pegs,
    sequence,
    steps,
    layers: layerSummaries,
    contourLoops,
    totalLengthMeters: Number((cumulativeCm / 100).toFixed(2)),
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

export function buildNailTemplateSvg(plan: StringArtPlan, title: string, palette: StringPalette): string {
  const widthMm = plan.boardSizeCm * 10 + 30
  const heightMm = plan.boardSizeCm * 10 + 46
  const cx = widthMm / 2
  const cy = 22 + plan.boardSizeCm * 5
  const boardR = plan.boardSizeCm * 5
  const pegR = boardR - 6
  const safeTitle = escapeXml(title.trim() || '绕线画作品')

  const contourGuidesSvg = plan.layoutMode === 'contour'
    ? plan.contourLoops.map(loop => {
      if (loop.length < 3) return ''
      const points = loop
        .map(num => {
          const peg = plan.pegs[num - 1]
          return `${(cx + peg.nx * pegR).toFixed(2)},${(cy + peg.ny * pegR).toFixed(2)}`
        })
        .join(' ')
      return `<polygon points="${points}" stroke="#c2c7b7" stroke-width="0.35" stroke-dasharray="1.8 1.4" fill="none" />`
    }).join('\n  ')
    : ''

  const nailsSvg = plan.pegs.map((peg, index) => {
    const px = Number((cx + peg.nx * pegR).toFixed(2))
    const py = Number((cy + peg.ny * pegR).toFixed(2))
    const isStart = peg.number === 1
    let lx = px
    let ly = py - 3.6
    if (plan.layoutMode === 'ring') {
      const labelOffset = index % 2 === 0 ? 4.4 : 8.1
      lx = Number((cx + peg.nx * (pegR + labelOffset)).toFixed(2))
      ly = Number((cy + peg.ny * (pegR + labelOffset)).toFixed(2))
    } else {
      const dist = Math.hypot(peg.nx, peg.ny) || 1
      const stepOut = index % 2 === 0 ? 3.2 : 5.2
      lx = Number((px + (peg.nx / dist) * stepOut).toFixed(2))
      ly = Number((py + (peg.ny / dist) * stepOut).toFixed(2))
    }
    const labelText = isStart ? `★${padPeg(peg.number, plan.pegCount)}` : padPeg(peg.number, plan.pegCount)
    const showLabel = plan.layoutMode === 'ring' ? (plan.pegCount <= 120 || index % 2 === 0 || isStart) : (index % 2 === 0 || isStart)
    return `<g>
      <circle cx="${px}" cy="${py}" r="${isStart ? '1.35' : '0.78'}" fill="${isStart ? '#a9483b' : '#fff'}" stroke="${isStart ? '#7c2b21' : peg.color}" stroke-width="0.34" />
      <circle cx="${px}" cy="${py}" r="0.22" fill="#35392f" />
      ${showLabel ? `<text x="${lx}" y="${ly}" font-size="${isStart ? '2.4' : '1.9'}" font-weight="${isStart ? '700' : '500'}" fill="${isStart ? '#a9483b' : '#4a5042'}" text-anchor="middle" dominant-baseline="central">${labelText}</text>` : ''}
    </g>`
  }).join('\n    ')

  const startY = (cy - pegR - 12.2).toFixed(2)
  const scaleY = heightMm - 15
  const textSafeFooterY = heightMm - 6
  const modeLabel = plan.layoutMode === 'contour' ? '自由轮廓布钉' : '外圈固定钉盘'

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${widthMm} ${heightMm}" fill="none">
  <title>${safeTitle} · 1:1 钉位打孔模板</title>
  <desc>TraceCraft 绕线画工坊 1:1 实际尺寸钉位打孔图纸（${modeLabel}），包含 50 mm 比例尺与起线钉定位。</desc>
  <rect width="${widthMm}" height="${heightMm}" fill="#ffffff" />
  <text x="15" y="10.5" font-size="4.4" font-weight="600" fill="#343a2e">${safeTitle} · 1:1 钉位模板</text>
  <text x="${widthMm - 15}" y="10.5" font-size="3.1" fill="#707766" text-anchor="end">${plan.boardSizeCm} cm 木板 · ${modeLabel} · ${plan.pegCount} 钉 · ${plan.stepCount} 步 · ${escapeXml(palette.name)}</text>
  <text x="${cx}" y="${startY}" font-size="2.8" font-weight="700" fill="#a9483b" text-anchor="middle">★ 01 号起线钉（共 ${plan.layers.length} 色线 · 按顺时针编号）</text>
  <circle cx="${cx}" cy="${cy}" r="${boardR}" stroke="#9ea494" stroke-width="0.4" stroke-dasharray="2.5 2" />
  <path d="M${cx - 5} ${cy}H${cx + 5}M${cx} ${cy - 5}V${cy + 5}" stroke="#a0a695" stroke-width="0.35" />
  <circle cx="${cx}" cy="${cy}" r="0.8" fill="#828876" />
  ${contourGuidesSvg}
  ${nailsSvg}
  <g>
    <path d="M15 ${scaleY - 1.5}V${scaleY + 1.5}M15 ${scaleY}H65M65 ${scaleY - 1.5}V${scaleY + 1.5}" stroke="#35392f" stroke-width="0.45" />
    <text x="70" y="${scaleY + 1}" font-size="2.9" font-weight="600" fill="#35392f">50 mm 比例尺 · 打印务必选择「实际大小 / 100% 缩放」</text>
  </g>
  <text x="15" y="${textSafeFooterY}" font-size="2.6" fill="#8d533d">安全提示：${STRING_SAFETY_NOTICE}</text>
</svg>`
}

export function windingSequenceCsv(plan: StringArtPlan, title: string, paletteName: string): string {
  const safeTitle = title.trim() || '绕线画作品'
  const modeLabel = plan.layoutMode === 'contour' ? '自由轮廓布钉' : '外圈固定钉盘'
  const rows: (string | number)[][] = [
    ['作品名称', safeTitle],
    ['布钉模式', modeLabel],
    ['底板直径 (cm)', plan.boardSizeCm],
    ['钉子数量', plan.pegCount],
    ['总绕线步数', plan.stepCount],
    ['预估用线总长 (m)', plan.totalLengthMeters],
    ['参考配色', paletteName],
    [],
    ['丝线颜色分布', '色号 HEX', '起始步', '结束步', '步数', '预估用量 (m)'],
    ...plan.layers.map(layer => [
      layer.name,
      layer.color,
      layer.startStep,
      layer.endStep,
      layer.stepCount,
      layer.lengthMeters,
    ]),
    [],
    ['步数', '起始钉号', '目标钉号', '绕线类型', '丝线颜色', 'HEX', '绕向参考', '单步弦长(cm)', '累计线长(m)', '起线操作'],
    ...plan.steps.map(step => [
      step.step,
      padPeg(step.from, plan.pegCount),
      padPeg(step.to, plan.pegCount),
      step.kind,
      step.colorName,
      step.color,
      step.direction,
      step.lengthCm,
      step.cumulativeMeters,
      step.isColorChange ? '换色起线' : step.isRestart ? '剪线重新起线' : '继续绕线',
    ]),
    [],
    ['说明', '固定钉模式使用固定覆盖参数计算明暗叠加；请按顺序绕线并保持张力均匀。预览不保证实物一致，效果受线径、材料和张力影响。'],
    ['安全提示', STRING_SAFETY_NOTICE],
  ]
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')
}

export function safeStringArtFilename(name: string) {
  return sanitizeFilename(name, 'TraceCraft-绕线画')
}
