import { describe, expect, it } from 'vitest'
import type { Artwork, GiftBoxItem } from '../../lib/types'
import { BOX_COLORS, canPack, changeShape, clamp, constrainItem, createEmptyBox, createInitialBox, createRaffia, formatMaterials, getBoxGeometry, getScaleLimit, ITEM_SIZE, MAX_SCALE, MIN_SCALE, moveLayer, normalizeRotation, safeFilename, summarizeMaterials, updateItem, wrapNote } from './logic'
import { renderGiftBoxSvg } from './export'

const bracelet: Artwork = {
  id: 'bracelet-1', name: '晴日串饰', kind: 'bracelet', thumbnail: 'data:image/svg+xml,%3Csvg/%3E', createdAt: '2026-11-20',
  data: { wristSize: 16, cordColor: '#ffffff', beads: [
    { id: '1', name: '奶白珍珠', color: '#fff', size: 8, material: 'pearl' },
    { id: '2', name: '奶白珍珠', color: '#fff', size: 8, material: 'pearl' },
    { id: '3', name: '茶色玻璃', color: '#abc', size: 6, material: 'glass' },
  ] },
}
const beads: Artwork = {
  id: 'beads-1', name: '小花拼豆', kind: 'beads', thumbnail: 'data:image/png;base64,test', createdAt: '2026-11-20',
  data: { columns: 3, rows: 2, cells: ['A1', '#FFFFFF', '', 'A2', 'transparent', '#00000000'], beadSize: 5, sourceName: 'flower.png', palette: [
    { code: 'A1', name: '白色', color: '#ffffff' }, { code: 'A2', name: '绿色', color: '#aabbcc' },
  ] },
}
const item = (patch: Partial<GiftBoxItem> = {}): GiftBoxItem => ({ id: 'item-1', artworkId: bracelet.id, x: 50, y: 50, rotation: 0, scale: 1, ...patch })

function expectInsideBox(candidate: GiftBoxItem, shape: 'square' | 'rectangle') {
  const { width, height } = getBoxGeometry(shape)
  const radians = candidate.rotation * Math.PI / 180
  const radius = ITEM_SIZE * candidate.scale * (Math.abs(Math.sin(radians)) + Math.abs(Math.cos(radians))) / 2
  expect(candidate.x / 100 * width - radius).toBeGreaterThanOrEqual(7.9999)
  expect(candidate.x / 100 * width + radius).toBeLessThanOrEqual(width - 7.9999)
  expect(candidate.y / 100 * height - radius).toBeGreaterThanOrEqual(7.9999)
  expect(candidate.y / 100 * height + radius).toBeLessThanOrEqual(height - 7.9999)
}

