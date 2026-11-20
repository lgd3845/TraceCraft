import { describe, expect, it } from 'vitest'
import type { CraftProject } from './craftGuide'
import { guideProgress, guideSheetSvg } from './craftGuide'

const project: CraftProject = {
  id: 'test', title: '一份 <心意> & "祝福"', subtitle: '基础练习',
  description: '原创图解', meaning: '送给喜欢的人', duration: '5 分钟', level: '入门',
  materials: ['一张正方形纸', '平整桌面'], safety: '请在成人陪同下操作。',
  steps: [
    { title: '对齐角点', instruction: '把左角移向右角。', checkpoint: '两个角点重合。' },
    { title: '展开纸张', instruction: '沿折线轻轻展开。', checkpoint: '左右两边连在一起。' },
  ],
  sources: [{ title: '示例来源 & 说明', url: 'https://example.com/guide?a=1&b=2' }],
  renderDiagram: () => null,
}

describe('guide progress', () => {
  it('starts at zero and reaches completion only when all steps are marked', () => {
    expect(guideProgress([], 6)).toBe(0)
    expect(guideProgress([0, 1], 6)).toBe(33)
    expect(guideProgress([0, 1, 2, 3, 4, 5], 6)).toBe(100)
  })
  it('counts unique in-range steps', () => {
    expect(guideProgress([0, 0, -1, 6], 6)).toBe(17)
    expect(guideProgress([], 0)).toBe(0)
  })
})

describe('downloadable guide sheet', () => {
  it('contains every step, diagram, material, safety note and source', () => {
    const svg = guideSheetSvg('折纸', project, ['<path d="M0 0L10 10"/>', '<circle cx="10" cy="10" r="5"/>'])
    expect(svg).toContain('01  对齐角点')
    expect(svg).toContain('02  展开纸张')
    expect(svg).toContain('<circle')
    expect(svg).toContain('两个角点重合。')
    expect(svg).toContain('一张正方形纸')
    expect(svg).toContain('请在成人陪同下操作。')
    expect(svg).toContain('https://example.com/guide?a=1&amp;b=2')
    expect(svg).not.toContain('foreignObject')
  })
  it('escapes text and preserves Chinese content', () => {
    const svg = guideSheetSvg('折纸', project, ['', ''])
    expect(svg).toContain('一份 &lt;心意&gt; &amp; &quot;祝福&quot;')
    expect(svg).toContain('示例来源 &amp; 说明')
    expect(svg).not.toContain('<心意>')
  })
})
