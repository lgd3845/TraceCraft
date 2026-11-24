import { describe, expect, it, vi } from 'vitest'
import { hasOpaquePixels, PersistentWorkerRunner, WorkerPhotoCache } from './persistentWorker'
import type { KeyedPhotoPayload, WorkerIncomingEnvelope } from './persistentWorker'

class FakeWorker<TPayload = string> {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: { message: string; preventDefault?: () => void }) => void) | null = null
  onmessageerror: (() => void) | null = null
  posted: Array<WorkerIncomingEnvelope<TPayload>> = []
  terminated = false

  postMessage(data: WorkerIncomingEnvelope<TPayload>) {
    this.posted.push(data)
  }

  emitMessage(data: unknown) {
    this.onmessage?.({ data } as MessageEvent)
  }

  emitError(message: string) {
    this.onerror?.({ message, preventDefault: () => {} })
  }

  terminate() {
    this.terminated = true
  }
}

describe('PersistentWorkerRunner', () => {
  it('reuses a single worker across sequential jobs', () => {
    const workers: FakeWorker[] = []
    const factory = vi.fn(() => {
      const w = new FakeWorker()
      workers.push(w)
      return w as unknown as Worker
    })

    const runner = new PersistentWorkerRunner<string, string>(factory)
    const results: string[] = []

    runner.submit('job-a', { onSuccess: res => results.push(res), onError: () => {} })
    expect(factory).toHaveBeenCalledTimes(1)
    expect(workers[0].posted).toEqual([{ jobId: 1, payload: 'job-a' }])
    workers[0].emitMessage({ jobId: 1, result: 'done-a' })

    runner.submit('job-b', { onSuccess: res => results.push(res), onError: () => {} })
    expect(factory).toHaveBeenCalledTimes(1)
    expect(workers[0].posted).toEqual([
      { jobId: 1, payload: 'job-a' },
      { jobId: 2, payload: 'job-b' },
    ])
    workers[0].emitMessage({ jobId: 2, result: 'done-b' })

    expect(results).toEqual(['done-a', 'done-b'])
    expect(workers[0].terminated).toBe(false)
    runner.dispose()
    expect(workers[0].terminated).toBe(true)
  })

  it('coalesces overlapping submissions so only the latest pending job executes', () => {
    const workers: FakeWorker[] = []
    const runner = new PersistentWorkerRunner<string, string>(() => {
      const w = new FakeWorker()
      workers.push(w)
      return w as unknown as Worker
    })

    const received: string[] = []
    runner.submit('first', { onSuccess: r => received.push(r), onError: () => {} })
    runner.submit('stale-middle', { onSuccess: r => received.push(r), onError: () => {} })
    runner.submit('latest', { onSuccess: r => received.push(r), onError: () => {} })

    // Only job 1 is sent immediately; job 2 is superseded by job 3.
    expect(workers[0].posted).toEqual([{ jobId: 1, payload: 'first' }])
    workers[0].emitMessage({ jobId: 1, result: 'result-first' })
    // Stale callback for first job must be ignored.
    expect(received).toEqual([])

    expect(workers[0].posted).toEqual([
      { jobId: 1, payload: 'first' },
      { jobId: 3, payload: 'latest' },
    ])
    workers[0].emitMessage({ jobId: 3, result: 'result-latest' })
    expect(received).toEqual(['result-latest'])
  })

  it('handles legacy error envelopes without jobId and preserves retry capability', () => {
    const workers: FakeWorker[] = []
    const runner = new PersistentWorkerRunner<string, string>(() => {
      const w = new FakeWorker()
      workers.push(w)
      return w as unknown as Worker
    })

    const errors: string[] = []
    const results: string[] = []
    runner.submit('first', { onSuccess: r => results.push(r), onError: msg => errors.push(msg) })
    workers[0].emitMessage({ error: '模拟失败' })
    expect(errors).toEqual(['模拟失败'])

    runner.submit('retry', { onSuccess: r => results.push(r), onError: msg => errors.push(msg) })
    expect(workers).toHaveLength(1)
    workers[0].emitMessage({ jobId: 2, result: 'ok' })
    expect(results).toEqual(['ok'])
  })

  it('terminates broken workers on error and recreates a fresh worker for later jobs', () => {
    const workers: FakeWorker[] = []
    const runner = new PersistentWorkerRunner<string, string>(() => {
      const w = new FakeWorker()
      workers.push(w)
      return w as unknown as Worker
    })

    const errors: string[] = []
    const results: string[] = []
    runner.submit('boom', { onSuccess: r => results.push(r), onError: msg => errors.push(msg) })
    workers[0].emitError('worker crashed')

    expect(workers[0].terminated).toBe(true)
    expect(errors).toEqual(['worker crashed'])

    runner.submit('recover', { onSuccess: r => results.push(r), onError: msg => errors.push(msg) })
    expect(workers).toHaveLength(2)
    workers[1].emitMessage({ jobId: 2, result: 'recovered' })
    expect(results).toEqual(['recovered'])
  })

  it('ignores late responses after cancelCurrent or dispose', () => {
    const workers: FakeWorker[] = []
    const runner = new PersistentWorkerRunner<string, string>(() => {
      const w = new FakeWorker()
      workers.push(w)
      return w as unknown as Worker
    })

    const results: string[] = []
    runner.submit('one', { onSuccess: r => results.push(r), onError: () => {} })
    runner.cancelCurrent()
    workers[0].emitMessage({ jobId: 1, result: 'late' })
    expect(results).toEqual([])

    runner.submit('two', { onSuccess: r => results.push(r), onError: () => {} })
    runner.dispose()
    workers[0].emitMessage({ jobId: 2, result: 'after-dispose' })
    expect(results).toEqual([])
    expect(workers[0].terminated).toBe(true)
  })

  it('detects opaque pixels without allocation', () => {
    expect(hasOpaquePixels(new Uint8ClampedArray([0, 0, 0, 0, 255, 0, 0, 15]), 16)).toBe(false)
    expect(hasOpaquePixels(new Uint8ClampedArray([0, 0, 0, 0, 255, 0, 0, 16]), 16)).toBe(true)
  })

  it('sends cooperative cancel envelopes once per superseded job and flushes pending work cleanly', () => {
    const workers: FakeWorker[] = []
    const runner = new PersistentWorkerRunner<string, string>(() => {
      const w = new FakeWorker()
      workers.push(w)
      return w as unknown as Worker
    }, { cooperativeCancel: true })

    const results: string[] = []
    const errors: string[] = []
    runner.submit('first', { onSuccess: r => results.push(r), onError: e => errors.push(e) })
    runner.submit('second', { onSuccess: r => results.push(r), onError: e => errors.push(e) })
    runner.submit('third', { onSuccess: r => results.push(r), onError: e => errors.push(e) })

    // Only one cancel envelope is sent for job 1 even across multiple queued updates.
    expect(workers[0].posted).toEqual([
      { jobId: 1, payload: 'first' },
      { type: 'cancel', jobId: 1 },
    ])

    workers[0].emitMessage({ jobId: 1, cancelled: true })
    expect(results).toEqual([])
    expect(errors).toEqual([])
    expect(workers[0].posted).toEqual([
      { jobId: 1, payload: 'first' },
      { type: 'cancel', jobId: 1 },
      { jobId: 3, payload: 'third' },
    ])

    runner.cancelCurrent()
    expect(workers[0].posted).toEqual([
      { jobId: 1, payload: 'first' },
      { type: 'cancel', jobId: 1 },
      { jobId: 3, payload: 'third' },
      { type: 'cancel', jobId: 3 },
    ])
    workers[0].emitMessage({ jobId: 3, cancelled: true })
    expect(results).toEqual([])
    expect(errors).toEqual([])
  })

  it('omits redundant photo RGBA buffers once confirmed and resets after errors or termination', () => {
    interface PhotoReq {
      source: KeyedPhotoPayload | { kind: 'example'; id: string }
      step: number
    }
    const workers: Array<FakeWorker<PhotoReq>> = []
    const runner = new PersistentWorkerRunner<PhotoReq, string>(() => {
      const w = new FakeWorker<PhotoReq>()
      workers.push(w)
      return w as unknown as Worker
    }, { cachePhotoSource: true })

    const rgbaA = new Uint8ClampedArray([1, 2, 3, 255])
    const rgbaB = new Uint8ClampedArray([4, 5, 6, 255])
    const results: string[] = []
    const errors: string[] = []

    // Initial error must NOT confirm photo key k1
    runner.submit({ source: { kind: 'photo', key: 'k1', width: 1, height: 1, rgba: rgbaA }, step: 1 }, {
      onSuccess: r => results.push(r),
      onError: e => errors.push(e),
    })
    workers[0].emitMessage({ error: '测试错误' })
    expect(errors).toEqual(['测试错误'])

    // Retry still includes rgba
    runner.submit({ source: { kind: 'photo', key: 'k1', width: 1, height: 1, rgba: rgbaA }, step: 2 }, {
      onSuccess: r => results.push(r),
      onError: e => errors.push(e),
    })
    expect((workers[0].posted[1] as { payload: PhotoReq }).payload.source).toMatchObject({ kind: 'photo', key: 'k1', rgba: rgbaA })
    workers[0].emitMessage({ jobId: 2, result: 'ok-1' })

    // Next job with same key k1 omits rgba
    runner.submit({ source: { kind: 'photo', key: 'k1', width: 1, height: 1, rgba: rgbaA }, step: 3 }, {
      onSuccess: r => results.push(r),
      onError: e => errors.push(e),
    })
    const thirdSource = (workers[0].posted[2] as { payload: PhotoReq }).payload.source
    expect(thirdSource).toEqual({ kind: 'photo', key: 'k1', width: 1, height: 1 })
    workers[0].emitMessage({ jobId: 3, result: 'ok-2' })

    // Changing to k2 sends rgbaB
    runner.submit({ source: { kind: 'photo', key: 'k2', width: 1, height: 1, rgba: rgbaB }, step: 4 }, {
      onSuccess: r => results.push(r),
      onError: e => errors.push(e),
    })
    expect((workers[0].posted[3] as { payload: PhotoReq }).payload.source).toMatchObject({ kind: 'photo', key: 'k2', rgba: rgbaB })

    // Worker crash clears confirmed key so fresh worker receives rgbaB again
    workers[0].emitError('crash')
    runner.submit({ source: { kind: 'photo', key: 'k2', width: 1, height: 1, rgba: rgbaB }, step: 5 }, {
      onSuccess: r => results.push(r),
      onError: e => errors.push(e),
    })
    expect(workers).toHaveLength(2)
    expect((workers[1].posted[0] as { payload: PhotoReq }).payload.source).toMatchObject({ kind: 'photo', key: 'k2', rgba: rgbaB })
    expect(results).toEqual(['ok-1', 'ok-2'])
  })

  it('resolves omitted photo RGBA inside WorkerPhotoCache and throws when missing', () => {
    const cache = new WorkerPhotoCache()
    const rgba = new Uint8ClampedArray([9, 8, 7, 255])
    expect(cache.resolve({ kind: 'photo', key: 'p1', width: 1, height: 1, rgba })).toEqual({ rgba, width: 1, height: 1 })
    expect(cache.resolve({ kind: 'photo', key: 'p1', width: 1, height: 1 })).toEqual({ rgba, width: 1, height: 1 })
    expect(() => cache.resolve({ kind: 'photo', key: 'p2', width: 1, height: 1 })).toThrow('源图缓存已失效')
  })
})
