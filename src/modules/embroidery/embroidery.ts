export type StitchMode = 'long-short' | 'cross-stitch' | 'punch-needle'

export type EmbroideryExampleId =
  | 'camellia'
  | 'cat'
  | 'persimmon'
  | 'strawberry'
  | 'crescent'
  | 'landscape'

export interface DmcThreadColor {
  code: string
  name: string
  color: string
  symbol: string
}

export interface FabricPreset {
  id: string
  name: string
  subtitle: string
  board: string
  weave: string
  hoopRim: string
  darkFabric: boolean
}

export interface EmbroideryStitch {
  index: number
  kind: 'long-short' | 'satin' | 'backstitch' | 'cross' | 'punch-loop'
  /** Normalized hoop coordinates in [-1, 1] */
  x0: number
  y0: number
  x1: number
  y1: number
  angle: number
  lengthMm: number
  dmcCode: string
  colorName: string
  color: string
  symbol: string
  strands: number
  layerIndex: number
  gridX?: number
  gridY?: number
}

export interface EmbroideryColorLayer {
  index: number
  dmcCode: string
  colorName: string
  color: string
  symbol: string
  strands: number
  startStep: number
  endStep: number
  stitchCount: number
  lengthMeters: number
}

export interface EmbroideryContourPolyline {
  color: string
  points: Array<{ x: number; y: number }>
}

export interface EmbroideryPlan {
  stitchMode: StitchMode
  hoopSizeCm: number
  gridWidth: number
  gridHeight: number
  cellSizeNorm: number
  stitches: EmbroideryStitch[]
  layers: EmbroideryColorLayer[]
  contours: EmbroideryContourPolyline[]
  totalStitches: number
  totalMeters: number
  estimatedMinutes: number
  darkFabric: boolean
}

export interface EmbroideryExampleMeta {
  id: EmbroideryExampleId
  label: string
  title: string
  sourceName: string
  recommendedMode: StitchMode
  recommendedFabricId: string
  removeBg: boolean
}

export const HOOP_SIZES_CM = [12, 15, 20, 24] as const
export type HoopSizeCm = (typeof HOOP_SIZES_CM)[number]

export const DENSITY_LEVELS = [28, 36, 46, 56] as const
export type DensityLevel = (typeof DENSITY_LEVELS)[number]

export const COLOR_LIMITS = [6, 8, 12, 16] as const
export type ColorLimit = (typeof COLOR_LIMITS)[number]

export const EMBROIDERY_SAFETY_NOTICE =
  '绣针针尖锐利，穿针换线与裁剪时请注意指尖安全；长短针拉线松紧适中即可，避免过度拉紧导致绣布起皱，儿童请在成人陪同下使用。'

export const STITCH_MODE_INFO: Record<
  StitchMode,
  { name: string; badge: string; tip: string }
> = {
  'long-short': {
    name: '长短针',
    badge: '流场丝光渐变',
    tip: '沿边缘结构张量流场排布长短错落的绣线，自然过渡光影起伏与花瓣绒感，适合花卉、肖像与风景。',
  },
  'cross-stitch': {
    name: '十字绣',
    badge: '艾达布零基础',
    tip: '清晰对应艾达布正交网格与 DMC 符号，并在轮廓边缘叠加回针勾边，数格落针最易上手。',
  },
  'punch-needle': {
    name: '戳戳绣',
    badge: '由外向内螺旋',
    tip: '先锁定轮廓外缘，再沿距离场逐圈向内铺满蓬松毛圈，立体手感饱满，半小时即可完成装饰摆件。',
  },
}

export const DMC_PALETTE: readonly DmcThreadColor[] = [
  { code: 'DMC 310', name: '曜石黑', color: '#1b1a1c', symbol: '●' },
  { code: 'DMC 3865', name: '冬季白', color: '#f7f5ee', symbol: '○' },
  { code: 'DMC 712', name: '奶油米', color: '#efe6d0', symbol: '□' },
  { code: 'DMC 415', name: '银鸽灰', color: '#b9bec2', symbol: '△' },
  { code: 'DMC 413', name: '深铅灰', color: '#4d5054', symbol: '■' },
  { code: 'DMC 321', name: '经典正红', color: '#c42b3c', symbol: '▲' },
  { code: 'DMC 666', name: '亮朱红', color: '#df3938', symbol: '◆' },
  { code: 'DMC 815', name: '勃艮第红', color: '#832030', symbol: '★' },
  { code: 'DMC 3705', name: '西瓜珊瑚', color: '#e66368', symbol: '✦' },
  { code: 'DMC 3607', name: '玫瑰洋红', color: '#cf4c7b', symbol: '✿' },
  { code: 'DMC 3609', name: '浅樱粉', color: '#efb4cb', symbol: '▽' },
  { code: 'DMC 3354', name: '豆沙粉', color: '#d88a96', symbol: '◉' },
  { code: 'DMC 945', name: '蜜桃肤', color: '#efc29e', symbol: '◐' },
  { code: 'DMC 950', name: '暖沙肤', color: '#dfb190', symbol: '⬟' },
  { code: 'DMC 742', name: '橘子金', color: '#f4a938', symbol: '◈' },
  { code: 'DMC 744', name: '鹅绒黄', color: '#f7da74', symbol: '◎' },
  { code: 'DMC 3820', name: '麦穗金', color: '#d6a442', symbol: '❖' },
  { code: 'DMC 970', name: '南瓜橘', color: '#ea6c28', symbol: '♣' },
  { code: 'DMC 900', name: '柿红橘', color: '#c84d20', symbol: '♠' },
  { code: 'DMC 702', name: '凯利翠绿', color: '#438948', symbol: '♥' },
  { code: 'DMC 704', name: '嫩芽绿', color: '#87b84a', symbol: '♢' },
  { code: 'DMC 890', name: '深松针绿', color: '#244b35', symbol: '▼' },
  { code: 'DMC 988', name: '橄榄灰绿', color: '#789265', symbol: '✚' },
  { code: 'DMC 3816', name: '鼠尾草绿', color: '#6b9e8d', symbol: '✱' },
  { code: 'DMC 3755', name: '晴空蓝', color: '#8ab4d4', symbol: '⊕' },
  { code: 'DMC 809', name: '矢车菊蓝', color: '#6b87b9', symbol: '⊗' },
  { code: 'DMC 798', name: '钴瓷蓝', color: '#395a94', symbol: '⋆' },
  { code: 'DMC 820', name: '深夜靛蓝', color: '#213158', symbol: '✡' },
  { code: 'DMC 3846', name: '湖光松石', color: '#3ea4b4', symbol: '✵' },
  { code: 'DMC 552', name: '紫罗兰', color: '#744888', symbol: '❂' },
  { code: 'DMC 210', name: '薰衣草紫', color: '#be9ecc', symbol: '≈' },
  { code: 'DMC 434', name: '焦糖琥珀', color: '#945b36', symbol: '✕' },
  { code: 'DMC 801', name: '浓烘焙棕', color: '#5b3926', symbol: '❚' },
]

export const FABRIC_PRESETS: readonly FabricPreset[] = [
  {
    id: 'linen-warm',
    name: '暖白亚麻布',
    subtitle: '百搭手绣 · 自然布纹',
    board: '#f7f1e5',
    weave: '#e5dbc7',
    hoopRim: '#c5a06f',
    darkFabric: false,
  },
  {
    id: 'cotton-raw',
    name: '原色粗棉布',
    subtitle: '复古质朴 · 戳戳绣优选',
    board: '#ede3cf',
    weave: '#d7cab1',
    hoopRim: '#b38c5a',
    darkFabric: false,
  },
  {
    id: 'aida-ivory',
    name: '象牙艾达绣布',
    subtitle: '十字绣格阵 · 孔距规整',
    board: '#fbf8ef',
    weave: '#ded7c5',
    hoopRim: '#cca97a',
    darkFabric: false,
  },
  {
    id: 'midnight-navy',
    name: '深邃夜蓝布',
    subtitle: '星夜月色 · 撞色凸显',
    board: '#1f2638',
    weave: '#2d374f',
    hoopRim: '#c9a672',
    darkFabric: true,
  },
]

export const EMBROIDERY_EXAMPLES: readonly EmbroideryExampleMeta[] = [
  {
    id: 'camellia',
    label: '山茶花开',
    title: '山茶花开 · 手工刺绣',
    sourceName: '山茶花开 · 原创示例',
    recommendedMode: 'long-short',
    recommendedFabricId: 'linen-warm',
    removeBg: true,
  },
  {
    id: 'cat',
    label: '橘猫午睡',
    title: '橘猫午睡 · 手工刺绣',
    sourceName: '橘猫午睡 · 原创示例',
    recommendedMode: 'long-short',
    recommendedFabricId: 'cotton-raw',
    removeBg: true,
  },
  {
    id: 'persimmon',
    label: '柿柿如意',
    title: '柿柿如意 · 戳戳绣摆件',
    sourceName: '柿柿如意 · 原创示例',
    recommendedMode: 'punch-needle',
    recommendedFabricId: 'cotton-raw',
    removeBg: true,
  },
  {
    id: 'strawberry',
    label: '草莓甜心',
    title: '草莓甜心 · 十字绣与勾边',
    sourceName: '草莓甜心 · 原创示例',
    recommendedMode: 'cross-stitch',
    recommendedFabricId: 'aida-ivory',
    removeBg: true,
  },
  {
    id: 'crescent',
    label: '新月星夜',
    title: '新月星夜 · 深蓝底刺绣',
    sourceName: '新月星夜 · 原创示例',
    recommendedMode: 'long-short',
    recommendedFabricId: 'midnight-navy',
    removeBg: true,
  },
  {
    id: 'landscape',
    label: '青山远黛',
    title: '青山远黛 · 丝光平针绣',
    sourceName: '青山远黛 · 原创示例',
    recommendedMode: 'long-short',
    recommendedFabricId: 'linen-warm',
    removeBg: false,
  },
]

