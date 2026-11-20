import { isValidElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { guideSheetSvg } from '../../lib/craftGuide'
import { CUT_COLOR, FOLD_COLOR } from './diagrams'
import { FLOWER_PARTIAL_REFLECTIONS, FLOWER_PROFILE, FLOWER_REFLECTIONS, HEART_PROFILE, HEART_REFLECTIONS, profilePaths } from './geometry'
import type { Cubic, CutProfile, Point } from './geometry'
import { PAPER_COLORS, PAPER_CUTTING_PROJECTS } from './projects'

const [heart, flower] = PAPER_CUTTING_PROJECTS
const markup = (project = heart, step = 0, hints = true) => renderToStaticMarkup(project.renderDiagram(step, PAPER_COLORS[0], hints))
const pathsWithRole = (svg: string, role: string) => [...svg.matchAll(new RegExp(`<path\\b[^>]*data-role="${role}"[^>]*>`, 'g'))].map(match => match[0])
const attribute = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1]

function cubicPoint(start: Point, curve: Cubic, t: number): Point {
  const u = 1 - t
  const coordinate = (axis: 0 | 1) => u ** 3 * start[axis] + 3 * u ** 2 * t * curve[0][axis] + 3 * u * t ** 2 * curve[1][axis] + t ** 3 * curve[2][axis]
  return [coordinate(0), coordinate(1)]
}

function sampleCurve(profile: CutProfile) {
  let start = profile.start
  return [start, ...profile.curves.flatMap(curve => {
    const points = Array.from({ length: 100 }, (_, index) => cubicPoint(start, curve, (index + 1) / 100))
    start = curve[2]
    return points
  })]
}

function insidePolygon([x, y]: Point, polygon: readonly Point[]) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

