import type { BeadColor, BeadsData } from '../../lib/types'

export const GRID_SIZES = [16, 24, 32, 48, 64] as const
export const COLOR_LIMITS = [8, 16, 24] as const
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const PALETTE_NOTICE = '参考色号，非品牌官方色号；采购请核对实体色卡'
export const ALPHA_NOTICE = '不透明度低于 50% 的像素留空，其余半透明像素与白色合成。'

// Original TraceCraft reference palette, deliberately not a manufacturer's color system.
export const BEADS_PALETTE: BeadColor[] = [
  { code: 'C01', name: '雪白', color: '#FAF9F5' },
  { code: 'C02', name: '燕麦', color: '#E4D7BF' },
  { code: 'C03', name: '奶油', color: '#F6E6C8' },
  { code: 'C04', name: '雾灰', color: '#B4B5AF' },
  { code: 'C05', name: '石墨', color: '#676B6C' },
  { code: 'C06', name: '墨黑', color: '#303139' },
  { code: 'C07', name: '柠檬', color: '#F4D65E' },
  { code: 'C08', name: '蜂蜜', color: '#DDA33C' },
  { code: 'C09', name: '杏桃', color: '#EFAE8E' },
  { code: 'C10', name: '珊瑚', color: '#E77D70' },
  { code: 'C11', name: '陶土', color: '#BC674A' },
  { code: 'C12', name: '朱红', color: '#C84C4D' },
  { code: 'C13', name: '莓果', color: '#883E56' },
  { code: 'C14', name: '樱粉', color: '#F0C4CB' },
  { code: 'C15', name: '玫瑰', color: '#CE819C' },
  { code: 'C16', name: '丁香', color: '#C2ACD4' },
  { code: 'C17', name: '紫罗兰', color: '#8971AC' },
  { code: 'C18', name: '天空', color: '#ABD2E0' },
  { code: 'C19', name: '湖蓝', color: '#679EBA' },
  { code: 'C20', name: '靛蓝', color: '#465E91' },
  { code: 'C21', name: '鼠尾草', color: '#91A47B' },
  { code: 'C22', name: '苔绿', color: '#647A52' },
  { code: 'C23', name: '松绿', color: '#3F6255' },
  { code: 'C24', name: '薄荷', color: '#B6D3BC' },
  { code: 'C25', name: '青碧', color: '#57A5A0' },
  { code: 'C26', name: '焦糖', color: '#AF845C' },
  { code: 'C27', name: '可可', color: '#775444' },
  { code: 'C28', name: '橘子', color: '#ED9249' },
]

type RGB = readonly [number, number, number]
export type ExampleKind =
  | 'flower' | 'heart' | 'capybara' | 'cat-paw' | 'shiba'
  | 'boba' | 'rainbow-cloud' | 'game-controller' | 'bunny' | 'koi'

export interface ExampleMeta {
  id: ExampleKind
  label: string
  title: string
  sourceName: string
}

export const BEAD_EXAMPLES: readonly ExampleMeta[] = [
  { id: 'flower', label: '春日雏菊', title: '小雏菊 · 示例', sourceName: '小雏菊 · 原创示例' },
  { id: 'heart', label: '暖红爱心', title: '一颗心 · 示例', sourceName: '一颗心 · 原创示例' },
  { id: 'capybara', label: '卡皮巴拉', title: '卡皮巴拉 · 示例', sourceName: '卡皮巴拉 · 原创示例' },
  { id: 'cat-paw', label: '软萌猫爪', title: '软萌猫爪 · 示例', sourceName: '软萌猫爪 · 原创示例' },
  { id: 'shiba', label: '微笑柴犬', title: '微笑柴犬 · 示例', sourceName: '微笑柴犬 · 原创示例' },
  { id: 'boba', label: '珍珠奶茶', title: '珍珠奶茶 · 示例', sourceName: '珍珠奶茶 · 原创示例' },
  { id: 'rainbow-cloud', label: '彩虹云朵', title: '彩虹云朵 · 示例', sourceName: '彩虹云朵 · 原创示例' },
  { id: 'game-controller', label: '复古掌机', title: '复古掌机 · 示例', sourceName: '复古掌机 · 原创示例' },
  { id: 'bunny', label: '草莓小兔', title: '草莓小兔 · 示例', sourceName: '草莓小兔 · 原创示例' },
  { id: 'koi', label: '好运锦鲤', title: '好运锦鲤 · 示例', sourceName: '好运锦鲤 · 原创示例' },
]