export interface QuantizedEmbroideryGrid {
  gridWidth: number
  gridHeight: number
  /** -1 = unstitched cloth, >= 0 = index into palette */
  cells: Int16Array
  palette: DmcThreadColor[]
  /** Per-cell RGB for structure tensor gradient calculation */
  rgb: Uint8ClampedArray
}

interface ParsedDmc extends DmcThreadColor {
  r: number
  g: number
  b: number
  lum: number
}

const PARSED_DMC: ParsedDmc[] = DMC_PALETTE.map(entry => {
  const clean = entry.color.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return {
    ...entry,
    r,
    g,
    b,
    lum: 0.299 * r + 0.587 * g + 0.114 * b,
  }
})

/** Perceptual Redmean squared distance */
function colorDistSq(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const rMean = (r1 + r2) * 0.5
  const dr = r1 - r2
  const dg = g1 - g2
  const db = b1 - b2
  return (2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db
}

function closestDmcFrom(
  r: number,
  g: number,
  b: number,
  candidates: readonly ParsedDmc[],
): number {
  let bestIdx = 0
  let bestDist = Infinity
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]
    const d = colorDistSq(r, g, b, c.r, c.g, c.b)
    if (d < bestDist) {
      bestDist = d
      bestIdx = i
    }
  }
  return bestIdx
}

/** Deterministic pseudo-random helper */
function hash01(seed: number): number {
  let x = (seed ^ 0x9e3779b9) >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296
}

/**
 * Flood-fills uniform border backdrop so bright white features INSIDE a portrait
 * or flower (eyes, white petals, shirts) stay intact while outer studio background becomes unstitched cloth.
 */
function detectExteriorBackgroundMask(
  rgb: Uint8ClampedArray,
  opaque: Uint8Array,
  w: number,
  h: number,
): Uint8Array {
  const bg = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    if (!opaque[i]) bg[i] = 1
  }

  // Estimate dominant border pixel color among opaque edge pixels
  const cornerCoords = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
    [Math.floor(w / 2), 0],
    [0, Math.floor(h / 2)],
    [w - 1, Math.floor(h / 2)],
    [Math.floor(w / 2), h - 1],
  ]
  let refR = 0
  let refG = 0
  let refB = 0
  let cornerSamples = 0
  for (const [cx, cy] of cornerCoords) {
    const idx = cy * w + cx
    if (!opaque[idx]) continue
    refR += rgb[idx * 3]
    refG += rgb[idx * 3 + 1]
    refB += rgb[idx * 3 + 2]
    cornerSamples++
  }
  if (!cornerSamples) return bg
  refR /= cornerSamples
  refG /= cornerSamples
  refB /= cornerSamples

  // Verify at least half of image perimeter resembles reference background color
  let borderTotal = 0
  let borderMatch = 0
  const maxDistSq = colorDistSq(0, 0, 0, 32, 32, 32)
  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      const idx = y * w + x
      if (!opaque[idx]) continue
      borderTotal++
      if (colorDistSq(rgb[idx * 3], rgb[idx * 3 + 1], rgb[idx * 3 + 2], refR, refG, refB) < maxDistSq) {
        borderMatch++
      }
    }
  }
  for (let y = 1; y < h - 1; y++) {
    for (const x of [0, w - 1]) {
      const idx = y * w + x
      if (!opaque[idx]) continue
      borderTotal++
      if (colorDistSq(rgb[idx * 3], rgb[idx * 3 + 1], rgb[idx * 3 + 2], refR, refG, refB) < maxDistSq) {
        borderMatch++
      }
    }
  }
  if (!borderTotal || borderMatch / borderTotal < 0.52) return bg

  const queue: number[] = []
  const visited = new Uint8Array(w * h)
  const seedToleranceSq = colorDistSq(0, 0, 0, 36, 36, 36)

  const pushIfBg = (x: number, y: number) => {
    const idx = y * w + x
    if (visited[idx]) return
    visited[idx] = 1
    if (!opaque[idx]) {
      bg[idx] = 1
      queue.push(idx)
      return
    }
    const r = rgb[idx * 3]
    const g = rgb[idx * 3 + 1]
    const b = rgb[idx * 3 + 2]
    if (colorDistSq(r, g, b, refR, refG, refB) <= seedToleranceSq) {
      bg[idx] = 1
      queue.push(idx)
    }
  }

  for (let x = 0; x < w; x++) {
    pushIfBg(x, 0)
    pushIfBg(x, h - 1)
  }
  for (let y = 1; y < h - 1; y++) {
    pushIfBg(0, y)
    pushIfBg(w - 1, y)
  }

  const dirs = [1, -1, w, -w]
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head]
    const cx = cur % w
    const cr = opaque[cur] ? rgb[cur * 3] : refR
    const cg = opaque[cur] ? rgb[cur * 3 + 1] : refG
    const cb = opaque[cur] ? rgb[cur * 3 + 2] : refB

    for (const d of dirs) {
      const nxt = cur + d
      if (nxt < 0 || nxt >= w * h || visited[nxt]) continue
      const nx = nxt % w
      if (Math.abs(nx - cx) > 1) continue
      visited[nxt] = 1
      if (!opaque[nxt]) {
        bg[nxt] = 1
        queue.push(nxt)
        continue
      }
      const nr = rgb[nxt * 3]
      const ng = rgb[nxt * 3 + 1]
      const nb = rgb[nxt * 3 + 2]
      // Dual check: close to border color AND smooth relative to neighbor (prevents leaking into subject)
      const toRef = colorDistSq(nr, ng, nb, refR, refG, refB)
      const toNbr = colorDistSq(nr, ng, nb, cr, cg, cb)
      if (toRef <= seedToleranceSq && toNbr <= seedToleranceSq * 0.65) {
        bg[nxt] = 1
        queue.push(nxt)
      }
    }
  }
  return bg
}

export function quantizeImageToEmbroideryGrid(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  gridSize: number,
  maxColors: number,
  removeBg = true,
): QuantizedEmbroideryGrid {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('图片尺寸无效，无法生成刺绣针法。')
  }
  let opaqueCheck = 0
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] >= 32) opaqueCheck++
  }
  if (!opaqueCheck) {
    throw new Error('这张图片全部透明，无法提取刺绣图案，请换一张主体清晰的图片。')
  }

  const safeGrid = Math.max(16, Math.min(72, Math.round(gridSize)))
  const safeMaxColors = Math.max(2, Math.min(20, Math.round(maxColors)))
  const aspect = width / height
  const gridWidth = aspect >= 1 ? safeGrid : Math.max(12, Math.round(safeGrid * aspect))
  const gridHeight = aspect <= 1 ? safeGrid : Math.max(12, Math.round(safeGrid / aspect))

  const rgb = new Uint8ClampedArray(gridWidth * gridHeight * 3)
  const opaque = new Uint8Array(gridWidth * gridHeight)
  const radiusLim = Math.max(gridWidth, gridHeight) * 0.46
  const cxGrid = (gridWidth - 1) / 2
  const cyGrid = (gridHeight - 1) / 2

  for (let gy = 0; gy < gridHeight; gy++) {
    const syStart = Math.floor((gy / gridHeight) * height)
    const syEnd = Math.max(syStart + 1, Math.floor(((gy + 1) / gridHeight) * height))
    for (let gx = 0; gx < gridWidth; gx++) {
      const sxStart = Math.floor((gx / gridWidth) * width)
      const sxEnd = Math.max(sxStart + 1, Math.floor(((gx + 1) / gridWidth) * width))
      let rSum = 0
      let gSum = 0
      let bSum = 0
      let aSum = 0
      let count = 0
      for (let sy = syStart; sy < syEnd; sy++) {
        for (let sx = sxStart; sx < sxEnd; sx++) {
          const idx = (sy * width + sx) * 4
          const alpha = rgba[idx + 3] / 255
          rSum += rgba[idx] * alpha
          gSum += rgba[idx + 1] * alpha
          bSum += rgba[idx + 2] * alpha
          aSum += alpha
          count++
        }
      }
      const cellIdx = gy * gridWidth + gx
      const avgAlpha = count ? aSum / count : 0
      if (avgAlpha < 0.25) {
        opaque[cellIdx] = 0
        continue
      }
      opaque[cellIdx] = 1
      rgb[cellIdx * 3] = Math.round(rSum / aSum)
      rgb[cellIdx * 3 + 1] = Math.round(gSum / aSum)
      rgb[cellIdx * 3 + 2] = Math.round(bSum / aSum)
    }
  }

  // Flood-fill exterior studio background BEFORE clipping to circular hoop perimeter
  const bgMask = removeBg
    ? detectExteriorBackgroundMask(rgb, opaque, gridWidth, gridHeight)
    : (() => {
        const m = new Uint8Array(gridWidth * gridHeight)
        for (let i = 0; i < m.length; i++) if (!opaque[i]) m[i] = 1
        return m
      })()

  for (let gy = 0; gy < gridHeight; gy++) {
    for (let gx = 0; gx < gridWidth; gx++) {
      if (Math.hypot(gx - cxGrid, gy - cyGrid) > radiusLim * 1.04) {
        bgMask[gy * gridWidth + gx] = 1
      }
    }
  }

  // Step 1: Map every foreground pixel to full DMC palette and measure weighted prominence
  const dmcCounts = new Float64Array(PARSED_DMC.length)
  const rawDmc = new Int16Array(gridWidth * gridHeight).fill(-1)
  let fgCount = 0
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const i = y * gridWidth + x
      if (bgMask[i]) continue
      fgCount++
      const r = rgb[i * 3]
      const g = rgb[i * 3 + 1]
      const b = rgb[i * 3 + 2]
      const dIdx = closestDmcFrom(r, g, b, PARSED_DMC)
      rawDmc[i] = dIdx
      // Preserve salient dark details (pupils/outlines) and central focal features when ranking top K colors
      const lum = PARSED_DMC[dIdx].lum
      const salience = lum < 75 ? 1.55 : lum > 225 ? 1.2 : 1.0
      dmcCounts[dIdx] += salience
    }
  }

  if (fgCount === 0) {
    // Fallback if image was completely flat color matching corners: keep inner pixels
    for (let i = 0; i < gridWidth * gridHeight; i++) {
      if (!opaque[i]) continue
      bgMask[i] = 0
      const dIdx = closestDmcFrom(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2], PARSED_DMC)
      rawDmc[i] = dIdx
      dmcCounts[dIdx] += 1
      fgCount++
    }
  }

  // Diverse palette selection: keep top weighted DMC entries while ensuring chromatic diversity
  const rankedIndices = Array.from(dmcCounts, (score, index) => ({ index, score }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)

  const chosenParsed: ParsedDmc[] = []
  for (const item of rankedIndices) {
    if (chosenParsed.length >= safeMaxColors) break
    const cand = PARSED_DMC[item.index]
    const tooClose = chosenParsed.some(existing => colorDistSq(cand.r, cand.g, cand.b, existing.r, existing.g, existing.b) < 280)
    if (!tooClose || rankedIndices.length <= safeMaxColors) {
      chosenParsed.push(cand)
    }
  }
  for (const item of rankedIndices) {
    if (chosenParsed.length >= safeMaxColors) break
    const cand = PARSED_DMC[item.index]
    if (!chosenParsed.includes(cand)) chosenParsed.push(cand)
  }
  if (!chosenParsed.length) chosenParsed.push(PARSED_DMC[0])

  const cells = new Int16Array(gridWidth * gridHeight).fill(-1)
  for (let i = 0; i < gridWidth * gridHeight; i++) {
    if (bgMask[i]) continue
    cells[i] = closestDmcFrom(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2], chosenParsed)
  }

  // Step 2: Confetti cleanup (remove isolated 1-cell noise except sharp dark eyes/outlines)
  const cleaned = new Int16Array(cells)
  const freq = new Int16Array(chosenParsed.length)
  for (let y = 1; y < gridHeight - 1; y++) {
    for (let x = 1; x < gridWidth - 1; x++) {
      const i = y * gridWidth + x
      const cur = cells[i]
      if (cur < 0) continue
      freq.fill(0)
      let sameNbr = 0
      let bestNbr = cur
      let bestNbrCount = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const nVal = cells[(y + dy) * gridWidth + (x + dx)]
          if (nVal < 0) continue
          if (nVal === cur) sameNbr++
          freq[nVal]++
          if (freq[nVal] > bestNbrCount) {
            bestNbrCount = freq[nVal]
            bestNbr = nVal
          }
        }
      }
      if (sameNbr === 0 && bestNbrCount >= 3) {
        const curLum = chosenParsed[cur].lum
        const nbrLum = chosenParsed[bestNbr].lum
        // Keep dark high-contrast accent pixels (e.g., strawberry seeds, pupils)
        if (Math.abs(curLum - nbrLum) < 75) {
          cleaned[i] = bestNbr
        }
      }
    }
  }

  // Re-compact palette to only used colors
  const usedMap = new Map<number, number>()
  const palette: DmcThreadColor[] = []
  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i]
    if (c < 0) continue
    let nextId = usedMap.get(c)
    if (nextId === undefined) {
      nextId = palette.length
      usedMap.set(c, nextId)
      const p = chosenParsed[c]
      palette.push({ code: p.code, name: p.name, color: p.color, symbol: p.symbol })
    }
    cleaned[i] = nextId
  }

  return { gridWidth, gridHeight, cells: cleaned, palette, rgb }
}

