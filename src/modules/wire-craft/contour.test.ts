import { describe, expect, it } from 'vitest'
import {
  createExampleLayers,
  DEFAULT_STRING_MAP_SIZE,
  generateStringArt,
  STRING_PALETTES,
  windingSequenceCsv,
} from './stringArt'
import type { StringArtPlan, StringLayerInput, StringPeg } from './stringArt'

// Walk the actual step direction independently of the solver's chord cache.
function linePixels(from: StringPeg, to: StringPeg, size: number): number[] {
  let x = from.x
  let y = from.y
  const dx = Math.abs(to.x - x)
  const dy = Math.abs(to.y - y)
  const sx = x < to.x ? 1 : -1
  const sy = y < to.y ? 1 : -1
  let error = dx - dy
  const pixels: number[] = []
  while (true) {
    pixels.push(y * size + x)
    if (x === to.x && y === to.y) return pixels
    const doubled = error * 2
    if (doubled > -dy) { error -= dy; x += sx }
    if (doubled < dx) { error += dx; y += sy }
  }
}

function makeLayer(size: number, inside: (x: number, y: number) => boolean, name = '主色'): StringLayerInput {
  const mask = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) mask[y * size + x] = inside(x, y) ? 1 : 0
  }
  return { name, color: '#70452a', map: mask.slice(), regionMask: mask }
}

function expectSafePlan(plan: StringArtPlan, layers: StringLayerInput[]) {
  const activeLayers = layers.filter(layer => layer.map.some(value => value > 0.01))
  for (const peg of plan.pegs) {
    expect(Number.isInteger(peg.x) && Number.isInteger(peg.y)).toBe(true)
    expect(peg.x).toBeGreaterThanOrEqual(0)
    expect(peg.x).toBeLessThan(plan.mapSize)
    expect(peg.y).toBeGreaterThanOrEqual(0)
    expect(peg.y).toBeLessThan(plan.mapSize)
    const layer = activeLayers[peg.layerIndex]
    expect((layer.regionMask ?? layer.map)[peg.y * plan.mapSize + peg.x]).toBeGreaterThan(0.15)
  }

  const outside: Array<{ step: number; kind: string; pixel: number }> = []
  for (const [index, step] of plan.steps.entries()) {
    const layer = activeLayers[step.layerIndex]
    const mask = layer.regionMask ?? layer.map
    const from = plan.pegs[step.from - 1]
    const to = plan.pegs[step.to - 1]
    expect(step.from).not.toBe(step.to)
    // Includes endpoints, every odd/even pixel, and the directed tie pixels.
    for (const pixel of linePixels(from, to, plan.mapSize)) {
      if (!(mask[pixel] > 0.15)) outside.push({ step: step.step, kind: step.kind, pixel })
    }
    expect(step.isRestart).toBe(index > 0 && plan.steps[index - 1].to !== step.from)
    expect(step.isColorChange).toBe(index > 0 && plan.steps[index - 1].layerIndex !== step.layerIndex)
  }
  expect(outside).toEqual([])
  expect(plan.stepCount).toBe(plan.steps.length)
}

