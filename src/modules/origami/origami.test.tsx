import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { guideSheetSvg } from '../../lib/craftGuide'
import { ORIGAMI_COLORS, ORIGAMI_PROJECTS } from './data'
import { clipToPentagon, diagramStep, edgeTail, HEART, HEART_FOLDS, LEFT_FLAP, midpoint, points, reflect, RIGHT_FLAP, STAR_MIDPOINTS, STAR_PINCHES, STAR_PUFFED, STAR_VERTICES, wrappedBand } from './geometry'
import type { Point } from './geometry'

const [heart, star] = ORIGAMI_PROJECTS
const colors = ORIGAMI_COLORS[0]
const svg = (project = heart, step = 0, hints = true) => renderToStaticMarkup(project.renderDiagram(step, colors, hints))
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1])

function expectPoint(actual: Point, expected: Point) {
  expect(actual[0]).toBeCloseTo(expected[0], 8)
  expect(actual[1]).toBeCloseTo(expected[1], 8)
}

function luminance(hex: string) {
  const rgb = [1, 3, 5].map(index => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
}

function shapeSignature(markup: string) {
  // Ignore titles, step metadata and labels: changing text alone is not a new diagram.
  return [...markup.matchAll(/<(?:polygon|polyline|path|line|circle|ellipse)\b[^>]*>/g)].map(match => match[0]).join('')
}

function expectInsidePentagon(vertices: readonly Point[]) {
  expect(vertices.length).toBeGreaterThanOrEqual(3)
  vertices.forEach(point => {
    expect(point.every(Number.isFinite)).toBe(true)
    STAR_VERTICES.forEach((a, edge) => {
      const b = STAR_VERTICES[(edge + 1) % 5]
      expect((b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0])).toBeGreaterThanOrEqual(-1e-8)
    })
  })
}