/**
 * Liu et al. Structure-Tensor Edge Tangent Flow (ETF):
 * Extracts smooth axial orientation angles theta in [-pi/2, pi/2] aligned WITH object contours
 * so long-and-short needle-painting stitches flow along petals, fur, hills, and silhouettes.
 */
export function computeStructureFlowField(
  grid: QuantizedEmbroideryGrid,
): { angles: Float32Array; edgeStrength: Float32Array } {
  const { gridWidth: w, gridHeight: h, rgb, cells } = grid
  const len = w * h
  const lum = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    if (cells[i] < 0) {
      lum[i] = 245
    } else {
      lum[i] = 0.299 * rgb[i * 3] + 0.587 * rgb[i * 3 + 1] + 0.114 * rgb[i * 3 + 2]
    }
  }

  const jxx = new Float32Array(len)
  const jxy = new Float32Array(len)
  const jyy = new Float32Array(len)
  const edgeStrength = new Float32Array(len)

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const tl = lum[(y - 1) * w + (x - 1)]
      const t = lum[(y - 1) * w + x]
      const tr = lum[(y - 1) * w + (x + 1)]
      const l = lum[y * w + (x - 1)]
      const r = lum[y * w + (x + 1)]
      const bl = lum[(y + 1) * w + (x - 1)]
      const b = lum[(y + 1) * w + x]
      const br = lum[(y + 1) * w + (x + 1)]
      const gx = (-tl + tr - 2 * l + 2 * r - bl + br) / 8
      const gy = (-tl - 2 * t - tr + bl + 2 * b + br) / 8
      // Also include crisp semantic region boundary gradient
      const maskEdgeX = cells[y * w + (x + 1)] !== cells[y * w + (x - 1)] ? 28 : 0
      const maskEdgeY = cells[(y + 1) * w + x] !== cells[(y - 1) * w + x] ? 28 : 0
      const fx = Math.abs(gx) >= maskEdgeX ? gx : (gx >= 0 ? maskEdgeX : -maskEdgeX)
      const fy = Math.abs(gy) >= maskEdgeY ? gy : (gy >= 0 ? maskEdgeY : -maskEdgeY)
      jxx[i] = fx * fx
      jxy[i] = fx * fy
      jyy[i] = fy * fy
      edgeStrength[i] = Math.min(1, Math.hypot(gx, gy) / 90)
    }
  }

  // Two-pass separable binomial smoothing of tensor field
  const smoothBuf = (src: Float32Array) => {
    const tmp = new Float32Array(len)
    const dst = new Float32Array(len)
    for (let y = 0; y < h; y++) {
      for (let x = 2; x < w - 2; x++) {
        const i = y * w + x
        tmp[i] = (src[i - 2] + 4 * src[i - 1] + 6 * src[i] + 4 * src[i + 1] + src[i + 2]) * 0.0625
      }
    }
    for (let y = 2; y < h - 2; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        dst[i] = (tmp[i - 2 * w] + 4 * tmp[i - w] + 6 * tmp[i] + 4 * tmp[i + w] + tmp[i + 2 * w]) * 0.0625
      }
    }
    return dst
  }

  const sxx = smoothBuf(smoothBuf(jxx))
  const sxy = smoothBuf(smoothBuf(jxy))
  const syy = smoothBuf(smoothBuf(jyy))

  // Doubled-angle vector diffusion handles theta === theta + pi axial symmetry cleanly
  let u2 = new Float32Array(len)
  let v2 = new Float32Array(len)
  const cx = (w - 1) / 2
  const cy = (h - 1) / 2

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const trace = sxx[i] + syy[i]
      if (trace > 20) {
        const theta = 0.5 * Math.atan2(2 * sxy[i], sxx[i] - syy[i]) + Math.PI / 2
        const conf = Math.min(1, trace / 240)
        u2[i] = Math.cos(2 * theta) * conf
        v2[i] = Math.sin(2 * theta) * conf
      } else {
        // Gentle radial/orbital fallback for pure flat spots before tensor diffusion
        const theta = Math.atan2(y - cy, x - cx) + Math.PI / 2
        u2[i] = Math.cos(2 * theta) * 0.08
        v2[i] = Math.sin(2 * theta) * 0.08
      }
    }
  }

  for (let iter = 0; iter < 5; iter++) {
    const nu = new Float32Array(u2)
    const nv = new Float32Array(v2)
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x
        if (cells[i] < 0) continue
        nu[i] =
          (u2[i] * 2 + u2[i - 1] + u2[i + 1] + u2[i - w] + u2[i + w]) / 6
        nv[i] =
          (v2[i] * 2 + v2[i - 1] + v2[i + 1] + v2[i - w] + v2[i + w]) / 6
      }
    }
    u2 = nu
    v2 = nv
  }

  const angles = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    angles[i] = 0.5 * Math.atan2(v2[i], u2[i])
  }
  return { angles, edgeStrength }
}

function computeRegionBoundaryDistances(grid: QuantizedEmbroideryGrid): Int16Array {
  const { gridWidth: w, gridHeight: h, cells } = grid
  const dist = new Int16Array(w * h).fill(999)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const c = cells[i]
      if (c < 0) {
        dist[i] = 0
        continue
      }
      if (
        x === 0 ||
        y === 0 ||
        x === w - 1 ||
        y === h - 1 ||
        cells[i - 1] !== c ||
        cells[i + 1] !== c ||
        cells[i - w] !== c ||
        cells[i + w] !== c
      ) {
        dist[i] = 1
      }
    }
  }
  // Forward + backward Chamfer distance pass
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      if (cells[i] < 0) continue
      dist[i] = Math.min(dist[i], dist[i - 1] + 1, dist[i - w] + 1)
    }
  }
  for (let y = h - 2; y >= 1; y--) {
    for (let x = w - 2; x >= 1; x--) {
      const i = y * w + x
      if (cells[i] < 0) continue
      dist[i] = Math.min(dist[i], dist[i + 1] + 1, dist[i + w] + 1)
    }
  }
  return dist
}

function gridToNorm(
  gx: number,
  gy: number,
  gridWidth: number,
  gridHeight: number,
): { x: number; y: number } {
  const maxDim = Math.max(gridWidth, gridHeight)
  const scale = 1.68 / maxDim
  return {
    x: Number(((gx - (gridWidth - 1) / 2) * scale).toFixed(4)),
    y: Number(((gy - (gridHeight - 1) / 2) * scale).toFixed(4)),
  }
}