export interface MaterialCount extends BeadColor { count: number }

export function gridDimensions(width: number, height: number, longestEdge: number) {
  if (![width, height, longestEdge].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('图片尺寸无效。')
  }
  const edge = Math.max(1, Math.min(128, Math.round(longestEdge)))
  const scale = edge / Math.max(width, height)
  return { columns: Math.max(1, Math.round(width * scale)), rows: Math.max(1, Math.round(height * scale)) }
}

export function hexToRgb(hex: string): RGB {
  const normalized = hex.replace('#', '')
  const full = normalized.length === 3 ? normalized.split('').map(char => char + char).join('') : normalized
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)]
}

// Red-mean distance gives green and dark shades more weight than plain RGB distance.
function colorDistance(a: RGB, b: RGB) {
  const redMean = (a[0] + b[0]) / 2
  return (2 + redMean / 256) * (a[0] - b[0]) ** 2
    + 4 * (a[1] - b[1]) ** 2 + (2 + (255 - redMean) / 256) * (a[2] - b[2]) ** 2
}

export function nearestColor(rgb: RGB, palette: readonly BeadColor[] = BEADS_PALETTE): BeadColor {
  if (!palette.length) throw new Error('没有可用的参考色。')
  let nearest = palette[0]
  let minimum = Infinity
  for (const color of palette) {
    const distance = colorDistance(rgb, hexToRgb(color.color))
    if (distance < minimum) { minimum = distance; nearest = color }
  }
  return nearest
}

export function quantizePixels(
  rgba: ArrayLike<number>, columns: number, rows: number, maxColors: number,
  referencePalette: readonly BeadColor[] = BEADS_PALETTE,
): Pick<BeadsData, 'columns' | 'rows' | 'cells' | 'palette'> {
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1
    || columns > 128 || rows > 128 || rgba.length !== columns * rows * 4) {
    throw new Error('像素数据与网格尺寸不一致。')
  }
  if (!referencePalette.length || !Number.isFinite(maxColors) || maxColors < 1) throw new Error('用色数量无效。')
  const pixels: (RGB | null)[] = []
  const frequencies = new Map<string, number>()
  for (let offset = 0; offset < rgba.length; offset += 4) {
    const alpha = rgba[offset + 3] / 255
    if (alpha < 0.5) { pixels.push(null); continue }
    const composite = (channel: number) => Math.round(rgba[offset + channel] * alpha + 255 * (1 - alpha))
    const rgb: RGB = [composite(0), composite(1), composite(2)]
    pixels.push(rgb)
    const code = nearestColor(rgb, referencePalette).code
    frequencies.set(code, (frequencies.get(code) ?? 0) + 1)
  }

  // Keep the dominant color, then preserve colors contributing the most weighted
  // error. This retains small contrasting details better than frequency alone.
  const candidates = referencePalette.filter(color => frequencies.has(color.code))
    .sort((a, b) => frequencies.get(b.code)! - frequencies.get(a.code)!)
  const selected: BeadColor[] = []
  const limit = Math.min(Math.floor(maxColors), candidates.length)
  if (limit) selected.push(candidates[0])
  while (selected.length < limit) {
    let best = candidates.find(color => !selected.includes(color))!
    let bestScore = -1
    for (const candidate of candidates) {
      if (selected.includes(candidate)) continue
      const rgb = hexToRgb(candidate.color)
      const distance = Math.min(...selected.map(color => colorDistance(rgb, hexToRgb(color.color))))
      const score = distance * frequencies.get(candidate.code)!
      if (score > bestScore) { bestScore = score; best = candidate }
    }
    selected.push(best)
  }
  const cells = pixels.map(rgb => rgb ? nearestColor(rgb, selected).code : '')
  const usedCodes = new Set(cells)
  const palette = referencePalette.filter(color => usedCodes.has(color.code)).map(color => ({ ...color }))
  return { columns, rows, cells, palette }
}

