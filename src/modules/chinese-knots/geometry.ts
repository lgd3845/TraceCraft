export const CORE_X = { C1: 284, C2: 316 } as const
export const PAPER = '#fbf7ef'
export const CORE_COLOR = '#91928a'
export const OVERHAND_PATH = 'M540 285 L365 285 L195 140 L230 105 L285 120 L370 205 L325 280 L235 265 L205 215 L245 165 L345 125 L408 105'
export const OVERHAND_OVERPASSES = [
  'M348 241.667 L327 276.667',
  'M220 161.324 L253 189.471',
  'M284 149.4 L345 125 L408 105',
] as const

export type KnotSceneKind = 'setup' | 'overlap' | 'midpoint' | 'bight' | 'weave' | 'tight' | 'repeat' | 'test' | 'tuck' | 'stoppers' | 'finished'
export interface KnotScene {
  kind: KnotSceneKind
  completedHalves: number
  mirrored?: boolean
}

export interface CordPoint { x: number; y: number }
export interface HalfGeometry {
  a: string
  b: string
  bOverA: string
  bExit: string
  coreTop: number
  coreBottom: number
  frontY: number
  backY: number
  overX: number
  exitX: number
  endA: CordPoint
  endB: CordPoint
}

// Only the WORKING paths are reflected. C1 and C2 never change places.
export function workingX(x: number, mirrored: boolean) {
  return mirrored ? 600 - x : x
}

// Both halves keep A in front of the cores while B returns behind and exits through the bight.
export function halfGeometry(mirrored = false, top = 88, compact = false, height = 40): HalfGeometry {
  const x = (value: number) => workingX(value, mirrored)
  const y = (value: number) => top + value * (compact ? height / 40 : 1)
  const point = (px: number, py: number) => `${x(px)} ${y(py)}`
  if (compact) {
    return {
      a: `M${point(250, 0)} C${point(250, 8)} ${point(258, 8)} ${point(258, 14)} Q${point(254, 23)} ${point(276, 23)} H${x(336)} C${point(350, 23)} ${point(350, 31)} ${point(350, 40)}`,
      b: `M${point(350, 0)} C${point(350, 8)} ${point(338, 8)} ${point(338, 14)} V${y(30)} Q${point(338, 35)} ${point(318, 35)} H${x(280)} Q${point(270, 35)} ${point(270, 28)} V${y(14)} C${point(270, 8)} ${point(250, 28)} ${point(250, 40)}`,
      bOverA: `M${point(338, 15)} V${y(30)}`,
      bExit: `M${point(270, 14)} C${point(270, 8)} ${point(250, 28)} ${point(250, 40)}`,
      coreTop: top, coreBottom: y(40), frontY: y(23), backY: y(35),
      overX: x(338), exitX: x(270),
      endA: { x: x(350), y: y(40) }, endB: { x: x(250), y: y(40) },
    }
  }
  return {
    a: `M${point(250, 0)} C${point(250, 55)} ${point(145, 30)} ${point(145, 85)} Q${point(145, 126)} ${point(190, 126)} H${x(454)}`,
    b: `M${point(350, 0)} C${point(350, 50)} ${point(397, 45)} ${point(397, 85)} V${y(170)} Q${point(397, 186)} ${point(375, 186)} H${x(205)} Q${point(181, 186)} ${point(181, 162)} V${y(83)}`,
    bOverA: `M${point(397, 105)} V${y(147)}`,
    bExit: `M${point(181, 108)} V${y(83)}`,
    coreTop: top, coreBottom: 338, frontY: y(126), backY: y(186),
    overX: x(397), exitX: x(181),
    endA: { x: x(454), y: y(126) }, endB: { x: x(181), y: y(83) },
  }
}

export function waitingBPath(mirrored: boolean, top: number) {
  const x = (value: number) => workingX(value, mirrored)
  return `M${x(350)} ${top} C${x(350)} ${top + 50} ${x(397)} ${top + 45} ${x(397)} ${top + 85} V324`
}

export function knotCount(completedHalves: number) {
  return { full: Math.floor(completedHalves / 2), remainingHalf: completedHalves % 2 }
}