function extractRegionContours(
  grid: QuantizedEmbroideryGrid,
): EmbroideryContourPolyline[] {
  const { gridWidth: w, gridHeight: h, cells, palette } = grid
  type Seg = { x0: number; y0: number; x1: number; y1: number; color: string; lum: number }
  const segments: Seg[] = []

  const getLum = (colorIdx: number) => {
    const p = PARSED_DMC.find(item => item.color === palette[colorIdx]?.color)
    return p?.lum ?? 120
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cur = cells[y * w + x]
      const right = x + 1 < w ? cells[y * w + (x + 1)] : -1
      const down = y + 1 < h ? cells[(y + 1) * w + x] : -1
      if (cur !== right) {
        const dominant = cur >= 0 && (right < 0 || getLum(cur) <= getLum(right)) ? cur : right
        if (dominant >= 0) {
          segments.push({
            x0: x + 0.5,
            y0: y - 0.5,
            x1: x + 0.5,
            y1: y + 0.5,
            color: palette[dominant].color,
            lum: getLum(dominant),
          })
        }
      }
      if (cur !== down) {
        const dominant = cur >= 0 && (down < 0 || getLum(cur) <= getLum(down)) ? cur : down
        if (dominant >= 0) {
          segments.push({
            x0: x - 0.5,
            y0: y + 0.5,
            x1: x + 0.5,
            y1: y + 0.5,
            color: palette[dominant].color,
            lum: getLum(dominant),
          })
        }
      }
    }
  }

  // Chain touching same-color segments into polylines for crisp SVG transfer outlines
  const byColor = new Map<string, Seg[]>()
  for (const seg of segments) {
    let arr = byColor.get(seg.color)
    if (!arr) {
      arr = []
      byColor.set(seg.color, arr)
    }
    arr.push(seg)
  }

  const polylines: EmbroideryContourPolyline[] = []
  for (const [color, segs] of byColor) {
    const used = new Uint8Array(segs.length)
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue
      used[i] = 1
      const pts: Array<{ x: number; y: number }> = [
        { x: segs[i].x0, y: segs[i].y0 },
        { x: segs[i].x1, y: segs[i].y1 },
      ]
      let extended = true
      while (extended) {
        extended = false
        const tail = pts[pts.length - 1]
        for (let j = 0; j < segs.length; j++) {
          if (used[j]) continue
          const s = segs[j]
          if (Math.abs(s.x0 - tail.x) < 0.05 && Math.abs(s.y0 - tail.y) < 0.05) {
            used[j] = 1
            pts.push({ x: s.x1, y: s.y1 })
            extended = true
            break
          }
          if (Math.abs(s.x1 - tail.x) < 0.05 && Math.abs(s.y1 - tail.y) < 0.05) {
            used[j] = 1
            pts.push({ x: s.x0, y: s.y0 })
            extended = true
            break
          }
        }
      }
      if (pts.length >= 3) {
        const closed =
          Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < 0.2
        let smoothed = pts
        for (let pass = 0; pass < 2; pass++) {
          const nextPts: Array<{ x: number; y: number }> = []
          const limit = closed ? smoothed.length : smoothed.length - 1
          if (!closed) nextPts.push(smoothed[0])
          for (let pi = 0; pi < limit; pi++) {
            const p0 = smoothed[pi]
            const p1 = smoothed[(pi + 1) % smoothed.length]
            nextPts.push({ x: p0.x * 0.75 + p1.x * 0.25, y: p0.y * 0.75 + p1.y * 0.25 })
            nextPts.push({ x: p0.x * 0.25 + p1.x * 0.75, y: p0.y * 0.25 + p1.y * 0.75 })
          }
          if (!closed) nextPts.push(smoothed[smoothed.length - 1])
          smoothed = nextPts
        }
        polylines.push({
          color,
          points: smoothed.map(p => gridToNorm(p.x, p.y, w, h)),
        })
      }
    }
  }
  return polylines
}

/** Order color layers for hand stitching: large base midtones first, highlights & dark outlines last */
function orderPaletteLayers(grid: QuantizedEmbroideryGrid): number[] {
  const counts = new Int32Array(grid.palette.length)
  for (let i = 0; i < grid.cells.length; i++) {
    if (grid.cells[i] >= 0) counts[grid.cells[i]]++
  }
  return grid.palette
    .map((entry, index) => {
      const parsed = PARSED_DMC.find(d => d.code === entry.code)
      const lum = parsed?.lum ?? 128
      const count = counts[index]
      // Very dark accents/outlines go near end; bright small highlights also come after base tones
      const isDarkAccent = lum < 52 && count < grid.cells.length * 0.22
      const score = isDarkAccent ? 1000000 - lum : -count * (lum > 220 ? 0.55 : 1)
      return { index, score }
    })
    .sort((a, b) => a.score - b.score)
    .map(item => item.index)
}

/** Segment pixels of one color layer into 8-connected spatial patches ordered top-to-bottom. */
function extractColorComponents(
  cells: Int16Array,
  w: number,
  h: number,
  cIdx: number,
): Array<Array<{ gx: number; gy: number }>> {
  const visited = new Uint8Array(w * h)
  const queue = new Int32Array(w * h)
  const components: Array<Array<{ gx: number; gy: number }>> = []

  for (let startY = 0; startY < h; startY++) {
    for (let startX = 0; startX < w; startX++) {
      const startIdx = startY * w + startX
      if (cells[startIdx] !== cIdx || visited[startIdx]) continue
      let head = 0
      let tail = 0
      queue[tail++] = startIdx
      visited[startIdx] = 1
      const comp: Array<{ gx: number; gy: number }> = []

      while (head < tail) {
        const curr = queue[head++]
        const cx = curr % w
        const cy = Math.floor(curr / w)
        comp.push({ gx: cx, gy: cy })
        for (let dy = -1; dy <= 1; dy++) {
          const ny = cy + dy
          if (ny < 0 || ny >= h) continue
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            const nx = cx + dx
            if (nx < 0 || nx >= w) continue
            const ni = ny * w + nx
            if (cells[ni] === cIdx && !visited[ni]) {
              visited[ni] = 1
              queue[tail++] = ni
            }
          }
        }
      }

      comp.sort((a, b) => a.gy - b.gy || a.gx - b.gx)
      components.push(comp)
    }
  }
  return components
}

/** Pick the largest initial patch or the unvisited patch closest to the needle cursor. */
function pickNextComponentIndex<T>(
  components: T[],
  visited: Uint8Array,
  cursor: { x: number; y: number } | null,
  getPoints: (comp: T) => Array<{ x: number; y: number }>,
): number {
  let bestIdx = -1
  if (!cursor) {
    let bestSize = -1
    for (let i = 0; i < components.length; i++) {
      if (visited[i]) continue
      const pts = getPoints(components[i])
      if (pts.length > bestSize) {
        bestSize = pts.length
        bestIdx = i
      }
    }
    return bestIdx
  }

  let bestDistSq = Infinity
  for (let i = 0; i < components.length; i++) {
    if (visited[i]) continue
    const pts = getPoints(components[i])
    for (let j = 0; j < pts.length; j++) {
      const dSq = (pts[j].x - cursor.x) ** 2 + (pts[j].y - cursor.y) ** 2
      if (dSq < bestDistSq) {
        bestDistSq = dSq
        bestIdx = i
      }
    }
  }
  return bestIdx
}

/** Order line stitches via nearest-endpoint greedy chaining, flipping segments head-to-tail to avoid jumps. */
function routeSegmentsByNearestEndpoint<T extends { x0: number; y0: number; x1: number; y1: number; angle: number }>(
  segments: T[],
  startCursor: { x: number; y: number } | null,
  midpointWeight = 0,
): { ordered: T[]; exit: { x: number; y: number } | null } {
  const n = segments.length
  if (n === 0) return { ordered: [], exit: startCursor }

  const used = new Uint8Array(n)
  const ordered: T[] = []
  let cursor = startCursor

  if (!cursor) {
    let firstIdx = 0
    for (let i = 1; i < n; i++) {
      if (
        segments[i].y0 < segments[firstIdx].y0 - 1e-6 ||
        (Math.abs(segments[i].y0 - segments[firstIdx].y0) <= 1e-6 && segments[i].x0 < segments[firstIdx].x0)
      ) {
        firstIdx = i
      }
    }
    used[firstIdx] = 1
    const first = segments[firstIdx]
    ordered.push(first)
    cursor = { x: first.x1, y: first.y1 }
  }

  while (ordered.length < n) {
    let bestIdx = -1
    let bestFlip = false
    let bestScore = Infinity
    for (let i = 0; i < n; i++) {
      if (used[i]) continue
      const seg = segments[i]
      const d0 = Math.hypot(seg.x0 - cursor.x, seg.y0 - cursor.y)
      const d1 = Math.hypot(seg.x1 - cursor.x, seg.y1 - cursor.y)
      const flip = d1 < d0
      let score = flip ? d1 : d0
      if (midpointWeight > 0) {
        const mx = (seg.x0 + seg.x1) * 0.5
        const my = (seg.y0 + seg.y1) * 0.5
        score += midpointWeight * Math.hypot(mx - cursor.x, my - cursor.y)
      }
      if (score < bestScore) {
        bestScore = score
        bestIdx = i
        bestFlip = flip
      }
    }
    if (bestIdx < 0) break
    used[bestIdx] = 1
    const raw = segments[bestIdx]
    const chosen: T = bestFlip
      ? {
          ...raw,
          x0: raw.x1,
          y0: raw.y1,
          x1: raw.x0,
          y1: raw.y0,
          angle: Math.atan2(raw.y0 - raw.y1, raw.x0 - raw.x1),
        }
      : raw
    ordered.push(chosen)
    cursor = { x: chosen.x1, y: chosen.y1 }
  }

  return { ordered, exit: cursor }
}