describe('strict mask-safe contour winding', () => {
  for (const example of ['crescent', 'cat'] as const) {
    for (const mode of ['mono', 'multi'] as const) {
      it.each([60, 80, 120])(`keeps every ${example} ${mode} step inside its own mask with %i requested pegs`, pegCount => {
        const size = DEFAULT_STRING_MAP_SIZE
        const palette = STRING_PALETTES.find(p => p.id === (example === 'cat' ? 'calico-cat' : 'starlight-gold'))!
        const layers = createExampleLayers(example, size, palette, mode)
        const plan = generateStringArt(layers, size, pegCount, 500, 20, 'contour', palette)

        expectSafePlan(plan, layers)
        expect(plan.steps.length).toBeLessThanOrEqual(500)
        expect(plan.steps.some(step => step.kind === '轮廓锁边')).toBe(true)
        expect(plan.steps.some(step => step.kind === '内部混绕')).toBe(true)
        expect(plan.steps.some(step => step.isRestart && !step.isColorChange)).toBe(true)
        expect(plan.layers.length).toBe(layers.length)
      })
    }
  }

  it('snaps boundary samples to real interior pixels without moving map-edge pegs inward', () => {
    const size = 40
    const layer = makeLayer(size, (x, y) => x <= 28 && y === 0)
    const plan = generateStringArt([layer], size, 60, 100, 20, 'contour')
    expect(plan.pegs.length).toBeGreaterThan(2)
    expect(plan.steps.length).toBeGreaterThan(0)
    expect(plan.pegs.every(peg => peg.y === 0 && peg.x <= 28)).toBe(true)
    expectSafePlan(plan, [layer])
  })

  it('does not merge nearby disjoint color masks, but still shares genuinely overlapping pegs', () => {
    const size = 64
    const left = makeLayer(size, (x, y) => x >= 4 && x <= 30 && y >= 8 && y <= 55, '左侧')
    const right = makeLayer(size, (x, y) => x >= 31 && x <= 57 && y >= 8 && y <= 55, '右侧')
    const overlap = { ...left, name: '左侧叠色', color: '#c28448' }
    const layers = [left, right, overlap]
    const plan = generateStringArt(layers, size, 120, 300, 20, 'contour')
    expectSafePlan(plan, layers)
    expect(plan.layers).toHaveLength(3)
    const usedPegs = layers.map((_, layerIndex) => new Set(plan.steps
      .filter(step => step.layerIndex === layerIndex)
      .flatMap(step => [step.from, step.to])))
    expect([...usedPegs[0]].some(peg => usedPegs[1].has(peg))).toBe(false)
    expect([...usedPegs[0]].some(peg => usedPegs[2].has(peg))).toBe(true)
    expect(plan.pegs.some(peg => peg.layerIndex === 2)).toBe(false)
  })

  it('rejects every crossing of narrow holes, including long chords previously sampled at stride two', () => {
    const size = 100
    const layer = makeLayer(size, (x, y) => x >= 3 && x <= 96 && y >= 3 && y <= 96
      && !(x === 49 && y >= 22 && y <= 77)
      && !(x === 32 && y === 32)
      && !(x === 64 && y === 64))
    const plan = generateStringArt([layer], size, 120, 800, 20, 'contour')
    expectSafePlan(plan, [layer])
    expect(plan.steps.some(step => linePixels(plan.pegs[step.from - 1], plan.pegs[step.to - 1], size).length > 56)).toBe(true)
    expect(plan.steps.some(step => step.kind === '内部混绕')).toBe(true)
  })

  it('skips unsafe outline edges instead of bridging a concavity or forcing fallback lines', () => {
    const size = 160
    const layers = createExampleLayers('crescent', size, STRING_PALETTES[2], 'mono')
    const plan = generateStringArt(layers, size, 60, 800, 20, 'contour')
    const mask = layers[0].regionMask!
    const unsafeEdges = plan.contourLoops.flatMap(loop => loop.flatMap((from, index) => {
      const to = loop[(index + 1) % loop.length]
      return linePixels(plan.pegs[from - 1], plan.pegs[to - 1], size).some(pixel => mask[pixel] <= 0.15)
        ? [{ from, to }] : []
    }))
    expect(unsafeEdges.length).toBeGreaterThan(0)
    for (const edge of unsafeEdges) {
      expect(plan.steps.some(step => step.from === edge.from && step.to === edge.to)).toBe(false)
    }
    expectSafePlan(plan, layers)
  })

  it('marks same-color disconnected islands as restarts and exports the correct start operation', () => {
    const size = 80
    const islands = makeLayer(size, (x, y) => y >= 10 && y <= 35
      && ((x >= 5 && x <= 25) || (x >= 50 && x <= 70)))
    const nextColor = makeLayer(size, (x, y) => x >= 20 && x <= 60 && y >= 50 && y <= 70, '次色')
    nextColor.color = '#e4b879'
    const layers = [islands, nextColor]
    const plan = generateStringArt(layers, size, 80, 300, 20, 'contour')
    expectSafePlan(plan, layers)
    expect(plan.steps[0].isRestart).toBe(false)
    expect(plan.steps[0].isColorChange).toBe(false)
    expect(plan.steps.some(step => step.isRestart && !step.isColorChange)).toBe(true)
    expect(plan.steps.some(step => step.isRestart && step.isColorChange)).toBe(true)
    expect(plan.steps.some(step => !step.isRestart && !step.isColorChange)).toBe(true)
    // A change of island must be a new start, never a connecting winding step.
    for (const step of plan.steps.filter(step => step.layerIndex === 0)) {
      expect(plan.pegs[step.from - 1].x < 40).toBe(plan.pegs[step.to - 1].x < 40)
    }

    const rows = windingSequenceCsv(plan, '片区测试', '测试配色').split('\r\n')
    const header = rows.findIndex(row => row.startsWith('"步数","起始钉号"'))
    expect(header).toBeGreaterThan(0)
    expect(rows[header].split(',').at(-1)).toBe('"起线操作"')
    for (const [index, step] of plan.steps.entries()) {
      const operation = step.isColorChange ? '换色起线' : step.isRestart ? '剪线重新起线' : '继续绕线'
      expect(rows[header + index + 1].split(',').at(-1)).toBe(`"${operation}"`)
    }
  })

  it('leaves unused budget when isolated tiny regions offer no legal continuation', () => {
    const size = 64
    const layer = makeLayer(size, (x, y) => [8, 48].some(cx => [8, 48].some(cy =>
      x >= cx && x <= cx + 1 && y >= cy && y <= cy + 1)))
    const plan = generateStringArt([layer], size, 80, 500, 20, 'contour')
    expect(plan.pegs.length).toBeGreaterThan(2)
    expect(plan.steps).toEqual([])
    expectSafePlan(plan, [layer])
  })

  it('returns zero steps and no fallback pegs for empty masks even with nonempty darkness', () => {
    const size = 40
    const layer = makeLayer(size, () => false)
    layer.map.fill(1)
    for (const input of [[layer], [], new Float32Array(size * size)]) {
      const plan = generateStringArt(input, size, 80, 500, 20, 'contour')
      expect(plan.pegs).toEqual([])
      expect(plan.steps).toEqual([])
      expect(plan.contourLoops).toEqual([])
      expect(plan.sequence).toEqual([])
      expect(plan.layers).toEqual([])
      expect(plan.totalLengthMeters).toBe(0)
    }
  })

  it.each([0, 1, 3, 10])('treats a contour budget of %i as an upper bound', budget => {
    const size = 40
    const layer = makeLayer(size, (x, y) => x >= 5 && x <= 34 && y >= 5 && y <= 34)
    const plan = generateStringArt([layer], size, 60, budget, 20, 'contour')
    expect(plan.steps.length).toBeLessThanOrEqual(budget)
    expectSafePlan(plan, [layer])
  })

  it.each(['crescent', 'cat'] as const)('is repeatably deterministic for %s without mutating input masks', example => {
    const size = DEFAULT_STRING_MAP_SIZE
    const layers = createExampleLayers(example, size, STRING_PALETTES[0], 'multi')
    const original = layers.map(layer => ({ map: layer.map.slice(), mask: layer.regionMask!.slice() }))
    const first = generateStringArt(layers, size, 120, 800, 20, 'contour')
    const second = generateStringArt(layers, size, 120, 800, 20, 'contour')
    expect(second).toEqual(first)
    expectSafePlan(second, layers)
    for (const [index, layer] of layers.entries()) {
      expect(layer.map).toEqual(original[index].map)
      expect(layer.regionMask).toEqual(original[index].mask)
    }
  })
})
