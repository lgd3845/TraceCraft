import { describe, expect, it } from 'vitest'
import type { BraceletBead } from '../../lib/types'
import { addBead, BEAD_CATALOG, buildMaterialsCsv, cloneBracelet, countMaterials, createPreset, csvCell, escapeXml, estimateLength, exportFilename, lengthGuidance, MAX_BEADS, moveBead, PRESETS, safeColor } from './bracelet'
import { buildBraceletSvg, layoutBeads } from './braceletSvg'

const bead = (overrides: Partial<BraceletBead> = {}): BraceletBead => ({ id: 'a', name: '奶油珍珠', color: '#f0e7d4', size: 8, material: 'pearl', ...overrides })

describe('catalog and editable presets', () => {
  it('offers at least twelve beads across all five materials', () => {
    expect(BEAD_CATALOG.length).toBeGreaterThanOrEqual(12)
    expect(new Set(BEAD_CATALOG.map(item => item.id)).size).toBe(BEAD_CATALOG.length)
    expect(new Set(BEAD_CATALOG.map(item => item.material)).size).toBe(5)
  })

  it('starts with a complete green, ivory, amber and gold bracelet', () => {
    const data = createPreset()
    expect(data.beads).toHaveLength(26)
    expect(estimateLength(data.beads)).toBe(18.8)
    expect(countMaterials(data.beads).map(item => [item.name, item.count])).toEqual([
      ['苔绿石', 8], ['奶油石', 4], ['奶油珍珠', 6], ['香槟金隔珠', 4], ['琥珀玻璃', 4],
    ])
  })

  it.each(PRESETS.map(preset => preset.id))('creates independent, bounded %s instances', id => {
    const first = createPreset(id)
    const second = createPreset(id)
    expect(first.beads.length).toBeLessThanOrEqual(MAX_BEADS)
    expect(new Set(first.beads.map(item => item.id)).size).toBe(first.beads.length)
    first.beads[0].name = 'changed'
    expect(second.beads[0].name).not.toBe('changed')
    expect(BEAD_CATALOG.some(item => item.name === 'changed')).toBe(false)
  })

  it('restores saved data without mutating it and gives duplicate bead IDs distinct selection IDs', () => {
    const source = { beads: [bead(), bead()], wristSize: 19.5, cordColor: '#645348' }
    const restored = cloneBracelet(source)
    expect(restored.wristSize).toBe(19.5)
    expect(restored.cordColor).toBe('#645348')
    expect(restored.beads.map(({ id: _id, ...item }) => item)).toEqual(source.beads.map(({ id: _id, ...item }) => item))
    expect(new Set(restored.beads.map(item => item.id)).size).toBe(2)
    restored.beads[0].name = 'new'
    expect(source.beads[0].name).toBe('奶油珍珠')
  })

  it('preserves all valid saved bracelet fields, including bead IDs and order', () => {
    const source = createPreset('sunset')
    const restored = cloneBracelet(source)
    expect(restored).toEqual(source)
    expect(restored.beads).not.toBe(source.beads)
    expect(restored.beads[0]).not.toBe(source.beads[0])
  })

  it('bounds oversized restored data, wrist size and unsafe colors', () => {
    const restored = cloneBracelet({ beads: Array.from({ length: MAX_BEADS + 10 }, () => bead({ size: Infinity, color: 'url(https://example.com)' })), wristSize: 99, cordColor: 'red" onload="alert(1)' })
    expect(restored.beads).toHaveLength(MAX_BEADS)
    expect(restored.wristSize).toBe(22)
    expect(restored.beads[0].size).toBe(8)
    expect(restored.cordColor).toBe('#d6cbb6')
    expect(restored.beads[0].color).toBe('#d6cbb6')
    expect(cloneBracelet({ beads: [], wristSize: 0, cordColor: '#645348' }).wristSize).toBe(14)
  })
})

describe('length and material accounting', () => {
  it('converts bead diameters and spacer widths from mm to cm', () => {
    expect(estimateLength([bead(), bead({ size: 10 }), bead({ material: 'spacer', size: 3 })])).toBe(2.1)
    expect(estimateLength([])).toBe(0)
    expect(estimateLength([bead({ size: 7.5 }), bead({ size: 7.5 })])).toBe(1.5)
  })

  it('groups identical materials regardless of bead instance ID, in first-use order', () => {
    const first = bead()
    const beads = [first, bead({ id: 'b' }), bead({ id: 'c', material: 'glass' }), bead({ id: 'd', size: 10 }), bead({ id: 'e', color: '#ffffff' })]
    const result = countMaterials(beads)
    expect(result).toHaveLength(4)
    expect(result[0].count).toBe(2)
    expect(result.map(item => item.count).reduce((sum, count) => sum + count, 0)).toBe(beads.length)
    expect(first).not.toHaveProperty('count')
    expect(countMaterials([])).toEqual([])
  })

  it('does not merge different named materials sharing the same size and color', () => {
    expect(countMaterials([bead(), bead({ name: '另一款珍珠' })])).toHaveLength(2)
  })

  it('provides empty, short, tight, trial-fit and loose reference guidance', () => {
    expect(lengthGuidance(0, 17, 0).tone).toBe('neutral')
    expect(lengthGuidance(16, 17, 20)).toMatchObject({ difference: -1, tone: 'warm', title: '当前串长比手围短' })
    expect(lengthGuidance(17.2, 17, 24)).toMatchObject({ difference: 0.2, title: '预留空间较少' })
    expect(lengthGuidance(18.8, 17, 26)).toMatchObject({ difference: 1.8, tone: 'green' })
    expect(lengthGuidance(21, 17, 30).title).toBe('预留空间较多')
    expect(lengthGuidance(18, 17, 24).detail).toContain('实物试戴')
  })
})