/** Sweep a single connected cross-stitch patch in continuous row runs (boustrophedon coverage). */
function routeCrossStitchComponent(
  comp: Array<{ gx: number; gy: number }>,
  startCursor: { x: number; y: number } | null,
): { ordered: Array<{ gx: number; gy: number }>; exit: { x: number; y: number } | null } {
  if (!comp.length) return { ordered: [], exit: startCursor }

  type GridRun = { gy: number; xStart: number; xEnd: number; cells: Array<{ gx: number; gy: number }> }
  const runs: GridRun[] = []
  let activeRun: GridRun | null = null
  for (const pt of comp) {
    if (!activeRun || pt.gy !== activeRun.gy || pt.gx !== activeRun.xEnd + 1) {
      activeRun = { gy: pt.gy, xStart: pt.gx, xEnd: pt.gx, cells: [pt] }
      runs.push(activeRun)
    } else {
      activeRun.xEnd = pt.gx
      activeRun.cells.push(pt)
    }
  }

  const used = new Uint8Array(runs.length)
  const ordered: Array<{ gx: number; gy: number }> = []
  let cursor = startCursor
  let prevRun: GridRun | null = null

  for (let step = 0; step < runs.length; step++) {
    let bestRun = -1
    let reverse = false
    if (!cursor) {
      bestRun = 0
      reverse = false
    } else {
      let bestCost = Infinity
      for (let i = 0; i < runs.length; i++) {
        if (used[i]) continue
        const run = runs[i]
        const touchesPrev =
          prevRun !== null &&
          Math.abs(run.gy - prevRun.gy) <= 1 &&
          run.xStart <= prevRun.xEnd + 1 &&
          run.xEnd >= prevRun.xStart - 1
        const continuityBonus = touchesPrev ? -0.35 : 0
        const dLeft = Math.hypot(run.xStart - cursor.x, run.gy - cursor.y) + continuityBonus
        const dRight = Math.hypot(run.xEnd - cursor.x, run.gy - cursor.y) + continuityBonus
        if (dLeft < bestCost) {
          bestCost = dLeft
          bestRun = i
          reverse = false
        }
        if (dRight < bestCost) {
          bestCost = dRight
          bestRun = i
          reverse = true
        }
      }
    }
    used[bestRun] = 1
    const run = runs[bestRun]
    if (reverse) {
      for (let k = run.cells.length - 1; k >= 0; k--) ordered.push(run.cells[k])
    } else {
      for (let k = 0; k < run.cells.length; k++) ordered.push(run.cells[k])
    }
    const exitCell = ordered[ordered.length - 1]
    cursor = { x: exitCell.gx, y: exitCell.gy }
    prevRun = run
  }

  return { ordered, exit: cursor }
}

