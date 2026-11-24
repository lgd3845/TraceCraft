import { WorkerPhotoCache } from '../../lib/persistentWorker'
import type { WorkerRequestEnvelope, WorkerResponseEnvelope } from '../../lib/persistentWorker'
import { createCompassExampleField, generateCompassPlan, rgbaToCompassField } from './compass'
import type {
  CompassAlgorithm,
  CompassColorMode,
  CompassContrastMode,
  CompassExampleId,
  CompassFieldInput,
  CompassPalette,
  CompassPlan,
  PaperSizeCm,
} from './compass'

export type CompassWorkerSource =
  | { kind: 'example'; id: CompassExampleId }
  | { kind: 'photo'; rgba?: Uint8ClampedArray; width: number; height: number; key: string }

export interface CompassWorkerRequest {
  source: CompassWorkerSource
  mapSize: number
  algorithm: CompassAlgorithm
  ringCount: number
  paperSizeCm: PaperSizeCm
  colorMode: CompassColorMode
  contrastMode: CompassContrastMode
  palette: CompassPalette
  usePhotoColors: boolean
  autoInvert: boolean
}

const photoCache = new WorkerPhotoCache()
let cachedFieldKey = ''
let cachedField: CompassFieldInput | null = null

self.onmessage = (event: MessageEvent<WorkerRequestEnvelope<CompassWorkerRequest>>) => {
  const { jobId, payload } = event.data
  try {
    const resolvedPhoto = payload.source.kind === 'photo' ? photoCache.resolve(payload.source) : null
    const sourceKey = payload.source.kind === 'example' ? `ex:${payload.source.id}` : payload.source.key
    const fieldKey = `${sourceKey}|${payload.mapSize}|${payload.palette.id}|${payload.usePhotoColors ? 1 : 0}|${payload.autoInvert ? 1 : 0}|${payload.contrastMode}`

    let field: CompassFieldInput
    if (fieldKey === cachedFieldKey && cachedField) {
      field = cachedField
    } else {
      field = payload.source.kind === 'example'
        ? createCompassExampleField(payload.source.id, payload.mapSize, payload.palette, payload.contrastMode)
        : rgbaToCompassField(
            resolvedPhoto!.rgba,
            resolvedPhoto!.width,
            resolvedPhoto!.height,
            payload.mapSize,
            payload.palette,
            payload.usePhotoColors,
            payload.autoInvert,
            payload.contrastMode,
          )
      cachedFieldKey = fieldKey
      cachedField = field
    }

    const plan = generateCompassPlan(
      field,
      payload.algorithm,
      payload.ringCount,
      payload.paperSizeCm,
      payload.colorMode,
      payload.contrastMode,
    )
    self.postMessage({ jobId, result: plan } satisfies WorkerResponseEnvelope<CompassPlan>)
  } catch (cause) {
    self.postMessage({
      jobId,
      error: cause instanceof Error ? cause.message : '圆规画方案生成失败，请重试或调整参数。',
    } satisfies WorkerResponseEnvelope<CompassPlan>)
  }
}