export function countMaterials(data: Pick<BeadsData, 'cells' | 'palette'>): MaterialCount[] {
  const counts = new Map<string, number>()
  for (const code of data.cells) if (code) counts.set(code, (counts.get(code) ?? 0) + 1)
  return data.palette.filter(color => counts.has(color.code))
    .map(color => ({ ...color, count: counts.get(color.code)! }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))
}

export function physicalSize(columns: number, rows: number, beadSize: number) {
  return { widthMm: columns * beadSize, heightMm: rows * beadSize }
}

export function cloneBeads(data: BeadsData): BeadsData {
  return { ...data, cells: [...data.cells], palette: data.palette.map(color => ({ ...color })) }
}

export function paintCell(data: BeadsData, index: number, code: string): BeadsData {
  if (index < 0 || index >= data.cells.length) return data
  if (data.cells[index] === code) return data
  const cells = [...data.cells]
  cells[index] = code
  const used = new Set(cells.filter(Boolean))
  const known = new Map<string, BeadColor>(BEADS_PALETTE.map(color => [color.code, color]))
  for (const color of data.palette) known.set(color.code, color)
  const palette = [...used]
    .map(item => known.get(item))
    .filter((item): item is BeadColor => Boolean(item))
    .map(item => ({ ...item }))
    .sort((a, b) => a.code.localeCompare(b.code))
  return { ...data, cells, palette }
}

// Saved grids are an independent source: no original photo is needed to edit or export.
export function resamplePattern(source: BeadsData, longestEdge: number, maxColors: number): BeadsData {
  const { columns, rows } = gridDimensions(source.columns, source.rows, longestEdge)
  const colors = new Map(source.palette.map(color => [color.code, hexToRgb(color.color)]))
  const pixels = new Uint8ClampedArray(columns * rows * 4)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const sourceX = Math.min(source.columns - 1, Math.floor((x + 0.5) * source.columns / columns))
      const sourceY = Math.min(source.rows - 1, Math.floor((y + 0.5) * source.rows / rows))
      const rgb = colors.get(source.cells[sourceY * source.columns + sourceX])
      if (rgb) pixels.set([...rgb, 255], (y * columns + x) * 4)
    }
  }
  return { ...quantizePixels(pixels, columns, rows, maxColors, source.palette.length ? source.palette : BEADS_PALETTE), beadSize: source.beadSize, sourceName: source.sourceName }
}

function spriteData(rows: readonly string[], legend: Record<string, string>, sourceName: string): BeadsData {
  const height = rows.length
  const width = rows[0].length
  const cells: string[] = []
  for (const row of rows) {
    for (const ch of row) {
      cells.push(legend[ch] ?? '')
    }
  }
  const used = new Set(cells.filter(Boolean))
  return {
    columns: width,
    rows: height,
    cells,
    palette: BEADS_PALETTE.filter(color => used.has(color.code)).map(color => ({ ...color })),
    beadSize: 5,
    sourceName,
  }
}