export function generateEmbroideryPlan(
  grid: QuantizedEmbroideryGrid,
  stitchMode: StitchMode = 'long-short',
  hoopSizeCm: number = 15,
  darkFabric = false,
): EmbroideryPlan {
  const safeHoopCm = Math.max(8, Math.min(32, hoopSizeCm))
  const { gridWidth: w, gridHeight: h, cells, palette } = grid
  const maxDim = Math.max(w, h)
  const cellSizeNorm = 1.68 / maxDim
  const normToMm = (safeHoopCm * 10) / 2
  const { angles } = computeStructureFlowField(grid)
  const boundaryDist = computeRegionBoundaryDistances(grid)
  const contours = extractRegionContours(grid)
  const layerOrder = orderPaletteLayers(grid)

  type RawStitch = Omit<EmbroideryStitch, 'index' | 'layerIndex'> & { origPaletteIndex: number }
  const byOrigLayer = new Map<number, RawStitch[]>()
  for (const idx of layerOrder) byOrigLayer.set(idx, [])

  if (stitchMode === 'cross-stitch') {
    const rawBackstitchesByColor = new Map<number, RawStitch[]>()
    for (const idx of layerOrder) rawBackstitchesByColor.set(idx, [])

    const lumByColor = palette.map(
      entry => PARSED_DMC.find(d => d.code === entry.color || d.code === entry.code)?.lum ?? 140,
    )
    const getLum = (id: number) => (id < 0 ? 245 : (lumByColor[id] ?? 140))

    // Segment each color layer into connected patches and sweep each patch cleanly in serpentine runs
    for (const cIdx of layerOrder) {
      const dmc = palette[cIdx]
      const list = byOrigLayer.get(cIdx)!
      const components = extractColorComponents(cells, w, h, cIdx)
      const visitedComps = new Uint8Array(components.length)
      let gridCursor: { x: number; y: number } | null = null
      let remaining = components.length

      while (remaining > 0) {
        const compIdx = pickNextComponentIndex(components, visitedComps, gridCursor, comp =>
          comp.map(pt => ({ x: pt.gx, y: pt.gy })),
        )
        if (compIdx < 0) break
        visitedComps[compIdx] = 1
        remaining--

        const routed = routeCrossStitchComponent(components[compIdx], gridCursor)
        gridCursor = routed.exit
        for (const pt of routed.ordered) {
          const tl = gridToNorm(pt.gx - 0.36, pt.gy - 0.36, w, h)
          const br = gridToNorm(pt.gx + 0.36, pt.gy + 0.36, w, h)
          const diagMm = Number((Math.hypot(br.x - tl.x, br.y - tl.y) * normToMm * 2).toFixed(2))
          list.push({
            origPaletteIndex: cIdx,
            kind: 'cross',
            x0: tl.x,
            y0: tl.y,
            x1: br.x,
            y1: br.y,
            angle: Math.PI / 4,
            lengthMm: diagMm,
            dmcCode: dmc.code,
            colorName: dmc.name,
            color: dmc.color,
            symbol: dmc.symbol,
            strands: 2,
            gridX: pt.gx,
            gridY: pt.gy,
          })
        }
      }
    }

    // Extract salient backstitch contour edges and chain each color continuously head-to-tail
    for (let gy = 0; gy < h - 1; gy++) {
      for (let gx = 0; gx < w - 1; gx++) {
        const c = cells[gy * w + gx]
        const cr = cells[gy * w + gx + 1]
        const cd = cells[(gy + 1) * w + gx]
        const l0 = getLum(c)
        const lr = getLum(cr)
        const ld = getLum(cd)
        if (c !== cr && Math.abs(l0 - lr) > 36) {
          const dom = c >= 0 && (cr < 0 || l0 <= lr) ? c : cr
          if (dom >= 0) {
            const p0 = gridToNorm(gx + 0.5, gy - 0.5, w, h)
            const p1 = gridToNorm(gx + 0.5, gy + 0.5, w, h)
            const dmc = palette[dom]
            rawBackstitchesByColor.get(dom)!.push({
              origPaletteIndex: dom,
              kind: 'backstitch',
              x0: p0.x,
              y0: p0.y,
              x1: p1.x,
              y1: p1.y,
              angle: Math.PI / 2,
              lengthMm: Number((cellSizeNorm * normToMm).toFixed(2)),
              dmcCode: dmc.code,
              colorName: dmc.name,
              color: dmc.color,
              symbol: dmc.symbol,
              strands: 2,
            })
          }
        }
        if (c !== cd && Math.abs(l0 - ld) > 36) {
          const dom = c >= 0 && (cd < 0 || l0 <= ld) ? c : cd
          if (dom >= 0) {
            const p0 = gridToNorm(gx - 0.5, gy + 0.5, w, h)
            const p1 = gridToNorm(gx + 0.5, gy + 0.5, w, h)
            const dmc = palette[dom]
            rawBackstitchesByColor.get(dom)!.push({
              origPaletteIndex: dom,
              kind: 'backstitch',
              x0: p0.x,
              y0: p0.y,
              x1: p1.x,
              y1: p1.y,
              angle: 0,
              lengthMm: Number((cellSizeNorm * normToMm).toFixed(2)),
              dmcCode: dmc.code,
              colorName: dmc.name,
              color: dmc.color,
              symbol: dmc.symbol,
              strands: 2,
            })
          }
        }
      }
    }

    for (const cIdx of layerOrder) {
      const list = byOrigLayer.get(cIdx)!
      const backstitches = rawBackstitchesByColor.get(cIdx)
      if (!backstitches?.length) continue
      const lastCross = list.length ? list[list.length - 1] : undefined
      const startCursor = lastCross ? { x: lastCross.x1, y: lastCross.y1 } : null
      const routedBack = routeSegmentsByNearestEndpoint(backstitches, startCursor, 0)
      list.push(...routedBack.ordered)
    }
  } else if (stitchMode === 'punch-needle') {
    // Patch-by-patch, ring-by-ring inward nearest-neighbor punch-needle loop placement
    for (const cIdx of layerOrder) {
      const dmc = palette[cIdx]
      const list = byOrigLayer.get(cIdx)!
      const components = extractColorComponents(cells, w, h, cIdx)
      const visitedComps = new Uint8Array(components.length)
      let gridCursor: { x: number; y: number } | null = null
      let normCursor: { x: number; y: number } | null = null
      let remaining = components.length

      while (remaining > 0) {
        const compIdx = pickNextComponentIndex(components, visitedComps, gridCursor, comp =>
          comp.map(pt => ({ x: pt.gx, y: pt.gy })),
        )
        if (compIdx < 0) break
        visitedComps[compIdx] = 1
        remaining--

        const ringBuckets = new Map<number, Array<{ gx: number; gy: number }>>()
        for (const pt of components[compIdx]) {
          const r = boundaryDist[pt.gy * w + pt.gx]
          const bucket = ringBuckets.get(r)
          if (bucket) bucket.push(pt)
          else ringBuckets.set(r, [pt])
        }
        const sortedRings = [...ringBuckets.keys()].sort((a, b) => a - b)
        let kCounter = 0

        for (const r of sortedRings) {
          const ringPts = ringBuckets.get(r)!
          const used = new Uint8Array(ringPts.length)
          for (let count = 0; count < ringPts.length; count++) {
            let bestIdx = 0
            if (!gridCursor) {
              bestIdx = 0
            } else {
              let bestDistSq = Infinity
              for (let j = 0; j < ringPts.length; j++) {
                if (used[j]) continue
                const dSq = (ringPts[j].gx - gridCursor.x) ** 2 + (ringPts[j].gy - gridCursor.y) ** 2
                if (dSq < bestDistSq) {
                  bestDistSq = dSq
                  bestIdx = j
                }
              }
            }
            used[bestIdx] = 1
            const pt = ringPts[bestIdx]
            gridCursor = { x: pt.gx, y: pt.gy }

            const jx = (hash01(pt.gx * 131 + pt.gy * 37) - 0.5) * 0.24
            const jy = (hash01(pt.gx * 59 + pt.gy * 211) - 0.5) * 0.24
            const pCenter = gridToNorm(pt.gx + jx, pt.gy + jy, w, h)
            const dir = angles[pt.gy * w + pt.gx] + (hash01(kCounter++ * 97 + pt.gx) - 0.5) * 0.3
            const rHalf = cellSizeNorm * 0.48
            let x0 = Number((pCenter.x - Math.cos(dir) * rHalf).toFixed(4))
            let y0 = Number((pCenter.y - Math.sin(dir) * rHalf).toFixed(4))
            let x1 = Number((pCenter.x + Math.cos(dir) * rHalf).toFixed(4))
            let y1 = Number((pCenter.y + Math.sin(dir) * rHalf).toFixed(4))
            let stitchAngle = dir
            if (normCursor && Math.hypot(x1 - normCursor.x, y1 - normCursor.y) < Math.hypot(x0 - normCursor.x, y0 - normCursor.y)) {
              ;[x0, x1] = [x1, x0]
              ;[y0, y1] = [y1, y0]
              stitchAngle = Math.atan2(y1 - y0, x1 - x0)
            }
            normCursor = { x: x1, y: y1 }

            list.push({
              origPaletteIndex: cIdx,
              kind: 'punch-loop',
              x0,
              y0,
              x1,
              y1,
              angle: stitchAngle,
              lengthMm: Number((cellSizeNorm * 3.8 * normToMm).toFixed(2)),
              dmcCode: dmc.code,
              colorName: dmc.name,
              color: dmc.color,
              symbol: dmc.symbol,
              strands: 6,
              gridX: pt.gx,
              gridY: pt.gy,
            })
          }
        }
      }
    }
  } else {
    // 'long-short': Patch-by-patch staggered thread painting routed via nearest-endpoint chaining
    for (const cIdx of layerOrder) {
      const dmc = palette[cIdx]
      const list = byOrigLayer.get(cIdx)!
      const covered = new Float32Array(w * h)
      const parsed = PARSED_DMC.find(d => d.code === dmc.code)
      const isDarkContourShade = (parsed?.lum ?? 128) < 58
      const components = extractColorComponents(cells, w, h, cIdx)
      const visitedComps = new Uint8Array(components.length)
      let normCursor: { x: number; y: number } | null = null
      let remaining = components.length

      while (remaining > 0) {
        const compIdx = pickNextComponentIndex(components, visitedComps, normCursor, comp =>
          comp.map(pt => gridToNorm(pt.gx, pt.gy, w, h)),
        )
        if (compIdx < 0) break
        visitedComps[compIdx] = 1
        remaining--

        const compStitches: RawStitch[] = []
        // 2 offset sub-passes pack staggered neighboring floss rows tightly with zero bare cloth gaps
        for (let pass = 0; pass < 2; pass++) {
          const passLatOffset = pass === 0 ? -0.22 : 0.22
          for (let k = 0; k < components[compIdx].length; k++) {
            const { gx, gy } = components[compIdx][k]
            const cPos = gy * w + gx
            if (pass > 0 && covered[cPos] >= 2.4) continue

            const dist = boundaryDist[cPos]
            const theta = angles[cPos]
            const jAng = (hash01(gx * 73 + gy * 179 + pass * 19) - 0.5) * 0.12
            const dir = theta + jAng
            const cosD = Math.cos(dir)
            const sinD = Math.sin(dir)

            // Longer staggered silk painting lengths give lush overlapping organic grain
            const isEven = (Math.round(gx + gy) + pass) % 2 === 0
            const targetGridLen = dist === 1
              ? (isEven ? 2.15 : 1.35)
              : (isEven ? 3.45 : 2.05) + hash01(gx * 17 + gy * 41) * 0.55

            // March forwards & backwards inside region + soft feather across same-tone boundaries
            let fwd = 0
            let bwd = 0
            const maxReach = Math.ceil(targetGridLen * 0.72)
            for (let step = 1; step <= maxReach; step++) {
              const fx = Math.round(gx + cosD * step * 0.65)
              const fy = Math.round(gy + sinD * step * 0.65)
              if (fx >= 0 && fx < w && fy >= 0 && fy < h) {
                const ni = fy * w + fx
                if (cells[ni] === cIdx || (step === 1 && cells[ni] >= 0)) {
                  fwd = step * 0.65
                } else {
                  break
                }
              }
            }
            for (let step = 1; step <= maxReach; step++) {
              const bx = Math.round(gx - cosD * step * 0.65)
              const by = Math.round(gy - sinD * step * 0.65)
              if (bx >= 0 && bx < w && by >= 0 && by < h) {
                const ni = by * w + bx
                if (cells[ni] === cIdx || (step === 1 && cells[ni] >= 0)) {
                  bwd = step * 0.65
                } else {
                  break
                }
              }
            }

            const spanFwd = Math.max(0.55, Math.min(targetGridLen * 0.56, fwd + 0.32))
            const spanBwd = Math.max(0.55, Math.min(targetGridLen * 0.56, bwd + 0.32))
            const latJitter = (hash01(gx * 31 + gy * 89 + pass * 11) - 0.5) * 0.16
            const off = passLatOffset + latJitter
            const pStartX = gx - cosD * spanBwd - sinD * off
            const pStartY = gy - sinD * spanBwd + cosD * off
            const pEndX = gx + cosD * spanFwd - sinD * off
            const pEndY = gy + sinD * spanFwd + cosD * off

            const p0 = gridToNorm(pStartX, pStartY, w, h)
            const p1 = gridToNorm(pEndX, pEndY, w, h)
            const lenNorm = Math.hypot(p1.x - p0.x, p1.y - p0.y)
            if (lenNorm < cellSizeNorm * 0.4) continue

            const samples = 5
            for (let s = 0; s <= samples; s++) {
              const t = s / samples
              const sx = Math.round(pStartX + (pEndX - pStartX) * t)
              const sy = Math.round(pStartY + (pEndY - pStartY) * t)
              if (sx >= 0 && sx < w && sy >= 0 && sy < h && cells[sy * w + sx] === cIdx) {
                covered[sy * w + sx] += s === 0 || s === samples ? 0.5 : 0.9
              }
            }

            compStitches.push({
              origPaletteIndex: cIdx,
              kind: dist === 1 && isDarkContourShade ? 'satin' : 'long-short',
              x0: p0.x,
              y0: p0.y,
              x1: p1.x,
              y1: p1.y,
              angle: dir,
              lengthMm: Number((lenNorm * normToMm).toFixed(2)),
              dmcCode: dmc.code,
              colorName: dmc.name,
              color: dmc.color,
              symbol: dmc.symbol,
              strands: dist === 1 ? 2 : 3,
              gridX: gx,
              gridY: gy,
            })
          }
        }

        const routed: { ordered: RawStitch[]; exit: { x: number; y: number } | null } =
          routeSegmentsByNearestEndpoint(compStitches, normCursor, 0.15)
        normCursor = routed.exit
        list.push(...routed.ordered)
      }
    }
  }

  const stitches: EmbroideryStitch[] = []
  const layers: EmbroideryColorLayer[] = []
  let totalMm = 0

  for (const origIdx of layerOrder) {
    const rawList = byOrigLayer.get(origIdx)
    if (!rawList?.length) continue
    const layerIndex = layers.length
    const startStep = stitches.length + 1
    let layerMm = 0
    for (const raw of rawList) {
      const idxNum = stitches.length + 1
      stitches.push({
        index: idxNum,
        kind: raw.kind,
        x0: raw.x0,
        y0: raw.y0,
        x1: raw.x1,
        y1: raw.y1,
        angle: raw.angle,
        lengthMm: raw.lengthMm,
        dmcCode: raw.dmcCode,
        colorName: raw.colorName,
        color: raw.color,
        symbol: raw.symbol,
        strands: raw.strands,
        layerIndex,
        gridX: raw.gridX,
        gridY: raw.gridY,
      })
      layerMm += raw.lengthMm * 1.45
    }
    totalMm += layerMm
    layers.push({
      index: layerIndex,
      dmcCode: rawList[0].dmcCode,
      colorName: rawList[0].colorName,
      color: rawList[0].color,
      symbol: rawList[0].symbol,
      strands: rawList[0].strands,
      startStep,
      endStep: stitches.length,
      stitchCount: rawList.length,
      lengthMeters: Number((layerMm / 1000).toFixed(2)),
    })
  }

  return {
    stitchMode,
    hoopSizeCm: safeHoopCm,
    gridWidth: w,
    gridHeight: h,
    cellSizeNorm,
    stitches,
    layers,
    contours,
    totalStitches: stitches.length,
    totalMeters: Number((totalMm / 1000).toFixed(2)),
    estimatedMinutes: Math.max(15, Math.round(stitches.length / (stitchMode === 'cross-stitch' ? 14 : 11))),
    darkFabric,
  }
}

