export type Point = readonly [number, number]
export type Cubic = readonly [Point, Point, Point]

export interface CutProfile {
  readonly name: 'heart' | 'flower'
  readonly width: number
  readonly height: number
  readonly start: Point
  readonly curves: readonly Cubic[]
  readonly corner?: Point
}

// Coordinates are instructional, not a true-size cutting template.
// The closing edge belongs to the retained paper, NEVER to the cut path.
export const HEART_PROFILE = {
  name: 'heart', width: 120, height: 240,
  start: [0, 62],
  curves: [
    [[34, 10], [102, 16], [104, 74]],
    [[110, 121], [51, 176], [0, 212]],
  ],
} as const satisfies CutProfile

// O is the original sheet centre. Both 22-unit bridges stay uncut.
// Swapping x/y reverses these cubics, so the diagonal petal is symmetric.
export const FLOWER_PROFILE = {
  name: 'flower', width: 120, height: 120,
  corner: [0, 0], start: [22, 0],
  curves: [
    [[44, 0], [90, 36], [82, 82]],
    [[36, 90], [0, 44], [0, 22]],
  ],
} as const satisfies CutProfile

const coordinates = (point: Point) => point.join(' ')

export function profilePaths(profile: CutProfile) {
  const curves = profile.curves.map(curve => `C${curve.map(coordinates).join(' ')}`).join(' ')
  const cut = `M${coordinates(profile.start)} ${curves}`
  const end = profile.curves[profile.curves.length - 1][2]
  return {
    cut,
    retained: profile.corner
      ? `M${coordinates(profile.corner)} L${coordinates(profile.start)} ${curves} Z`
      : `${cut} Z`,
    protectedFold: profile.corner
      ? `M${coordinates(end)} L${coordinates(profile.corner)} L${coordinates(profile.start)}`
      : `M${coordinates(profile.start)} L${coordinates(end)}`,
  }
}

// All unfolded pieces reuse the original profile, never a second silhouette.
export const HEART_REFLECTIONS = [[1, 1], [-1, 1]] as const
export const FLOWER_PARTIAL_REFLECTIONS = [[1, 1], [1, -1]] as const
export const FLOWER_REFLECTIONS = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const