const SPRITES: Record<Exclude<ExampleKind, 'flower' | 'heart'>, { rows: readonly string[]; legend: Record<string, string> }> = {
  capybara: {
    legend: { k: 'C27', b: 'C26', c: 'C02', o: 'C28', g: 'C22', e: 'C06', p: 'C09', n: 'C05' },
    rows: [
      '...........gg...........',
      '..........oooo..........',
      '.........oooooo.........',
      '.........oooooo.........',
      '..........oooo..........',
      '.....kk..kkkkkk..kk.....',
      '....kbbkkkkkkkkkkbbk....',
      '....kbbbbbbbbbbbbbbk....',
      '...kbbbbbbbbbbbbbbbbk...',
      '...kbbebbbbbbbbbebbbk...',
      '...kbbbbbccccccbbbbbk...',
      '...kbbbbcccnccccbbbbk...',
      '...kbppbcccnccccbpbpk...',
      '...kbbbbccccccccbbbbk...',
      '....kbbbbbbbbbbbbbbk....',
      '....kbbbbbbbbbbbbbbk....',
      '...kbbbbbbbbbbbbbbbbk...',
      '...kbbbbbbbbbbbbbbbbk...',
      '...kbbbbbbbbbbbbbbbbk...',
      '...kbbbbbbbbbbbbbbbbk...',
      '....kbbbbbbbbbbbbbbk....',
      '....kbbbk..kk..kbbbk....',
      '....kkkk........kkkk....',
      '........................',
    ],
  },
  'cat-paw': {
    legend: { k: 'C27', w: 'C01', p: 'C14', r: 'C15', c: 'C03' },
    rows: [
      '........................',
      '.......kkk....kkk.......',
      '......kpppk..kpppk......',
      '..kk..kprpk..kprpk..kk..',
      '.kppk.kpppk..kpppk.kppk.',
      '.kprpk.kkk....kkk.kprpk.',
      '.kpppk............kpppk.',
      '..kkk..kkkkkkkkkk..kkk..',
      '.....kkwwwwwwwwwwkk.....',
      '....kwwwwwwwwwwwwwwk....',
      '...kwwwwwwwwwwwwwwwwk...',
      '...kwwwwwwppppwwwwwwk...',
      '..kwwwwwwpprrppwwwwwwk..',
      '..kwwwwwpprrrrppwwwwwk..',
      '..kwwwwwppppppppwwwwwk..',
      '..kwwwwwppppppppwwwwwk..',
      '...kwwwwwppppppwwwwwk...',
      '...kwwwwwwwwwwwwwwwwk...',
      '....kwwwwwwwwwwwwwwk....',
      '.....kkwwwwwwwwwwkk.....',
      '.......kkkkkkkkkk.......',
      '........................',
      '........................',
      '........................',
    ],
  },
  shiba: {
    legend: { k: 'C27', o: 'C28', h: 'C08', w: 'C01', c: 'C03', e: 'C06', p: 'C10', r: 'C12' },
    rows: [
      '........................',
      '....kk............kk....',
      '...kokk..........kkok...',
      '...koook........koook...',
      '...koooookkkkkkkooook...',
      '..kkoooooooooooooooook..',
      '..koooooooooooooooooook.',
      '.koooooowooooooowoooook.',
      '.koooowwwoooooowwwoooook',
      '.kooooeooooooooooeoooook',
      '.koooowwwwkkkkwwwwoooook',
      '.kppowwwwkkkkkkwwwwopppk',
      '.kppowwwwwwwwwwwwwwopppk',
      '..kkwwwwwwwwwwwwwwwwkkk.',
      '...kwwwwwwppppwwwwwwk...',
      '....kkwwwwppppwwwwkk....',
      '.....krrrrrrrrrrrrk.....',
      '.....krrrhhrrhhrrrk.....',
      '......kwwwwwwwwwwk......',
      '......kwwwwwwwwwwk......',
      '......kwwk....kwwk......',
      '......kkk......kkk......',
      '........................',
      '........................',
    ],
  },
  boba: {
    legend: { k: 'C27', g: 'C21', s: 'C22', w: 'C01', t: 'C02', m: 'C03', b: 'C06', p: 'C14', c: 'C26' },
    rows: [
      '.............ggg........',
      '............gsg.........',
      '............gsg.........',
      '...........gsg..........',
      '......kkkkkkkkkkkk......',
      '.....kwwwwwwwwwwwwk.....',
      '....kkkkkkkkkkkkkkkk....',
      '.....kmmmmmmmmmmmmk.....',
      '.....kmmmmmmmmmmmmk.....',
      '.....kmmbmmmmmmbmmk.....',
      '.....kmpbmmmmmmbpmk.....',
      '.....kttmmmmmmmmttk.....',
      '.....kttttttttttttk.....',
      '......kttttttttttk......',
      '......kttbbttbbttk......',
      '......kttbbttbbttk......',
      '......kcccccccccck......',
      '......kcbccbbcccbk......',
      '.......kccbbccbbk.......',
      '.......kcccccccck.......',
      '........kkkkkkkk........',
      '........................',
      '........................',
      '........................',
    ],
  },
  'rainbow-cloud': {
    legend: { k: 'C05', w: 'C01', r: 'C12', o: 'C28', y: 'C07', g: 'C24', b: 'C18', p: 'C14', e: 'C06' },
    rows: [
      '........................',
      '........rrrrrrrr........',
      '......rrrrrrrrrrrr......',
      '.....rrroooooooorrr.....',
      '....rroooooooooooorr....',
      '...rrooyyyyyyyyyyoorr...',
      '..rrooyyygggggggyyyoor..',
      '..rroyyggbbbbbbbggyyor..',
      '..rroyygbbkkkkkbbgyyor..',
      '..rrkkkkwwwwwwwwkkkkrr..',
      '...kwwwwwwwwwwwwwwwwk...',
      '..kwwwwwwwwwwwwwwwwwwk..',
      '.kwwwwwewwwwwwwwewwwwwk.',
      '.kwwwwwwwwwwwwwwwwwwwwk.',
      '.kwwwppwwwwwwwwwwppwwwk.',
      '.kwwwwwwwweeeewwwwwwwwk.',
      '..kwwwwwwwwwwwwwwwwwwk..',
      '...kkkkkkkkkkkkkkkkkk...',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
    ],
  },
  'game-controller': {
    legend: { k: 'C06', g: 'C04', w: 'C01', d: 'C05', s: 'C18', b: 'C20', r: 'C12', y: 'C07' },
    rows: [
      '........................',
      '....kkkkkkkkkkkkkkkk....',
      '...kggggggggggggggggk...',
      '...kgddddddddddddddgk...',
      '...kgdssssssssssssdgk...',
      '...kgdswwwwsssssssdgk...',
      '...kgdswssssssssssdgk...',
      '...kgdssssssssssssdgk...',
      '...kgddddddddddddddgk...',
      '...kggggggggggggggggk...',
      '...kggggggggggggggggk...',
      '...kgggkkgggggggggggk...',
      '...kggkddkgggggggbbgk...',
      '...kggddddkgggggrrggk...',
      '...kgggkkgggggyykrrgk...',
      '...kggggggggggggyyggk...',
      '...kgggggddggddgggggk...',
      '...kggggggggggggggggk...',
      '....kkkkkkkkkkkkkkkk....',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
    ],
  },
  bunny: {
    legend: { k: 'C13', w: 'C01', p: 'C14', r: 'C12', g: 'C21', e: 'C06', c: 'C10' },
    rows: [
      '........................',
      '......kkk......kkk......',
      '.....kwwk......kwwk.....',
      '.....kwpk......kpwk.....',
      '.....kwpk......kpwk.....',
      '.....kwpk......kpwk.....',
      '.....kwwkkkkkkkkwwk.....',
      '....kwwwwwwwwwwwwwwk....',
      '...kwwwwwwwwwwwwwwwwk...',
      '...kwwwewwwwwwwwewwwk...',
      '...kwwppwwweeeewwppwk...',
      '....kwwwwwwwwwwwwwwk....',
      '.....kkkwwwwwwwwkkk.....',
      '....kwwwwkggggkwwwwk....',
      '...kwwwwkrrrrrrkwwwwk...',
      '...kwwkrrrrrrrrrrkwwk...',
      '....kkrrrwrwrwrrrrkk....',
      '.....krrrrrrrrrrrrk.....',
      '......krrrwrwrrrrk......',
      '.......krrrrrrrrk.......',
      '........krrrrrrk........',
      '.........kkkkkk.........',
      '........................',
      '........................',
    ],
  },
  koi: {
    legend: { k: 'C27', r: 'C12', w: 'C01', o: 'C28', b: 'C18', e: 'C06' },
    rows: [
      '........................',
      '.........kkkkk..........',
      '.......kkrrrrrkk........',
      '......krrrrrrrrrk.......',
      '.....krrewrrrrwerk......',
      '....krrrrrrrrrrrrrk.....',
      '....krrrrwwwwrrrrrk.....',
      '...krrrrwwwwwwrrrrk.....',
      '..koorrrwwwwwwrrrook....',
      '...kkrrrwwwwwwrrrkk.....',
      '....kwwwwwwwwwwwwk......',
      '....kwwwwrrrrwwwwk......',
      '.....kwwrrrrrrwwk.......',
      '.....kwwrrrrrrwwk.......',
      '......kwwwwwwwwk........',
      '.......kwwrrwwk.........',
      '.......koorrook.........',
      '......koorrrrook........',
      '.....koork..krook.......',
      '.....kkkk....kkkk.......',
      '........................',
      '........................',
      '........................',
      '........................',
    ],
  },
}

