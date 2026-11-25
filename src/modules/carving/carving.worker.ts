import { WorkerPhotoCache } from '../../lib/persistentWorker'
import type { WorkerRequestEnvelope, WorkerResponseEnvelope } from '../../lib/persistentWorker'
import { createCarvingExampleField, generateCarvingPlan, rgbaToCarvingField } from './carving'
import type {
  BridgeWidthMm,
  CarvingAlgorithm,
  CarvingContrastMode,
  CarvingExampleId,
  CarvingFieldInput,
  CarvingPlan,
  FrameSizeCm,
} from './carving'

export type CarvingWorkerSource =
  | { kind: 'example'; id: CarvingExampleId }
  | { kind: 'photo'; rgba?: Uint8ClampedArray; width: number; height: number; key: string }

export interface CarvingWorkerRequest {
  source: CarvingWorkerSource
  gridSize: number
  algorithm: CarvingAlgorithm
  frameSizeCm: FrameSizeCm
  bridgeWidthMm: BridgeWidthMm
  contrastMode: CarvingContrastMode
  mirrorPrint?: boolean
}

const photoCache = new WorkerPhotoCache()
let cachedFieldKey = ''
let cachedField: CarvingFieldInput | null = null

self.onmessage = (event: MessageEvent<WorkerRequestEnvelope<CarvingWorkerRequest>>) => {
  const { jobId, payload } = event.data
  try {
    const resolvedPhoto = payload.source.kind === 'photo' ? photoCache.resolve(payload.source) : null
    const sourceKey = payload.source.kind === 'example' ? `ex:${payload.source.id}` : payload.source.key
    const mirrorPrint = Boolean(payload.mirrorPrint)
    const fieldKey = `${sourceKey}|${payload.gridSize}|${payload.contrastMode}|${mirrorPrint ? 1 : 0}`

    let field: CarvingFieldInput
    if (fieldKey === cachedFieldKey && cachedField) {
      field = cachedField
    } else {
      field = payload.source.kind === 'example'
        ? createCarvingExampleField(payload.source.id, payload.gridSize, payload.contrastMode, mirrorPrint)
        : rgbaToCarvingField(
            resolvedPhoto!.rgba,
            resolvedPhoto!.width,
            resolvedPhoto!.height,
            payload.gridSize,
            false,
            payload.contrastMode,
            mirrorPrint,
          )
      cachedFieldKey = fieldKey
      cachedField = field
    }

    const plan = generateCarvingPlan(
      field,
      payload.algorithm,
      payload.frameSizeCm,
      payload.bridgeWidthMm,
      payload.contrastMode,
      mirrorPrint,
    )
    self.postMessage({ jobId, result: plan } satisfies WorkerResponseEnvelope<CarvingPlan>)
  } catch (cause) {
    self.postMessage({
      jobId,
      error: cause instanceof Error ? cause.message : '雕刻底稿生成失败，请重试或调整参数。',
    } satisfies WorkerResponseEnvelope<CarvingPlan>)
  }
}
