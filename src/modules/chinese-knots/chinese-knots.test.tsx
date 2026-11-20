import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { guideSheetSvg } from '../../lib/craftGuide'
import { renderKnotDiagram } from './diagrams'
import { CORE_X, OVERHAND_OVERPASSES, OVERHAND_PATH, PAPER, halfGeometry, knotCount, workingX } from './geometry'
import { BASIC_STEPS, CHINESE_KNOT_PROJECTS, KNOT_COLORS, SLIDING_STEPS } from './lessons'

const render = (project: number, step: number, hints = true, palette = 0) => renderToStaticMarkup(CHINESE_KNOT_PROJECTS[project].renderDiagram(step, KNOT_COLORS[palette], hints))
const sources = new Set([
  'https://www.animatedknots.com/cobra-lanyard-knot',
  'https://www.dmc.com/BE/en-GB/sbs-macrame-stitch-diagrams',
  'https://bochiknot.com/blogs/macrame-basic-knots/how-to-macrame-square-knot-tutorial',
  'https://www.limabeads.com/Tying-the-Sliding-Square-Knot-T31',
])

function cordEnd(svg: string, cord: 'A' | 'B') {
  const match = svg.match(new RegExp(`data-cord-end="${cord}" data-end-x="([\\d.]+)" data-end-y="([\\d.]+)"`))
  expect(match, `missing ${cord} free-end label`).not.toBeNull()
  return { x: Number(match![1]), y: Number(match![2]) }
}

function assertCrossingOrder(svg: string) {
  const halves = svg.split(/(?=<g data-half-route=)/).slice(1)
  expect(halves.length).toBeGreaterThan(0)
  for (const half of halves) {
    const layers = ['b-back', 'cores', 'a-front', 'b-over-a']
    if (half.includes('data-layer="b-exits-loop"')) layers.push('b-exits-loop')
    let previous = -1
    for (const layer of layers) {
      const index = half.indexOf(`data-layer="${layer}"`)
      expect(index, layer).toBeGreaterThan(previous)
      previous = index
    }
    for (const layer of layers.filter(layer => layer !== 'b-back')) {
      const afterLayer = half.slice(half.indexOf(`data-layer="${layer}"`))
      const knockout = afterLayer.match(/<path data-knockout="true"[^>]*>/)?.[0]
      expect(knockout, layer).toBeDefined()
      expect(knockout).toContain(`stroke="${PAPER}"`)
      expect(knockout).not.toMatch(/opacity=/)
    }
  }
}