/** Procedural multi-tone RGBA generators for 6 curated built-in showcases */
export function createEmbroideryExampleRgba(
  id: EmbroideryExampleId,
  size = 112,
): { rgba: Uint8ClampedArray; width: number; height: number } {
  const rgba = new Uint8ClampedArray(size * size * 4)
  const setPx = (x: number, y: number, r: number, g: number, b: number, a = 255) => {
    const idx = (y * size + x) * 4
    rgba[idx] = Math.max(0, Math.min(255, Math.round(r)))
    rgba[idx + 1] = Math.max(0, Math.min(255, Math.round(g)))
    rgba[idx + 2] = Math.max(0, Math.min(255, Math.round(b)))
    rgba[idx + 3] = a
  }

  const ptSegDist = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
    const dx = bx - ax
    const dy = by - ay
    const lenSq = dx * dx + dy * dy
    if (!lenSq) return Math.hypot(px - ax, py - ay)
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
  }

  for (let y = 0; y < size; y++) {
    const ny = (y / (size - 1)) * 2 - 1
    for (let x = 0; x < size; x++) {
      const nx = (x / (size - 1)) * 2 - 1

      if (id === 'camellia') {
        const cx = nx * 1.05
        const cy = (ny + 0.05) * 1.05
        const r = Math.hypot(cx, cy)
        const ang = Math.atan2(cy, cx)
        const bloomOuter = 0.49 + 0.085 * Math.cos(5 * ang)
        const bloomMid = 0.34 + 0.065 * Math.cos(5 * ang + 0.62)
        const bloomInner = 0.21 + 0.04 * Math.cos(4 * ang + 1.1)

        // Leaves behind petals
        const leaf1 = Math.hypot((nx + 0.42) * 0.9, (ny - 0.28) * 1.6) < 0.34
        const leaf2 = Math.hypot((nx - 0.46) * 0.95, (ny + 0.16) * 1.55) < 0.31
        const leaf3 = Math.hypot((nx + 0.14) * 1.1, (ny + 0.46) * 1.4) < 0.28
        const stem = Math.abs(nx + 0.03 * Math.sin(ny * 4)) < 0.035 && ny > 0.34 && ny < 0.78

        if (r < 0.105) {
          // Golden stamen center
          const dot = Math.sin(cx * 42) * Math.cos(cy * 42) > 0.35
          setPx(x, y, dot ? 247 : 214, dot ? 218 : 164, dot ? 116 : 66)
        } else if (r < bloomInner) {
          setPx(x, y, 131, 32, 48)
        } else if (r < bloomMid) {
          const ridge = Math.abs(Math.sin(ang * 2.5 + 0.3))
          setPx(x, y, 196 + ridge * 32, 43 + ridge * 24, 60 + ridge * 30)
        } else if (r < bloomOuter) {
          const rim = (r - bloomMid) / Math.max(0.05, bloomOuter - bloomMid)
          setPx(x, y, 223 + rim * 20, 57 + rim * 48, 56 + rim * 56)
        } else if (stem) {
          setPx(x, y, 36, 75, 53)
        } else if (leaf1 || leaf2 || leaf3) {
          const vein = ptSegDist(nx, ny, -0.42, 0.28, -0.1, 0.06) < 0.025 || ptSegDist(nx, ny, 0.46, -0.16, 0.1, 0.02) < 0.025
          setPx(x, y, vein ? 36 : 67, vein ? 75 : 137, vein ? 53 : 72)
        } else {
          setPx(x, y, 255, 255, 255, 0)
        }
        continue
      }

      if (id === 'cat') {
        const headD = Math.hypot((nx - 0.02) / 0.42, (ny + 0.18) / 0.34)
        const bodyD = Math.hypot((nx + 0.06) / 0.56, (ny - 0.26) / 0.40)
        const earL = ny < -0.24 && ny > -0.68 && Math.abs(nx + 0.22 + (ny + 0.24) * 0.18) < (ny + 0.68) * 0.45
        const earR = ny < -0.24 && ny > -0.68 && Math.abs(nx - 0.26 - (ny + 0.24) * 0.18) < (ny + 0.68) * 0.45
        const tail = Math.hypot(Math.hypot(nx - 0.24, ny - 0.46) - 0.32, 0) < 0.085 && (nx > 0.16 || ny > 0.42)

        if (headD <= 1 || bodyD <= 1 || earL || earR || tail) {
          const chest = Math.hypot((nx - 0.04) / 0.24, (ny - 0.08) / 0.24) < 1
          const innerEarL = earL && ny > -0.58 && ny < -0.32 && Math.abs(nx + 0.21) < 0.08
          const innerEarR = earR && ny > -0.58 && ny < -0.32 && Math.abs(nx - 0.25) < 0.08
          const eyeL = Math.hypot((nx + 0.11) / 0.08, (ny + 0.20) / 0.03) < 1 && ny > -0.21
          const eyeR = Math.hypot((nx - 0.16) / 0.08, (ny + 0.20) / 0.03) < 1 && ny > -0.21
          const nose = Math.hypot(nx - 0.025, ny + 0.11) < 0.038
          const stripe = (bodyD <= 1 && !chest && Math.sin(nx * 14 + ny * 6) > 0.55) || (headD <= 1 && ny < -0.34 && Math.abs(nx - 0.02) < 0.14 && Math.sin(nx * 24) > 0.2)

          if (eyeL || eyeR) {
            setPx(x, y, 27, 26, 28)
          } else if (nose || innerEarL || innerEarR) {
            setPx(x, y, 239, 180, 203)
          } else if (chest) {
            setPx(x, y, 247, 245, 238)
          } else if (stripe) {
            setPx(x, y, 148, 91, 54)
          } else {
            setPx(x, y, 244, 169, 56)
          }
        } else {
          setPx(x, y, 255, 255, 255, 0)
        }
        continue
      }

      if (id === 'persimmon') {
        const f1 = Math.hypot((nx + 0.20) / 0.34, (ny - 0.08) / 0.30)
        const f2 = Math.hypot((nx - 0.26) / 0.30, (ny - 0.22) / 0.26)
        const branch = ptSegDist(nx, ny, -0.66, -0.44, 0.56, -0.06) < 0.038 || ptSegDist(nx, ny, -0.20, -0.30, -0.20, -0.18) < 0.03 || ptSegDist(nx, ny, 0.26, -0.16, 0.26, -0.02) < 0.028
        const calyx1 = Math.hypot((nx + 0.20) * 1.4, (ny + 0.18) * 3.0) < 0.22 || Math.hypot((nx + 0.20) * 2.8, (ny + 0.18) * 1.5) < 0.18
        const calyx2 = Math.hypot((nx - 0.26) * 1.5, (ny + 0.01) * 3.0) < 0.20
        const leafP = Math.hypot((nx + 0.44) * 0.9, (ny + 0.24) * 1.9) < 0.24

        if (calyx1 || calyx2) {
          setPx(x, y, 36, 75, 53)
        } else if (f1 <= 1 || f2 <= 1) {
          const highlight = Math.hypot(nx + 0.28, ny - 0.0) < 0.11 || Math.hypot(nx - 0.18, ny - 0.15) < 0.09
          const darkBase = f1 <= 1 ? ny > 0.24 : ny > 0.36
          if (highlight) setPx(x, y, 247, 218, 116)
          else if (darkBase) setPx(x, y, 200, 77, 32)
          else setPx(x, y, 234, 108, 40)
        } else if (branch) {
          setPx(x, y, 91, 57, 38)
        } else if (leafP) {
          setPx(x, y, 67, 137, 72)
        } else {
          setPx(x, y, 255, 255, 255, 0)
        }
        continue
      }

      if (id === 'strawberry') {
        const sY = ny - 0.06
        const halfW = sY < -0.32 ? 0 : (0.50 * (1 - (sY + 0.32) * 0.85) * Math.sqrt(Math.max(0, 1 - ((sY - 0.06) / 0.56) ** 2)))
        const inBerry = ny > -0.28 && ny < 0.62 && Math.abs(nx) < halfW * 1.15 + 0.10 * Math.max(0, 0.35 - Math.abs(sY))
        const cap = ny < -0.18 && ny > -0.44 && Math.abs(nx) < 0.38 - Math.abs(Math.sin(nx * 16)) * 0.14
        const stem = Math.abs(nx) < 0.04 && ny <= -0.40 && ny > -0.62
        if (stem) {
          setPx(x, y, 36, 75, 53)
        } else if (cap) {
          setPx(x, y, nx > 0.05 ? 67 : 135, nx > 0.05 ? 137 : 184, nx > 0.05 ? 72 : 74)
        } else if (inBerry) {
          const gridS = (Math.abs((Math.round(nx * 14) + Math.round(ny * 12)) % 2) === 0) && Math.hypot((nx * 14) - Math.round(nx * 14), (ny * 12) - Math.round(ny * 12)) < 0.24
          const shade = nx > 0.16 || ny > 0.38
          if (gridS && ny > -0.14 && ny < 0.48) setPx(x, y, 247, 218, 116)
          else if (shade) setPx(x, y, 131, 32, 48)
          else setPx(x, y, 223, 57, 56)
        } else {
          setPx(x, y, 255, 255, 255, 0)
        }
        continue
      }

      if (id === 'crescent') {
        const outer = Math.hypot(nx + 0.08, ny) <= 0.68
        const inner = Math.hypot(nx - 0.19, ny + 0.06) <= 0.52
        const star1 = Math.hypot(nx - 0.36, ny + 0.34) < 0.09 && (Math.abs(nx - 0.36) < 0.025 || Math.abs(ny + 0.34) < 0.025)
        const star2 = Math.hypot(nx - 0.44, ny - 0.16) < 0.065 && (Math.abs(nx - 0.44) < 0.02 || Math.abs(ny - 0.16) < 0.02)
        const star3 = Math.hypot(nx + 0.10, ny + 0.50) < 0.055 && (Math.abs(nx + 0.10) < 0.02 || Math.abs(ny + 0.50) < 0.02)

        if (star1 || star2 || star3) {
          setPx(x, y, 247, 218, 116)
        } else if (outer && !inner) {
          const blossom = Math.hypot(nx + 0.44, ny - 0.16) < 0.11 || Math.hypot(nx + 0.22, ny - 0.44) < 0.10
          if (blossom) setPx(x, y, 239, 180, 203)
          else if (ny > 0.25) setPx(x, y, 214, 164, 66)
          else setPx(x, y, 244, 169, 56)
        } else {
          setPx(x, y, 255, 255, 255, 0)
        }
        continue
      }

      // 'landscape' 青山远黛 (full sky & rolling mountain vista inside 0.85R hoop)
      if (Math.hypot(nx, ny) > 0.86) {
        setPx(x, y, 255, 255, 255, 0)
        continue
      }
      const ridge1 = 0.02 + 0.18 * Math.sin(nx * 2.8 + 0.5)
      const ridge2 = 0.24 + 0.16 * Math.cos(nx * 3.5 - 0.4)
      const water = 0.46
      const sun = Math.hypot(nx - 0.28, ny + 0.30) < 0.18
      if (ny > water) {
        const rip = Math.abs(Math.sin(ny * 36)) > 0.72
        setPx(x, y, rip ? 138 : 57, rip ? 180 : 90, rip ? 212 : 148)
      } else if (ny > ridge2) {
        setPx(x, y, 36, 75, 53)
      } else if (ny > ridge1) {
        setPx(x, y, 107, 158, 141)
      } else if (sun) {
        setPx(x, y, 230, 99, 104)
      } else {
        setPx(x, y, 239, 230, 208)
      }
    }
  }
  return { rgba, width: size, height: size }
}

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function csvCell(value: string | number): string {
  const str = String(value)
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str
  return `"${safe.replaceAll('"', '""')}"`
}

