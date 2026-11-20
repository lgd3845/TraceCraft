import type { Artwork } from './types'

export const STORAGE_KEY = 'giftcraft.artworks.v1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isArtwork(value: unknown): value is Artwork {
  if (!isRecord(value) || !isRecord(value.data)) return false
  if (typeof value.id !== 'string' || typeof value.name !== 'string' || typeof value.thumbnail !== 'string' || typeof value.createdAt !== 'string') return false
  const data = value.data
  if (value.kind === 'bracelet') {
    return typeof data.wristSize === 'number' && typeof data.cordColor === 'string' && Array.isArray(data.beads) && data.beads.every(bead => isRecord(bead) && typeof bead.id === 'string' && typeof bead.name === 'string' && typeof bead.color === 'string' && typeof bead.size === 'number' && ['glass', 'pearl', 'wood', 'crystal', 'spacer'].includes(String(bead.material)))
  }
  if (value.kind === 'beads') {
    return Number.isInteger(data.columns) && Number.isInteger(data.rows) && Number(data.columns) > 0 && Number(data.rows) > 0 && Number(data.columns) <= 128 && Number(data.rows) <= 128 && typeof data.beadSize === 'number' && typeof data.sourceName === 'string' && Array.isArray(data.cells) && data.cells.length === Number(data.columns) * Number(data.rows) && data.cells.every(cell => typeof cell === 'string') && Array.isArray(data.palette) && data.palette.every(color => isRecord(color) && typeof color.code === 'string' && typeof color.name === 'string' && typeof color.color === 'string')
  }
  if (value.kind === 'gift-box') {
    return ['rectangle', 'square'].includes(String(data.shape)) && typeof data.color === 'string' && typeof data.fillerColor === 'string' && typeof data.ribbonColor === 'string' && typeof data.note === 'string' && Array.isArray(data.items) && data.items.every(item => isRecord(item) && typeof item.id === 'string' && typeof item.artworkId === 'string' && ['x', 'y', 'rotation', 'scale'].every(key => typeof item[key] === 'number' && Number.isFinite(item[key])))
  }
  return false
}

export function readArtworks(storage: Pick<Storage, 'getItem'>): Artwork[] {
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return []
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed) || !parsed.every(isArtwork)) throw new Error('Invalid saved artworks')
  return parsed
}

export function writeArtworks(storage: Pick<Storage, 'setItem'>, artworks: Artwork[]) {
  storage.setItem(STORAGE_KEY, JSON.stringify(artworks))
}
