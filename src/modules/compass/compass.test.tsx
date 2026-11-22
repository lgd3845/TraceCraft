import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StudioContext } from '../../lib/studio'
import type { StudioContextValue } from '../../lib/types'
import CompassStudio from './CompassStudio'
import {
  buildCompassTemplateSvg,
  COMPASS_EXAMPLES,
  COMPASS_PALETTES,
  COMPASS_SAFETY_NOTICE,
  compassStepsCsv,
  createCompassExampleField,
  DEFAULT_COMPASS_MAP_SIZE,
  generateCompassPlan,
  PAPER_SIZES_CM,
  rgbaToCompassField,
  RING_COUNTS,
} from './compass'

function createSyntheticPortraitRgba(width: number, height: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const dist = Math.hypot(x - width / 2, y - height / 2)
      if (dist < width * 0.16) {
        rgba[idx] = 18; rgba[idx + 1] = 20; rgba[idx + 2] = 26; rgba[idx + 3] = 255
      } else if (dist < width * 0.34) {
        rgba[idx] = 175; rgba[idx + 1] = 112; rgba[idx + 2] = 92; rgba[idx + 3] = 255
      } else {
        rgba[idx] = 249; rgba[idx + 1] = 247; rgba[idx + 2] = 242; rgba[idx + 3] = 255
      }
    }
  }
  return rgba
}

const mockStudio: StudioContextValue = {
  artworks: [],
  route: 'compass',
  editingArtwork: null,
  navigate: () => {},
  saveArtwork: () => null,
  deleteArtwork: () => {},
  notify: () => {},
}

describe('multi-algorithm compass art studio engine', () => {
  it('provides 6 distinct examples covering all three compass algorithms', () => {
    expect(COMPASS_EXAMPLES).toHaveLength(6)
    const algorithms = new Set(COMPASS_EXAMPLES.map(item => item.recommendedAlgorithm))
    expect(algorithms.size).toBe(3)

    const counts = COMPASS_EXAMPLES.map(example => {
      const palette = COMPASS_PALETTES.find(p => p.id === example.defaultPaletteId) ?? COMPASS_PALETTES[0]
      const field = createCompassExampleField(example.id, DEFAULT_COMPASS_MAP_SIZE, palette)
      const plan = generateCompassPlan(
        field,
        example.recommendedAlgorithm,
        RING_COUNTS[1],
        PAPER_SIZES_CM[1],
        example.recommendedColorMode,
      )
      expect(plan.steps.length).toBeGreaterThan(15)
      return `${example.recommendedAlgorithm}:${plan.steps.length}`
    })
    expect(new Set(counts).size).toBeGreaterThanOrEqual(5)
  })

  it('rejects transparent images, yields zero steps for pure white, and preserves edge contrast', () => {
    const empty = new Uint8ClampedArray(64 * 64 * 4)
    expect(() => rgbaToCompassField(empty, 64, 64)).toThrow(/全部透明/)

    for (const whiteVal of [255, 250]) {
      const white = new Uint8ClampedArray(80 * 80 * 4).fill(whiteVal)
      for (let i = 3; i < white.length; i += 4) white[i] = 255
      const field = rgbaToCompassField(white, 80, 80, 120)
      expect(field.darkness.every(v => v === 0)).toBe(true)
      const plan = generateCompassPlan(field, 'concentric-arcs', 28, 20, 'mono')
      expect(plan.steps).toEqual([])
      expect(plan.totalLengthMeters).toBe(0)
    }

    const portrait = createSyntheticPortraitRgba(120, 120)
    const extracted = rgbaToCompassField(portrait, 120, 120, DEFAULT_COMPASS_MAP_SIZE, COMPASS_PALETTES[0], true, false, 'portrait')
    const c = Math.floor(DEFAULT_COMPASS_MAP_SIZE / 2)
    expect(extracted.darkness[18 * DEFAULT_COMPASS_MAP_SIZE + c]).toBe(0)
    expect(extracted.darkness[c * DEFAULT_COMPASS_MAP_SIZE + c]).toBeGreaterThan(0.7)
  })

  it('produces distinct center layouts, arc sweeps, and widths across all 3 algorithms', () => {
    const field = createCompassExampleField('portrait', DEFAULT_COMPASS_MAP_SIZE, COMPASS_PALETTES[0])
    const concentric = generateCompassPlan(field, 'concentric-arcs', 40, 20, 'mono', 'portrait')
    const spiral = generateCompassPlan(field, 'archimedean-spiral', 40, 20, 'mono', 'portrait')
    const tri = generateCompassPlan(field, 'multi-center-intersect', 40, 20, 'multi', 'portrait')

    expect(concentric.centers).toHaveLength(1)
    expect(concentric.centers[0].id).toBe('O')
    expect(concentric.steps.every(s => s.sweepDeg <= 122)).toBe(true)

    expect(spiral.centers).toHaveLength(1)
    expect(spiral.steps.every(s => s.sweepDeg === 360)).toBe(true)
    const radiiDiff = spiral.steps[0].samples.some(sample => Math.abs(sample.radiusNorm - spiral.steps[0].radiusNorm) > 0.0001)
    expect(radiiDiff).toBe(true)

    expect(tri.centers.map(c => c.id)).toEqual(['A', 'B', 'C'])
    expect(new Set(tri.steps.map(s => s.centerId)).size).toBe(3)
    expect(tri.layers.length).toBeGreaterThanOrEqual(2)
  })

  it('exports valid 1:1 mm protractor SVG templates and formula-safe CSV', () => {
    const field = createCompassExampleField('rose', DEFAULT_COMPASS_MAP_SIZE, COMPASS_PALETTES[3])
    const plan = generateCompassPlan(field, 'multi-center-intersect', 40, PAPER_SIZES_CM[2], 'multi')
    const svg = buildCompassTemplateSvg(plan, 'A&B <Rose>', COMPASS_PALETTES[3])

    expect(svg).toContain('width="286mm"')
    expect(svg).toContain('height="302mm"')
    expect(svg).toContain('A&amp;B &lt;Rose&gt;')
    expect(svg).toContain('50 mm 比例尺')
    expect(svg).toContain('0°')
    expect(svg).toContain('★ 圆心 A')
    expect(svg).toContain(COMPASS_SAFETY_NOTICE)
    expect(svg).not.toMatch(/NaN|undefined|<image|foreignObject/)

    const csv = compassStepsCsv(plan, '=CMD|calc', COMPASS_PALETTES[3].name)
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"\'=CMD|calc"')
    expect(csv).toContain('所属圆心')
    expect(csv).toContain('圆规半径(mm)')
  })

  it('renders CompassStudio SSR markup cleanly', () => {
    const html = renderToStaticMarkup(
      <StudioContext.Provider value={mockStudio}>
        <CompassStudio />
      </StudioContext.Provider>,
    )

    expect(html).toContain('圆规画工坊')
    expect(html).toContain('同心圆分段弧')
    expect(html).toContain('一笔阿基米德螺线')
    expect(html).toContain('三圆心叠交网格')
    expect(html).toContain('40 圈')
    expect(html).toContain('把难忘的瞬间，一规一弧转成复古版画。')
    expect(html).not.toMatch(/NaN|undefined/)
  })
})
