import type { BraceletBead, BraceletData } from '../../lib/types'
import { beadSize, escapeXml, MAX_BEADS, safeColor } from './bracelet'

export const ARTBOARD_SIZE = 520
const CENTER_X = 260
const CENTER_Y = 254
const RADIUS_X = 175
const RADIUS_Y = 155

export interface BeadPosition {
  bead: BraceletBead
  index: number
  x: number
  y: number
  rx: number
  ry: number
  rotation: number
}

// Arc-length sampling keeps different bead widths evenly spaced on an ellipse.
export function layoutBeads(beads: BraceletBead[]): BeadPosition[] {
  const visible = beads.slice(0, MAX_BEADS)
  if (!visible.length) return []
  const segments = 720
  const arc = [{ angle: -Math.PI / 2, distance: 0 }]
  for (let index = 1; index <= segments; index += 1) {
    const angle = -Math.PI / 2 + index / segments * Math.PI * 2
    const previous = arc[index - 1].angle
    const distance = Math.hypot(RADIUS_X * (Math.cos(angle) - Math.cos(previous)), RADIUS_Y * (Math.sin(angle) - Math.sin(previous)))
    arc.push({ angle, distance: arc[index - 1].distance + distance })
  }
  const perimeter = arc[segments].distance
  const totalWidth = visible.reduce((sum, bead) => sum + beadSize(bead.size), 0)
  const scale = Math.min(5.5, perimeter / totalWidth * 0.965)
  let consumed = 0
  let segment = 1
  return visible.map((bead, index) => {
    const width = beadSize(bead.size)
    const distance = (consumed + width / 2) / totalWidth * perimeter
    consumed += width
    while (segment < segments && arc[segment].distance < distance) segment += 1
    const start = arc[segment - 1]
    const end = arc[segment]
    const angle = start.angle + (end.angle - start.angle) * (distance - start.distance) / (end.distance - start.distance)
    return {
      bead, index,
      x: CENTER_X + RADIUS_X * Math.cos(angle),
      y: CENTER_Y + RADIUS_Y * Math.sin(angle),
      rx: Math.min(34, width * scale / 2),
      ry: bead.material === 'spacer' ? Math.min(28, 4.5 * scale) : Math.min(34, width * scale / 2),
      rotation: bead.material === 'spacer' ? Math.atan2(RADIUS_Y * Math.cos(angle), -RADIUS_X * Math.sin(angle)) * 180 / Math.PI : 0,
    }
  })
}

function tint(hex: string, amount: number) {
  const color = safeColor(hex)
  const channels = [1, 3, 5].map(start => Number.parseInt(color.slice(start, start + 2), 16))
  return `#${channels.map(channel => Math.round(amount >= 0 ? channel + (255 - channel) * amount : channel * (1 + amount)).toString(16).padStart(2, '0')).join('')}`
}

function number(value: number) { return value.toFixed(2) }

function beadDefinitions(position: BeadPosition) {
  const { bead, index, rx, ry } = position
  const color = safeColor(bead.color)
  const gradient = bead.material === 'spacer'
    ? `<linearGradient id="bead-${index}"><stop stop-color="${tint(color, -0.32)}"/><stop offset=".22" stop-color="${color}"/><stop offset=".42" stop-color="${tint(color, 0.7)}"/><stop offset=".55" stop-color="${color}"/><stop offset=".8" stop-color="${tint(color, -0.24)}"/><stop offset="1" stop-color="${tint(color, 0.4)}"/></linearGradient>`
    : `<radialGradient id="bead-${index}" cx="32%" cy="27%" r="76%"><stop stop-color="${tint(color, bead.material === 'wood' ? 0.25 : 0.62)}"/><stop offset=".32" stop-color="${tint(color, 0.17)}"/><stop offset=".68" stop-color="${color}"/><stop offset=".93" stop-color="${tint(color, -0.28)}"/><stop offset="1" stop-color="${tint(color, -0.38)}"/></radialGradient>`
  return `${gradient}<clipPath id="clip-${index}"><ellipse rx="${number(rx)}" ry="${number(ry)}"/></clipPath>`
}