export function createExample(kind: ExampleKind): BeadsData {
  if (kind !== 'flower' && kind !== 'heart') {
    const meta = BEAD_EXAMPLES.find(item => item.id === kind)!
    const sprite = SPRITES[kind]
    return spriteData(sprite.rows, sprite.legend, meta.sourceName)
  }
  const columns = 24
  const rows = 24
  const cells: string[] = []
  const heart = (x: number, y: number) => {
    const a = (x - 11.5) / 8.5
    const b = (10.5 - y) / 8.5
    return (a * a + b * b - 1) ** 3 - a * a * b ** 3 <= 0
  }
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      let code = ''
      if (kind === 'flower') {
        if (y >= 9 && y <= 21 && (x === 11 || x === 12)) code = x === 11 ? 'C21' : 'C22'
        if (((x - 8) / 3.5) ** 2 + ((y - 16) / 1.8) ** 2 <= 1) code = y < 16 ? 'C21' : 'C22'
        if (((x - 15) / 3.5) ** 2 + ((y - 18) / 1.8) ** 2 <= 1) code = y < 18 ? 'C21' : 'C22'
        for (let petal = 0; petal < 8; petal++) {
          const angle = petal * Math.PI / 4
          const px = 11.5 + Math.cos(angle) * 4.2
          const py = 8 + Math.sin(angle) * 4.2
          if ((x - px) ** 2 + (y - py) ** 2 <= 2.6 ** 2) code = y > 9 ? 'C09' : 'C03'
        }
        if ((x - 11.5) ** 2 + (y - 8) ** 2 <= 2.5 ** 2) code = y >= 9 ? 'C08' : 'C07'
      } else if (heart(x, y)) {
        const border = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !heart(x + dx, y + dy))
        code = border ? 'C12' : y > 12 ? 'C11' : 'C10'
        if (!border && ((x - 7) / 2.3) ** 2 + ((y - 6) / 1.8) ** 2 <= 1) code = 'C14'
      }
      cells.push(code)
    }
  }
  const used = new Set(cells)
  return { columns, rows, cells, palette: BEADS_PALETTE.filter(color => used.has(color.code)).map(color => ({ ...color })), beadSize: 5, sourceName: kind === 'flower' ? '小雏菊 · 原创示例' : '一颗心 · 原创示例' }
}