describe('gift-box coordinate and transform constraints', () => {
  it('clamps normalized coordinates and handles non-finite input', () => {
    expect(clamp(-12, 0, 100)).toBe(0)
    expect(clamp(120, 0, 100)).toBe(100)
    expect(clamp(40, 0, 100)).toBe(40)
    expect(clamp(Number.NaN, 0, 100, 50)).toBe(50)
    expect(clamp(Infinity, 0, 100, 50)).toBe(50)
  })
  it('normalizes negative and multi-turn rotations', () => {
    expect(normalizeRotation(450)).toBe(90)
    expect(normalizeRotation(-450)).toBe(-90)
    expect(normalizeRotation(180)).toBe(-180)
    expect(normalizeRotation(Number.NaN)).toBe(0)
  })
  it('keeps the entire rotated footprint within either box shape', () => {
    for (const shape of ['rectangle', 'square'] as const) {
      for (const rotation of [-180, -135, -90, -45, 0, 30, 45, 90, 179]) {
        for (const x of [-100, 0, 50, 100, 200]) {
          for (const y of [-100, 50, 200]) {
            const result = constrainItem(item({ x, y, rotation, scale: 9 }), shape)
            expectInsideBox(result, shape)
            expect(result.scale).toBeLessThanOrEqual(MAX_SCALE)
          }
        }
      }
    }
  })
  it('constrains scaling and recovers invalid imported values', () => {
    expect(constrainItem(item({ scale: -1 }), 'square').scale).toBe(MIN_SCALE)
    const result = constrainItem(item({ x: NaN, y: Infinity, rotation: NaN, scale: NaN }), 'rectangle')
    expect(result).toMatchObject({ x: 50, y: 50, rotation: 0, scale: 1 })
    expect(getScaleLimit('rectangle', 45)).toBeLessThan(MAX_SCALE)
  })
  it('moves only the selected item without mutating the original', () => {
    const data = { ...createEmptyBox(), items: [item(), item({ id: 'item-2' })] }
    const next = updateItem(data, 'item-1', { x: -999, y: 999, scale: 99 })
    expectInsideBox(next.items[0], 'rectangle')
    expect(next.items[1]).toBe(data.items[1])
    expect(data.items[0].x).toBe(50)
    expect(data.items[0].scale).toBe(1)
  })
  it('reconstrains all items when changing box shape', () => {
    const data = { ...createEmptyBox(), shape: 'square' as const, items: [item({ rotation: 45, scale: 1.65, y: 95 })] }
    const next = changeShape(data, 'rectangle')
    expect(next.shape).toBe('rectangle')
    expectInsideBox(next.items[0], 'rectangle')
    expect(data.shape).toBe('square')
  })
  it('changes stacking order by exactly one level and handles endpoints', () => {
    const items = [item(), item({ id: 'item-2' }), item({ id: 'item-3' })]
    expect(moveLayer(items, 'item-1', 1).map(entry => entry.id)).toEqual(['item-2', 'item-1', 'item-3'])
    expect(moveLayer(items, 'item-3', -1).map(entry => entry.id)).toEqual(['item-1', 'item-3', 'item-2'])
    expect(moveLayer(items, 'item-1', -1)).toBe(items)
    expect(moveLayer(items, 'item-3', 1)).toBe(items)
    expect(moveLayer(items, 'missing', 1)).toBe(items)
  })
})

describe('gift-box initial state', () => {
  it('starts with a truly empty box, never fabricated artworks', () => {
    expect(createInitialBox(null).items).toEqual([])
    expect(createInitialBox(null).color).toBe(BOX_COLORS[0].value)
  })
  it('automatically adds the bracelet or bead artwork being packed', () => {
    for (const artwork of [bracelet, beads]) {
      const initial = createInitialBox(artwork)
      expect(initial.items).toHaveLength(1)
      expect(initial.items[0].artworkId).toBe(artwork.id)
      expectInsideBox(initial.items[0], initial.shape)
    }
  })
  it('restores a gift-box including item order, colors and note without nesting it', () => {
    const data = { ...createEmptyBox(), items: [item(), item({ id: 'item-2', artworkId: beads.id })], note: '给你的小礼物', ribbonColor: '#123456' }
    const artwork: Artwork = { id: 'box-1', name: '礼盒', kind: 'gift-box', data, thumbnail: '', createdAt: '' }
    expect(createInitialBox(artwork)).toEqual(data)
    expect(createInitialBox(artwork).items).not.toBe(data.items)
    expect(canPack(artwork)).toBe(false)
    expect(canPack(bracelet)).toBe(true)
  })
})

