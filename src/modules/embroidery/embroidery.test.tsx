import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StudioContext } from '../../lib/studio'
import type { StudioContextValue } from '../../lib/types'
import EmbroideryStudio from './EmbroideryStudio'
import {
  buildEmbroideryTemplateSvg,
  computeStructureFlowField,
  createEmbroideryExampleRgba,
  EMBROIDERY_EXAMPLES,
  EMBROIDERY_SAFETY_NOTICE,
  embroideryMaterialsCsv,
  FABRIC_PRESETS,
  generateEmbroideryPlan,
  quantizeImageToEmbroideryGrid,
} from './embroidery'

function createWhiteBgMotifWithWhiteCenterRgba(size: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const d = Math.hypot(x - size / 2, y - size / 2)
      if (d < size * 0.14) {
        // Interior bright white sclera / center highlight MUST NOT be cleared by bg removal
        rgba[idx] = 250; rgba[idx + 1] = 249; rgba[idx + 2] = 246; rgba[idx + 3] = 255
      } else if (d < size * 0.34) {
        // Saturated crimson ring isolating interior white from exterior background
        rgba[idx] = 198; rgba[idx + 1] = 44; rgba[idx + 2] = 60; rgba[idx + 3] = 255
      } else {
        // Exterior uniform white background
        rgba[idx] = 252; rgba[idx + 1] = 251; rgba[idx + 2] = 248; rgba[idx + 3] = 255
      }
    }
  }
  return rgba
}

const mockStudio: StudioContextValue = {
  artworks: [],
  route: 'embroidery',
  editingArtwork: null,
  navigate: () => {},
  saveArtwork: () => null,
  deleteArtwork: () => {},
  notify: () => {},
}

