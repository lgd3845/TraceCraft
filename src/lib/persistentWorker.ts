export interface WorkerRequestEnvelope<TPayload> {
  jobId: number
  payload: TPayload
}

export interface WorkerCancelEnvelope {
  type: 'cancel'
  jobId: number
}

export type WorkerIncomingEnvelope<TPayload> =
  | WorkerRequestEnvelope<TPayload>
  | WorkerCancelEnvelope

export type WorkerResponseEnvelope<TResult> =
  | { jobId?: number; result: TResult }
  | { jobId?: number; plan?: TResult }
  | { jobId?: number; error: string }
  | { jobId?: number; cancelled: true }

export interface WorkerJobCallbacks<TResult> {
  onSuccess: (result: TResult) => void
  onError: (message: string) => void
}

export interface KeyedPhotoPayload {
  kind: 'photo'
  key: string
  width: number
  height: number
  rgba?: Uint8ClampedArray
}

export interface PersistentWorkerOptions {
  cooperativeCancel?: boolean
  cachePhotoSource?: boolean
}

interface InFlightJob<TResult> {
  jobId: number
  cancelled: boolean
  cancelSent: boolean
  photoKey: string | null
  callbacks: WorkerJobCallbacks<TResult>
}

interface PendingJob<TPayload, TResult> {
  jobId: number
  payload: TPayload
  callbacks: WorkerJobCallbacks<TResult>
}

export class WorkerPhotoCache {
  private cachedKey = ''
  private cachedRgba: Uint8ClampedArray | null = null
  private cachedWidth = 0
  private cachedHeight = 0

  resolve(source: KeyedPhotoPayload): { rgba: Uint8ClampedArray; width: number; height: number } {
    if (source.rgba) {
      this.cachedKey = source.key
      this.cachedRgba = source.rgba
      this.cachedWidth = source.width
      this.cachedHeight = source.height
      return { rgba: source.rgba, width: source.width, height: source.height }
    }
    if (source.key === this.cachedKey && this.cachedRgba) {
      return { rgba: this.cachedRgba, width: this.cachedWidth, height: this.cachedHeight }
    }
    throw new Error('源图缓存已失效，请重新上传或调整取景。')
  }
}

function extractPhotoSource(payload: unknown): KeyedPhotoPayload | null {
  if (!payload || typeof payload !== 'object') return null
  const src = (payload as { source?: unknown }).source
  if (!src || typeof src !== 'object') return null
  const candidate = src as Record<string, unknown>
  if (
    candidate.kind !== 'photo' ||
    typeof candidate.key !== 'string' ||
    typeof candidate.width !== 'number' ||
    typeof candidate.height !== 'number'
  ) {
    return null
  }
  return candidate as unknown as KeyedPhotoPayload
}

export function hasOpaquePixels(rgba: ArrayLike<number>, minAlpha = 16): boolean {
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] >= minAlpha) return true
  }
  return false
}

/**
 * Keeps a single Web Worker alive across jobs and coalesces burst updates so
 * intermediate stale requests are dropped rather than queued.
 */
export class PersistentWorkerRunner<TPayload, TResult> {
  private readonly createWorker: () => Worker
  private readonly cooperativeCancel: boolean
  private readonly cachePhotoSource: boolean
  private worker: Worker | null = null
  private nextJobId = 0
  private inFlight: InFlightJob<TResult> | null = null
  private pending: PendingJob<TPayload, TResult> | null = null
  private confirmedPhotoKey = ''
  private disposed = false

  constructor(createWorker: () => Worker, options?: PersistentWorkerOptions) {
    this.createWorker = createWorker
    this.cooperativeCancel = Boolean(options?.cooperativeCancel)
    this.cachePhotoSource = Boolean(options?.cachePhotoSource)
  }

  submit(payload: TPayload, callbacks: WorkerJobCallbacks<TResult>): number {
    if (this.disposed) return -1
    const jobId = ++this.nextJobId
    if (this.inFlight) {
      this.inFlight.cancelled = true
      this.sendCancelIfNeeded(this.inFlight)
      this.pending = { jobId, payload, callbacks }
      return jobId
    }
    this.dispatch({ jobId, payload, callbacks })
    return jobId
  }

