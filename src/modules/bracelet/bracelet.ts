import type { BeadMaterial, BraceletBead, BraceletData } from '../../lib/types'

export const MAX_BEADS = 64
export const DEFAULT_NAME = '植野漫步'

export const MATERIAL_NAMES: Record<BeadMaterial, string> = {
  crystal: '天然石风格', pearl: '珍珠', glass: '玻璃', wood: '木珠', spacer: '金属隔珠',
}

export const BEAD_CATALOG: BraceletBead[] = [
  { id: 'moss', name: '苔绿石', color: '#819881', size: 8, material: 'crystal' },
  { id: 'ivory', name: '奶油珍珠', color: '#f0e7d4', size: 8, material: 'pearl' },
  { id: 'amber', name: '琥珀玻璃', color: '#bc813f', size: 8, material: 'glass' },
  { id: 'sand', name: '奶油石', color: '#d8c7a7', size: 8, material: 'crystal' },
  { id: 'forest', name: '森林石', color: '#4f7361', size: 10, material: 'crystal' },
  { id: 'rose', name: '玫瑰石', color: '#d5aea3', size: 8, material: 'crystal' },
  { id: 'blush', name: '粉贝珍珠', color: '#e4c8be', size: 8, material: 'pearl' },
  { id: 'silver-pearl', name: '月灰珍珠', color: '#bdc8c5', size: 10, material: 'pearl' },
  { id: 'sea', name: '海盐玻璃', color: '#8db6a7', size: 8, material: 'glass' },
  { id: 'mist', name: '雾蓝玻璃', color: '#97aab9', size: 8, material: 'glass' },
  { id: 'oak', name: '原色木珠', color: '#b99065', size: 8, material: 'wood' },
  { id: 'walnut', name: '胡桃木珠', color: '#785540', size: 10, material: 'wood' },
  { id: 'cedar', name: '浅杉木珠', color: '#d0b38a', size: 8, material: 'wood' },
  { id: 'gold', name: '香槟金隔珠', color: '#c2a064', size: 3, material: 'spacer' },
  { id: 'silver', name: '雾银隔珠', color: '#b6bfbc', size: 3, material: 'spacer' },
]

export const CORD_COLORS = [
  { name: '亚麻白', color: '#d6cbb6' },
  { name: '鼠尾草', color: '#849178' },
  { name: '陶土棕', color: '#b37c60' },
  { name: '深咖啡', color: '#645348' },
]

export const PRESETS = [
  { id: 'garden', name: DEFAULT_NAME, description: '苔绿 · 奶油 · 琥珀', colors: ['#819881', '#f0e7d4', '#bc813f'], pattern: ['moss', 'moss', 'sand', 'ivory', 'gold', 'amber', 'ivory', 'sand', 'moss', 'gold', 'ivory', 'amber', 'moss'], cordColor: '#d6cbb6' },
  { id: 'sunset', name: '落日来信', description: '木色 · 暖棕 · 香槟金', colors: ['#b99065', '#bc813f', '#d0b38a'], pattern: ['oak', 'cedar', 'amber', 'ivory', 'gold', 'walnut', 'cedar', 'amber', 'oak', 'gold', 'ivory', 'cedar'], cordColor: '#b37c60' },
  { id: 'moon', name: '月光海岸', description: '月灰 · 海盐 · 珍珠白', colors: ['#bdc8c5', '#8db6a7', '#f0e7d4'], pattern: ['ivory', 'sea', 'silver-pearl', 'ivory', 'silver', 'mist', 'ivory', 'sea', 'ivory', 'silver', 'silver-pearl', 'ivory'], cordColor: '#d6cbb6' },
] as const

export function createPreset(presetId: string = 'garden'): BraceletData {
  const preset = PRESETS.find(item => item.id === presetId) ?? PRESETS[0]
  return {
    beads: [...preset.pattern, ...preset.pattern].map((id, index) => ({
      ...BEAD_CATALOG.find(bead => bead.id === id)!, id: `${preset.id}-${index}`,
    })),
    wristSize: 17,
    cordColor: preset.cordColor,
  }
}

