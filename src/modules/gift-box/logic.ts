import type { Artwork, GiftBoxData, GiftBoxItem } from '../../lib/types'

export const ITEM_SIZE = 156
export const MIN_SCALE = 0.45
export const MAX_SCALE = 1.65
export const MAX_ITEMS = 16
export const MAX_NOTE_LENGTH = 60

export const BOX_COLORS = [
  { name: '鼠尾草', value: '#a6b29b' }, { name: '奶油白', value: '#e9dfca' },
  { name: '陶土橙', value: '#ca967c' }, { name: '雾紫', value: '#b9aec6' },
  { name: '森林绿', value: '#657968' },
]
export const FILLER_COLORS = [
  { name: '原色拉菲草', value: '#e4d3ae' }, { name: '奶白拉菲草', value: '#f0e8d6' },
  { name: '浅粉拉菲草', value: '#e7c8bd' }, { name: '浅绿拉菲草', value: '#ccd5b9' },
]
export const RIBBON_COLORS = [
  { name: '陶土缎带', value: '#b97559' }, { name: '苔绿缎带', value: '#718268' },
  { name: '莓果缎带', value: '#986676' }, { name: '雾紫缎带', value: '#a397b4' },
  { name: '香槟缎带', value: '#d1b68a' },
]

export function createEmptyBox(): GiftBoxData {
  return {
    shape: 'rectangle', color: BOX_COLORS[0].value, fillerColor: FILLER_COLORS[0].value,
    ribbonColor: RIBBON_COLORS[0].value, items: [], note: '愿每一份小小的心意，\n都成为日常里的惊喜。',
  }
}

export function getBoxGeometry(shape: GiftBoxData['shape']) {
  return shape === 'square'
    ? { x: 133, y: 91, width: 414, height: 414 }
    : { x: 86, y: 124, width: 508, height: 334 }
}

export function clamp(value: number, min: number, max: number, fallback = min) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback))
}

export function normalizeRotation(rotation: number) {
  if (!Number.isFinite(rotation)) return 0
  return ((rotation + 180) % 360 + 360) % 360 - 180
}

export function getScaleLimit(shape: GiftBoxData['shape'], rotation: number) {
  const { width, height } = getBoxGeometry(shape)
  const radians = normalizeRotation(rotation) * Math.PI / 180
  const footprint = ITEM_SIZE * (Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians)))
  return Math.min(MAX_SCALE, (Math.min(width, height) - 16) / footprint)
}

// Use the rotated image's square viewport as a conservative boundary, including a soft inset.
// The artwork itself keeps its original aspect ratio inside that viewport.
export function constrainItem(item: GiftBoxItem, shape: GiftBoxData['shape']): GiftBoxItem {
  const { width, height } = getBoxGeometry(shape)
  const rotation = normalizeRotation(item.rotation)
  const scale = clamp(item.scale, MIN_SCALE, getScaleLimit(shape, rotation), 1)
  const radians = rotation * Math.PI / 180
  const radius = ITEM_SIZE * scale * (Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians))) / 2 + 8
  return {
    ...item, rotation, scale,
    x: clamp(item.x, radius / width * 100, 100 - radius / width * 100, 50),
    y: clamp(item.y, radius / height * 100, 100 - radius / height * 100, 50),
  }
}

export function updateItem(data: GiftBoxData, id: string, patch: Partial<Pick<GiftBoxItem, 'x' | 'y' | 'scale' | 'rotation'>>) {
  return { ...data, items: data.items.map(item => item.id === id ? constrainItem({ ...item, ...patch }, data.shape) : item) }
}

export function changeShape(data: GiftBoxData, shape: GiftBoxData['shape']): GiftBoxData {
  return { ...data, shape, items: data.items.map(item => constrainItem(item, shape)) }
}

export function moveLayer(items: GiftBoxItem[], id: string, direction: -1 | 1) {
  const from = items.findIndex(item => item.id === id)
  const to = from + direction
  if (from < 0 || to < 0 || to >= items.length) return items
  const next = [...items]
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}

export function canPack(artwork: Artwork): artwork is Artwork & { kind: 'bracelet' | 'beads' } {
  return artwork.kind === 'bracelet' || artwork.kind === 'beads'
}

export function createInitialBox(editing: Artwork | null): GiftBoxData {
  if (editing?.kind === 'gift-box') {
    return { ...editing.data, items: editing.data.items.map(item => constrainItem(item, editing.data.shape)) }
  }
  const box = createEmptyBox()
  if (editing && canPack(editing)) {
    box.items = [constrainItem({ id: crypto.randomUUID(), artworkId: editing.id, x: 40, y: 43, rotation: -8, scale: 1 }, box.shape)]
  }
  return box
}

export function wrapNote(note: string) {
  const characters = Array.from(note.replace(/\s+/g, ' ').trim())
  const lines: string[] = []
  for (let index = 0; index < characters.length; index += 12) lines.push(characters.slice(index, index + 12).join(''))
  return lines
}

