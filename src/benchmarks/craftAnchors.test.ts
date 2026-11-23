import { describe, expect, it } from 'vitest'
import baseline from './baseline.json'
import { CRAFT_ANCHOR_CASES } from './craftAnchors'

const LOWER_IS_BETTER = new Set([
  'meanRedmeanError',
  'p95RedmeanError',
  'meanFlowAlignmentDeg',
  'medianIntraLayerJumpCells',
  'weightedLossRatio',
  'rasterizedWeightedMse',
  'shortArcRatio',
  'bridgeAreaRatio',
  'tinyCutRatio',
])

const HIGHER_IS_BETTER = new Set([
  'edgeDetailPreservation',
  'foregroundCoverageRatio',
  'localRoutingRatio',
  'targetMaskIoU',
])

type BaselineCase = {
  studio: string
  tier: string
  outputHash: string
  metrics: Record<string, number>
}

const baselineCases = baseline.cases as Record<string, BaselineCase>

describe('craft engine output hashes, quality gates, and invariants', () => {
  it('tracks every defined anchor case in baseline.json', () => {
    for (const spec of CRAFT_ANCHOR_CASES) {
      expect(baselineCases[spec.id]).toBeDefined()
    }
  })

  it.each(CRAFT_ANCHOR_CASES)('locks output hash and quality metrics for $id ($tier)', spec => {
    const base = baselineCases[spec.id]
    const result = spec.run()

    expect(result.outputHash).toBe(base.outputHash)

    for (const [key, value] of Object.entries(result.metrics)) {
      expect(Number.isFinite(value), `${spec.id}.${key} should be finite`).toBe(true)
      const baseValue = base.metrics[key]
      expect(typeof baseValue, `${spec.id}.${key} missing from baseline`).toBe('number')

      if (LOWER_IS_BETTER.has(key)) {
        expect(value, `${spec.id}.${key} regressed`).toBeLessThanOrEqual(baseValue * 1.02 + 1e-6)
      } else if (HIGHER_IS_BETTER.has(key)) {
        expect(value, `${spec.id}.${key} regressed`).toBeGreaterThanOrEqual(baseValue * 0.98 - 1e-6)
      }
    }

    if (result.studio === 'carving') {
      expect(result.metrics.allLayers4Connected).toBe(1)
    }
    if (result.studio === 'wire-craft') {
      expect(result.metrics.outOfMaskPixels).toBe(0)
    }
  })

  it('produces identical output hashes across consecutive runs', () => {
    const representativeIds = [
      'beads:portrait-32-16',
      'embroidery:camellia-long-short-36',
      'wire:cat-contour-multi-120-800',
      'compass:portrait-concentric-40',
      'carving:portrait-stencil-128',
    ]
    for (const id of representativeIds) {
      const spec = CRAFT_ANCHOR_CASES.find(item => item.id === id)!
      const first = spec.run()
      const second = spec.run()
      expect(second.outputHash).toBe(first.outputHash)
      expect(second.metrics).toEqual(first.metrics)
    }
  })
})
