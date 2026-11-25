import { afterEach, describe, expect, it, vi } from 'vitest'
import { compressImageForStorage, loadStoredPhoto } from './artworkImage'
import {
  dataUrlToBlob,
  deleteMediaBlobs,
  getMediaBlob,
  isMediaRef,
  MEDIA_STORE_NAME,
  parseMediaRef,
  pruneUnusedMediaBlobs,
  putMediaBlob,
  toMediaRef,
} from './mediaStore'

function createFakeIndexedDb(options: { failOpen?: boolean; failTx?: boolean } = {}): {
  factory: IDBFactory
  store: Map<string, Blob>
} {
  const store = new Map<string, Blob>()
  const names = new Set<string>()

  const schedule = (fn: () => void) => queueMicrotask(fn)

  const dbMock = {
    objectStoreNames: {
      contains: (name: string) => names.has(name),
    },
    createObjectStore: (name: string) => {
      names.add(name)
      return {}
    },
    close: () => {},
    onversionchange: null as (() => void) | null,
    onclose: null as (() => void) | null,
    transaction: () => {
      const tx: Record<string, unknown> = {
        oncomplete: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onabort: null as (() => void) | null,
        objectStore: () => ({
          put: (value: Blob, key: string) => {
            schedule(() => {
              if (options.failTx) {
                ;(tx.onerror as (() => void) | null)?.()
                return
              }
              store.set(key, value)
              ;(tx.oncomplete as (() => void) | null)?.()
            })
            return {}
          },
          get: (key: string) => {
            const req: Record<string, unknown> = { result: undefined, onsuccess: null, onerror: null }
            schedule(() => {
              if (options.failTx) {
                ;(req.onerror as (() => void) | null)?.()
                return
              }
              req.result = store.get(key)
              ;(req.onsuccess as (() => void) | null)?.()
            })
            return req
          },
          delete: (key: string) => {
            store.delete(key)
            return {}
          },
          getAllKeys: () => {
            const req: Record<string, unknown> = { result: undefined, onsuccess: null, onerror: null }
            schedule(() => {
              req.result = Array.from(store.keys())
              ;(req.onsuccess as (() => void) | null)?.()
              schedule(() => (tx.oncomplete as (() => void) | null)?.())
            })
            return req
          },
        }),
      }
      // For batch deleteMediaBlobs where no request callback drives completion
      const origObjectStore = tx.objectStore as () => Record<string, unknown>
      tx.objectStore = () => {
        const obj = origObjectStore()
        const origDelete = obj.delete as (key: string) => unknown
        let deleteScheduled = false
        return {
          ...obj,
          delete: (key: string) => {
            origDelete(key)
            if (!deleteScheduled) {
              deleteScheduled = true
              schedule(() => {
                if (!options.failTx) {
                  ;(tx.oncomplete as (() => void) | null)?.()
                } else {
                  ;(tx.onerror as (() => void) | null)?.()
                }
              })
            }
            return {}
          },
        }
      }
      return tx
    },
  }

  const factory = {
    open: () => {
      const req: Record<string, unknown> = {
        result: dbMock,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        onblocked: null,
      }
      schedule(() => {
        if (options.failOpen) {
          ;(req.onerror as (() => void) | null)?.()
          return
        }
        if (!names.has(MEDIA_STORE_NAME)) {
          ;(req.onupgradeneeded as (() => void) | null)?.()
        }
        ;(req.onsuccess as (() => void) | null)?.()
      })
      return req
    },
  } as unknown as IDBFactory

  return { factory, store }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('mediaStore', () => {
  it('formats, detects, and parses idb media references', () => {
    expect(isMediaRef(undefined)).toBe(false)
    expect(isMediaRef('idb:')).toBe(false)
    expect(isMediaRef('data:image/png;base64,abc')).toBe(false)
    expect(isMediaRef('idb:art-1')).toBe(true)
    expect(toMediaRef('art-1')).toBe('idb:art-1')
    expect(parseMediaRef('idb:art-1')).toBe('art-1')
    expect(parseMediaRef('data:image/png;base64,abc')).toBeNull()
  })

  it('converts base64 and percent-encoded data URLs into Blobs', async () => {
    const base64Url = 'data:image/jpeg;base64,' + btoa('\x01\x02\x03\x04')
    const blob = dataUrlToBlob(base64Url)
    expect(blob.type).toBe('image/jpeg')
    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual([1, 2, 3, 4])

    const svgBlob = dataUrlToBlob('data:image/svg+xml,%3Csvg%20xmlns%3D%22x%22/%3E')
    expect(svgBlob.type).toBe('image/svg+xml')
    expect(await svgBlob.text()).toBe('<svg xmlns="x"/>')

    expect(() => dataUrlToBlob('https://example.com/a.png')).toThrow('无效的图片数据')
  })

  it('stores, reads, deletes, and prunes media blobs via IndexedDB', async () => {
    const { factory, store } = createFakeIndexedDb()
    const blobA = new Blob(['a'], { type: 'image/webp' })
    const blobB = new Blob(['b'], { type: 'image/jpeg' })
    const blobC = new Blob(['c'], { type: 'image/png' })

    expect(await putMediaBlob('k-a', blobA, factory)).toBe(true)
    expect(await putMediaBlob('k-b', blobB, factory)).toBe(true)
    expect(await putMediaBlob('k-c', blobC, factory)).toBe(true)
    expect(await (await getMediaBlob('k-a', factory))?.text()).toBe('a')
    expect(await getMediaBlob('missing', factory)).toBeNull()

    await deleteMediaBlobs(['k-b'], factory)
    expect(store.has('k-b')).toBe(false)

    await pruneUnusedMediaBlobs(new Set(['k-a']), factory)
    expect(Array.from(store.keys())).toEqual(['k-a'])
  })

  it('degrades gracefully when IndexedDB is unavailable or fails to open', async () => {
    expect(await putMediaBlob('k', new Blob(['x']), null)).toBe(false)
    expect(await getMediaBlob('k', null)).toBeNull()

    const failing = createFakeIndexedDb({ failOpen: true })
    expect(await putMediaBlob('k', new Blob(['x']), failing.factory)).toBe(false)
    expect(await getMediaBlob('k', failing.factory)).toBeNull()
  })
})

describe('artworkImage compression and photo loading', () => {
  it('uses lossy WebP/JPEG for opaque images and retains alpha for transparent images at maxEdge 640', () => {
    let alphaFill = 255
    let lastCanvas = { width: 0, height: 0 }
    const ctx = {
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
      drawImage: vi.fn(),
      getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => {
        const data = new Uint8ClampedArray(w * h * 4).fill(255)
        data[3] = alphaFill
        return { data }
      }),
    }
    const toDataURL = vi.fn((mime: string) => `data:${mime};base64,AAA=`)
    const canvas = {
      set width(v: number) {
        lastCanvas.width = v
      },
      get width() {
        return lastCanvas.width
      },
      set height(v: number) {
        lastCanvas.height = v
      },
      get height() {
        return lastCanvas.height
      },
      getContext: vi.fn(() => ctx),
      toDataURL,
    }
    vi.stubGlobal('document', { createElement: vi.fn(() => canvas) })

    const img = { naturalWidth: 1280, naturalHeight: 960 } as HTMLImageElement
    const opaqueUrl = compressImageForStorage(img)
    expect(lastCanvas).toEqual({ width: 640, height: 480 })
    expect(opaqueUrl).toMatch(/^data:image\/webp;base64,/)
    expect(toDataURL).toHaveBeenCalledWith('image/webp', 0.86)

    // Falls back to JPEG if WebP is unsupported by the canvas encoder
    toDataURL.mockImplementation((mime: string) =>
      mime === 'image/webp' ? 'data:image/png;base64,FALLBACK' : `data:${mime};base64,BBB=`,
    )
    expect(compressImageForStorage(img)).toMatch(/^data:image\/jpeg;base64,/)

    // Preserves PNG transparency when WebP is unsupported on alpha images
    alphaFill = 128
    expect(compressImageForStorage(img)).toMatch(/^data:image\/png;base64,/)
  })

  it('restores idb photos with object URL revocation and builds safe img preview', async () => {
    const { factory } = createFakeIndexedDb()
    await putMediaBlob('photo-1', new Blob(['img'], { type: 'image/webp' }), factory)
    vi.stubGlobal('indexedDB', factory)

    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-1')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    vi.stubGlobal('Image', class {
      decoding = ''
      naturalWidth = 400
      naturalHeight = 300
      onload?: () => void
      onerror?: () => void
      set src(_v: string) {
        queueMicrotask(() => this.onload?.())
      }
    })

    const previewCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
        drawImage: vi.fn(),
        getImageData: () => ({ data: new Uint8ClampedArray([10, 20, 30, 255]) }),
      }),
      toDataURL: (mime: string) => `data:${mime};base64,PREVIEW`,
    }
    vi.stubGlobal('document', { createElement: vi.fn(() => previewCanvas) })

    const restored = await loadStoredPhoto('idb:photo-1')
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-1')
    expect(restored.image.naturalWidth).toBe(400)
    expect(restored.preview).toMatch(/^data:image\//)
    expect(restored.preview.startsWith('idb:')).toBe(false)

    const inline = await loadStoredPhoto('data:image/jpeg;base64,INLINE')
    expect(inline.preview).toBe('data:image/jpeg;base64,INLINE')
  })
})