describe('Chinese knot original lesson data', () => {
  it('provides two independent, bounded lessons with researched source links', () => {
    expect(CHINESE_KNOT_PROJECTS.map(project => project.title)).toEqual(['平结基础', '平结滑扣'])
    expect(new Set(CHINESE_KNOT_PROJECTS.map(project => project.id)).size).toBe(2)
    expect(CHINESE_KNOT_PROJECTS.map(project => project.steps.length)).toEqual([8, 12])
    for (const project of CHINESE_KNOT_PROJECTS) {
      expect(project.subtitle).toBe('编绳入门·可搭配串饰')
      expect(project.materials.length).toBeGreaterThanOrEqual(3)
      expect(project.sources.length).toBeGreaterThanOrEqual(2)
      expect(project.sources.length).toBeLessThanOrEqual(3)
      expect(new Set(project.sources.map(source => source.url)).size).toBe(project.sources.length)
      for (const source of project.sources) {
        expect(source.title.length).toBeGreaterThan(0)
        expect(sources.has(source.url)).toBe(true)
        expect(new URL(source.url).protocol).toBe('https:')
      }
      expect(new Set(project.steps.map(step => step.title)).size).toBe(project.steps.length)
      for (const step of project.steps) {
        expect(step.title.length).toBeGreaterThan(0)
        expect(Array.from(step.instruction).length).toBeGreaterThan(0)
        expect(Array.from(step.instruction).length, step.title).toBeLessThanOrEqual(115)
        expect(Array.from(step.checkpoint).length, step.title).toBeLessThanOrEqual(70)
      }
      for (const warning of ['练样', '不承重', '不勒紧', '成人监督', '火焰', '胶水']) expect(project.safety).toContain(warning)
    }
  })

  it('separates half knots from full knots and repeats alternating halves', () => {
    expect(BASIC_STEPS.map(step => step.scene.completedHalves)).toEqual([0, 0, 0, 1, 1, 1, 2, 6])
    expect(SLIDING_STEPS.map(step => step.scene.completedHalves)).toEqual([0, 0, 0, 0, 1, 1, 1, 2, 6, 6, 6, 6])
    expect(knotCount(1)).toEqual({ full: 0, remainingHalf: 1 })
    expect(knotCount(2)).toEqual({ full: 1, remainingHalf: 0 })
    expect(knotCount(6)).toEqual({ full: 3, remainingHalf: 0 })
    for (const steps of [BASIC_STEPS, SLIDING_STEPS]) {
      const routes = steps.filter(step => ['bight', 'weave'].includes(step.scene.kind))
      expect(routes.map(step => Boolean(step.scene.mirrored))).toEqual([false, false, true, true])
      expect(steps[0].instruction).toContain('不翻面')
    }
    expect(BASIC_STEPS[7].instruction).toContain('总从当前左侧起手会变成螺旋')
  })

  it('teaches separate free tails, material checks, tuck-only finishing and independent stoppers', () => {
    expect(SLIDING_STEPS[0].instruction).toContain('C1 自由端向下，C2 自由端向上')
    expect(SLIDING_STEPS[1].instruction).toContain('同一根绳的两端标记')
    expect(SLIDING_STEPS[7].checkpoint).toContain('每完成一个整结都试滑与保持')
    expect(SLIDING_STEPS[8].instruction).toContain('每完成一个整结')
    expect(SLIDING_STEPS[8].instruction).toContain('不保证实物牢固')
    expect(SLIDING_STEPS[9].instruction).toContain('工作绳收尾，不穿入芯线')
    expect(SLIDING_STEPS[9].instruction).toContain('不缝、不粘芯线，不用火封')
    expect(SLIDING_STEPS[9].checkpoint).toContain('未验证前别剪短')
    expect(SLIDING_STEPS[10].instruction).toContain('自己的绳头穿过自己的圈')
    expect(SLIDING_STEPS[10].instruction).toContain('绝不把两尾系在一起')
    expect(SLIDING_STEPS[11].instruction).toContain('先离腕反复试滑')
  })
})