function beadDrawing(position: BeadPosition) {
  const { bead, index, x, y, rx, ry, rotation } = position
  const radius = rx
  const surface = `<ellipse rx="${number(rx)}" ry="${number(ry)}" fill="url(#bead-${index})" stroke="${tint(bead.color, -0.24)}" stroke-width=".45"/>`
  let texture = ''
  if (bead.material === 'crystal') {
    texture = `<g clip-path="url(#clip-${index})" transform="rotate(${index * 47 % 360})"><path d="M ${-radius} ${-radius * 0.6} Q ${-radius * 0.2} ${radius * 0.15} ${radius} ${-radius * 0.4} L ${radius} ${radius * 0.25} Q 0 ${-radius * 0.1} ${-radius} ${radius * 0.3}Z" fill="#fff" opacity=".15"/><path d="M ${-radius} ${radius * 0.7} Q ${radius * 0.25} ${-radius * 0.1} ${radius * 0.8} ${-radius}" fill="none" stroke="#fff" stroke-width="1.3" opacity=".22"/><path d="M ${-radius * 0.7} ${-radius} Q ${radius * 0.7} 0 ${radius * 0.2} ${radius}" fill="none" stroke="#43503c" stroke-width=".8" opacity=".12"/></g>`
  } else if (bead.material === 'wood') {
    texture = `<g clip-path="url(#clip-${index})" fill="none" stroke="#593e27" opacity=".19" stroke-width=".9" transform="rotate(${index * 31 % 180})">${[-0.7, -0.35, 0, 0.35, 0.7].map(offset => `<path d="M ${-radius * 1.2} ${radius * offset} Q 0 ${radius * (offset + 0.5)} ${radius * 1.2} ${radius * offset}"/>`).join('')}</g>`
  } else if (bead.material === 'glass') {
    texture = `<path d="M ${-radius * 0.65} ${radius * 0.23} Q 0 ${radius * 0.95} ${radius * 0.68} ${radius * 0.2}" fill="none" stroke="#fff8d9" stroke-width="${radius * 0.1}" opacity=".32"/><circle cx="${radius * 0.28}" cy="${radius * 0.24}" r="${radius * 0.08}" fill="#fff" opacity=".25"/><circle cx="${radius * 0.5}" cy="${-radius * 0.2}" r="${radius * 0.045}" fill="#fff" opacity=".5"/>`
  } else if (bead.material === 'pearl') {
    texture = `<ellipse rx="${radius * 0.82}" ry="${radius * 0.84}" fill="none" stroke="#fff9f0" stroke-width="${radius * 0.075}" opacity=".32"/><path d="M ${-radius * 0.55} ${radius * 0.32} Q 0 ${radius * 0.82} ${radius * 0.6} ${radius * 0.2}" fill="none" stroke="#d7b6a1" stroke-width="${radius * 0.12}" opacity=".18"/>`
  } else {
    texture = `<ellipse rx="${rx * 0.54}" ry="${ry * 0.92}" fill="none" stroke="#fff4d5" stroke-width=".8" opacity=".62"/><path d="M 0 ${-ry * 0.9} V ${ry * 0.9}" stroke="#6b553a" stroke-width=".65" opacity=".35"/>`
  }
  const highlight = bead.material === 'spacer' ? '' : `<ellipse cx="${-rx * 0.32}" cy="${-ry * 0.38}" rx="${rx * 0.27}" ry="${ry * 0.16}" transform="rotate(-35 ${-rx * 0.32} ${-ry * 0.38})" fill="#fff" opacity="${bead.material === 'wood' ? 0.12 : 0.62}"/><circle cx="${-rx * 0.2}" cy="${-ry * 0.48}" r="${rx * 0.075}" fill="#fff" opacity=".7"/>`
  return `<g transform="translate(${number(x)} ${number(y)}) rotate(${number(rotation)})"><title>${escapeXml(`${index + 1}. ${bead.name} · ${bead.size} mm`)}</title>${surface}${texture}${highlight}</g>`
}

/** Transparent, self-contained artwork: no labels, remote assets or page background. */
export function buildBraceletSvg(data: BraceletData, name: string) {
  const positions = layoutBeads(data.beads)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="520" viewBox="0 0 520 520" role="img" aria-labelledby="bracelet-title"><title id="bracelet-title">${escapeXml(name)}</title><defs><filter id="bead-shadow" x="-20%" y="-20%" width="140%" height="150%" color-interpolation-filters="sRGB"><feDropShadow dx="1.5" dy="4" stdDeviation="2.7" flood-color="#51432f" flood-opacity=".22"/></filter>${positions.map(beadDefinitions).join('')}</defs><ellipse cx="${CENTER_X}" cy="${CENTER_Y}" rx="${RADIUS_X}" ry="${RADIUS_Y}" fill="none" stroke="${safeColor(data.cordColor)}" stroke-width="2.5"/><ellipse cx="${CENTER_X}" cy="${CENTER_Y}" rx="${RADIUS_X}" ry="${RADIUS_Y}" fill="none" stroke="#fff" stroke-width=".65" opacity=".55"/><g filter="url(#bead-shadow)">${positions.map(beadDrawing).join('')}</g></svg>`
}