describe('original beginner paper-cutting lessons', () => {
  it('has the two intended lessons, separate cutting/unfolding steps and unique IDs', () => {
    expect(PAPER_CUTTING_PROJECTS.map(project => project.title)).toEqual(['对折爱心', '连体四瓣花'])
    expect(PAPER_CUTTING_PROJECTS.map(project => project.steps.length)).toEqual([6, 7])
    expect(new Set(PAPER_CUTTING_PROJECTS.map(project => project.id)).size).toBe(2)
    expect(heart.steps[3].title).toContain('剪')
    expect(heart.steps[4].title).toContain('打开')
    expect(flower.steps[4].title).toContain('剪')
    expect(flower.steps[5].title).toContain('展开')
  })

  for (const project of PAPER_CUTTING_PROJECTS) {
    it(`${project.title}: concise instructions, preparation, safety and two attributed references`, () => {
      expect(new Set(project.steps.map(step => step.title)).size).toBe(project.steps.length)
      for (const step of project.steps) {
        expect(step.title).not.toBe('')
        expect(Array.from(step.instruction).length).toBeGreaterThan(0)
        expect(Array.from(step.instruction).length).toBeLessThanOrEqual(115)
        expect(Array.from(step.checkpoint).length).toBeGreaterThan(0)
        expect(Array.from(step.checkpoint).length).toBeLessThanOrEqual(70)
      }
      const materials = project.materials.join(' ')
      for (const item of ['15 cm × 15 cm', '薄彩纸', '铅笔', '圆头剪刀', '废纸']) expect(materials).toContain(item)
      for (const caution of ['成人陪同', '不用刻刀或火', '别硬剪', '不是等比例剪裁模板', '废纸试剪', '不可剪断']) expect(project.safety).toContain(caution)
      expect(project.sources).toHaveLength(2)
      expect(new Set(project.sources.map(source => source.url)).size).toBe(2)
      for (const source of project.sources) {
        expect(source.title.length).toBeGreaterThan(10)
        expect(new URL(source.url).protocol).toBe('https:')
        expect(['z.hangzhou.com.cn', 'www.ihchina.cn']).toContain(new URL(source.url).hostname)
      }
      expect(project.description).toContain('原创示意图')
      expect(project.description).toContain('废纸试剪')
    })

    for (const colors of PAPER_COLORS) {
      for (const hints of [true, false]) {
        it(`${project.title}: every ${colors.name} SVG is self-contained, with hints ${hints}`, () => {
          project.steps.forEach((_, index) => {
            const node = project.renderDiagram(index, colors, hints)
            expect(isValidElement(node) && node.type).toBe('svg')
            const svg = renderToStaticMarkup(node)
            expect(svg.startsWith('<svg ')).toBe(true)
            expect(svg.endsWith('</svg>')).toBe(true)
            expect(svg.match(/<svg\b/g)).toHaveLength(1)
            expect(svg).toContain('viewBox="0 0 600 400"')
            expect(svg).toContain('<title>')
            expect(svg).toContain('<desc>')
            expect(svg).not.toMatch(/undefined|NaN|Infinity|foreignObject|<defs\b|<use\b|<image\b|<script\b|\bid=|\bhref=|url\(|data:image/i)
            expect(svg.replace('xmlns="http://www.w3.org/2000/svg"', '')).not.toMatch(/https?:\/\//)
            for (const size of svg.matchAll(/font-size="([\d.]+)"/g)) expect(Number(size[1])).toBeGreaterThanOrEqual(18)
          })
        })
      }
    }

    it(`${project.title}: serializing innerHTML preserves all diagram and lesson content`, () => {
      const diagrams = project.steps.map((_, index) => markup(project, index).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''))
      const sheet = guideSheetSvg('剪纸工坊', project, diagrams)
      expect(sheet.match(/<svg\b/g)).toHaveLength(project.steps.length + 1)
      for (const diagram of diagrams) {
        expect(diagram).toContain('font-family="sans-serif"')
        expect(sheet).toContain(diagram)
      }
      for (const step of project.steps) expect(sheet).toContain(step.title)
      for (const source of project.sources) expect(sheet).toContain(source.url)
      expect(sheet).not.toMatch(/undefined|NaN|foreignObject|\bid=|url\(/)
    })
  }

  it('renders every lesson without React warnings and labels the layer progression', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      for (const project of PAPER_CUTTING_PROJECTS) {
        for (const hints of [true, false]) project.steps.forEach((_, step) => markup(project, step, hints))
      }
      expect(errors).not.toHaveBeenCalled()
      expect(warnings).not.toHaveBeenCalled()
    } finally {
      errors.mockRestore()
      warnings.mockRestore()
    }
    for (const [step, layers] of [1, 2, 4, 4, 4, 2, 1].entries()) expect(markup(flower, step)).toContain(`${layers} 层`)
    for (const [step, layers] of [1, 2, 2, 2].entries()) expect(markup(heart, step)).toContain(`${layers} 层`)
    expect(markup(heart, 4)).toContain('展开中')
    expect(markup(heart, 5)).toContain('1 层')
  })

  it('keeps paper colors distinct from fixed red cut and blue fold lines', () => {
    expect(CUT_COLOR).not.toBe(FOLD_COLOR)
    for (const colors of PAPER_COLORS) {
      expect(colors.primary).not.toBe(colors.secondary)
      for (const color of [colors.primary, colors.secondary]) expect([CUT_COLOR, FOLD_COLOR]).not.toContain(color)
      const svg = renderToStaticMarkup(flower.renderDiagram(4, colors, false))
      expect(svg).toContain(`stroke="${CUT_COLOR}"`)
      expect(svg).toContain(`stroke="${FOLD_COLOR}"`)
      expect(svg).toContain('OA、OB 不剪')
    }
    expect(markup(heart, 3, false)).toContain('左折边 · 不剪')
  })

  it('makes final cards uncluttered and guards invalid step indices', () => {
    for (const project of PAPER_CUTTING_PROJECTS) {
      expect(markup(project, project.steps.length - 1, false)).not.toMatch(/<text\b/)
      for (const step of [-5, NaN, Infinity]) expect(markup(project, step)).toBe(markup(project, 0))
      expect(markup(project, 100)).toBe(markup(project, project.steps.length - 1))
      expect(markup(project, 1.9)).toBe(markup(project, 1))
    }
  })
})