describe('square-knot working geometry and crossing layers', () => {
  it('reflects working cords, not the core identities', () => {
    expect(CORE_X).toEqual({ C1: 284, C2: 316 })
    for (const compact of [false, true]) {
      const left = halfGeometry(false, 88, compact)
      const right = halfGeometry(true, 88, compact)
      expect(right.endA.x).toBe(600 - left.endA.x)
      expect(right.endB.x).toBe(600 - left.endB.x)
      expect(right.endA.y).toBe(left.endA.y)
      expect(right.overX).toBe(600 - left.overX)
      expect(right.exitX).toBe(600 - left.exitX)
      expect(right.a).toMatch(/^M350 88 /)
      expect(right.b).toMatch(/^M250 88 /)
      expect(left.a).toContain(`H${compact ? 336 : 454}`)
      expect(right.a).toContain(`H${compact ? 264 : 146}`)
      expect(left.backY).toBeGreaterThan(left.frontY)
      expect(right.backY).toBe(left.backY)
      // Each B foreground segment crosses the level of A's transverse run.
      for (const geometry of [left, right]) {
        const coordinates = geometry.bOverA.match(/[\d.]+/g)!.map(Number)
        expect(coordinates[0]).toBe(geometry.overX)
        expect(coordinates[1]).toBeLessThan(geometry.frontY)
        expect(coordinates[2]).toBeGreaterThan(geometry.frontY)
        expect(geometry.bExit).toContain(`M${geometry.exitX} `)
      }
    }
    expect(workingX(181, true)).toBe(419)
  })

  it('keeps the loop-entry crossing behind A, including the denser slider rows', () => {
    for (const mirrored of [false, true]) {
      for (const compact of [false, true]) {
        for (const height of [24, 40]) {
          const geometry = halfGeometry(mirrored, 88, compact, height)
          const values = geometry.bExit.match(/[\d.]+/g)!.map(Number)
          const density = compact ? height / 40 : 1
          const t = compact ? (8 + Math.sqrt(1312)) / 52 : Math.sqrt(36 / 45)
          const rimY = 88 + (compact ? 14 + 18 * t - 9 * t * t : 126 - 41 * (1 - t) ** 2) * density
          const width = compact ? 7 * density : 10
          const clearance = compact ? 2 * density : 7
          for (let sample = 0; sample <= 100; sample++) {
            const u = sample / 100
            const x = compact ? (1 - u) ** 3 * values[0] + 3 * (1 - u) ** 2 * u * values[2] + 3 * (1 - u) * u ** 2 * values[4] + u ** 3 * values[6] : values[0]
            const y = compact ? (1 - u) ** 3 * values[1] + 3 * (1 - u) ** 2 * u * values[3] + 3 * (1 - u) * u ** 2 * values[5] + u ** 3 * values[7] : values[1] * (1 - u) + values[2] * u
            expect(Math.hypot(x - geometry.exitX, y - rimY)).toBeGreaterThan(width + clearance / 2)
          }
        }
      }
    }
  })

  it('connects tightened half endpoints to the next mirrored half without renaming A/B', () => {
    for (const height of [24, 40]) {
      for (let index = 0; index < 5; index++) {
        const current = halfGeometry(index % 2 === 1, 88 + index * height, true, height)
        const next = halfGeometry(index % 2 === 0, 88 + (index + 1) * height, true, height)
        expect(next.a).toMatch(new RegExp(`^M${current.endA.x} ${current.endA.y} `))
        expect(next.b).toMatch(new RegExp(`^M${current.endB.x} ${current.endB.y} `))
      }
    }
  })

  it('uses explicit front/back draw order and opaque knockouts on both mirrored halves', () => {
    for (const mirrored of [false, true]) {
      for (const kind of ['bight', 'weave'] as const) {
        const svg = renderToStaticMarkup(renderKnotDiagram({ kind, completedHalves: mirrored ? 1 : 0, mirrored }, KNOT_COLORS[0], false, false))
        assertCrossingOrder(svg)
        expect(svg.includes('data-layer="b-exits-loop"')).toBe(kind === 'weave' || mirrored)
      }
    }
    assertCrossingOrder(render(0, 7))
    assertCrossingOrder(render(1, 11))
  })

  it('keeps physical free-end names after side changes, independent of color choice', () => {
    for (let palette = 0; palette < KNOT_COLORS.length; palette++) {
      expect(cordEnd(render(0, 0, false, palette), 'A').x).toBe(250)
      expect(cordEnd(render(0, 2, false, palette), 'A')).toEqual({ x: 454, y: 214 })
      expect(cordEnd(render(0, 2, false, palette), 'B')).toEqual({ x: 181, y: 171 })
      expect(cordEnd(render(0, 3, false, palette), 'A').x).toBe(350)
      expect(cordEnd(render(0, 3, false, palette), 'B').x).toBe(250)
      expect(cordEnd(render(0, 5, false, palette), 'A')).toEqual({ x: 146, y: 254 })
      expect(cordEnd(render(0, 5, false, palette), 'B')).toEqual({ x: 419, y: 211 })
      expect(cordEnd(render(0, 6, false, palette), 'A').x).toBe(250)
      expect(cordEnd(render(0, 6, false, palette), 'B').x).toBe(350)
    }
  })
})

