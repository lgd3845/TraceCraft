export type Point = readonly [number, number]
export type Fold = { from: Point; to: Point; crease: readonly [Point, Point] }

export const midpoint = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
export const points = (vertices: readonly Point[]) => vertices.map(([x, y]) => `${Number(x.toFixed(3))},${Number(y.toFixed(3))}`).join(' ')

/** Reflection is only a flat fold construction, not a paper/material simulation. */
export function reflect(point: Point, [a, b]: readonly [Point, Point]): Point {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSquared = dx * dx + dy * dy
  if (!lengthSquared) return point
  const t = ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSquared
  return [2 * (a[0] + t * dx) - point[0], 2 * (a[1] + t * dy) - point[1]]
}

// A diamond of radius 100. The lower-tip destination is the NEW top edge,
// y=-50, not the original top (y=-100) or the original centre (y=0).
export const HEART = {
  diamond: [[0, -100], [100, 0], [0, 100], [-100, 0]],
  topOutline: [[-50, -50], [50, -50], [100, 0], [0, 100], [-100, 0]],
  topFlap: [[-50, -50], [50, -50], [0, 0]],
  bottomOutline: [[-50, -50], [50, -50], [100, 0], [75, 25], [-75, 25], [-100, 0]],
  bottomFlap: [[-75, 25], [75, 25], [0, -50]],
  rightMoving: [[0, 25], [75, 25], [100, 0], [62.5, -37.5]],
  rightFixed: [[-50, -50], [50, -50], [62.5, -37.5], [0, 25], [-75, 25], [-100, 0]],
  leftMoving: [[0, 25], [-75, 25], [-100, 0], [-62.5, -37.5]],
  rough: [[0, -50], [25, -75], [62.5, -37.5], [0, 25], [-62.5, -37.5], [-25, -75]],
  sides: [[0, -50], [25, -75], [50, -50], [50, -25], [0, 25], [-50, -25], [-50, -50], [-25, -75]],
  finished: [[0, -50], [12.5, -62.5], [37.5, -62.5], [50, -50], [50, -25], [0, 25], [-50, -25], [-50, -50], [-37.5, -62.5], [-12.5, -62.5]],
} as const satisfies Record<string, readonly Point[]>

export const HEART_FOLDS = {
  top: { from: [0, -100], to: [0, 0], crease: [[-50, -50], [50, -50]] },
  bottom: { from: [0, 100], to: [0, -50], crease: [[-75, 25], [75, 25]] },
  right: { from: [75, 25], to: [0, -50], crease: [[0, 25], [62.5, -37.5]] },
  left: { from: [-75, 25], to: [0, -50], crease: [[0, 25], [-62.5, -37.5]] },
  rightSide: { from: [62.5, -37.5], to: [37.5, -37.5], crease: [[50, -50], [50, -25]] },
  leftSide: { from: [-62.5, -37.5], to: [-37.5, -37.5], crease: [[-50, -50], [-50, -25]] },
  rightTip: { from: [25, -75], to: [25, -50], crease: [[12.5, -62.5], [37.5, -62.5]] },
  leftTip: { from: [-25, -75], to: [-25, -50], crease: [[-37.5, -62.5], [-12.5, -62.5]] },
} as const satisfies Record<string, Fold>

export const RIGHT_FLAP = HEART.rightMoving.map(point => reflect(point, HEART_FOLDS.right.crease))
export const LEFT_FLAP = HEART.leftMoving.map(point => reflect(point, HEART_FOLDS.left.crease))

export function pentagon(radius = 64): Point[] {
  return Array.from({ length: 5 }, (_, index) => {
    const angle = (-90 + 72 * index) * Math.PI / 180
    return [radius * Math.cos(angle), radius * Math.sin(angle)] as Point
  })
}

export const STAR_VERTICES = pentagon()
export const STAR_MIDPOINTS = STAR_VERTICES.map((vertex, index) => midpoint(vertex, STAR_VERTICES[(index + 1) % 5]))

// Each arrow starts outside an EDGE midpoint, directed towards the centre.
// Insetting those five midpoints leaves the five original vertices as tips.
export const STAR_PINCHES = STAR_MIDPOINTS.map((point, edge) => ({
  edge,
  midpoint: point,
  from: [point[0] * 1.55, point[1] * 1.55] as Point,
  to: [point[0] * 0.84, point[1] * 0.84] as Point,
}))
export const STAR_PUFFED: Point[] = STAR_VERTICES.flatMap((vertex, index) => [vertex, [STAR_MIDPOINTS[index][0] * 0.64, STAR_MIDPOINTS[index][1] * 0.64] as Point])

/** A broad tail attached to one complete pentagon edge, with its true fold axis. */
export function edgeTail(edge: number, length: number): Point[] {
  const a = STAR_VERTICES[edge]
  const b = STAR_VERTICES[(edge + 1) % 5]
  const mid = midpoint(a, b)
  const distance = Math.hypot(...mid)
  const offset: Point = [mid[0] / distance * length, mid[1] / distance * length]
  return [a, b, [b[0] + offset[0], b[1] + offset[1]], [a[0] + offset[0], a[1] + offset[1]]]
}

// Intersection of convex polygons: draw a rectangular paper band within the
// pentagon without clipPaths/IDs (the same diagram appears several times).
export function clipToPentagon(subject: readonly Point[]): Point[] {
  let result = [...subject]
  for (let index = 0; index < 5; index++) {
    const a = STAR_VERTICES[index]
    const b = STAR_VERTICES[(index + 1) % 5]
    const side = (p: Point) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
    const input = result
    result = []
    input.forEach((end, i) => {
      const start = input[(i + input.length - 1) % input.length]
      const ds = side(start)
      const de = side(end)
      if ((ds >= 0) !== (de >= 0)) {
        const t = ds / (ds - de)
        result.push([start[0] + t * (end[0] - start[0]), start[1] + t * (end[1] - start[1])])
      }
      if (de >= 0) result.push(end)
    })
  }
  return result
}

export function wrappedBand(edge: number): Point[] {
  const axis: readonly [Point, Point] = [STAR_VERTICES[edge], STAR_VERTICES[(edge + 1) % 5]]
  return clipToPentagon(edgeTail(edge, 180).map(point => reflect(point, axis)))
}

export function diagramStep(step: number, count: number) {
  return Number.isFinite(step) ? Math.max(0, Math.min(count - 1, Math.trunc(step))) : 0
}
