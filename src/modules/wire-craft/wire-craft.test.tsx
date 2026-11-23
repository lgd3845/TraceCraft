import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StudioContext } from '../../lib/studio'
import type { StudioContextValue } from '../../lib/types'
import WireCraftStudio from './WireCraftStudio'
import { DEFAULT_PHOTO_FRAMING, photoCropRect } from './stringArtCanvas'
import {
  advanceStringArtCoverage,
  applyThread,
  BOARD_SIZES_CM,
  buildNailTemplateSvg,
  computeImportanceMap,
  CONTOUR_PEG_COUNTS,
  CONTOUR_STEP_COUNTS,
  createExampleDarknessMap,
  createExampleLayers,
  DEFAULT_STRING_MAP_SIZE,
  generateStringArt,
  generateStringArtAsync,
  padPeg,
  rgbaToDarknessMap,
  rgbaToPhotoLayers,
  RING_PEG_COUNTS,
  RING_STEP_COUNTS,
  STRING_EXAMPLES,
  STRING_PALETTES,
  STRING_SAFETY_NOTICE,
  stringArtCoverage,
  threadFootprint,
  threadGain,
  windingSequenceCsv,
} from './stringArt'

function createSyntheticPortraitRgba(width: number, height: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const dx = x - width / 2
      const dy = y - height / 2
      const dist = Math.hypot(dx, dy)
      if (dist < width * 0.16) {
        // High-contrast dark focal center (pupil/eye)
        rgba[idx] = 20; rgba[idx + 1] = 18; rgba[idx + 2] = 22; rgba[idx + 3] = 255
      } else if (dist < width * 0.34) {
        // Mid-tone cheek / warm petal
        rgba[idx] = 196; rgba[idx + 1] = 112; rgba[idx + 2] = 96; rgba[idx + 3] = 255
      } else {
        // Bright highlight surround
        rgba[idx] = 248; rgba[idx + 1] = 246; rgba[idx + 2] = 240; rgba[idx + 3] = 255
      }
    }
  }
  return rgba
}

const mockStudio: StudioContextValue = {
  artworks: [],
  route: 'wire-craft',
  editingArtwork: null,
  navigate: () => {},
  saveArtwork: () => null,
  deleteArtwork: () => {},
  notify: () => {},
}