export interface MaterialLine { label: string; quantity: number; unit: string }
export interface MaterialSummary {
  packaging: MaterialLine[]
  contents: MaterialLine[]
  supplies: MaterialLine[]
  missing: number
  totalItems: number
}

function colorName(color: string, palette: { name: string; value: string }[]) {
  return palette.find(entry => entry.value.toLowerCase() === color.toLowerCase())?.name ?? color
}

export function summarizeMaterials(data: GiftBoxData, artworks: Artwork[]): MaterialSummary {
  const byId = new Map(artworks.filter(canPack).map(artwork => [artwork.id, artwork]))
  const counts = new Map<string, number>()
  for (const item of data.items) counts.set(item.artworkId, (counts.get(item.artworkId) ?? 0) + 1)
  const contents: MaterialLine[] = []
  const supplies = new Map<string, MaterialLine>()
  let missing = 0
  function addSupply(label: string, quantity: number, unit: string) {
    const key = `${label}|${unit}`
    const previous = supplies.get(key)
    supplies.set(key, { label, quantity: (previous?.quantity ?? 0) + quantity, unit })
  }
  for (const [id, count] of counts) {
    const artwork = byId.get(id)
    if (!artwork) { missing += count; continue }
    contents.push({ label: `${artwork.name}（${artwork.kind === 'bracelet' ? '串饰' : '拼豆'}）`, quantity: count, unit: '件' })
    if (artwork.kind === 'bracelet') {
      const materialNames = { glass: '玻璃', pearl: '珍珠', wood: '木珠', crystal: '水晶', spacer: '隔片' }
      for (const bead of artwork.data.beads) addSupply(`${bead.name} · ${materialNames[bead.material]} · ${bead.size} mm · ${bead.color}`, count, '颗')
      addSupply(`串绳 ${artwork.data.cordColor}（净手围参考，另留结头余量）`, artwork.data.wristSize * count, 'cm')
    } else {
      for (const cell of artwork.data.cells) {
        if (!cell || cell.toLowerCase() === 'transparent' || cell === '#00000000') continue
        const color = artwork.data.palette.find(entry => entry.code === cell || entry.color.toLowerCase() === cell.toLowerCase())
        addSupply(`拼豆 ${artwork.data.beadSize} mm · ${color ? `${color.code} ${color.name}` : cell}`, count, '颗')
      }
    }
  }
  return {
    packaging: [
      { label: `${data.shape === 'square' ? '方形' : '矩形'}礼盒 · ${colorName(data.color, BOX_COLORS)}`, quantity: 1, unit: '个' },
      { label: colorName(data.fillerColor, FILLER_COLORS), quantity: 1, unit: '份（按实物盒型调整）' },
      { label: colorName(data.ribbonColor, RIBBON_COLORS), quantity: 1, unit: '条（长度实测）' },
      { label: '祝福卡片', quantity: 1, unit: '张' },
    ],
    contents, supplies: [...supplies.values()], missing, totalItems: data.items.length,
  }
}

export function formatMaterials(name: string, data: GiftBoxData, summary: MaterialSummary) {
  const section = (title: string, lines: MaterialLine[]) => `${title}\n${lines.map(line => `- ${line.label} × ${Number(line.quantity.toFixed(2))} ${line.unit}`).join('\n')}`
  return [
    `GiftCraft · ${name.trim() || '我的心意礼盒'}`, '',
    '本清单为搭配与备料参考，预览不保证实际尺寸。请实测作品、礼盒内径及厚度，确认容纳后再采购。',
    '颜色不代表真实商品色号；拉菲草用量、丝带长度与串绳结头余量请按实物调整。', '',
    section('一、包装材料', summary.packaging), '', section(`二、盒内作品（共 ${summary.totalItems} 件）`, summary.contents), '',
    section('三、内容制作材料（已按放入件数汇总）', summary.supplies), '',
    `四、贺卡文字\n${data.note.trim() || '（空白卡片）'}`,
    ...(summary.missing ? ['', `注意：有 ${summary.missing} 件作品来源不可用，未计入制作材料。`] : []),
  ].join('\n')
}

export function safeFilename(name: string) {
  return name.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').slice(0, 60) || '我的心意礼盒'
}

// A fixed seed keeps the raffia in place during dragging, saving, and re-opening.
export function createRaffia(seed = 3187, count = 190) {
  let state = seed >>> 0
  const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296 }
  return Array.from({ length: count }, (_, index) => {
    const x = random() * 100
    const y = random() * 100
    const dx = random() * 22 - 11
    const dy = random() * 22 - 11
    const bend = random() * 10 - 5
    return {
      path: `M ${x.toFixed(2)} ${y.toFixed(2)} q ${bend.toFixed(2)} ${(dy - 5).toFixed(2)} ${dx.toFixed(2)} ${dy.toFixed(2)} t ${(dx * 0.5).toFixed(2)} ${(dy * -0.8).toFixed(2)}`,
      light: index % 3 === 0, width: 0.22 + random() * 0.24,
    }
  })
}