describe('SVG contract for boards, small cards and complete-guide export', () => {
  for (const [projectIndex, project] of CHINESE_KNOT_PROJECTS.entries()) {
    it(`renders every ${project.title} step in every palette, with and without hints`, () => {
      for (let step = 0; step < project.steps.length; step++) {
        for (let palette = 0; palette < KNOT_COLORS.length; palette++) {
          for (const hints of [true, false]) {
            const svg = render(projectIndex, step, hints, palette)
            expect(svg).toMatch(/^<svg /)
            expect(svg).toMatch(/<\/svg>$/)
            expect(svg.match(/<svg\b/g)).toHaveLength(1)
            expect(svg).toContain('viewBox="0 0 600 400"')
            expect(svg).not.toMatch(/foreignObject|<image\b|<use\b|\bid=|url\(#|<animate|NaN|Infinity/)
            expect(svg).toContain('<title>')
            expect(svg).toContain('<desc>')
            for (const size of svg.matchAll(/font-size="([\d.]+)"/g)) expect(Number(size[1])).toBeGreaterThanOrEqual(18)
            expect(svg.includes('data-hints="true"')).toBe(hints)
            for (const [id, x] of Object.entries(CORE_X)) {
              expect(svg).toContain(`data-core="${id}" data-core-x="${x}"`)
              expect(svg).toContain(`data-core-label="${id}"><text x="${x}"`)
            }
            if (projectIndex === 1) expect(svg).toContain('data-free-core-directions="C1-down-C2-up"')
          }
        }
      }
    })

    it(`exports all ${project.title} states without shared identifiers or external assets`, () => {
      const diagrams = project.steps.map((_, step) => render(projectIndex, step).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''))
      const sheet = guideSheetSvg('中国结工坊', project, diagrams)
      expect(sheet.match(/viewBox="0 0 600 400"/g)).toHaveLength(project.steps.length)
      expect(sheet).not.toMatch(/\bid=|url\(#|foreignObject|<image\b/)
      for (const step of project.steps) expect(sheet).toContain(step.title)
      for (const source of project.sources) expect(sheet).toContain(source.url)
    })
  }

  it('renders a connected bracelet, back-only tucks and two separate tail stoppers', () => {
    const overlap = render(1, 0, false)
    expect(overlap).toContain('data-bracelet-connection="C1-top-to-C2-bottom"')
    expect(overlap).not.toContain('data-cord-end=')
    const midpoint = render(1, 1, false)
    expect(midpoint.indexOf('data-working-anchor="separate-cord-midpoint-behind"')).toBeLessThan(midpoint.indexOf('data-layer="cores"'))
    const tuck = render(1, 9, false)
    expect(tuck).toContain('工作绳收尾，不穿入芯线')
    expect(tuck).toContain('data-finish="working-ends-only"')
    expect(tuck.indexOf('data-finish="working-ends-only"')).toBeLessThan(tuck.indexOf('data-band-halves="6"'))
    expect(cordEnd(tuck, 'A')).toEqual({ x: 268, y: 214 })
    expect(cordEnd(tuck, 'B')).toEqual({ x: 332, y: 214 })
    expect(tuck).not.toContain('data-stopper=')
    for (const step of [10, 11]) {
      const svg = render(1, step, false)
      expect(svg.match(/data-stopper=/g)).toHaveLength(2)
      expect(svg).toContain('data-stopper="C1" data-stopper-x="284"')
      expect(svg).toContain('data-stopper="C2" data-stopper-x="316"')
    }
    expect(render(1, 10)).toContain('data-fixture="clip"')
    expect(render(1, 11)).not.toContain('data-fixture="clip"')
  })

  it('separates stopper position symbols from a three-crossing overhand tying inset', () => {
    const svg = render(1, 10)
    expect(svg.match(/data-stopper-symbol="true"/g)).toHaveLength(2)
    expect(svg).toContain('灰色圆点只标止结位置')
    expect(svg).toContain('data-overhand-inset="thread-once"')
    expect(svg.match(/data-overhand-crossing=/g)).toHaveLength(3)
    expect(OVERHAND_OVERPASSES).toHaveLength(3)
    const numbers = OVERHAND_PATH.match(/[\d.]+/g)!.map(Number)
    const vertices = Array.from({ length: numbers.length / 2 }, (_, index) => ({ x: numbers[index * 2], y: numbers[index * 2 + 1] }))
    let crossings = 0
    for (let i = 0; i < vertices.length - 1; i++) {
      for (let j = i + 2; j < vertices.length - 1; j++) {
        const a = vertices[i], b = vertices[i + 1], c = vertices[j], d = vertices[j + 1]
        const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y
        const divisor = rx * sy - ry * sx
        if (!divisor) continue
        const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / divisor
        const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / divisor
        if (t > 0 && t < 1 && u > 0 && u < 1) crossings++
      }
    }
    expect(crossings).toBe(3)
  })

  it('exposes only completed knots, even while the next half is loose', () => {
    for (const [index, steps] of [BASIC_STEPS, SLIDING_STEPS].entries()) {
      for (const [stepIndex, step] of steps.entries()) {
        const svg = render(index, stepIndex)
        const { full, remainingHalf } = knotCount(step.scene.completedHalves)
        expect(svg).toContain(`data-completed-halves="${step.scene.completedHalves}"`)
        expect(svg).toContain(`data-complete-knots="${full}"`)
        expect(svg).toContain(`data-remaining-half="${remainingHalf}"`)
        const looseHalf = ['bight', 'weave'].includes(step.scene.kind) ? 1 : 0
        expect(svg.match(/data-half-route=/g)?.length ?? 0).toBe(step.scene.completedHalves + looseHalf)
      }
    }
  })

  it('clamps stale or non-finite step requests without losing a diagram', () => {
    expect(render(0, -1)).toBe(render(0, 0))
    expect(render(0, 999)).toBe(render(0, 7))
    expect(render(1, NaN)).toBe(render(1, 0))
    expect(render(1, Infinity)).toBe(render(1, 0))
  })
})