export function safeColor(color: string, fallback = '#d6cbb6') {
  return /^#[\da-f]{6}$/i.test(color) ? color : fallback
}

export function beadSize(size: number) {
  return Number.isFinite(size) ? Math.min(20, Math.max(1, size)) : 8
}

export function cloneBracelet(data: BraceletData): BraceletData {
  const ids = new Set<string>()
  return {
    beads: data.beads.slice(0, MAX_BEADS).map((bead, index) => {
      let id = bead.id
      while (!id || ids.has(id)) id = `${id || 'bead'}-${index}`
      ids.add(id)
      return { ...bead, id, color: safeColor(bead.color), size: beadSize(bead.size) }
    }),
    wristSize: Number.isFinite(data.wristSize) ? Math.max(14, Math.min(22, data.wristSize)) : 17,
    cordColor: safeColor(data.cordColor),
  }
}

/** The sum of bead widths, not the finished inner circumference. */
export function estimateLength(beads: BraceletBead[]) {
  return Math.round(beads.reduce((total, bead) => total + beadSize(bead.size), 0) * 10) / 100
}

export function lengthGuidance(length: number, wristSize: number, count: number) {
  const difference = Math.round((length - wristSize) * 100) / 100
  if (!count) return { difference, tone: 'neutral', title: '先放入几颗喜欢的珠子', detail: '添加珠子后，这里会显示串长参考。' }
  if (difference < 0) return { difference, tone: 'warm', title: '当前串长比手围短', detail: '可以再添几颗珠子，实际制作时请先试戴。' }
  if (difference < 0.6) return { difference, tone: 'warm', title: '预留空间较少', detail: '珠子厚度会占用内圈空间，可再添一两颗。' }
  if (difference <= 2) return { difference, tone: 'green', title: '可以开始试排啦', detail: '已有一些余量，松紧仍需根据实物试戴调整。' }
  return { difference, tone: 'warm', title: '预留空间较多', detail: '喜欢贴腕的话，可以试着减少几颗珠子。' }
}

export interface MaterialEntry extends Omit<BraceletBead, 'id'> {
  key: string
  count: number
}

export function countMaterials(beads: BraceletBead[]): MaterialEntry[] {
  const counts = new Map<string, MaterialEntry>()
  for (const bead of beads) {
    const key = JSON.stringify([bead.name, bead.material, bead.color, bead.size])
    const existing = counts.get(key)
    if (existing) existing.count += 1
    else counts.set(key, { key, name: bead.name, material: bead.material, color: bead.color, size: bead.size, count: 1 })
  }
  return [...counts.values()]
}

export function addBead(beads: BraceletBead[], bead: BraceletBead) {
  return beads.length >= MAX_BEADS ? beads : [...beads, bead]
}

export function moveBead(beads: BraceletBead[], from: number, direction: -1 | 1) {
  const to = from + direction
  if (from < 0 || from >= beads.length || to < 0 || to >= beads.length) return beads
  const next = [...beads]
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}

export function escapeXml(value: string) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '').replace(/[<>&"']/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]!)
}

/** Quote every CSV cell and neutralize spreadsheet formula prefixes. */
export function csvCell(value: string | number) {
  const text = String(value)
  const safe = /^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

export function buildMaterialsCsv(name: string, data: BraceletData) {
  const rows: (string | number)[][] = [
    ['作品名称', name],
    ['参考手围（cm）', data.wristSize],
    ['估算串长（cm）', estimateLength(data.beads)],
    ['珠子总数', data.beads.length],
    ['绳色（HEX）', safeColor(data.cordColor)],
    ['说明', '串长为珠子直径 / 隔珠宽度之和，不等于成品内围。未计打结、弹力与珠孔误差；请按实物试戴。颜色与材质为搭配参考。'],
    [],
    ['珠子名称', '材质', '颜色（HEX）', '直径 / 宽度（mm）', '数量（颗）'],
    ...countMaterials(data.beads).map(item => [item.name, MATERIAL_NAMES[item.material], safeColor(item.color), item.size, item.count]),
  ]
  return `\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`
}

export function exportFilename(name: string) {
  return name.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/[. ]+$/g, '').slice(0, 48) || '我的串饰'
}