export function validateImageFile(file: Pick<File, 'size' | 'type' | 'name'>): string | null {
  if (file.size === 0) return '这张图片是空文件，请重新选择。'
  if (file.size > MAX_IMAGE_BYTES) return '图片超过 10 MB，请先缩小文件后再试。'
  const supported = ['image/png', 'image/jpeg', 'image/webp']
  if (file.type ? !supported.includes(file.type.toLowerCase()) : !/\.(png|jpe?g|webp)$/i.test(file.name)) {
    return '仅支持 PNG、JPEG 或 WebP 图片，请换一张试试。'
  }
  return null
}

export function detectImageType(bytes: Uint8Array): string | null {
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) return 'image/png'
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg'
  if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp'
  return null
}

function csvCell(value: string | number) {
  const text = String(value)
  // User-controlled names must not become formulas when opened in a spreadsheet.
  const safe = /^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}

export function materialsCsv(data: BeadsData, name: string): string {
  const materials = countMaterials(data)
  const size = physicalSize(data.columns, data.rows, data.beadSize)
  const rows: (string | number)[][] = [
    ['作品名称', name], ['来源', data.sourceName], ['网格', `${data.columns} 列 × ${data.rows} 行`],
    ['拼豆直径 (mm)', data.beadSize], ['成品宽 (mm)', size.widthMm], ['成品高 (mm)', size.heightMm],
    ['总豆数', materials.reduce((sum, material) => sum + material.count, 0)], [],
    ['参考色号', '颜色名称', 'HEX 参考颜色', '数量 (颗)'],
    ...materials.map(material => [material.code, material.name, material.color, material.count]),
    [], ['色号说明', PALETTE_NOTICE], ['空白格', '不放豆；数量不含备用损耗'],
    ['尺寸说明', '按网格外框与豆径估算，熨烫后尺寸可能变化；不保证与实物颜色完全一致'],
  ]
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')
}

export function safeFilename(name: string) {
  return name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/^\.+/, '').trim().slice(0, 60) || 'TraceCraft-拼豆'
}
