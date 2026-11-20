import { describe, expect, it } from 'vitest'
import { readArtworks, STORAGE_KEY, writeArtworks } from './storage'
import type { Artwork } from './types'

const artwork: Artwork = {
  id: 'sample', name: '晴日手链', kind: 'bracelet', thumbnail: '', createdAt: '2026-11-20',
  data: { wristSize: 16, cordColor: '#fff', beads: [{ id: '1', name: '珍珠', color: '#fff', size: 8, material: 'pearl' }] },
}

describe('local artwork storage', () => {
  it('starts with an empty library', () => {
    expect(readArtworks({ getItem: () => null })).toEqual([])
  })
  it('round-trips complete artwork data', () => {
    let saved = ''
    writeArtworks({ setItem: (key, value) => { expect(key).toBe(STORAGE_KEY); saved = value } }, [artwork])
    expect(readArtworks({ getItem: () => saved })).toEqual([artwork])
  })
  it('rejects corrupt saved content', () => {
    expect(() => readArtworks({ getItem: () => '{' })).toThrow()
    expect(() => readArtworks({ getItem: () => '[{"kind":"bracelet"}]' })).toThrow()
    expect(() => readArtworks({ getItem: () => JSON.stringify([{ ...artwork, data: { beads: ['invalid'] } }]) })).toThrow()
  })
  it('surfaces storage quota failures', () => {
    expect(() => writeArtworks({ setItem: () => { throw new Error('quota') } }, [artwork])).toThrow('quota')
  })
})