describe('origami lesson content', () => {
  it('offers only the two scoped beginner lessons, with stable unique IDs', () => {
    expect(ORIGAMI_PROJECTS.map(project => project.title)).toEqual(['平面爱心', '幸运星'])
    expect(ORIGAMI_PROJECTS.map(project => project.steps.length)).toEqual([9, 7])
    expect(new Set(ORIGAMI_PROJECTS.map(project => project.id)).size).toBe(2)
    expect(ORIGAMI_PROJECTS.map(project => project.id)).toEqual(['origami-heart', 'origami-lucky-star'])
  })

  it('keeps every Chinese instruction/checkpoint within the shared sheet budget', () => {
    ORIGAMI_PROJECTS.forEach(project => {
      expect(project.description).toContain('示意')
      expect(project.meaning.length).toBeGreaterThan(10)
      expect(project.duration).toContain('分钟')
      expect(project.level).toContain('入门')
      expect(new Set(project.steps.map(step => step.title)).size).toBe(project.steps.length)
      project.steps.forEach(step => {
        expect(step.title).toMatch(/[\u4e00-\u9fff]/)
        expect(Array.from(step.instruction).length).toBeLessThanOrEqual(115)
        expect(Array.from(step.checkpoint).length).toBeLessThanOrEqual(70)
        expect(step.instruction.length).toBeGreaterThan(20)
        expect(step.checkpoint.length).toBeGreaterThan(10)
      })
    })
  })

  it('retains all researched sources without invented or substituted links', () => {
    expect(heart.sources.map(source => source.url)).toEqual(['http://www.origami-instructions.com/easy-origami-heart.html?no_redirect=true'])
    expect(star.sources.map(source => source.url)).toEqual(['https://origami.me/star/', 'https://www.redtedart.com/origami-lucky-star-how-to-make/'])
    ORIGAMI_PROJECTS.forEach(project => project.sources.forEach(source => {
      expect(source.title.length).toBeGreaterThan(10)
      expect(['http:', 'https:']).toContain(new URL(source.url).protocol)
    }))
  })

  it('uses accessible prepared materials, with no cutting or heat during folding', () => {
    expect(heart.materials.join(' ')).toContain('15 × 15 cm')
    expect(star.materials.join(' ')).toContain('1 × 25 cm')
    expect(star.materials.join(' ')).toContain('24–30 cm')
    expect(star.materials.join(' ')).toContain('备用纸条')
    expect(star.safety).toContain('成人预先裁成等宽条')
    expect(star.safety).toContain('勿入口')
    ORIGAMI_PROJECTS.forEach(project => {
      expect(project.materials.join(' ')).not.toMatch(/剪刀|刀片|火源|打火机/)
      expect(project.safety).toMatch(/不需要剪刀|无需剪刀/)
    })
  })

  it('explicitly teaches the difficult destinations, turns and star mechanics', () => {
    expect(heart.steps[0].instruction).toContain('正面朝下')
    expect(heart.steps[2].instruction).toContain('新顶边的中点')
    expect(heart.steps[2].instruction).toContain('不是原中心')
    expect(heart.steps[3].checkpoint).toContain('45°')
    expect(heart.steps[5].instruction).toContain('不要在桌面上旋转')
    expect(heart.steps[8].instruction).toContain('整个模型翻回正面')
    expect(star.steps[1].instruction).toContain('只穿一次')
    expect(star.steps[2].checkpoint).toContain('不是六边形')
    expect(star.steps[4].instruction).toContain('绕几次由纸长与松紧决定')
    expect(star.steps[5].checkpoint).toContain('尾端已藏住')
    expect(star.steps[6].instruction).toContain('五条边的中点')
    expect(star.steps[6].instruction).toContain('不是捏五个顶点')
    expect(star.steps[6].instruction).toContain('厚度与手法影响')
  })

  it('provides four distinct warm front/back pairs with visible contrast', () => {
    expect(ORIGAMI_COLORS).toHaveLength(4)
    expect(new Set(ORIGAMI_COLORS.map(option => option.name)).size).toBe(4)
    ORIGAMI_COLORS.forEach(option => {
      expect(option.primary).toMatch(/^#[0-9a-f]{6}$/)
      expect(option.secondary).toMatch(/^#[0-9a-f]{6}$/)
      expect((luminance(option.secondary) + 0.05) / (luminance(option.primary) + 0.05)).toBeGreaterThan(3)
    })
  })
})

describe('origami static diagrams and export', () => {
  for (const project of ORIGAMI_PROJECTS) {
    it(`${project.title}: renders every step, palette and hint mode as one standalone native SVG`, () => {
      for (const palette of ORIGAMI_COLORS) {
        for (const hints of [true, false]) {
          project.steps.forEach((_, step) => {
            const markup = renderToStaticMarkup(project.renderDiagram(step, palette, hints))
            expect(markup).toMatch(/^<svg\b[^>]*viewBox="0 0 600 400"[^>]*>[\s\S]*<\/svg>$/)
            expect(markup.match(/<svg\b/g)).toHaveLength(1)
            expect(markup).toContain('xmlns="http://www.w3.org/2000/svg"')
            expect(markup).not.toMatch(/undefined|NaN|Infinity|foreignObject|<image\b|<use\b|<defs\b|<marker\b|\sid=|url\(|\shref=|<style\b|<script\b|<div\b/)
            expect(markup).toContain(`fill="${palette.primary}"`)
            expect(markup).toContain(`fill="${palette.secondary}"`)
            const texts = [...markup.matchAll(/<text\b[^>]*>/g)]
            expect(texts.length).toBeGreaterThan(3)
            texts.forEach(([tag]) => expect(Number(tag.match(/font-size="(\d+)"/)?.[1])).toBeGreaterThanOrEqual(18))
            if (!hints) expect(markup).not.toContain('data-hint=')
          })
        }
      }
    })

    it(`${project.title}: changes actual geometry at every step, even with hints off`, () => {
      for (const hints of [true, false]) {
        const shapes = project.steps.map((_, index) => shapeSignature(svg(project, index, hints)))
        expect(new Set(shapes).size).toBe(project.steps.length)
        shapes.forEach((signature, index) => expect(signature).toBe(shapeSignature(svg(project, index, hints))))
      }
    })

    it(`${project.title}: supports thumbnail, current preview and innerHTML sheet together without IDs`, () => {
      const renders = project.steps.map((_, step) => svg(project, step))
      const inner = renders.map(markup => markup.replace(/^<svg\b[^>]*>/, '').replace(/<\/svg>$/, ''))
      const sheet = guideSheetSvg('折纸小心意', project, inner)
      expect(sheet.match(/<svg\b/g)).toHaveLength(project.steps.length + 1)
      inner.forEach(markup => {
        expect(markup).toContain('font-family=')
        expect(markup).toContain('font-size="18"')
        expect(markup).not.toMatch(/<svg\b|\sid=|url\(/)
        expect(sheet).toContain(markup)
      })
      const coexist = svg(project, project.steps.length - 1, false) + renders[0] + sheet
      expect(coexist).not.toMatch(/\sid=|url\(|undefined|NaN/)
      project.sources.forEach(source => expect(sheet).toContain(source.url))
    })
  }

  it('shows one loop, then three explicit overpasses in a single overhand knot', () => {
    expect(svg(star, 0).match(/data-overpass=/g)).toHaveLength(1)
    expect(svg(star, 1).match(/data-overpass=/g)).toHaveLength(3)
    expect(svg(star, 1)).toContain('data-knot="single-overhand"')
    expect(svg(star, 1)).toContain('stroke-width="26"')
  })

  it('separates wrapping, tail tucking and five edge-midpoint pinches', () => {
    expect(svg(star, 3)).toContain('data-pocket="short"')
    expect(svg(star, 3)).toContain('data-tail="long"')
    expect(svg(star, 4)).toContain('data-hint="wrap-lower-edge"')
    expect(svg(star, 4)).toContain('data-hint="wrap-sloping-edge"')
    expect(svg(star, 5)).toContain('data-pocket="final"')
    expect(svg(star, 5)).not.toContain('data-tail="long"')
    for (const hints of [true, false]) {
      expect(svg(star, 6, hints).match(/data-pinch-edge=/g)).toHaveLength(5)
      expect(svg(star, 6, hints)).not.toContain('data-tail=')
    }
  })

  it('uses the exact constructed heart polygons rather than a finished-heart placeholder', () => {
    expect(svg(heart, 0)).toContain(`points="${points(HEART.diamond)}"`)
    expect(svg(heart, 1)).toContain(`points="${points(HEART.topOutline)}"`)
    expect(svg(heart, 2)).toContain(`points="${points(HEART.bottomOutline)}"`)
    expect(svg(heart, 3)).toContain(`points="${points(RIGHT_FLAP)}"`)
    expect(svg(heart, 4)).toContain(`points="${points(LEFT_FLAP)}"`)
    expect(svg(heart, 7)).toContain(`points="${points(HEART.finished)}"`)
    expect(svg(heart, 2)).toContain('data-hint="new-top-edge"')
    expect(svg(heart, 0)).not.toContain(`points="${points(HEART.finished)}"`)
  })

  it('normalizes invalid indices deterministically', () => {
    expect(diagramStep(4.9, 9)).toBe(4)
    ORIGAMI_PROJECTS.forEach(project => {
      for (const invalid of [-3, NaN, Infinity]) expect(svg(project, invalid)).toBe(svg(project, 0))
      expect(svg(project, 100)).toBe(svg(project, project.steps.length - 1))
    })
  })
})

describe('heart fold geometry', () => {
  it('reflects every moving corner onto its taught target and fixes crease endpoints', () => {
    Object.values(HEART_FOLDS).forEach(fold => {
      expectPoint(reflect(fold.from, fold.crease), fold.to)
      fold.crease.forEach(endpoint => {
        expectPoint(reflect(endpoint, fold.crease), endpoint)
        expect(distance(endpoint, fold.from)).toBeCloseTo(distance(endpoint, fold.to), 8)
      })
      expectPoint(reflect(fold.to, fold.crease), fold.from)
    })
  })

  it('targets the new top edge for the lower tip, not the old top or centre', () => {
    expectPoint(HEART_FOLDS.bottom.to, midpoint(...HEART_FOLDS.top.crease))
    expect(HEART_FOLDS.bottom.to).not.toEqual([0, -100])
    expect(HEART_FOLDS.bottom.to).not.toEqual([0, 0])
    expect(HEART_FOLDS.bottom.crease).toEqual([[-75, 25], [75, 25]])
  })

  it('constructs both 45-degree half folds from the same future bottom tip', () => {
    for (const fold of [HEART_FOLDS.right, HEART_FOLDS.left]) {
      const [start, end] = fold.crease
      expect(start).toEqual([0, 25])
      expect(Math.abs(end[0] - start[0])).toBe(Math.abs(end[1] - start[1]))
      expectPoint(reflect(fold.from, fold.crease), [0, -50])
    }
    expect(RIGHT_FLAP).toEqual([[0, 25], [0, -50], [25, -75], [62.5, -37.5]])
    expect(LEFT_FLAP).toEqual(RIGHT_FLAP.map(([x, y]) => [-x || 0, y]))
  })

  it('keeps balanced cosmetic corner folds and the original bottom tip', () => {
    HEART.finished.forEach(([x, y]) => expect(HEART.finished.some(point => point[0] === -x && point[1] === y)).toBe(true))
    expect(HEART.finished).toContainEqual([0, 25])
    expect(HEART.finished).toContainEqual([0, -50])
    expect(reflect([3, 4], [[0, 0], [0, 0]])).toEqual([3, 4])
  })
})

describe('lucky star schematic geometry', () => {
  it('uses a regular pentagon, not a hexagon', () => {
    expect(STAR_VERTICES).toHaveLength(5)
    STAR_VERTICES.forEach((point, index) => {
      expect(Math.hypot(...point)).toBeCloseTo(64, 8)
      expect(distance(point, STAR_VERTICES[(index + 1) % 5])).toBeCloseTo(distance(STAR_VERTICES[0], STAR_VERTICES[1]), 8)
    })
  })

  it('attaches broad tails to real edges and clips folded layers without external masks', () => {
    for (let edge = 0; edge < 5; edge++) {
      const [a, b, c, d] = edgeTail(edge, 80)
      expectPoint(a, STAR_VERTICES[edge])
      expectPoint(b, STAR_VERTICES[(edge + 1) % 5])
      expect(distance(a, d)).toBeCloseTo(80, 8)
      expect(distance(b, c)).toBeCloseTo(80, 8)
      expect((b[0] - a[0]) * (d[0] - a[0]) + (b[1] - a[1]) * (d[1] - a[1])).toBeCloseTo(0, 8)
      expectInsidePentagon(wrappedBand(edge))
    }
    expectInsidePentagon(clipToPentagon([[-100, -100], [100, -100], [100, 100], [-100, 100]]))
    expect(clipToPentagon([[200, 200], [240, 200], [220, 250]])).toEqual([])
  })

  it('points all five arrows inward through edge midpoints, never at vertices', () => {
    expect(STAR_PINCHES).toHaveLength(5)
    STAR_PINCHES.forEach(({ edge, midpoint: mid, from, to }) => {
      expectPoint(mid, midpoint(STAR_VERTICES[edge], STAR_VERTICES[(edge + 1) % 5]))
      expect(Math.hypot(...from)).toBeGreaterThan(Math.hypot(...mid))
      expect(Math.hypot(...to)).toBeLessThan(Math.hypot(...mid))
      expect(from[0] * to[1] - from[1] * to[0]).toBeCloseTo(0, 8)
      expect(STAR_VERTICES.some(vertex => distance(vertex, mid) < 1)).toBe(false)
    })
    expect(STAR_PUFFED).toHaveLength(10)
    STAR_VERTICES.forEach((vertex, edge) => {
      expectPoint(STAR_PUFFED[edge * 2], vertex)
      expect(Math.hypot(...STAR_PUFFED[edge * 2 + 1])).toBeLessThan(Math.hypot(...STAR_MIDPOINTS[edge]))
    })
  })
})
