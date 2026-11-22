import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StudioContext } from '../../lib/studio'
import type { StudioContextValue } from '../../lib/types'
import CarvingStudio from './CarvingStudio'
import {
  BRIDGE_WIDTHS_MM,
  buildCarvingTemplateSvg,
  CARVING_EXAMPLES,
  CARVING_MATERIALS,
  CARVING_SAFETY_NOTICE,
  carvingStepsCsv,
  createCarvingExampleField,
  DEFAULT_CARVING_RESOLUTION,
  FRAME_SIZES_CM,
  generateCarvingPlan,
  rgbaToCarvingField,
} from './carving'

function createBullseyeRgba(size: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(size * size * 4).fill(255)
  const cx = (size - 1) / 2
  const cy = (size - 1) / 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x - cx, y - cy)
      const i = (y * size + x) * 4
      // Disconnected dark floating island inside white hollow moat
      if (dist < size * 0.20) {
        rgba[i] = 16
        rgba[i + 1] = 16
        rgba[i + 2] = 18
      }
    }
  }
  return rgba
}

function createAsymmetricRgba(size: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(size * size * 4).fill(255)
  for (let y = 20; y < size - 20; y++) {
    for (let x = 14; x < Math.floor(size * 0.35); x++) {
      const i = (y * size + x) * 4
      rgba[i] = 15
      rgba[i + 1] = 15
      rgba[i + 2] = 20
    }
  }
  return rgba
}

function isFullyConnectedToFrame(mask: Uint8Array, size: number): boolean {
  const visited = new Uint8Array(mask.length)
  const queue = new Int32Array(mask.length)
  let head = 0
  let tail = 0
  if (!mask[0]) return false
  queue[tail++] = 0
  visited[0] = 1
  while (head < tail) {
    const curr = queue[head++]
    const cx = curr % size
    const cy = Math.floor(curr / size)
    if (cx > 0 && mask[curr - 1] && !visited[curr - 1]) { visited[curr - 1] = 1; queue[tail++] = curr - 1 }
    if (cx < size - 1 && mask[curr + 1] && !visited[curr + 1]) { visited[curr + 1] = 1; queue[tail++] = curr + 1 }
    if (cy > 0 && mask[curr - size] && !visited[curr - size]) { visited[curr - size] = 1; queue[tail++] = curr - size }
    if (cy < size - 1 && mask[curr + size] && !visited[curr + size]) { visited[curr + size] = 1; queue[tail++] = curr + size }
  }
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] && !visited[i]) return false
  }
  return true
}

const mockStudio: StudioContextValue = {
  artworks: [],
  route: 'carving',
  editingArtwork: null,
  navigate: () => {},
  saveArtwork: () => null,
  deleteArtwork: () => {},
  notify: () => {},
}