describe('fold-safe curves and same-profile reflection geometry', () => {
  it('reflects the heart horizontally and the flower across both crease axes', () => {
    expect(HEART_REFLECTIONS).toEqual([[1, 1], [-1, 1]])
    expect(FLOWER_PARTIAL_REFLECTIONS).toEqual([[1, 1], [1, -1]])
    expect(FLOWER_REFLECTIONS).toEqual([[1, 1], [1, -1], [-1, 1], [-1, -1]])
  })

  for (const [project, profile, trace, cut, reflections] of [
    [heart, HEART_PROFILE, 2, 3, HEART_REFLECTIONS],
    [flower, FLOWER_PROFILE, 3, 4, FLOWER_REFLECTIONS],
  ] as const) {
    it(`${profile.name}: scissors follow an open curve, never the protected closing edges`, () => {
      const paths = profilePaths(profile)
      expect(paths.cut.match(/[A-Za-z]/g)).toEqual(['M', 'C', 'C'])
      expect(paths.retained).toMatch(/ Z$/)
      expect(paths.protectedFold).not.toMatch(/[CZ]/)
      for (const step of [trace, cut]) {
        for (const hints of [true, false]) {
          const svg = markup(project, step, hints)
          const cutPaths = pathsWithRole(svg, 'cut-path')
          expect(cutPaths).toHaveLength(1)
          expect(attribute(cutPaths[0], 'd')).toBe(paths.cut)
          expect(attribute(cutPaths[0], 'stroke')).toBe(CUT_COLOR)
          expect(pathsWithRole(svg, 'protected-fold').map(tag => attribute(tag, 'd'))).toEqual([paths.protectedFold])
          expect(pathsWithRole(svg, 'retained').map(tag => attribute(tag, 'd'))).toEqual([paths.retained])
          expect(svg).toContain('data-role="source-paper"')
          expect(svg).toContain('废料')
        }
      }
    })

    it(`${profile.name}: final pieces and visible boundaries are reflections of the traced profile`, () => {
      const paths = profilePaths(profile)
      const svg = markup(project, project.steps.length - 1)
      expect(pathsWithRole(svg, 'retained').map(tag => attribute(tag, 'd'))).toEqual(reflections.map(() => paths.retained))
      expect(pathsWithRole(svg, 'finished-edge').map(tag => attribute(tag, 'd'))).toEqual(reflections.map(() => paths.cut))
      for (const reflection of reflections) {
        expect(svg).toContain(`data-reflection="${reflection.join(',')}" transform="scale(${reflection.join(' ')})"`)
      }
      expect(pathsWithRole(svg, 'cut-path')).toHaveLength(0)
    })

    it(`${profile.name}: the cut stays inside the folded source paper`, () => {
      for (const [x, y] of sampleCurve(profile)) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThan(profile.width)
        expect(y).toBeLessThan(profile.height)
      }
    })
  }

  it('heart has exactly two fold-edge endpoints and retains a continuous central connection', () => {
    const curve = sampleCurve(HEART_PROFILE)
    expect(curve[0]).toEqual([0, 62])
    expect(curve.at(-1)).toEqual([0, 212])
    for (const [x] of curve.slice(1, -1)) expect(x).toBeGreaterThan(0)
    for (const y of [70, 100, 140, 180, 200]) expect(insidePolygon([1, y], curve)).toBe(true)
    const partial = markup(heart, 4)
    expect(partial).toContain('scale(-0.55 1)')
    expect(pathsWithRole(partial, 'retained').map(tag => attribute(tag, 'd'))).toEqual([profilePaths(HEART_PROFILE).retained, profilePaths(HEART_PROFILE).retained])
  })

  it('flower has positive-width bridges, an intact centre and a diagonal-symmetric petal', () => {
    const curve = sampleCurve(FLOWER_PROFILE)
    expect(curve[0]).toEqual([22, 0])
    expect(curve.at(-1)).toEqual([0, 22])
    for (let index = 0; index < curve.length; index++) {
      const [x, y] = curve[index]
      const reversed = curve[curve.length - 1 - index]
      expect(x).toBeCloseTo(reversed[1], 8)
      expect(y).toBeCloseTo(reversed[0], 8)
      expect(Math.hypot(x, y)).toBeGreaterThanOrEqual(22)
      if (index > 0 && index < curve.length - 1) {
        expect(x).toBeGreaterThan(0)
        expect(y).toBeGreaterThan(0)
      }
    }
    const polygon = [FLOWER_PROFILE.corner, ...curve]
    // The entire 21 x 21 area beside O survives, not just a point contact.
    // Reflection therefore joins all four quadrants into a solid central area.
    for (const x of [0.1, 5, 10, 15, 21]) {
      for (const y of [0.1, 5, 10, 15, 21]) expect(insidePolygon([x, y], polygon)).toBe(true)
    }
    const partial = markup(flower, 5)
    expect(pathsWithRole(partial, 'retained')).toHaveLength(2)
    for (const reflection of FLOWER_PARTIAL_REFLECTIONS) expect(partial).toContain(`data-reflection="${reflection.join(',')}"`)
    expect(partial).not.toContain('data-reflection="-1,')
    expect(partial).toContain('2 层')
  })
})