describe('sequence editing', () => {
  const sequence = [bead({ id: 'a' }), bead({ id: 'b' }), bead({ id: 'c' })]

  it('moves the selected bead in either direction without mutating the input', () => {
    expect(moveBead(sequence, 1, -1).map(item => item.id)).toEqual(['b', 'a', 'c'])
    expect(moveBead(sequence, 1, 1).map(item => item.id)).toEqual(['a', 'c', 'b'])
    expect(sequence.map(item => item.id)).toEqual(['a', 'b', 'c'])
  })

  it('does not wrap around or move a missing selection', () => {
    expect(moveBead(sequence, 0, -1)).toBe(sequence)
    expect(moveBead(sequence, 2, 1)).toBe(sequence)
    expect(moveBead(sequence, -1, 1)).toBe(sequence)
    expect(moveBead([], 0, 1)).toEqual([])
  })

  it('appends without mutation and rejects additions beyond the performance limit', () => {
    const full = Array.from({ length: MAX_BEADS }, (_, index) => bead({ id: String(index) }))
    expect(addBead(full, bead())).toBe(full)
    expect(addBead(full.slice(1), bead())).toHaveLength(MAX_BEADS)
    expect(addBead(sequence, bead({ id: 'd' }))).toHaveLength(4)
    expect(sequence).toHaveLength(3)
  })
})

describe('transparent SVG preview and layout', () => {
  it('places every bead on the ellipse, within the artboard, including maximum count', () => {
    for (const data of [createPreset(), { beads: Array.from({ length: MAX_BEADS }, () => bead({ size: 20 })) }]) {
      const layout = layoutBeads(data.beads)
      expect(layout).toHaveLength(data.beads.length)
      for (const position of layout) {
        expect(((position.x - 260) / 175) ** 2 + ((position.y - 254) / 155) ** 2).toBeCloseTo(1)
        expect(position.x - position.rx).toBeGreaterThan(0)
        expect(position.y - position.ry).toBeGreaterThan(0)
        expect(position.x + position.rx).toBeLessThan(520)
        expect(position.y + position.ry).toBeLessThan(520)
        expect(position.rotation).toBeTypeOf('number')
      }
    }
    expect(layoutBeads([])).toEqual([])
  })

  it('keeps wider beads wider and shapes metal spacers differently', () => {
    const result = layoutBeads([bead({ size: 8 }), bead({ size: 10 }), bead({ material: 'spacer', size: 3 })])
    expect(result[1].rx).toBeGreaterThan(result[0].rx)
    expect(result[2].ry).toBeGreaterThan(result[2].rx)
  })

  it('creates self-contained SVG with gradients, shadows and no background panel', () => {
    const svg = buildBraceletSvg(createPreset(), '植野漫步')
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('viewBox="0 0 520 520"')
    expect(svg).toContain('<radialGradient')
    expect(svg).toContain('<feDropShadow')
    expect(svg).not.toMatch(/<rect|<image|<script|<foreignObject|href=|url\(https?:/i)
    expect(svg.match(/<title>/g)).toHaveLength(26)
  })

  it('escapes user titles and bead names, and rejects injected paint references', () => {
    const name = '</title><script>alert("x")</script>&'
    const svg = buildBraceletSvg({ beads: [bead({ name, color: '\"><image href="https://evil.example"/>' })], wristSize: 17, cordColor: 'url(https://evil.example)' }, name)
    expect(svg).toContain('&lt;/title&gt;&lt;script&gt;')
    expect(svg).toContain('&quot;x&quot;')
    expect(svg).not.toContain('<script>')
    expect(svg).not.toContain('evil.example')
    expect(svg).not.toContain('<image')
    expect(escapeXml(`a<&>"'\u0001`)).toBe('a&lt;&amp;&gt;&quot;&apos;')
    expect(safeColor('#Ab12Ef')).toBe('#Ab12Ef')
  })
})

describe('CSV and file name safety', () => {
  it('quotes names, embedded commas, quotes and newlines', () => {
    expect(csvCell('小林的 "礼物",\n夏天')).toBe('"小林的 ""礼物"",\n夏天"')
  })

  it.each(['=HYPERLINK("https://example.com")', '+SUM(1,2)', '-1+2', '@SUM(1,2)', '   =1+1', '\t=1', '\r\n=1'])('neutralizes a spreadsheet formula prefix: %s', input => {
    expect(csvCell(input)).toMatch(/^"'/)
  })

  it('exports UTF-8 BOM, bead counts, cord color and the sizing disclaimer', () => {
    const csv = buildMaterialsCsv('=危险名称', createPreset())
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"作品名称","\'=危险名称"')
    expect(csv).toContain('"珠子总数","26"')
    expect(csv).toContain('"苔绿石","天然石风格","#819881","8","8"')
    expect(csv).toContain('"香槟金隔珠","金属隔珠","#c2a064","3","4"')
    expect(csv).toContain('不等于成品内围')
    expect(csv).toContain('#d6cbb6')
  })

  it('neutralizes a formula in a saved bead name as well as the artwork name', () => {
    const csv = buildMaterialsCsv('正常名字', { beads: [bead({ name: '=1+1' })], wristSize: 17, cordColor: '#d6cbb6' })
    expect(csv).toContain('"\'=1+1","珍珠"')
  })

  it('sanitizes export filenames and supplies a fallback', () => {
    expect(exportFilename('  夏天 / 礼物:*?  ')).toBe('夏天 _ 礼物___')
    expect(exportFilename('  ')).toBe('我的串饰')
    expect(exportFilename('../手链')).not.toContain('/')
    expect(exportFilename('a'.repeat(100))).toHaveLength(48)
  })
})