describe('multi-algorithm photo carving & auto-bridge stencil engine', () => {
  it('provides 6 distinct examples covering positive-stencil, woodcut-relief, and layered-shadowbox', () => {
    expect(CARVING_EXAMPLES).toHaveLength(6)
    const algorithms = new Set(CARVING_EXAMPLES.map(item => item.recommendedAlgorithm))
    expect(algorithms.size).toBe(3)

    const counts = CARVING_EXAMPLES.map(example => {
      const field = createCarvingExampleField(example.id, 96)
      const plan = generateCarvingPlan(field, example.recommendedAlgorithm, FRAME_SIZES_CM[1], BRIDGE_WIDTHS_MM[1])
      expect(plan.steps.length).toBeGreaterThanOrEqual(1)
      expect(plan.totalPerimeterMeters).toBeGreaterThan(0)
      return plan.steps.length
    })
    expect(Math.max(...counts)).toBeGreaterThanOrEqual(6)
  })

  it('rejects transparent images, yields zero steps for pure white, and flips horizontally for mirror stamps', () => {
    const empty = new Uint8ClampedArray(64 * 64 * 4)
    expect(() => rgbaToCarvingField(empty, 64, 64)).toThrow(/全部透明/)

    for (const whiteVal of [255, 250]) {
      const white = new Uint8ClampedArray(80 * 80 * 4).fill(whiteVal)
      for (let i = 3; i < white.length; i += 4) white[i] = 255
      const field = rgbaToCarvingField(white, 80, 80, 96)
      expect(field.darkness.every(v => v === 0)).toBe(true)
      const plan = generateCarvingPlan(field, 'positive-stencil', 18, 1.8)
      expect(plan.steps).toEqual([])
      expect(plan.floatingIslandsBridged).toBe(0)
    }

    const asym = createAsymmetricRgba(96)
    const normal = rgbaToCarvingField(asym, 96, 96, 96, false, 'portrait', false)
    const mirrored = rgbaToCarvingField(asym, 96, 96, 96, false, 'portrait', true)
    expect(normal.darkness[48 * 96 + 24]).toBeGreaterThan(0.5)
    expect(normal.darkness[48 * 96 + 72]).toBe(0)
    expect(mirrored.darkness[48 * 96 + 24]).toBe(0)
    expect(mirrored.darkness[48 * 96 + 72]).toBeGreaterThan(0.5)
  })

  it('detects disconnected floating islands and auto-bridges every retained pixel 4-connected to the outer frame', () => {
    const bullseye = createBullseyeRgba(96)
    const field = rgbaToCarvingField(bullseye, 96, 96, 96, false, 'portrait', false)
    const plan = generateCarvingPlan(field, 'positive-stencil', 18, 1.8, 'portrait', false)

    expect(plan.floatingIslandsBridged).toBeGreaterThanOrEqual(1)
    expect(plan.bridges.length).toBe(plan.floatingIslandsBridged)
    expect(isFullyConnectedToFrame(plan.layers[0].retainedMask, 96)).toBe(true)
  })

  it('separates behavior across positive-stencil, woodcut-relief, and 4-layer shadowbox algorithms', () => {
    const field = createCarvingExampleField('portrait', DEFAULT_CARVING_RESOLUTION)
    const stencil = generateCarvingPlan(field, 'positive-stencil', 18, 1.8)
    const woodcut = generateCarvingPlan(field, 'woodcut-relief', 18, 1.8)
    const shadowbox = generateCarvingPlan(field, 'layered-shadowbox', 18, 1.8)

    expect(stencil.layers).toHaveLength(1)
    expect(isFullyConnectedToFrame(stencil.layers[0].retainedMask, DEFAULT_CARVING_RESOLUTION)).toBe(true)
    for (const plan of [stencil, woodcut, shadowbox]) {
      for (const step of plan.steps) {
        expect(step.startXMm).toBeGreaterThanOrEqual(0)
        expect(step.startXMm).toBeLessThanOrEqual(plan.frameWidthMm)
        expect(step.startYMm).toBeGreaterThanOrEqual(0)
        expect(step.startYMm).toBeLessThanOrEqual(plan.frameWidthMm)
      }
    }

    expect(woodcut.layers).toHaveLength(1)
    expect(woodcut.steps.some(s => s.toolHint === '三角刀排线' || s.toolHint === '圆刀大面清底')).toBe(true)

    expect(shadowbox.layers).toHaveLength(4)
    expect(shadowbox.layers.map(l => l.name)).toContain('L4 · 背光细节层')
    for (const layer of shadowbox.layers) {
      expect(isFullyConnectedToFrame(layer.retainedMask, DEFAULT_CARVING_RESOLUTION)).toBe(true)
    }
  })

  it('exports valid 1:1 mm stencil SVG templates with bridges and formula-safe CSV', () => {
    const field = createCarvingExampleField('portrait', 96)
    const plan = generateCarvingPlan(field, 'positive-stencil', 18, 1.8, 'portrait', true)
    const svg = buildCarvingTemplateSvg(plan, 'A&B <Carving>', CARVING_MATERIALS[0])

    expect(svg).toContain('width="216mm"')
    expect(svg).toContain('height="232mm"')
    expect(svg).toContain('A&amp;B &lt;Carving&gt;')
    expect(svg).toContain('50 mm 比例尺')
    expect(svg).toContain('防掉连接桥')
    expect(svg).toContain(CARVING_SAFETY_NOTICE)
    expect(svg).not.toMatch(/NaN|undefined|<image|foreignObject/)

    const csv = carvingStepsCsv(plan, '=CMD|calc', CARVING_MATERIALS[0].name)
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"\'=CMD|calc"')
    expect(csv).toContain('自动加固悬空孤岛数')
    expect(csv).toContain('下刀步序')
  })

  it('renders CarvingStudio SSR markup cleanly', () => {
    const html = renderToStaticMarkup(
      <StudioContext.Provider value={mockStudio}>
        <CarvingStudio />
      </StudioContext.Provider>,
    )

    expect(html).toContain('雕刻画工坊')
    expect(html).toContain('阳刻连桥刻纸')
    expect(html).toContain('阴刻版画木刻')
    expect(html).toContain('多层光影纸雕')
    expect(html).toContain('雕刻步骤')
    expect(html).toContain('把定格的剪影，一刀一影刻出玲珑层次。')
    expect(html).not.toMatch(/NaN|undefined/)
  })
})
