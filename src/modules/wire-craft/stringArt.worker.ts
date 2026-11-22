import { generateStringArt } from './stringArt'

export type StringArtWorkerResponse =
  | { plan: ReturnType<typeof generateStringArt> }
  | { error: string }

self.onmessage = (event: MessageEvent<Parameters<typeof generateStringArt>>) => {
  try {
    const plan = generateStringArt(...event.data)
    self.postMessage({ plan } satisfies StringArtWorkerResponse)
  } catch (cause) {
    self.postMessage({
      error: cause instanceof Error ? cause.message : '生成失败，请重试或调整参数。',
    } satisfies StringArtWorkerResponse)
  }
}
