import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const baselinePath = path.join(rootDir, 'src', 'benchmarks', 'baseline.json')

const args = new Set(process.argv.slice(2))
const updateMode = args.has('--update')
const allowDrift = args.has('--allow-drift')

function roundMs(value) {
  return Number(value.toFixed(3))
}

function percentile(sorted, p) {
  if (!sorted.length) return 0
  const idx = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))
  return sorted[idx]
}

function padRight(text, len) {
  const str = String(text)
  return str.length >= len ? str : str + ' '.repeat(len - str.length)
}

function padLeft(text, len) {
  const str = String(text)
  return str.length >= len ? str : ' '.repeat(len - str.length) + str
}

async function main() {
  const server = await createServer({
    root: rootDir,
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  })

  try {
    const mod = await server.ssrLoadModule('/src/benchmarks/craftAnchors.ts')
    const cases = mod.CRAFT_ANCHOR_CASES

    let existingBaseline = null
    if (!updateMode) {
      if (!fs.existsSync(baselinePath)) {
        console.error(`Baseline not found at ${baselinePath}. Run "npm run bench:update" first.`)
        process.exitCode = 1
        return
      }
      existingBaseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
    }

    const nextBaselineCases = {}
    let driftCount = 0
    const rows = []

    for (const spec of cases) {
      // Warmup 1x
      let lastResult = spec.run()
      const iterations = spec.tier === 'default' ? 5 : 3
      const timings = []
      const extraAccum = {}

      const heapBefore = process.memoryUsage().heapUsed
      let peakHeapDelta = 0

      for (let i = 0; i < iterations; i++) {
        const t0 = performance.now()
        lastResult = spec.run()
        const elapsed = performance.now() - t0
        timings.push(elapsed)

        const heapNow = process.memoryUsage().heapUsed - heapBefore
        if (heapNow > peakHeapDelta) peakHeapDelta = heapNow

        if (lastResult.extraTimingsMs) {
          for (const [k, v] of Object.entries(lastResult.extraTimingsMs)) {
            if (!extraAccum[k]) extraAccum[k] = []
            extraAccum[k].push(v)
          }
        }
      }

      timings.sort((a, b) => a - b)
      const p50Ms = roundMs(percentile(timings, 0.5))
      const p95Ms = roundMs(percentile(timings, 0.95))
      const extraP50 = {}
      for (const [k, list] of Object.entries(extraAccum)) {
        list.sort((a, b) => a - b)
        extraP50[k] = roundMs(percentile(list, 0.5))
      }
      const heapDeltaKb = Math.round(Math.max(0, peakHeapDelta) / 1024)

      if (updateMode) {
        nextBaselineCases[spec.id] = {
          studio: lastResult.studio,
          tier: lastResult.tier,
          outputHash: lastResult.outputHash,
          metrics: lastResult.metrics,
          baselineTimingMs: {
            p50Ms,
            p95Ms,
            ...extraP50,
            heapDeltaKb,
          },
        }
        rows.push({
          id: spec.id,
          tier: spec.tier,
          p50Ms: `${p50Ms} ms`,
          p95Ms: `${p95Ms} ms`,
          speedup: 'BASELINE',
          hashStatus: lastResult.outputHash,
          extra: Object.entries(extraP50).map(([k, v]) => `${k}=${v}ms`).join(', ') || '-',
          heap: `${heapDeltaKb} KB`,
        })
      } else {
        const base = existingBaseline.cases[spec.id]
        if (!base) {
          driftCount++
          rows.push({
            id: spec.id,
            tier: spec.tier,
            p50Ms: `${p50Ms} ms`,
            p95Ms: `${p95Ms} ms`,
            speedup: 'NEW',
            hashStatus: 'MISSING_BASE',
            extra: '-',
            heap: `${heapDeltaKb} KB`,
          })
          continue
        }

        const hashMatch = lastResult.outputHash === base.outputHash
        if (!hashMatch) driftCount++
        const baseP50 = base.baselineTimingMs?.p50Ms ?? p50Ms
        const ratio = baseP50 > 0 && p50Ms > 0 ? `${(baseP50 / p50Ms).toFixed(2)}x` : '-'
        const metricDiffs = []
        for (const [k, v] of Object.entries(lastResult.metrics)) {
          const bv = base.metrics[k]
          if (typeof bv === 'number' && bv !== v) {
            const delta = Number((v - bv).toFixed(4))
            metricDiffs.push(`${k}:${delta >= 0 ? '+' : ''}${delta}`)
          }
        }
        const extraSummary = [
          ...Object.entries(extraP50).map(([k, v]) => `${k}=${v}ms`),
          ...metricDiffs,
        ].join('; ') || '-'

        rows.push({
          id: spec.id,
          tier: spec.tier,
          p50Ms: `${p50Ms} ms`,
          p95Ms: `${p95Ms} ms`,
          speedup: ratio,
          hashStatus: hashMatch ? 'MATCH' : `DRIFT (${lastResult.outputHash} != ${base.outputHash})`,
          extra: extraSummary,
          heap: `${heapDeltaKb} KB`,
        })
      }
    }

    if (updateMode) {
      const payload = {
        version: 1,
        generatedAt: new Date().toISOString(),
        nodeVersion: process.version,
        cases: nextBaselineCases,
      }
      fs.writeFileSync(baselinePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
      console.log(`Updated baseline at ${baselinePath} (${Object.keys(nextBaselineCases).length} cases).`)
    }

    const header = [
      padRight('Case ID', 36),
      padRight('Tier', 8),
      padLeft('P50', 11),
      padLeft('P95', 11),
      padLeft('vs Base', 9),
      padRight('  Hash', 18),
      'Notes / Extra Timings / Metric Deltas',
    ].join(' ')
    console.log('\n' + header)
    console.log('-'.repeat(118))
    for (const r of rows) {
      console.log([
        padRight(r.id, 36),
        padRight(r.tier, 8),
        padLeft(r.p50Ms, 11),
        padLeft(r.p95Ms, 11),
        padLeft(r.speedup, 9),
        padRight(`  ${r.hashStatus}`, 18),
        `${r.extra} (heap +${r.heap})`,
      ].join(' '))
    }
    console.log('')

    if (!updateMode && driftCount > 0) {
      console.error(`Detected ${driftCount} output hash drift(s) against baseline.json.`)
      if (!allowDrift) {
        process.exitCode = 1
      }
    }
  } finally {
    await server.close()
  }
}

await main()