describe('gift-box material summary', () => {
  it('counts repeated gifts and aggregates their bead and cord quantities', () => {
    const data = { ...createEmptyBox(), items: [item(), item({ id: 'item-2' }), item({ id: 'item-3', artworkId: beads.id })] }
    const summary = summarizeMaterials(data, [bracelet, beads])
    expect(summary.totalItems).toBe(3)
    expect(summary.contents.map(line => line.quantity)).toEqual([2, 1])
    expect(summary.supplies.find(line => line.label.includes('奶白珍珠'))?.quantity).toBe(4)
    expect(summary.supplies.find(line => line.label.includes('茶色玻璃'))?.quantity).toBe(2)
    expect(summary.supplies.find(line => line.label.includes('串绳'))).toMatchObject({ quantity: 32, unit: 'cm' })
    expect(summary.packaging).toHaveLength(4)
    expect(summary.packaging.every(line => line.quantity === 1)).toBe(true)
  })
  it('supports palette codes and hex colors, ignoring unfilled bead cells', () => {
    const summary = summarizeMaterials({ ...createEmptyBox(), items: [item({ artworkId: beads.id })] }, [beads])
    expect(summary.supplies).toEqual([
      { label: '拼豆 5 mm · A1 白色', quantity: 2, unit: '颗' },
      { label: '拼豆 5 mm · A2 绿色', quantity: 1, unit: '颗' },
    ])
  })
  it('reports missing sources and excludes nested gift-boxes', () => {
    const nested: Artwork = { id: 'nested', name: '不可套娃', kind: 'gift-box', data: createEmptyBox(), thumbnail: '', createdAt: '' }
    const data = { ...createEmptyBox(), items: [item({ artworkId: 'missing' }), item({ id: 'item-2', artworkId: nested.id })] }
    const summary = summarizeMaterials(data, [bracelet, nested])
    expect(summary.missing).toBe(2)
    expect(summary.contents).toEqual([])
    expect(summary.supplies).toEqual([])
  })
  it('produces a usable material list with honest sizing and quantity caveats', () => {
    const data = { ...createEmptyBox(), items: [item()], note: '祝你快乐' }
    const text = formatMaterials('我的礼盒', data, summarizeMaterials(data, [bracelet]))
    expect(text).toContain('不保证实际尺寸')
    expect(text).toContain('另留结头余量')
    expect(text).toContain('一、包装材料')
    expect(text).toContain('三、内容制作材料')
    expect(text).toContain('祝你快乐')
  })
  it('leaves an empty box empty in the content list', () => {
    const summary = summarizeMaterials(createEmptyBox(), [bracelet, beads])
    expect(summary.totalItems).toBe(0)
    expect(summary.contents).toEqual([])
  })
})

describe('gift-box deterministic and safe SVG output', () => {
  it('keeps seeded raffia stable across repeated renders', () => {
    expect(createRaffia()).toEqual(createRaffia())
    expect(createRaffia(1)).not.toEqual(createRaffia(2))
    expect(createRaffia()).toHaveLength(190)
  })
  it('wraps complete Unicode text without losing characters and normalizes whitespace', () => {
    expect(wrapNote('一二三四五六七八九十一二三四五').join('')).toBe('一二三四五六七八九十一二三四五')
    expect(wrapNote('  你好\n\n世界  ')).toEqual(['你好 世界'])
    expect(wrapNote('')).toEqual([])
  })
  it('escapes user-controlled XML and uses flattened PNGs without selection UI', () => {
    const data = { ...createEmptyBox(), note: '<script>&礼物', items: [item()] }
    const png = 'data:image/png;base64,aGVsbG8='
    const svg = renderGiftBoxSvg(data, [bracelet], '</title><script>alert(1)</script>', new Map([[bracelet.id, png]]))
    expect(svg).toContain('&lt;/title&gt;&lt;script&gt;')
    expect(svg).toContain('&lt;script&gt;&amp;礼物')
    expect(svg).not.toContain('<script>')
    expect(svg).not.toContain('data:image/svg+xml')
    expect(svg).toContain(`href="${png}"`)
    expect(svg).toContain('preserveAspectRatio="xMidYMid meet"')
    expect(svg).not.toContain('giftbox-selection-ring')
    expect(svg).not.toContain('tabindex=')
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
  })
  it('refuses to export incomplete or nested SVG thumbnail maps', () => {
    const data = { ...createEmptyBox(), items: [item()] }
    expect(() => renderGiftBoxSvg(data, [bracelet], '礼盒', new Map())).toThrow('自包含')
    expect(() => renderGiftBoxSvg(data, [bracelet], '礼盒', new Map([[bracelet.id, bracelet.thumbnail]]))).toThrow('自包含')
  })
  it('removes unsafe filename characters', () => {
    expect(safeFilename('  送给你/最好的:心意?  ')).toBe('送给你-最好的-心意-')
    expect(safeFilename('  ')).toBe('我的心意礼盒')
  })
})