export function safeEmbroideryFilename(title: string): string {
  const clean = title.trim().replace(/[\\/:*?"<>|]+/g, '-').slice(0, 42)
  return clean || 'TraceCraft-刺绣'
}

export function buildEmbroideryTemplateSvg(
  plan: EmbroideryPlan,
  title: string,
  fabric: FabricPreset,
): string {
  const hoopMm = plan.hoopSizeCm * 10
  const legendRows = Math.max(1, Math.ceil(plan.layers.length / 4))
  const sheetW = hoopMm + 30
  const sheetH = hoopMm + 34 + legendRows * 5.2
  const cx = sheetW / 2
  const cy = hoopMm / 2 + 16
  const rMm = hoopMm / 2
  const activeR = rMm * 0.92
  const titleSafe = escapeXml(title.trim() || '手工刺绣水消笔底稿')
  const modeInfo = STITCH_MODE_INFO[plan.stitchMode]

  const contourPaths = plan.contours
    .map(pl => {
      const d = pl.points
        .map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${(cx + pt.x * activeR).toFixed(2)},${(cy + pt.y * activeR).toFixed(2)}`)
        .join(' ')
      return `<path d="${d}" fill="none" stroke="${fabric.darkFabric ? '#6d83a8' : '#3a668a'}" stroke-width="0.45" stroke-dasharray="1.8 1.2" opacity="0.88" />`
    })
    .join('\n')

  // In cross-stitch show symbol matrix; in long-short / punch-needle show sparse directional flow guide ticks
  const guideMarks: string[] = []
  if (plan.stitchMode === 'cross-stitch') {
    const cellMm = plan.cellSizeNorm * activeR
    for (const s of plan.stitches) {
      if (s.kind !== 'cross') continue
      const sx = cx + ((s.x0 + s.x1) * 0.5) * activeR
      const sy = cy + ((s.y0 + s.y1) * 0.5) * activeR
      guideMarks.push(
        `<rect x="${(sx - cellMm * 0.48).toFixed(2)}" y="${(sy - cellMm * 0.48).toFixed(2)}" width="${(cellMm * 0.96).toFixed(2)}" height="${(cellMm * 0.96).toFixed(2)}" fill="none" stroke="#c8beac" stroke-width="0.2" />` +
          `<text x="${sx.toFixed(2)}" y="${(sy + cellMm * 0.25).toFixed(2)}" text-anchor="middle" font-size="${Math.max(1.8, cellMm * 0.62).toFixed(2)}" fill="#433c32">${escapeXml(s.symbol)}</text>`,
      )
    }
  } else {
    const stride = Math.max(1, Math.floor(plan.stitches.length / 260))
    for (let i = 0; i < plan.stitches.length; i += stride) {
      const s = plan.stitches[i]
      const mx = cx + ((s.x0 + s.x1) * 0.5) * activeR
      const my = cy + ((s.y0 + s.y1) * 0.5) * activeR
      const dx = Math.cos(s.angle) * 2.2
      const dy = Math.sin(s.angle) * 2.2
      guideMarks.push(
        `<line x1="${(mx - dx).toFixed(2)}" y1="${(my - dy).toFixed(2)}" x2="${(mx + dx).toFixed(2)}" y2="${(my + dy).toFixed(2)}" stroke="#8a7a64" stroke-width="0.32" opacity="0.72" />`,
      )
    }
  }

  const legendStartY = hoopMm + 23
  const legend = plan.layers
    .map(
      (layer, idx) =>
        `<g transform="translate(${(15 + (idx % 4) * ((sheetW - 30) / 4)).toFixed(2)}, ${(legendStartY + Math.floor(idx / 4) * 5).toFixed(2)})">` +
        `<circle cx="2" cy="-1.2" r="1.4" fill="${layer.color}" stroke="#888" stroke-width="0.2" />` +
        `<text x="4.5" y="0" font-size="2.8" fill="#3a332b">${escapeXml(layer.symbol)} ${escapeXml(layer.dmcCode)} (${layer.strands}股)</text></g>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}mm" height="${sheetH.toFixed(1)}mm" viewBox="0 0 ${sheetW} ${sheetH.toFixed(1)}">
  <title>${titleSafe} · 1:1 水消笔底稿</title>
  <desc>TraceCraft 刺绣工坊 1:1 实际尺寸水消笔描图底稿（${escapeXml(modeInfo.name)}），含 50 mm 比例尺与绣绷对位标记。</desc>
  <rect x="0" y="0" width="${sheetW}" height="${sheetH.toFixed(1)}" fill="#ffffff" />
  <text x="${cx}" y="8" text-anchor="middle" font-size="4.4" font-weight="bold" fill="#2c261f">${titleSafe} · 1:1 水消笔底稿（${escapeXml(modeInfo.name)} · ${plan.hoopSizeCm}cm 绣绷）</text>
  <line x1="15" y1="12" x2="65" y2="12" stroke="#3a332b" stroke-width="0.6" />
  <line x1="15" y1="10.5" x2="15" y2="13.5" stroke="#3a332b" stroke-width="0.5" />
  <line x1="65" y1="10.5" x2="65" y2="13.5" stroke="#3a332b" stroke-width="0.5" />
  <text x="40" y="10.5" text-anchor="middle" font-size="2.6" fill="#5e5446">50 mm 比例尺</text>
  <circle cx="${cx}" cy="${cy}" r="${rMm}" fill="${fabric.board}" stroke="${fabric.hoopRim}" stroke-width="0.9" />
  <circle cx="${cx}" cy="${cy}" r="${(rMm * 0.94).toFixed(2)}" fill="none" stroke="#b5a792" stroke-width="0.3" stroke-dasharray="2 2" />
  <line x1="${cx}" y1="${cy - rMm}" x2="${cx}" y2="${cy - rMm + 4}" stroke="#a6483b" stroke-width="0.5" />
  <text x="${cx}" y="${cy - rMm - 1.5}" text-anchor="middle" font-size="2.5" fill="#a6483b">12点绣绷螺丝对位标记</text>
  ${contourPaths}
  ${guideMarks.join('\n')}
  ${legend}
  <text x="${cx}" y="${(sheetH - 2.5).toFixed(1)}" text-anchor="middle" font-size="2.4" fill="#6b6152">${escapeXml(EMBROIDERY_SAFETY_NOTICE)}</text>
</svg>`
}

export function embroideryMaterialsCsv(
  plan: EmbroideryPlan,
  title: string,
  fabricName: string,
): string {
  const modeInfo = STITCH_MODE_INFO[plan.stitchMode]
  const lines: string[] = [
    ['作品名称', title.trim() || '刺绣作品', '刺绣针法', modeInfo.name, '绣绷尺寸(cm)', plan.hoopSizeCm, '绣布', fabricName].map(csvCell).join(','),
    ['DMC色号', '参考色名', '图谱符号', '建议股数', '针数', '预估线长(m)', '起始步', '结束步'].map(csvCell).join(','),
  ]
  for (const layer of plan.layers) {
    lines.push(
      [
        layer.dmcCode,
        layer.colorName,
        layer.symbol,
        `${layer.strands}股`,
        layer.stitchCount,
        layer.lengthMeters,
        layer.startStep,
        layer.endStep,
      ].map(csvCell).join(','),
    )
  }
  lines.push('')
  lines.push(['针步序号', '针法类型', 'DMC色号', '色名', '建议股数', '针距(mm)', '起针X', '起针Y', '落针X', '落针Y'].map(csvCell).join(','))
  const stepLimit = Math.min(plan.stitches.length, 3000)
  for (let i = 0; i < stepLimit; i++) {
    const s = plan.stitches[i]
    lines.push(
      [
        s.index,
        s.kind,
        s.dmcCode,
        s.colorName,
        s.strands,
        s.lengthMm,
        s.x0.toFixed(3),
        s.y0.toFixed(3),
        s.x1.toFixed(3),
        s.y1.toFixed(3),
      ].map(csvCell).join(','),
    )
  }
  return `\uFEFF${lines.join('\n')}`
}
