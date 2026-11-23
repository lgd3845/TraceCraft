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

export interface PersistentWorkerOptions {
  cooperativeCancel?: boolean
}

interface InFlightJob<TResult> {
  jobId: number
  cancelled: boolean
  cancelSent: boolean
  callbacks: WorkerJobCallbacks<TResult>
}

interface PendingJob<TPayload, TResult> {
  jobId: number
  payload: TPayload
  callbacks: WorkerJobCallbacks<TResult>
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
  private worker: Worker | null = null
  private nextJobId = 0
  private inFlight: InFlightJob<TResult> | null = null
  private pending: PendingJob<TPayload, TResult> | null = null
  private disposed = false

  constructor(createWorker: () => Worker, options?: PersistentWorkerOptions) {
    this.createWorker = createWorker
    this.cooperativeCancel = Boolean(options?.cooperativeCancel)
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
      if (!active.cancelled && !this.disposed && !(data && data.cancelled === true)) {
        if (data && typeof data.error === 'string') {
          active.callbacks.onError(data.error)
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
      this.inFlight = {
        jobId: job.jobId,
        cancelled: false,
        cancelSent: false,
        callbacks: job.callbacks,
      }
      worker.postMessage({ jobId: job.jobId, payload: job.payload } satisfies WorkerRequestEnvelope<TPayload>)
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
    if (this.worker) {
      this.worker.onmessage = null
      this.worker.onerror = null
      this.worker.onmessageerror = null
      this.worker.terminate()
      this.worker = null
    }
  }
}
