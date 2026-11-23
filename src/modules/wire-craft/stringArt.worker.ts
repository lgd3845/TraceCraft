import type { WorkerIncomingEnvelope, WorkerResponseEnvelope } from '../../lib/persistentWorker'
import { createExampleLayers, generateStringArtAsync, rgbaToPhotoLayers } from './stringArt'
import type {
  BoardSizeCm,
  ColorWeaveMode,
  ContrastMode,
  NailLayoutMode,
  StringArtPlan,
  StringExampleId,
  StringLayerInput,
  StringPalette,
} from './stringArt'

export type StringArtWorkerSource =
  | { kind: 'example'; id: StringExampleId }
  | { kind: 'photo'; rgba: Uint8ClampedArray; width: number; height: number; key: string }

export interface StringArtWorkerRequest {
  source: StringArtWorkerSource
  mapSize: number
  pegCount: number
  stepCount: number
  boardSizeCm: BoardSizeCm
  layoutMode: NailLayoutMode
  palette: StringPalette
  threadDarkness: number
  colorWeaveMode: ColorWeaveMode
  contrastMode: ContrastMode
  usePhotoColors: boolean
  autoInvert: boolean
}

let cachedLayerKey = ''
let cachedLayers: StringLayerInput[] | null = null
let activeJobId = 0
let abortedJobId = 0
let yieldChannel: MessageChannel | null = null
let pendingYieldResolve: (() => void) | null = null

function yieldToMacrotask(): Promise<void> {
  if (typeof MessageChannel === 'undefined') {
    return new Promise(resolve => setTimeout(resolve, 0))
  }
  if (!yieldChannel) {
    yieldChannel = new MessageChannel()
    yieldChannel.port1.onmessage = () => {
      const resolve = pendingYieldResolve
      pendingYieldResolve = null
      resolve?.()
    }
  }
  return new Promise(resolve => {
    pendingYieldResolve = resolve
    yieldChannel!.port2.postMessage(null)
  })
}

self.onmessage = async (event: MessageEvent<WorkerIncomingEnvelope<StringArtWorkerRequest>>) => {
  const message = event.data
  if ('type' in message) {
    if (message.type === 'cancel' && message.jobId === activeJobId) {
      abortedJobId = message.jobId
    }
    return
  }

  const { jobId, payload } = message
  activeJobId = jobId
  abortedJobId = 0

  try {
    const sourceKey = payload.source.kind === 'example' ? `ex:${payload.source.id}` : payload.source.key
    const layerKey = `${sourceKey}|${payload.mapSize}|${payload.palette.id}|${payload.usePhotoColors ? 1 : 0}|${payload.autoInvert ? 1 : 0}|${payload.colorWeaveMode}|${payload.contrastMode}`

    let layers: StringLayerInput[]
    if (layerKey === cachedLayerKey && cachedLayers) {
      layers = cachedLayers
    } else {
      layers = payload.source.kind === 'example'
        ? createExampleLayers(
            payload.source.id,
            payload.mapSize,
            payload.palette,
            payload.colorWeaveMode,
            payload.contrastMode,
          )
        : rgbaToPhotoLayers(
            payload.source.rgba,
            payload.source.width,
            payload.source.height,
            payload.mapSize,
            payload.palette,
            payload.usePhotoColors,
            payload.autoInvert,
            payload.colorWeaveMode,
            payload.contrastMode,
          )
      cachedLayerKey = layerKey
      cachedLayers = layers
    }

    const plan = await generateStringArtAsync(
      layers,
      payload.mapSize,
      payload.pegCount,
      payload.stepCount,
      payload.boardSizeCm,
      payload.layoutMode,
      payload.palette,
      payload.threadDarkness,
      {
        shouldAbort: () => abortedJobId === jobId,
        chunkSteps: 32,
        yieldChunk: yieldToMacrotask,
      },
    )
    if (!plan || abortedJobId === jobId) {
      self.postMessage({ jobId, cancelled: true } satisfies WorkerResponseEnvelope<StringArtPlan>)
      return
    }
    self.postMessage({ jobId, result: plan } satisfies WorkerResponseEnvelope<StringArtPlan>)
  } catch (cause) {
    self.postMessage({
      jobId,
      error: cause instanceof Error ? cause.message : '生成失败，请重试或调整参数。',
    } satisfies WorkerResponseEnvelope<StringArtPlan>)
  } finally {
    if (activeJobId === jobId) {
      activeJobId = 0
    }
  }
}