describe('shared-coverage and free-contour string art engine', () => {
  it('provides 8 distinct example showcases including portrait & multi-color illustrations', () => {
    expect(STRING_EXAMPLES).toHaveLength(8)
    const signatures = new Set<string>()
    for (const example of STRING_EXAMPLES) {
      const palette = STRING_PALETTES.find(p => p.id === example.defaultPaletteId) ?? STRING_PALETTES[0]
      const layers = createExampleLayers(example.id, DEFAULT_STRING_MAP_SIZE, palette, example.recommendedColorMode)
      expect(layers.length).toBeGreaterThanOrEqual(1)
      const map = createExampleDarknessMap(example.id, DEFAULT_STRING_MAP_SIZE)
      expect(map.length).toBe(DEFAULT_STRING_MAP_SIZE * DEFAULT_STRING_MAP_SIZE)
      expect(map[0]).toBe(0)
      signatures.add(`${layers.length}:${Array.from(map).filter(v => v > 0.25).length}`)
    }
    expect(signatures.size).toBeGreaterThanOrEqual(6)
  })

  it('computes saliency importance weighting & contrast highlight clean-floor cleanly', () => {
    const empty = new Uint8ClampedArray(80 * 80 * 4)
    expect(() => rgbaToDarknessMap(empty, 80, 80)).toThrow(/全部透明/)

    const rgba = createSyntheticPortraitRgba(120, 120)
    const mapPortrait = rgbaToDarknessMap(rgba, 120, 120, DEFAULT_STRING_MAP_SIZE, false, 'portrait')
    const mapDramatic = rgbaToDarknessMap(rgba, 120, 120, DEFAULT_STRING_MAP_SIZE, false, 'dramatic')
    const importance = computeImportanceMap(mapPortrait, DEFAULT_STRING_MAP_SIZE)

    const c = Math.floor(DEFAULT_STRING_MAP_SIZE / 2)
    // Bright highlight background must be floored cleanly to 0 darkness
    expect(mapPortrait[20 * DEFAULT_STRING_MAP_SIZE + c]).toBe(0)
    expect(mapPortrait[c * DEFAULT_STRING_MAP_SIZE + c]).toBeGreaterThan(0.75)
    // Edge ring between dark core & light cheek must carry higher importance (> 1.4)
    const edgeIdx = Math.floor(c * 0.68) * DEFAULT_STRING_MAP_SIZE + c
    expect(importance[c * DEFAULT_STRING_MAP_SIZE + c]).toBeGreaterThan(1.4)
    expect(mapDramatic[edgeIdx]).toBeLessThanOrEqual(mapPortrait[edgeIdx] + 0.2)

    const photoLayers = rgbaToPhotoLayers(rgba, 120, 120, DEFAULT_STRING_MAP_SIZE, STRING_PALETTES[0], true, false, 'multi', 'portrait')
    expect(photoLayers.length).toBeGreaterThanOrEqual(2)
    for (const layer of photoLayers) {
      expect(layer.color).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('runs the continuous ring solver within its latency budget and enforces constraints', () => {
    const layers = createExampleLayers('portrait', DEFAULT_STRING_MAP_SIZE, STRING_PALETTES[0], 'mono', 'portrait')
    const start = performance.now()
    const plan = generateStringArt(layers, DEFAULT_STRING_MAP_SIZE, RING_PEG_COUNTS[2], RING_STEP_COUNTS[1], 20, 'ring', STRING_PALETTES[0])
    const elapsedMs = performance.now() - start

    const minGap = Math.max(6, Math.floor(RING_PEG_COUNTS[2] * 0.07))
    expect(plan.layoutMode).toBe('ring')
    expect(plan.pegs).toHaveLength(200)
    expect(plan.steps.length).toBeGreaterThanOrEqual(450)
    expect(plan.steps.length).toBeLessThanOrEqual(2000)
    expect(elapsedMs).toBeLessThan(1500)

    const pairUses = new Map<string, number>()
    for (const [index, s] of plan.steps.entries()) {
      if (index) expect(s.from).toBe(plan.steps[index - 1].to)
      expect(s.isRestart).toBe(false)
      const diff = Math.abs(s.to - s.from)
      expect(Math.min(diff, 200 - diff)).toBeGreaterThanOrEqual(minGap)
      expect(s.kind).toBe('光影走线')
      const key = s.from < s.to ? `${s.from}:${s.to}` : `${s.to}:${s.from}`
      const uses = (pairUses.get(key) ?? 0) + 1
      expect(uses).toBeLessThanOrEqual(3)
      pairUses.set(key, uses)
      expect(plan.steps.slice(Math.max(0, index - 12), index).some(step => step.from === s.to)).toBe(false)
    }
  })

  it('produces zero lines for white and near-white photos in either layout', () => {
    for (const value of [255, 250]) {
      const rgba = new Uint8ClampedArray(80 * 80 * 4).fill(value)
      for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255
      for (const contrast of ['soft', 'portrait', 'dramatic'] as const) {
        const map = rgbaToDarknessMap(rgba, 80, 80, 80, false, contrast)
        expect(map.every(value => value === 0)).toBe(true)
        for (const layout of ['ring', 'contour'] as const) {
          const plan = generateStringArt(map, 80, 80, 500, 20, layout)
          expect(plan.steps).toEqual([])
          expect(plan.layers).toEqual([])
          expect(plan.totalLengthMeters).toBe(0)
        }
      }
    }
  })

  it('does not amplify the faint shading of a near-white photo into lines', () => {
    const size = 120
    const rgba = new Uint8ClampedArray(size * size * 4)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4
        rgba[i] = rgba[i + 1] = rgba[i + 2] = 243 + ((x * 7 + y * 13) % 13)
        rgba[i + 3] = 255
      }
    }
    const map = rgbaToDarknessMap(rgba, size, size, DEFAULT_STRING_MAP_SIZE, false, 'portrait')
    expect(Math.max(...map)).toBe(0)
    expect(generateStringArt(map, DEFAULT_STRING_MAP_SIZE, 200, 1500).steps).toEqual([])
  })

  it('keeps flat white, grey and black luminance distinct without inventing contrast', () => {
    const darkness = [255, 128, 0].map(value => {
      const rgba = new Uint8ClampedArray(80 * 80 * 4).fill(value)
      for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255
      return rgbaToDarknessMap(rgba, 80, 80, 80)[40 * 80 + 40]
    })
    expect(darkness[0]).toBe(0)
    expect(darkness[1]).toBeGreaterThan(0)
    expect(darkness[1]).toBeLessThan(darkness[2])
  })

  it('samples photo colors and masks in the same coordinates as luminance', () => {
    const size = 200
    const rgba = new Uint8ClampedArray(size * size * 4).fill(255)
    for (let y = 65; y < 135; y++) {
      for (let x = 140; x < 180; x++) {
        const i = (y * size + x) * 4
        rgba[i] = rgba[i + 1] = rgba[i + 2] = 0
      }
    }
    const mono = rgbaToDarknessMap(rgba, size, size, size)
    const layers = rgbaToPhotoLayers(rgba, size, size, size, STRING_PALETTES[0], true, false, 'multi')
    expect(layers.length).toBeGreaterThan(0)
    for (const layer of layers) {
      for (let i = 0; i < mono.length; i++) {
        if (layer.regionMask![i] > 0) expect(mono[i]).toBeGreaterThan(0)
      }
    }
  })

  it('accepts only lines that improve the exact field used by the renderer', () => {
    const size = DEFAULT_STRING_MAP_SIZE
    const layers = createExampleLayers('portrait', size, STRING_PALETTES[0], 'mono', 'portrait')
    const plan = generateStringArt(layers, size, 200, 1500)
    const target = layers[0].map, importance = layers[0].importance!
    const field = new Float32Array(size * size)
    const loss = () => field.reduce((sum, value, i) => sum + importance[i] * (target[i] - value) ** 2, 0)
    const initial = loss()
    let predictedGain = 0
    for (const [index, step] of plan.steps.entries()) {
      if (index) expect(step.from).toBe(plan.steps[index - 1].to)
      const footprint = threadFootprint(plan.pegs[step.from - 1], plan.pegs[step.to - 1], size)
      const gain = threadGain(target, field, importance, footprint, plan.threadDarkness)
      expect(gain).toBeGreaterThan(0)
      predictedGain += gain
      applyThread(field, footprint, plan.threadDarkness)
    }
    expect(initial - loss()).toBeCloseTo(predictedGain, 2)
    expect(loss() / initial).toBeLessThan(0.46)
    expect(stringArtCoverage(plan)[0]).toEqual(field)
    expect(field.every(value => value >= 0 && value <= 1)).toBe(true)
  })

  it('keeps the same winding prefix and line strength when only the step limit changes', () => {
    const layers = createExampleLayers('portrait', 100, STRING_PALETTES[0], 'mono')
    const short = generateStringArt(layers, 100, 120, 200)
    const long = generateStringArt(layers, 100, 120, 1000)
    expect(long.threadDarkness).toBe(short.threadDarkness)
    expect(long.steps.slice(0, short.steps.length)).toEqual(short.steps)
    expect(stringArtCoverage(long, short.steps.length)).toEqual(stringArtCoverage(short))
  })

  it('advances ring coverage incrementally with exact bit-for-bit parity', () => {
    const layers = createExampleLayers('portrait', DEFAULT_STRING_MAP_SIZE, STRING_PALETTES[0], 'mono')
    const plan = generateStringArt(layers, DEFAULT_STRING_MAP_SIZE, 160, 400)
    const fields = plan.layers.map(() => new Float32Array(plan.mapSize * plan.mapSize))
    const layerMap = new Map(plan.layers.map((layer, index) => [layer.index, index]))
    let prev = 0
    for (const checkpoint of [50, 120, 300]) {
      advanceStringArtCoverage(plan, fields, layerMap, prev, checkpoint)
      expect(fields).toEqual(stringArtCoverage(plan, checkpoint))
      prev = checkpoint
    }
  })

  it('matches synchronous output in generateStringArtAsync across layouts and aborts early on cancel', async () => {
    const ringLayers = createExampleLayers('portrait', 160, STRING_PALETTES[0], 'mono')
    const syncRing = generateStringArt(ringLayers, 160, 120, 120, 20, 'ring', STRING_PALETTES[0])
    const asyncRing = await generateStringArtAsync(
      ringLayers,
      160,
      120,
      120,
      20,
      'ring',
      STRING_PALETTES[0],
      undefined,
      { chunkSteps: 17, yieldChunk: async () => {} },
    )
    expect(asyncRing).not.toBeNull()
    expect(asyncRing!.sequence).toEqual(syncRing.sequence)
    expect(asyncRing!.steps).toEqual(syncRing.steps)
    expect(asyncRing!.layers).toEqual(syncRing.layers)
    expect(asyncRing!.totalLengthMeters).toBe(syncRing.totalLengthMeters)

    const palette = STRING_PALETTES.find(p => p.id === 'starlight-gold')!
    const contourLayers = createExampleLayers('crescent', 160, palette, 'multi', 'portrait')
    const syncContour = generateStringArt(contourLayers, 160, CONTOUR_PEG_COUNTS[0], 140, 20, 'contour', palette)
    const asyncContour = await generateStringArtAsync(
      contourLayers,
      160,
      CONTOUR_PEG_COUNTS[0],
      140,
      20,
      'contour',
      palette,
      undefined,
      { chunkSteps: 19, yieldChunk: async () => {} },
    )
    expect(asyncContour).not.toBeNull()
    expect(asyncContour!.sequence).toEqual(syncContour.sequence)
    expect(asyncContour!.steps).toEqual(syncContour.steps)
    expect(asyncContour!.layers).toEqual(syncContour.layers)
    expect(asyncContour!.totalLengthMeters).toBe(syncContour.totalLengthMeters)

    let yields = 0
    const aborted = await generateStringArtAsync(
      ringLayers,
      160,
      120,
      120,
      20,
      'ring',
      STRING_PALETTES[0],
      undefined,
      {
        chunkSteps: 16,
        shouldAbort: () => yields >= 2,
        yieldChunk: async () => {
          yields++
        },
      },
    )
    expect(aborted).toBeNull()
    expect(yields).toBe(2)
  })

  it('uses additive coverage rather than losing line strength in already dark details', () => {
    const footprint = { indices: new Int32Array([0, 1]), coverage: new Float32Array([1, 0.5]) }
    const field = new Float32Array(2)
    for (let line = 0; line < 25; line++) applyThread(field, footprint, 0.04)
    expect(field[0]).toBeCloseTo(1, 5)
    expect(field[1]).toBeCloseTo(0.5, 5)
    applyThread(field, footprint, 0.8)
    expect(field[0]).toBe(1)
    expect(field[1]).toBeCloseTo(0.9, 5)
    expect(threadGain(new Float32Array([0, 0]), field, new Float32Array([1, 1]), footprint, 0.1)).toBeLessThan(0)
  })

  it('preserves dark image boundaries instead of imposing an artificial white vignette', () => {
    const size = 120
    const rgba = new Uint8ClampedArray(size * size * 4).fill(255)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < 12; x++) {
        const index = (y * size + x) * 4
        rgba[index] = rgba[index + 1] = rgba[index + 2] = 0
      }
    }
    const map = rgbaToDarknessMap(rgba, size, size, size)
    expect(map[Math.floor(size / 2) * size + 5]).toBeGreaterThan(0.9)
  })

  it('centers, enlarges and clamps portrait framing without reading outside the source', () => {
    expect(photoCropRect(480, 320)).toEqual({ sx: 80, sy: 0, side: 320 })
    expect(photoCropRect(480, 320, { zoom: 2, x: 0.75, y: 0.2 })).toEqual({ sx: 280, sy: 0, side: 160 })
    for (const [width, height] of [[80, 400], [500, 100], [160, 160]]) {
      for (const zoom of [1, 2, 3]) {
        for (const x of [0, 0.5, 1]) {
          for (const y of [0, 0.5, 1]) {
            const rect = photoCropRect(width, height, { zoom, x, y })
            expect(rect.sx).toBeGreaterThanOrEqual(0)
            expect(rect.sy).toBeGreaterThanOrEqual(0)
            expect(rect.sx + rect.side).toBeLessThanOrEqual(width)
            expect(rect.sy + rect.side).toBeLessThanOrEqual(height)
          }
        }
      }
    }
    expect(DEFAULT_PHOTO_FRAMING).toEqual({ zoom: 1, x: 0.5, y: 0.5 })
  })

  it('uses symmetric antialiased footprints without wrapping across grid rows', () => {
    const layers = createExampleLayers('heart', 80, STRING_PALETTES[0], 'mono')
    const plan = generateStringArt(layers, 80, 120, 20)
    const a = plan.pegs[7], b = plan.pegs[66]
    expect(threadFootprint(a, b, 80)).toEqual(threadFootprint(b, a, 80))
    const footprint = threadFootprint({ ...a, x: 0, y: 0 }, { ...b, x: 0, y: 79 }, 80)
    expect(footprint.indices.length).toBe(80)
    expect(Array.from(footprint.indices).every(index => index % 80 === 0)).toBe(true)
    expect(Array.from(footprint.coverage).every(value => value === 1)).toBe(true)
  })

  it('builds free-contour multi-color plans with outlined regions and weaving steps', () => {
    const palette = STRING_PALETTES.find(p => p.id === 'starlight-gold')!
    const layers = createExampleLayers('crescent', DEFAULT_STRING_MAP_SIZE, palette, 'multi', 'portrait')
    const plan = generateStringArt(layers, DEFAULT_STRING_MAP_SIZE, CONTOUR_PEG_COUNTS[1], CONTOUR_STEP_COUNTS[1], 20, 'contour', palette)

    expect(plan.layoutMode).toBe('contour')
    expect(plan.layers.length).toBeGreaterThanOrEqual(2)
    expect(plan.contourLoops.length).toBeGreaterThanOrEqual(2)
    expect(plan.steps.filter(s => s.kind === '轮廓锁边').length).toBeGreaterThan(15)
    expect(plan.steps.filter(s => s.kind === '内部混绕').length).toBeGreaterThan(50)
    expect(plan.steps.filter(s => s.isColorChange).length).toBe(plan.layers.length - 1)
  })

  it('exports valid 1:1 mm nail template SVG and multi-color CSV', () => {
    const layers = createExampleLayers('tulip', DEFAULT_STRING_MAP_SIZE, STRING_PALETTES[4], 'multi')
    const plan = generateStringArt(layers, DEFAULT_STRING_MAP_SIZE, CONTOUR_PEG_COUNTS[0], CONTOUR_STEP_COUNTS[0], BOARD_SIZES_CM[1], 'contour', STRING_PALETTES[4])
    const svg = buildNailTemplateSvg(plan, 'A&B <Tulip> Card', STRING_PALETTES[4])

    expect(svg).toContain('width="280mm"')
    expect(svg).toContain('height="296mm"')
    expect(svg).toContain('A&amp;B &lt;Tulip&gt; Card')
    expect(svg).toContain('<polygon points=')
    expect(svg).toContain('50 mm 比例尺')
    expect(svg).toContain('★ 01 号起线钉')
    expect(svg).toContain(STRING_SAFETY_NOTICE)
    expect(svg).not.toMatch(/NaN|undefined|<image|foreignObject/)

    const csv = windingSequenceCsv(plan, '=CMD|test', STRING_PALETTES[4].name)
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"\'=CMD|test"')
    expect(csv).toContain('自由轮廓布钉')
    expect(csv).toContain('丝线颜色')
    expect(csv).toContain(`"${padPeg(plan.steps[0].from, plan.pegCount)}"`)
  })

  it('renders upgraded WireCraftStudio HTML structure cleanly', () => {
    const markup = renderToStaticMarkup(
      <StudioContext.Provider value={mockStudio}>
        <WireCraftStudio />
      </StudioContext.Provider>,
    )

    expect(markup).toContain('绕线画工坊')
    expect(markup).toContain('人物肖像')
    expect(markup).toContain('外圈固定钉')
    expect(markup).toContain('自由轮廓布钉')
    expect(markup).toContain('主次对比度')
    expect(markup).toContain('200 钉')
    expect(markup).toContain('把熟悉的光影，一钉一线织成绵密轮廓。')
    expect(markup).not.toMatch(/NaN|undefined/)
  })
})
