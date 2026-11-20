import type { ReactNode } from 'react'

export interface GuideColors {
  primary: string
  secondary: string
}

export interface GuideColorOption extends GuideColors {
  name: string
}

export interface CraftStep {
  title: string
  instruction: string
  checkpoint: string
}

export interface CraftSource {
  title: string
  url: string
}

export interface CraftProject {
  id: string
  title: string
  subtitle: string
  description: string
  meaning: string
  duration: string
  level: string
  materials: readonly string[]
  safety: string
  steps: readonly CraftStep[]
  sources: readonly CraftSource[]
  renderDiagram: (step: number, colors: GuideColors, showHints: boolean) => ReactNode
}

export function guideProgress(completed: readonly number[], total: number) {
  return total ? Math.round(new Set(completed.filter(step => step >= 0 && step < total)).size / total * 100) : 0
}

function xml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!)
}

function textLines(value: string, width: number) {
  const characters = Array.from(value)
  const lines: string[] = []
  for (let index = 0; index < characters.length; index += width) lines.push(characters.slice(index, index + width).join(''))
  return lines
}

function svgText(value: string, x: number, y: number, width: number, fontSize = 18, color = '#65705e') {
  return `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}">${textLines(value, width).map((line, index) => `<tspan x="${x}" dy="${index ? fontSize * 1.65 : 0}">${xml(line)}</tspan>`).join('')}</text>`
}

export function guideSheetSvg(category: string, project: CraftProject, diagrams: readonly string[]) {
  const headerHeight = 260
  const stepHeight = 430
  const safetyLines = textLines(project.safety, 58).length
  const footerHeight = 180 + safetyLines * 26 + project.sources.length * 34
  const height = headerHeight + project.steps.length * stepHeight + footerHeight
  const footerY = headerHeight + project.steps.length * stepHeight
  const steps = project.steps.map((step, index) => {
    const y = headerHeight + index * stepHeight
    return `<g><rect x="30" y="${y}" width="1060" height="410" rx="18" fill="#ffffff" stroke="#e3e7dc" />${svgText(`${String(index + 1).padStart(2, '0')}  ${step.title}`, 55, y + 42, 44, 22, '#354b3d')}<svg x="48" y="${y + 60}" width="490" height="327" viewBox="0 0 600 400">${diagrams[index]}</svg>${svgText(step.instruction, 570, y + 112, 25)}${svgText('完成检查', 570, y + 278, 25, 15, '#a7664e')}${svgText(step.checkpoint, 570, y + 312, 25, 17)}</g>`
  }).join('')
  const sourcesY = footerY + 70 + safetyLines * 26
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="${height}" viewBox="0 0 1120 ${height}" font-family="sans-serif"><title>${xml(project.title)} · GiftCraft 完整图解</title><rect width="1120" height="${height}" fill="#f7f8f2" />${svgText(`GiftCraft 心意工坊 / ${category}`, 40, 45, 65, 16)}${svgText(project.title, 40, 96, 36, 34, '#354b3d')}${svgText(`${project.level} · ${project.duration} · ${project.steps.length} 个步骤`, 40, 132, 70, 17)}${svgText(`准备：${project.materials.join('；')}`, 40, 174, 57, 17)}${steps}${svgText(`安全提示：${project.safety}`, 40, footerY + 30, 58, 16, '#9b614c')}${svgText('技法参考 · 本站文字与图解为重新编排绘制', 40, sourcesY, 64, 16)}${project.sources.map((source, index) => `<a href="${xml(source.url)}" target="_blank">${svgText(source.title, 40, sourcesY + 35 + index * 34, 70, 15)}</a>`).join('')}${svgText('GiftCraft · 一步一步，把心意做到手里。示意图不按实物比例，请配合文字逐步操作。', 40, height - 30, 85, 14)}</svg>`
}