describe('Multi-algorithm DMC embroidery studio engine', () => {
  it('provides 6 distinct showcase examples quantizable to authentic DMC threads', () => {
    expect(EMBROIDERY_EXAMPLES).toHaveLength(6)
    const signatures = new Set<string>()
    for (const ex of EMBROIDERY_EXAMPLES) {
      const { rgba, width, height } = createEmbroideryExampleRgba(ex.id, 100)
      const grid = quantizeImageToEmbroideryGrid(rgba, width, height, 36, 12, ex.removeBg)
      expect(grid.palette.length).toBeGreaterThanOrEqual(2)
      for (const color of grid.palette) {
        expect(color.code).toMatch(/^DMC \d+$/)
      }
      signatures.add(`${grid.palette.map(c => c.code).join(',')}:${Array.from(grid.cells).filter(c => c >= 0).length}`)
    }
    expect(signatures.size).toBe(6)
  })

  it('rejects empty images and uses flood-fill background removal preserving interior highlights', () => {
    const empty = new Uint8ClampedArray(60 * 60 * 4)
    expect(() => quantizeImageToEmbroideryGrid(empty, 60, 60, 32, 8, true)).toThrow(/全部透明/)

    const rgba = createWhiteBgMotifWithWhiteCenterRgba(96)
    const stripped = quantizeImageToEmbroideryGrid(rgba, 96, 96, 36, 8, true)
    const kept = quantizeImageToEmbroideryGrid(rgba, 96, 96, 36, 8, false)
    const c = Math.floor(stripped.gridHeight / 2) * stripped.gridWidth + Math.floor(stripped.gridWidth / 2)

    const edgeInsideHoop = Math.floor(stripped.gridHeight / 2) * stripped.gridWidth + 4
    // Exterior white ring inside hoop is unstitched (-1) when removeBg=true, stitched (>=0) when removeBg=false, while interior center stays >=0
    expect(stripped.cells[edgeInsideHoop]).toBe(-1)
    expect(stripped.cells[c]).toBeGreaterThanOrEqual(0)
    expect(kept.cells[edgeInsideHoop]).toBeGreaterThanOrEqual(0)
  })

  it('extracts coherent structure-tensor flow angles and generates all 3 stitch algorithms distinctly', () => {
    const { rgba, width, height } = createEmbroideryExampleRgba('camellia', 100)
    const grid = quantizeImageToEmbroideryGrid(rgba, width, height, 36, 10, true)
    const flow = computeStructureFlowField(grid)
    expect(flow.angles.length).toBe(grid.gridWidth * grid.gridHeight)

    const longShort = generateEmbroideryPlan(grid, 'long-short', 15, false)
    const crossStitch = generateEmbroideryPlan(grid, 'cross-stitch', 15, false)
    const punchNeedle = generateEmbroideryPlan(grid, 'punch-needle', 15, false)

    expect(longShort.stitches.some(s => s.kind === 'long-short')).toBe(true)
    expect(crossStitch.stitches.some(s => s.kind === 'cross')).toBe(true)
    expect(crossStitch.stitches.some(s => s.kind === 'backstitch')).toBe(true)
    expect(punchNeedle.stitches.some(s => s.kind === 'punch-loop')).toBe(true)
    expect(punchNeedle.stitches[0].strands).toBe(6)

    for (const plan of [longShort, crossStitch, punchNeedle]) {
      expect(plan.totalStitches).toBeGreaterThan(80)
      expect(plan.totalMeters).toBeGreaterThan(0.5)
      let expectedStart = 1
      for (const layer of plan.layers) {
        expect(layer.startStep).toBe(expectedStart)
        expect(layer.endStep).toBe(layer.startStep + layer.stitchCount - 1)
        expectedStart = layer.endStep + 1
      }
      expect(expectedStart - 1).toBe(plan.totalStitches)
    }
  })

  it('exports valid 1:1 mm water-soluble transfer SVG and formula-safe DMC CSV', () => {
    const { rgba, width, height } = createEmbroideryExampleRgba('strawberry', 96)
    const grid = quantizeImageToEmbroideryGrid(rgba, width, height, 28, 8, true)
    const plan = generateEmbroideryPlan(grid, 'cross-stitch', 15, false)

    const svg = buildEmbroideryTemplateSvg(plan, 'A&B <Berry>', FABRIC_PRESETS[2])
    expect(svg).toContain('width="180mm"')
    expect(svg).toContain('50 mm 比例尺')
    expect(svg).toContain('A&amp;B &lt;Berry&gt;')
    expect(svg).toContain(EMBROIDERY_SAFETY_NOTICE)
    expect(svg).not.toMatch(/NaN|undefined|<image|foreignObject/)

    const csv = embroideryMaterialsCsv(plan, '=CMD|calc', FABRIC_PRESETS[2].name)
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"\'=CMD|calc"')
    expect(csv).toContain('DMC ')
    expect(csv).toContain('建议股数')
  })

  it('renders EmbroideryStudio SSR structure cleanly', () => {
    const html = renderToStaticMarkup(
      <StudioContext.Provider value={mockStudio}>
        <EmbroideryStudio />
      </StudioContext.Provider>,
    )
    expect(html).toContain('刺绣工坊')
    expect(html).toContain('长短针')
    expect(html).toContain('十字绣')
    expect(html).toContain('戳戳绣')
    expect(html).toContain('山茶花开')
    expect(html).toContain('把心爱的画面，一针一线绣成温润流光。')
    expect(html).not.toMatch(/NaN|undefined/)
  })

  it('routes intra-layer stitches locally to neighboring positions instead of jumping across motifs', () => {
    for (const exampleId of ['camellia', 'strawberry'] as const) {
      const { rgba, width, height } = createEmbroideryExampleRgba(exampleId, 100)
      const grid = quantizeImageToEmbroideryGrid(rgba, width, height, 36, 10, true)

      for (const stitchMode of ['long-short', 'cross-stitch', 'punch-needle'] as const) {
        const plan = generateEmbroideryPlan(grid, stitchMode, 15, false)
        const jumpsInCells: number[] = []
        for (let i = 1; i < plan.stitches.length; i++) {
          const prev = plan.stitches[i - 1]
          const curr = plan.stitches[i]
          if (prev.layerIndex !== curr.layerIndex) continue
          const distCells = Math.hypot(curr.x0 - prev.x1, curr.y0 - prev.y1) / plan.cellSizeNorm
          jumpsInCells.push(distCells)
        }
        jumpsInCells.sort((a, b) => a - b)
        const medianJump = jumpsInCells[Math.floor(jumpsInCells.length / 2)]
        const threshold = stitchMode === 'long-short' ? 3.0 : 2.5
        const localRatio = jumpsInCells.filter(d => d <= threshold).length / jumpsInCells.length
        expect(medianJump).toBeLessThan(1.5)
        expect(localRatio).toBeGreaterThanOrEqual(0.85)
      }
    }
  })
})
