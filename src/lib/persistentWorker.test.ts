import { describe, expect, it, vi } from 'vitest'
import { hasOpaquePixels, PersistentWorkerRunner } from './persistentWorker'
import type { WorkerIncomingEnvelope } from './persistentWorker'

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: { message: string; preventDefault?: () => void }) => void) | null = null
  onmessageerror: (() => void) | null = null
  posted: Array<WorkerIncomingEnvelope<string>> = []
  terminated = false

  postMessage(data: WorkerIncomingEnvelope<string>) {
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
})
