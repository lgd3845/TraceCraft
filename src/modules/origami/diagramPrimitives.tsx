import type { ReactNode } from 'react'
import type { GuideColors } from '../../lib/craftGuide'
import type { Point } from './geometry'
import { points } from './geometry'

export const INK = '#52443d'
export const ACCENT = '#a74429'
export const BOARD = '#fffcf6'

export function Label({ x, y, children, anchor = 'middle', color = INK }: { x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; color?: string }) {
  return <text x={x} y={y} textAnchor={anchor} fontSize={18} fill={color}>{children}</text>
}

export function Paper({ vertices, fill, moving = false }: { vertices: readonly Point[]; fill: string; moving?: boolean }) {
  return <polygon data-paper="true" data-moving={moving || undefined} points={points(vertices)} fill={fill} stroke={moving ? ACCENT : INK} strokeWidth={moving ? 2.6 : 1.6} strokeLinejoin="round" />
}

export function Crease({ a, b }: { a: Point; b: Point }) {
  return <line data-hint="crease" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={INK} strokeWidth={1.6} strokeDasharray="5 4" />
}

export function Target({ at }: { at: Point }) {
  return <circle data-hint="target" cx={at[0]} cy={at[1]} r={3.5} fill={BOARD} stroke={ACCENT} strokeWidth={2} />
}

// Arrowheads are ordinary paths: no document-global marker IDs or url(#...).
export function Arrow({ from, to, bend, color = ACCENT }: { from: Point; to: Point; bend?: Point; color?: string }) {
  const tangent = bend ?? from
  const angle = Math.atan2(to[1] - tangent[1], to[0] - tangent[0])
  const wing = (delta: number): Point => [to[0] - 9 * Math.cos(angle + delta), to[1] - 9 * Math.sin(angle + delta)]
  const path = bend ? `M ${from.join(' ')} Q ${bend.join(' ')} ${to.join(' ')}` : `M ${from.join(' ')} L ${to.join(' ')}`
  return <g data-arrow="true" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d={path} /><polyline points={points([wing(-0.5), to, wing(0.5)])} />
  </g>
}

export function Diagram({ title, description, colors, hints, children, note }: { title: string; description: string; colors: GuideColors; hints: boolean; children: ReactNode; note: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" role="img" aria-label={title}>
    <title>{title}</title><desc>{description}</desc>
    {/* All presentation lives inside the root so innerHTML exports retain it. */}
    <g fontFamily="system-ui, 'Noto Sans CJK SC', sans-serif" fontSize={18} fill={INK}>
      <rect width={600} height={400} rx={18} fill={BOARD} />
      <rect x={24} y={21} width={19} height={15} rx={2} fill={colors.primary} stroke={INK} />
      <Label x={51} y={36} anchor="start">纸正面</Label>
      <rect x={124} y={21} width={19} height={15} rx={2} fill={colors.secondary} stroke={INK} />
      <Label x={151} y={36} anchor="start">纸背面</Label>
      <Label x={575} y={36} anchor="end">{hints ? '虚线折痕 · 空心点对齐' : '折纸结构示意'}</Label>
      {children}
      <Label x={300} y={382} color="#786a60">{note}</Label>
    </g>
  </svg>
}

export function Panels({ left, right }: { left: string; right: string }) {
  return <g>
    <line x1={300} y1={90} x2={300} y2={326} stroke="#e7dfd3" />
    <Label x={150} y={76}>{left}</Label><Label x={450} y={76}>{right}</Label>
    <Arrow from={[283, 207]} to={[315, 207]} color="#887c6b" />
  </g>
}
