export const MEDIA_REF_PREFIX = 'idb:'
export const MEDIA_DB_NAME = 'tracecraft-media'
export const MEDIA_STORE_NAME = 'blobs'

const dbPromises = new WeakMap<IDBFactory, Promise<IDBDatabase | null>>()

export function isMediaRef(value: string | undefined): value is string {
  return Boolean(value && value.startsWith(MEDIA_REF_PREFIX) && value.length > MEDIA_REF_PREFIX.length)
}

export function toMediaRef(id: string): string {
  return `${MEDIA_REF_PREFIX}${id}`
}

export function parseMediaRef(ref: string): string | null {
  return isMediaRef(ref) ? ref.slice(MEDIA_REF_PREFIX.length) : null
}

function decodeBase64Bytes(base64: string): Uint8Array<ArrayBuffer> {
  if (typeof atob === 'function') {
    const binary = atob(base64)
    const buffer = new ArrayBuffer(binary.length)
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
  const maybeBuffer = (globalThis as { Buffer?: { from(data: string, enc: string): Uint8Array } }).Buffer
  if (maybeBuffer) {
    const raw = maybeBuffer.from(base64, 'base64')
    const buffer = new ArrayBuffer(raw.length)
    const bytes = new Uint8Array(buffer)
    bytes.set(raw)
    return bytes
  }
  throw new Error('当前环境不支持 base64 图片解码。')
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',')
  if (comma < 0 || !dataUrl.startsWith('data:')) {
    throw new Error('无效的图片数据。')
  }
  const meta = dataUrl.slice(5, comma)
  const body = dataUrl.slice(comma + 1)
  const isBase64 = meta === 'base64' || meta.endsWith(';base64')
  const rawType = isBase64 ? meta.slice(0, meta.length - 6).replace(/;$/, '') : meta.split(';')[0]
  const mime = rawType || 'image/png'

  if (isBase64) {
    const bytes = decodeBase64Bytes(body)
    return new Blob([bytes], { type: mime })
  }

  const text = decodeURIComponent(body)
  const encoded = new TextEncoder().encode(text)
  const buffer = new ArrayBuffer(encoded.length)
  new Uint8Array(buffer).set(encoded)
  return new Blob([buffer], { type: mime })
}

function resolveFactory(idb?: IDBFactory | null): IDBFactory | null {
  if (idb !== undefined) return idb
  return typeof indexedDB !== 'undefined' ? indexedDB : null
}

function openMediaDatabase(idb?: IDBFactory | null): Promise<IDBDatabase | null> {
  const factory = resolveFactory(idb)
  if (!factory) return Promise.resolve(null)
  const existing = dbPromises.get(factory)
  if (existing) return existing

  const promise = new Promise<IDBDatabase | null>(resolve => {
    try {
      const request = factory.open(MEDIA_DB_NAME, 1)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(MEDIA_STORE_NAME)) {
          db.createObjectStore(MEDIA_STORE_NAME)
        }
      }
      request.onsuccess = () => {
        const db = request.result
        db.onversionchange = () => {
          dbPromises.delete(factory)
          db.close()
        }
        db.onclose = () => {
          dbPromises.delete(factory)
        }
        resolve(db)
      }
      request.onerror = () => {
        dbPromises.delete(factory)
        resolve(null)
      }
      request.onblocked = () => {
        dbPromises.delete(factory)
        resolve(null)
      }
    } catch {
      dbPromises.delete(factory)
      resolve(null)
    }
  })

  dbPromises.set(factory, promise)
  return promise
}

export async function putMediaBlob(id: string, blob: Blob, idb?: IDBFactory | null): Promise<boolean> {
  const db = await openMediaDatabase(idb)
  if (!db) return false
  return new Promise<boolean>(resolve => {
    try {
      const tx = db.transaction(MEDIA_STORE_NAME, 'readwrite')
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(false)
      tx.onabort = () => resolve(false)
      tx.objectStore(MEDIA_STORE_NAME).put(blob, id)
    } catch {
      resolve(false)
    }
  })
}

export async function getMediaBlob(id: string, idb?: IDBFactory | null): Promise<Blob | null> {
  const db = await openMediaDatabase(idb)
  if (!db) return null
  return new Promise<Blob | null>(resolve => {
    try {
      const tx = db.transaction(MEDIA_STORE_NAME, 'readonly')
      const req = tx.objectStore(MEDIA_STORE_NAME).get(id)
      req.onsuccess = () => {
        resolve(req.result instanceof Blob ? req.result : null)
      }
      req.onerror = () => resolve(null)
      tx.onerror = () => resolve(null)
      tx.onabort = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

export async function deleteMediaBlobs(ids: readonly string[], idb?: IDBFactory | null): Promise<void> {
  if (!ids.length) return
  const db = await openMediaDatabase(idb)
  if (!db) return
  await new Promise<void>(resolve => {
    try {
      const tx = db.transaction(MEDIA_STORE_NAME, 'readwrite')
      const store = tx.objectStore(MEDIA_STORE_NAME)
      for (const id of ids) {
        store.delete(id)
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
      tx.onabort = () => resolve()
    } catch {
      resolve()
    }
  })
}

export async function pruneUnusedMediaBlobs(keepIds: ReadonlySet<string>, idb?: IDBFactory | null): Promise<void> {
  const db = await openMediaDatabase(idb)
  if (!db) return
  await new Promise<void>(resolve => {
    try {
      const tx = db.transaction(MEDIA_STORE_NAME, 'readwrite')
      const store = tx.objectStore(MEDIA_STORE_NAME)
      const req = store.getAllKeys()
      req.onsuccess = () => {
        const keys = Array.isArray(req.result) ? req.result : []
        for (const key of keys) {
          if (typeof key === 'string' && !keepIds.has(key)) {
            store.delete(key)
          }
        }
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
      tx.onabort = () => resolve()
    } catch {
      resolve()
    }
  })
}