  cancelCurrent() {
    if (this.inFlight) {
      this.inFlight.cancelled = true
      this.sendCancelIfNeeded(this.inFlight)
    }
    this.pending = null
  }

  dispose() {
    this.disposed = true
    this.cancelCurrent()
    this.inFlight = null
    this.terminateWorker()
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker
    const worker = this.createWorker()
    worker.onmessage = (event: MessageEvent<WorkerResponseEnvelope<TResult>>) => {
      const active = this.inFlight
      if (!active) return
      const data = event.data as Record<string, unknown> | null | undefined
      if (data && typeof data.jobId === 'number' && data.jobId !== active.jobId) {
        return
      }
      this.inFlight = null
      const isError = Boolean(data && typeof data.error === 'string')
      const isCancelled = Boolean(data && data.cancelled === true)
      const hasResult = Boolean(
        data &&
          (('result' in data && data.result !== undefined) ||
            ('plan' in data && data.plan !== undefined)),
      )
      if (active.photoKey && !isError && (hasResult || isCancelled)) {
        this.confirmedPhotoKey = active.photoKey
      }
      if (!active.cancelled && !this.disposed && !isCancelled) {
        if (isError) {
          active.callbacks.onError(data!.error as string)
        } else if (data && 'result' in data && data.result !== undefined) {
          active.callbacks.onSuccess(data.result as TResult)
        } else if (data && 'plan' in data && data.plan !== undefined) {
          active.callbacks.onSuccess(data.plan as TResult)
        } else {
          active.callbacks.onError('生成结果读取失败，请重试。')
        }
      }
      this.flushPending()
    }
    worker.onerror = event => {
      if (typeof event.preventDefault === 'function') event.preventDefault()
      const active = this.inFlight
      this.inFlight = null
      this.terminateWorker()
      if (active && !active.cancelled && !this.disposed) {
        active.callbacks.onError(event.message || '生成失败，请重试或调整参数。')
      }
      this.flushPending()
    }
    worker.onmessageerror = () => {
      const active = this.inFlight
      this.inFlight = null
      this.terminateWorker()
      if (active && !active.cancelled && !this.disposed) {
        active.callbacks.onError('生成结果读取失败，请重试。')
      }
      this.flushPending()
    }
    this.worker = worker
    return worker
  }

  private dispatch(job: PendingJob<TPayload, TResult>) {
    try {
      const worker = this.ensureWorker()
      const photoSource = this.cachePhotoSource ? extractPhotoSource(job.payload) : null
      const photoKey = photoSource ? photoSource.key : null
      const wirePayload = photoSource && photoSource.rgba && photoSource.key === this.confirmedPhotoKey
        ? ({
            ...(job.payload as Record<string, unknown>),
            source: {
              kind: 'photo',
              key: photoSource.key,
              width: photoSource.width,
              height: photoSource.height,
            },
          } as unknown as TPayload)
        : job.payload
      this.inFlight = {
        jobId: job.jobId,
        cancelled: false,
        cancelSent: false,
        photoKey,
        callbacks: job.callbacks,
      }
      worker.postMessage({ jobId: job.jobId, payload: wirePayload } satisfies WorkerRequestEnvelope<TPayload>)
    } catch (cause) {
      this.inFlight = null
      this.terminateWorker()
      if (!this.disposed) {
        job.callbacks.onError(cause instanceof Error ? cause.message : '当前浏览器无法启动本地计算，请重试。')
      }
      this.flushPending()
    }
  }

  private sendCancelIfNeeded(job: InFlightJob<TResult>) {
    if (!this.cooperativeCancel || job.cancelSent || !this.worker) return
    job.cancelSent = true
    try {
      this.worker.postMessage({ type: 'cancel', jobId: job.jobId } satisfies WorkerCancelEnvelope)
    } catch {
      // Best-effort cooperative cancellation; stale completion stays guarded by jobId/cancelled.
    }
  }

  private flushPending() {
    if (this.disposed || this.inFlight || !this.pending) return
    const next = this.pending
    this.pending = null
    this.dispatch(next)
  }

  private terminateWorker() {
    this.confirmedPhotoKey = ''
    if (this.worker) {
      this.worker.onmessage = null
      this.worker.onerror = null
      this.worker.onmessageerror = null
      this.worker.terminate()
      this.worker = null
    }
  }
}
