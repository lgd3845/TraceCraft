import type { WorkerRequestEnvelope, WorkerResponseEnvelope } from '../../lib/persistentWorker'
import {
  createEmbroideryExampleRgba,
  generateEmbroideryPlan,
  quantizeImageToEmbroideryGrid,
} from './embroidery'
import type {
  EmbroideryExampleId,
  EmbroideryPlan,
  QuantizedEmbroideryGrid,
  StitchMode,
} from './embroidery'

export type EmbroideryWorkerSource =
  | { kind: 'example'; id: EmbroideryExampleId }
  | { kind: 'photo'; rgba: Uint8ClampedArray; width: number; height: number; key: string }

export interface EmbroideryWorkerRequest {
  source: EmbroideryWorkerSource
  stitchMode: StitchMode
  gridSize: number
  maxColors: number
  hoopSizeCm: number
}

let cachedGridKey = ''
let cachedGrid: QuantizedEmbroideryGrid | null = null

self.onmessage = (event: MessageEvent<WorkerRequestEnvelope<EmbroideryWorkerRequest>>) => {
  const { jobId, payload } = event.data
  try {
    const sourceKey = payload.source.kind === 'example' ? `ex:${payload.source.id}` : payload.source.key
    const gridKey = `${sourceKey}|${payload.gridSize}|${payload.maxColors}`

    let grid: QuantizedEmbroideryGrid
    if (gridKey === cachedGridKey && cachedGrid) {
      grid = cachedGrid
    } else {
      const sample = payload.source.kind === 'example'
        ? createEmbroideryExampleRgba(payload.source.id, 112)
        : payload.source
      grid = quantizeImageToEmbroideryGrid(
        sample.rgba,
        sample.width,
        sample.height,
        payload.gridSize,
        payload.maxColors,
        true,
      )
      cachedGridKey = gridKey
      cachedGrid = grid
    }

    const plan = generateEmbroideryPlan(grid, payload.stitchMode, payload.hoopSizeCm, false)
    self.postMessage({ jobId, result: plan } satisfies WorkerResponseEnvelope<EmbroideryPlan>)
  } catch (cause) {
    self.postMessage({
      jobId,
      error: cause instanceof Error ? cause.message : '刺绣方案生成失败，请重试或调整参数。',
    } satisfies WorkerResponseEnvelope<EmbroideryPlan>)
  }
}
