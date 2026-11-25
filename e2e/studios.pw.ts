import { expect, test } from '@playwright/test'
import type { Download, Locator, Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import type { Artwork } from '../src/lib/types'

const storageKey = 'tracecraft.artworks.v1'
const works = (page: Page): Promise<Artwork[]> => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), storageKey)

async function exportFromModal(page: Page, optionLabels: string[]) {
  await page.getByRole('button', { name: '导出图纸', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '导出图纸' })
  await expect(dialog).toBeVisible()
  const boxes = dialog.getByRole('checkbox')
  const count = await boxes.count()
  for (let i = 0; i < count; i++) {
    const box = boxes.nth(i)
    const labelText = await box.locator('..').innerText()
    const shouldCheck = optionLabels.some(target => labelText.includes(target))
    if (shouldCheck) await box.check()
    else if (await box.isChecked()) await box.uncheck()
  }
  const downloaded: Download[] = []
  const onDownload = (download: Download) => { downloaded.push(download) }
  page.on('download', onDownload)
  try {
    await dialog.getByRole('button', { name: /确认导出/ }).click()
    await expect.poll(() => downloaded.length, { timeout: 10000 }).toBe(optionLabels.length)
    await expect(dialog).toHaveCount(0)
  } finally {
    page.off('download', onDownload)
  }
  return downloaded
}

async function openNavigation(page: Page) {
  if (page.viewportSize()!.width < 700) await page.getByRole('button', { name: '打开导航', exact: true }).click()
}

async function assertFullscreenModeStable(
  fullscreen: Locator,
  targetModeLabel: string,
  options: { expectGuide?: boolean; checkBoardBounds?: boolean; checkBoardCenter?: boolean } = {},
) {
  const { expectGuide = true, checkBoardBounds = true, checkBoardCenter = true } = options
  const board = fullscreen.locator('.studio-fullscreen-board')
  const segmented = fullscreen.locator('.studio-fullscreen-tools .segmented')
  const bar = fullscreen.locator('.studio-fullscreen-bar')

  const beforeBoard = await board.boundingBox()
  const beforeSegmented = await segmented.boundingBox()
  const beforeBar = await bar.boundingBox()
  expect(beforeBoard).not.toBeNull()
  expect(beforeSegmented).not.toBeNull()
  expect(beforeBar).not.toBeNull()

  await fullscreen.getByRole('button', { name: targetModeLabel, exact: true }).click()

  if (expectGuide) {
    await expect(fullscreen.locator('.studio-fullscreen-guide')).toBeVisible()
  }

  const afterBoard = await board.boundingBox()
  const afterSegmented = await segmented.boundingBox()
  const afterBar = await bar.boundingBox()
  expect(afterBoard).not.toBeNull()
  expect(afterSegmented).not.toBeNull()
  expect(afterBar).not.toBeNull()

  expect(Math.abs(afterSegmented!.x - beforeSegmented!.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(afterSegmented!.y - beforeSegmented!.y)).toBeLessThanOrEqual(1)
  expect(Math.abs(afterSegmented!.width - beforeSegmented!.width)).toBeLessThanOrEqual(1)
  expect(Math.abs(afterSegmented!.height - beforeSegmented!.height)).toBeLessThanOrEqual(1)
  expect(Math.abs(afterBar!.height - beforeBar!.height)).toBeLessThanOrEqual(1)

  if (checkBoardBounds) {
    expect(Math.abs(afterBoard!.x - beforeBoard!.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(afterBoard!.y - beforeBoard!.y)).toBeLessThanOrEqual(1)
    expect(Math.abs(afterBoard!.width - beforeBoard!.width)).toBeLessThanOrEqual(1)
    expect(Math.abs(afterBoard!.height - beforeBoard!.height)).toBeLessThanOrEqual(1)
  }

  if (checkBoardCenter) {
    const beforeCx = beforeBoard!.x + beforeBoard!.width / 2
    const beforeCy = beforeBoard!.y + beforeBoard!.height / 2
    const afterCx = afterBoard!.x + afterBoard!.width / 2
    const afterCy = afterBoard!.y + afterBoard!.height / 2
    expect(Math.abs(afterCx - beforeCx)).toBeLessThanOrEqual(1)
    expect(Math.abs(afterCy - beforeCy)).toBeLessThanOrEqual(1)
  }

  if (expectGuide) {
    const guide = fullscreen.locator('.studio-fullscreen-guide')
    const guideBox = await guide.boundingBox()
    expect(guideBox).not.toBeNull()
    const overlapsHorizontally = guideBox!.x < afterBoard!.x + afterBoard!.width - 1 && afterBoard!.x < guideBox!.x + guideBox!.width - 1
    const overlapsVertically = guideBox!.y < afterBoard!.y + afterBoard!.height - 1 && afterBoard!.y < guideBox!.y + guideBox!.height - 1
    expect(overlapsHorizontally && overlapsVertically).toBe(false)
  }
}

async function fixtureImage(page: Page, transparent = false) {
  const data = await page.evaluate(empty => {
    const canvas = document.createElement('canvas')
    canvas.width = 80
    canvas.height = 40
    const context = canvas.getContext('2d')!
    if (!empty) {
      context.fillStyle = '#647A52'
      context.fillRect(8, 4, 32, 32)
      context.fillStyle = '#DDA33C'
      context.fillRect(40, 4, 32, 32)
    }
    return canvas.toDataURL('image/png').split(',')[1]
  }, transparent)
  return Buffer.from(data, 'base64')
}

test('真实图片本地转图、尺寸与材料一致，重载后能继续编辑导出', async ({ page }) => {
  await page.goto('/?studio=beads')
  if (page.viewportSize()!.width > 950) {
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true)
  }
  const png = await fixtureImage(page)
  await page.locator('input[type=file]').setInputFiles({ name: '小小色彩.png', mimeType: 'image/png', buffer: png })
  await page.getByRole('group', { name: '网格精度', exact: true }).getByRole('button', { name: '32', exact: true }).click()
  await expect(page.locator('.beads-stats')).toContainText('32 × 16')
  await page.getByRole('button', { name: '像素图纸', exact: true }).click()
  await expect(page.locator('.beads-stats')).toHaveCount(0)
  await expect(page.getByRole('checkbox', { name: /显示格内色号/ })).toBeChecked()
  await page.getByRole('checkbox', { name: /显示格内色号/ }).uncheck()
  await page.getByRole('button', { name: '拼豆实感', exact: true }).click()
  await expect(page.locator('.beads-stats')).toBeVisible()
  await page.getByRole('button', { name: '全屏浏览', exact: true }).click()
  const fullscreen = page.getByRole('dialog', { name: '全屏预览拼豆作品' })
  await expect(fullscreen).toBeVisible()
  await expect(fullscreen.locator('canvas')).toBeVisible()
  await assertFullscreenModeStable(fullscreen, '像素图纸', { expectGuide: false, checkBoardBounds: false, checkBoardCenter: true })
  await expect(fullscreen.getByLabel('显示格内色号')).toBeVisible()
  await assertFullscreenModeStable(fullscreen, '拼豆实感', { expectGuide: false, checkBoardBounds: false, checkBoardCenter: true })
  await fullscreen.getByRole('button', { name: '关闭全屏预览', exact: true }).click()
  await expect(fullscreen).toHaveCount(0)
  await page.getByRole('button', { name: '保存作品', exact: true }).click()
  const saveModal = page.getByRole('dialog', { name: '保存作品' })
  await expect(saveModal).toBeVisible()
  await expect(page.locator('#beads-name')).toHaveValue('小小色彩')
  await saveModal.getByRole('button', { name: '确认保存', exact: true }).click()
  await expect.poll(async () => (await works(page)).length).toBe(1)
  const saved = (await works(page))[0]
  expect(saved.kind).toBe('beads')
  if (saved.kind !== 'beads') throw new Error('Expected a beads artwork')
  expect(saved.data.columns).toBe(32)
  expect(saved.data.rows).toBe(16)
  expect(saved.data.cells).toHaveLength(512)
  expect(saved.data.cells).toContain('')
  expect(saved.data.palette.length).toBeLessThanOrEqual(8)
  expect(saved.thumbnail).toMatch(/^data:image\/png;base64,/)
  const count = saved.data.cells.filter(Boolean).length
  await expect(page.locator('.beads-material-column').getByRole('button', { name: /导出材料/ })).toHaveCount(0)
  const [pattern, csvDownload] = await exportFromModal(page, ['高清拼豆图纸', '拼豆材料清单'])
  const patternPng = await readFile((await pattern.path())!)
  expect(patternPng.subarray(1, 4).toString()).toBe('PNG')
  expect(patternPng.readUInt32BE(16)).toBeGreaterThan(900)
  const csv = await readFile((await csvDownload.path())!, 'utf8')
  expect(csv).toContain(`"总豆数","${count}"`)
  expect(csv).toContain('非品牌官方色号')

  await page.goto(`/?studio=beads&work=${saved.id}`)
  await expect(page.locator('.beads-restored')).toContainText('已还原完整图纸')
  await page.getByRole('group', { name: '网格精度', exact: true }).getByRole('button', { name: '48', exact: true }).click()
  await page.getByRole('button', { name: '更新作品', exact: true }).click()
  const updateModal = page.getByRole('dialog', { name: '更新作品名称' })
  await expect(page.locator('#beads-name')).toHaveValue('小小色彩')
  await updateModal.getByRole('button', { name: '确认保存', exact: true }).click()
  const updated = (await works(page))[0]
  expect(updated.id).toBe(saved.id)
  expect((await works(page)).length).toBe(1)
  if (updated.kind === 'beads') { expect(updated.data.columns).toBe(48); expect(updated.data.rows).toBe(24) }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (page.viewportSize()!.width > 950) {
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true)
  }
})

test('无效、超大及全透明图片有明确反馈，不覆盖原作品', async ({ page }) => {
  await page.goto('/?studio=beads')
  await expect(page.locator('canvas')).toBeVisible()
  const original = await page.locator('canvas').getAttribute('aria-label')
  await page.locator('input[type=file]').setInputFiles({ name: '错误.png', mimeType: 'image/png', buffer: Buffer.from('not an image') })
  await expect(page.getByRole('alert')).toContainText('文件内容不是有效')
  await expect(page.locator('canvas')).toHaveAttribute('aria-label', original!)
  await page.locator('input[type=file]').setInputFiles({ name: '太大.png', mimeType: 'image/png', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) })
  await expect(page.getByRole('alert')).toContainText('超过 10 MB')
  await expect(page.locator('canvas')).toHaveAttribute('aria-label', original!)
  await page.locator('input[type=file]').setInputFiles({ name: '透明.png', mimeType: 'image/png', buffer: await fixtureImage(page, true) })
  await expect(page.locator('.beads-empty-grid')).toContainText('全部透明')
  await expect(page.getByRole('button', { name: '保存作品', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: '导出图纸', exact: true })).toBeDisabled()
  expect(await works(page)).toEqual([])
})

test('浏览器存储失败不会显示保存成功', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'tracecraft.artworks.v1') throw new DOMException('Storage full', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  })
  await page.goto('/?studio=beads')
  await page.getByRole('button', { name: '保存作品', exact: true }).click()
  await page.getByRole('dialog', { name: '保存作品' }).getByRole('button', { name: '确认保存', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('保存失败')
  expect(await works(page)).toEqual([])
  await expect(page.getByRole('button', { name: '保存作品', exact: true })).toBeVisible()
})

test('拼豆支持热门像素示例与点格微调画笔', async ({ page }) => {
  await page.goto('/?studio=beads')
  const examples = page.getByRole('group', { name: '热门拼豆示例' })
  await examples.getByRole('button', { name: '卡皮巴拉', exact: true }).click()
  await expect(page.locator('.beads-canvas-panel canvas')).toHaveAttribute('aria-label', /卡皮巴拉/)
  const canvas = page.locator('.beads-canvas-panel canvas')
  const beforeLabel = (await canvas.getAttribute('aria-label'))!
  await page.getByRole('button', { name: /点格微调/ }).click()
  await page.getByRole('button', { name: '留空', exact: true }).click()
  await canvas.scrollIntoViewIfNeeded()
  const box = (await canvas.boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(canvas).not.toHaveAttribute('aria-label', beforeLabel)
  const erasedLabel = (await canvas.getAttribute('aria-label'))!
  await page.getByRole('group', { name: '点格微调画笔选色' }).locator('button').nth(3).click()
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(canvas).not.toHaveAttribute('aria-label', erasedLabel)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('绕线画工坊支持上传照片、分步跟绕教程及钉位模板 SVG/CSV/PNG 导出', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))

  await page.goto('/')
  await page.getByRole('button', { name: '打开绕线画工坊', exact: true }).click()
  await expect(page).toHaveURL(/studio=wire-craft/)
  await expect(page.getByRole('heading', { name: '绕线画工坊' })).toBeVisible()
  expect(await page.locator('.string-canvas-header .segmented button').allInnerTexts()).toEqual(['成品全览', '分步跟绕教程'])
  await expect(page.getByRole('checkbox', { name: /钉号标注/ })).toHaveCount(0)
  await expect(page.locator('.string-stats')).toBeVisible()
  await expect(page.locator('.string-player')).toHaveCount(0)

  // Switch between ring portrait contrast modes and contour multi-color mode
  await page.getByRole('group', { name: '主次对比度' }).getByRole('button', { name: '强对比', exact: true }).click()
  await page.getByRole('group', { name: '热门绕线画示例' }).getByRole('button', { name: '三花猫咪', exact: true }).click()
  await expect(page.locator('.string-stage canvas')).toHaveAttribute('aria-label', /三花猫咪/)
  await page.getByRole('group', { name: '目标钉数' }).getByRole('button', { name: '60 钉', exact: true }).click()
  await page.getByRole('group', { name: '最大步数' }).getByRole('button', { name: '300', exact: true }).click()

  await page.getByRole('button', { name: '分步跟绕教程', exact: true }).click()
  await expect(page.locator('.string-stats')).toHaveCount(0)
  await expect(page.locator('.string-workspace > .string-player')).toBeVisible()
  const callout = page.locator('.string-step-callout')
  await expect(callout).toContainText(/第 1 \/ \d+ 步/)
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(callout).toContainText(/第 2 \/ \d+ 步/)
  await page.locator('.string-canvas-panel').click({ position: { x: 10, y: 10 } })
  await page.keyboard.press('ArrowRight')
  await expect(callout).toContainText(/第 3 \/ \d+ 步/)
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(callout).toContainText(/第 2 \/ \d+ 步/)

  // Clicking 2nd color layer in right sidebar jumps step index and reveals color-change notice
  await page.locator('.string-right-column .string-layer-pills button').nth(1).click()
  await expect(callout).toContainText('本步换线')

  // Upload a custom local image in ring fixed-pin mode
  await page.getByRole('group', { name: '钉位排布方式' }).getByRole('button', { name: /外圈固定钉/ }).click()
  const buffer = await fixtureImage(page)
  await page.locator('input[aria-label="选择绕线画来源图片"]').setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer })
  await expect(page.locator('.string-stage canvas')).toHaveAttribute('aria-label', /portrait/)
  await page.getByRole('button', { name: '保存作品', exact: true }).click()
  await expect(page.locator('#string-title')).toHaveValue(/portrait/)
  await page.getByRole('button', { name: '确认保存' }).click()
  await expect(page.getByRole('button', { name: '更新作品', exact: true })).toBeVisible()
  await expect(callout).toContainText(/第 1 \/ \d+ 步/)

  await expect(page.locator('.string-right-column .panel-title')).toHaveText('针号顺序')
  await page.getByRole('button', { name: '成品全览', exact: true }).click()
  await expect(page.locator('.string-stats')).toBeVisible()
  await expect(page.locator('.string-player')).toHaveCount(0)
  await page.getByRole('button', { name: '全屏浏览', exact: true }).click()
  const fullscreen = page.getByRole('dialog', { name: '全屏预览绕线画作品' })
  await expect(fullscreen).toBeVisible()
  await assertFullscreenModeStable(fullscreen, '分步跟绕教程')
  const fullscreenGuide = fullscreen.locator('.studio-fullscreen-guide')
  await expect(fullscreenGuide).toBeVisible()
  const ghostToggle = fullscreen.getByLabel('总览底影')
  await expect(ghostToggle).toBeChecked()
  await ghostToggle.uncheck()
  await expect(ghostToggle).not.toBeChecked()
  await ghostToggle.check()
  await fullscreen.getByRole('button', { name: '全屏重置进度', exact: true }).click()
  await expect(fullscreenGuide).toContainText(/第 1 \/ \d+ 步/)
  await expect(fullscreenGuide).toContainText(/号钉 →/)
  await fullscreenGuide.getByRole('button', { name: '下一步' }).click()
  await expect(fullscreenGuide).toContainText(/第 2 \/ \d+ 步/)
  await fullscreen.getByRole('button', { name: '关闭全屏预览', exact: true }).click()
  await expect(fullscreen).toHaveCount(0)
  await page.getByRole('button', { name: /星夜流金/ }).click()

  const [svgDownload] = await exportFromModal(page, ['1:1 钉位打孔模板'])
  const svg = await readFile((await svgDownload.path())!, 'utf8')
  expect(svg).toContain('<svg')
  expect(svg).toContain('width="230mm"')
  expect(svg).toContain('50 mm 比例尺')
  expect(svg).toContain('★ 01 号起线钉')
  expect(svg).toContain('TraceCraft')

  const [csvDownload] = await exportFromModal(page, ['针号顺序表'])
  const csv = await readFile((await csvDownload.path())!, 'utf8')
  expect(csv).toContain('丝线颜色')
  expect(csv).toContain('外圈固定钉盘')
  expect(csv).toContain('起始钉号')

  const [pngDownload] = await exportFromModal(page, ['高清绕线画图纸'])
  const pngBytes = await readFile((await pngDownload.path())!)
  expect(pngBytes.subarray(1, 4).toString()).toBe('PNG')
  expect(pngBytes.readUInt32BE(16)).toBe(1400)
  expect(pngBytes.readUInt32BE(20)).toBe(1040)

  expect(errors).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (page.viewportSize()!.width > 950) {
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true)
  }
})

test('绕线画纯白目标不产生杂线，空状态禁用跟绕和导出且可恢复', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/?studio=wire-craft')
  await page.getByRole('button', { name: '分步跟绕教程', exact: true }).click()
  await expect(page.getByRole('button', { name: '自动跟绕', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '复制本段 50 步口令', exact: true })).toHaveCount(0)
  const white = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 80
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, 80, 80)
    return canvas.toDataURL().split(',')[1]
  })
  await page.locator('input[aria-label="选择绕线画来源图片"]').setInputFiles({ name: 'white.png', mimeType: 'image/png', buffer: Buffer.from(white, 'base64') })
  await expect(page.locator('.string-empty-state')).toBeVisible()
  await expect(page.getByRole('button', { name: '分步跟绕教程', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: '导出图纸', exact: true })).toBeDisabled()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.string-player')).toHaveCount(0)
  await expect(page.locator('main')).not.toContainText(/NaN|Infinity|第 1 \/ 0/)
  await page.getByRole('group', { name: '钉位排布方式' }).getByRole('button', { name: /自由轮廓布钉/ }).click()
  await expect(page.locator('.string-empty-state')).toBeVisible()
  await page.getByRole('group', { name: '热门绕线画示例' }).getByRole('button', { name: '人物肖像', exact: true }).click()
  await expect(page.locator('.string-empty-state')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '导出图纸', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: '分步跟绕教程', exact: true })).toBeEnabled()
  expect(errors).toEqual([])
})

test('绕线画画布与导出图使用优化器的同一覆盖值', async ({ page }) => {
  await page.goto('/?studio=wire-craft')
  await expect(page.getByRole('button', { name: '导出图纸', exact: true })).toBeEnabled()
  const checks = await page.evaluate(async () => {
    const algorithmPath = '/src/modules/wire-craft/stringArt.ts'
    const rendererPath = '/src/modules/wire-craft/stringArtCanvas.ts'
    const a = await import(algorithmPath)
    const r = await import(rendererPath)
    const palette = a.STRING_PALETTES[0]
    const size = a.DEFAULT_STRING_MAP_SIZE
    const layers = a.createExampleLayers('portrait', size, palette, 'mono', 'portrait')
    const plan = a.generateStringArt(layers, size, 200, 3200, 20, 'ring', palette)
    const field = a.stringArtCoverage(plan)[0] as Float32Array
    const preview = document.querySelector<HTMLCanvasElement>('.string-stage canvas')!
    const exported = r.stringArtSheetCanvas(plan, palette, '一致性测试') as HTMLCanvasElement
    const sampleBilinear = (u: number, v: number) => {
      const x0 = Math.max(0, Math.min(size - 1, Math.floor(u)))
      const y0 = Math.max(0, Math.min(size - 1, Math.floor(v)))
      const x1 = Math.max(0, Math.min(size - 1, x0 + 1))
      const y1 = Math.max(0, Math.min(size - 1, y0 + 1))
      const tx = Math.max(0, Math.min(1, u - x0))
      const ty = Math.max(0, Math.min(1, v - y0))
      const c00 = field[y0 * size + x0], c10 = field[y0 * size + x1]
      const c01 = field[y1 * size + x0], c11 = field[y1 * size + x1]
      const cov = (c00 * (1 - tx) + c10 * tx) * (1 - ty) + (c01 * (1 - tx) + c11 * tx) * ty
      return 251 + (24 - 251) * cov
    }
    const samples: { previewDiff: number; exportedDiff: number }[] = []
    for (let row = 0; row < 9; row++) {
      for (let column = 0; column < 9; column++) {
        const x = Math.round(size * (0.3 + column * 0.05)), y = Math.round(size * (0.3 + row * 0.05))
        const diffAt = (canvas: HTMLCanvasElement, cx: number, cy: number, radius: number) => {
          const scale = radius * 0.875 / (size / 2 - 4)
          const offset = (size / 2) * scale
          const px = Math.floor(cx + (x - (size - 1) / 2) * scale)
          const py = Math.floor(cy + (y - (size - 1) / 2) * scale)
          const actual = canvas.getContext('2d')!.getImageData(px, py, 1, 1).data[0]
          const u = (px + 0.5 - (cx - offset)) / scale - 0.5
          const v = (py + 0.5 - (cy - offset)) / scale - 0.5
          return Math.abs(actual - sampleBilinear(u, v))
        }
        samples.push({
          previewDiff: diffAt(preview, 360, 360, 720 * 0.455),
          exportedDiff: diffAt(exported, 430, 560, 340),
        })
      }
    }
    return samples
  })
  expect(checks.length).toBe(81)
  for (const sample of checks) {
    expect(sample.previewDiff).toBeLessThan(12)
    expect(sample.exportedDiff).toBeLessThan(12)
  }
})

test('绕线画支持取景重置、调整线浓度并取消过期计算', async ({ page }) => {
  await page.goto('/?studio=wire-craft')
  const exportButton = page.getByRole('button', { name: '导出图纸', exact: true })
  await expect(exportButton).toBeEnabled()
  await page.locator('input[aria-label="选择绕线画来源图片"]').setInputFiles({ name: 'crop-test.png', mimeType: 'image/png', buffer: await fixtureImage(page) })
  await expect(exportButton).toBeEnabled()
  const crop = page.getByRole('img', { name: '照片取景预览', exact: true })
  const initial = await crop.evaluate(element => (element as HTMLCanvasElement).toDataURL())
  await page.getByText('调整取景', { exact: true }).click()
  const zoom = page.locator('#string-framing-zoom')
  await zoom.focus()
  await zoom.press('End')
  await expect(zoom).toHaveValue('3')
  expect(await crop.evaluate(element => (element as HTMLCanvasElement).toDataURL())).not.toBe(initial)
  await zoom.press('Home')
  await expect(zoom).toHaveValue('1')
  await expect(exportButton).toBeEnabled()
  expect(await crop.evaluate(element => (element as HTMLCanvasElement).toDataURL())).toBe(initial)
  const darkness = page.locator('#string-darkness')
  await darkness.focus()
  await darkness.press('End')
  await darkness.press('Home')
  await expect(darkness).toHaveValue('0.02')
  await expect(exportButton).toBeEnabled()
  await page.getByRole('button', { name: '分步跟绕教程', exact: true }).click()
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(page.locator('.string-step-callout')).toContainText(/第 2 \/ \d+ 步/)
  await page.getByRole('button', { name: '重置取景', exact: true }).click()
  await expect(zoom).toHaveValue('1')
  await expect(page.locator('#string-framing-x')).toHaveValue('0.5')
  await expect(page.locator('#string-framing-y')).toHaveValue('0.5')
  await page.getByRole('group', { name: '热门绕线画示例' }).getByRole('button', { name: '人物肖像', exact: true }).click()
  await expect(crop).toHaveCount(0)
  await expect(exportButton).toBeEnabled()
  await expect(page.locator('.string-stage canvas')).toHaveAttribute('aria-label', /人物肖像/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('绕线画后台生成失败可重试，旧计算不会触发导出', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Worker.prototype.postMessage
    sessionStorage.setItem('test-worker-failure', '1')
    Worker.prototype.postMessage = function (message: unknown) {
      if (sessionStorage.getItem('test-worker-failure')) {
        queueMicrotask(() => this.dispatchEvent(new MessageEvent('message', { data: { error: '测试生成失败' } })))
        return
      }
      original.call(this, message)
    }
  })
  await page.goto('/?studio=wire-craft')
  await expect(page.locator('.string-generation-error')).toContainText('测试生成失败')
  await expect(page.getByRole('button', { name: '导出图纸', exact: true })).toBeDisabled()
  await page.evaluate(() => sessionStorage.removeItem('test-worker-failure'))
  await page.locator('.string-generation-error button').click()
  await expect(page.getByRole('button', { name: '导出图纸', exact: true })).toBeEnabled()
  await expect(page.locator('.string-generation-error')).toHaveCount(0)
})

test('绕线画跨同色片区明确提示重新起线并保留CSV操作', async ({ page }) => {
  await page.goto('/?studio=wire-craft')
  await page.getByRole('group', { name: '热门绕线画示例' }).getByRole('button', { name: '三花猫咪', exact: true }).click()
  await expect(page.getByRole('button', { name: '导出图纸', exact: true })).toBeEnabled()
  const [download] = await exportFromModal(page, ['针号顺序表'])
  const csv = await readFile((await download.path())!, 'utf8')
  expect(csv).toContain('起线操作')
  const row = csv.split('\r\n').find(line => line.endsWith('"剪线重新起线"'))!
  expect(row).toBeDefined()
  const step = Number(row.split(',')[0].replaceAll('"', ''))
  await page.getByRole('button', { name: '分步跟绕教程', exact: true }).click()
  const progress = page.getByRole('slider', { name: '绕线步数进度跳转' })
  await progress.focus()
  await progress.press('Home')
  for (let i = 1; i < step; i++) await progress.press('ArrowRight')
  await expect(page.locator('.string-step-callout')).toContainText('本步重新起线')
})

test('刺绣工坊支持上传图片、切换三种针法算法、分步跟绣及 DMC 模板导出', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))

  await page.goto('/')
  await page.getByRole('button', { name: '打开刺绣工坊', exact: true }).click()
  await expect(page).toHaveURL(/studio=embroidery/)
  await expect(page.getByRole('heading', { name: '刺绣工坊' })).toBeVisible()
  expect(await page.locator('.embroidery-canvas-topbar .segmented button').allInnerTexts()).toEqual(['刺绣实感', '水消笔底稿', '分步跟绣教程'])
  await expect(page.getByRole('checkbox', { name: /辅助格线/ })).toHaveCount(0)
  await expect(page.locator('.embroidery-stats')).toBeVisible()
  await expect(page.locator('.embroidery-player')).toHaveCount(0)

  const modeGroup = page.getByRole('group', { name: '刺绣针法' })
  await modeGroup.getByRole('button', { name: '十字绣', exact: true }).click()
  await expect(page.locator('.embroidery-stage-card canvas')).toHaveAttribute('aria-label', /十字绣/)
  await modeGroup.getByRole('button', { name: '戳戳绣', exact: true }).click()
  await expect(page.locator('.embroidery-stage-card canvas')).toHaveAttribute('aria-label', /戳戳绣/)
  await modeGroup.getByRole('button', { name: '长短针', exact: true }).click()

  await page.getByRole('group', { name: '热门刺绣示例' }).getByRole('button', { name: '草莓甜心', exact: true }).click()
  await expect(page.locator('.embroidery-stage-card canvas')).toHaveAttribute('aria-label', /草莓甜心/)

  await page.getByRole('button', { name: '水消笔底稿', exact: true }).click()
  await expect(page.locator('.embroidery-stats')).toHaveCount(0)
  await page.getByRole('button', { name: '分步跟绣教程', exact: true }).click()
  await expect(page.locator('.embroidery-stats')).toHaveCount(0)
  await expect(page.locator('.embroidery-stage-column > .embroidery-player')).toBeVisible()
  await expect(page.getByRole('button', { name: '自动演示', exact: true })).toHaveCount(0)
  await expect(page.locator('.embroidery-bom-panel')).toContainText('绣线色序')
  await expect(page.locator('.embroidery-bom-panel')).toContainText('分步针序')
  await expect(page.locator('.embroidery-bom-panel')).not.toContainText(/DMC 绣线色序|点击跳转|流场长短针|完整十字/)
  const callout = page.locator('.embroidery-step-callout')
  await expect(callout).toContainText(/第 1 \/ \d+ 针/)
  await page.getByRole('button', { name: '下一针', exact: true }).click()
  await expect(callout).toContainText(/第 2 \/ \d+ 针/)
  await page.getByRole('button', { name: '上一针', exact: true }).click()
  await expect(callout).toContainText(/第 1 \/ \d+ 针/)

  await page.locator('.embroidery-bom-panel .embroidery-layer-pills button').nth(1).click()
  await expect(callout).not.toContainText(/第 1 \//)
  await expect(page.locator('.embroidery-bom-panel .embroidery-layer-pills button').nth(1)).toHaveClass(/is-active/)

  const buffer = await fixtureImage(page)
  await page.locator('input[aria-label="选择刺绣来源图片"]').setInputFiles({ name: 'flower.png', mimeType: 'image/png', buffer })
  await expect(page.locator('.embroidery-stage-card canvas')).toHaveAttribute('aria-label', /flower/)
  await page.getByRole('button', { name: '保存作品', exact: true }).click()
  await expect(page.locator('#embroidery-title')).toHaveValue(/flower/)
  await page.getByRole('button', { name: '确认保存' }).click()
  await expect(page.getByRole('button', { name: '更新作品', exact: true })).toBeVisible()

  await page.getByRole('button', { name: '刺绣实感', exact: true }).click()
  await expect(page.locator('.embroidery-stats')).toBeVisible()
  await expect(page.locator('.embroidery-player')).toHaveCount(0)
  await page.getByRole('button', { name: '全屏浏览', exact: true }).click()
  const fullscreen = page.getByRole('dialog', { name: '全屏预览刺绣作品' })
  await expect(fullscreen).toBeVisible()
  await assertFullscreenModeStable(fullscreen, '分步跟绣教程')
  const fullscreenGuide = fullscreen.locator('.studio-fullscreen-guide')
  await expect(fullscreenGuide).toBeVisible()
  const ghostToggle = fullscreen.getByLabel('未绣淡影')
  await expect(ghostToggle).toBeChecked()
  await ghostToggle.uncheck()
  await ghostToggle.check()
  await fullscreen.getByRole('button', { name: '全屏回到第 1 针', exact: true }).click()
  await expect(fullscreenGuide).toContainText(/第 1 \/ \d+ 针/)
  await expect(fullscreenGuide).toContainText(/DMC/)
  await fullscreenGuide.getByRole('button', { name: '下一针' }).click()
  await expect(fullscreenGuide).toContainText(/第 2 \/ \d+ 针/)
  await fullscreen.getByRole('button', { name: '关闭全屏预览', exact: true }).click()
  await expect(fullscreen).toHaveCount(0)
  await page.getByRole('group', { name: '绣布底色' }).getByRole('button', { name: '深邃夜蓝布', exact: true }).click()

  const [svgDownload] = await exportFromModal(page, ['1:1 水消笔底稿'])
  const svg = await readFile((await svgDownload.path())!, 'utf8')
  expect(svg).toContain('<svg')
  expect(svg).toContain('width="180mm"')
  expect(svg).toContain('50 mm 比例尺')
  expect(svg).toContain('TraceCraft')

  const [csvDownload] = await exportFromModal(page, ['DMC 绣线清单'])
  const csv = await readFile((await csvDownload.path())!, 'utf8')
  expect(csv).toContain('DMC色号')
  expect(csv).toContain('建议股数')

  const [pngDownload] = await exportFromModal(page, ['高清刺绣图纸'])
  const pngBytes = await readFile((await pngDownload.path())!)
  expect(pngBytes.subarray(1, 4).toString()).toBe('PNG')
  expect(pngBytes.readUInt32BE(16)).toBe(1400)
  expect(pngBytes.readUInt32BE(20)).toBe(1040)

  expect(errors).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (page.viewportSize()!.width > 950) {
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true)
  }
})

test('圆规画工坊支持上传图片、切换三种圆规算法、分步跟画及 1:1 量角底稿导出', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))

  await page.goto('/')
  await page.getByRole('button', { name: '打开圆规画工坊', exact: true }).click()
  await expect(page).toHaveURL(/studio=compass/)
  await expect(page.getByRole('heading', { name: '圆规画工坊' })).toBeVisible()
  expect(await page.locator('.compass-canvas-header .segmented button').allInnerTexts()).toEqual(['成品全览', '分步跟画教程'])
  await expect(page.getByRole('checkbox', { name: /量角刻度与圆心/ })).toHaveCount(0)
  await expect(page.locator('.compass-stats')).toBeVisible()
  await expect(page.locator('.compass-player')).toHaveCount(0)

  const algGroup = page.getByRole('group', { name: '圆规画算法模式' })
  await algGroup.getByRole('button', { name: '一笔阿基米德螺线', exact: true }).click()
  await expect(algGroup.getByRole('button', { name: '一笔阿基米德螺线', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await algGroup.getByRole('button', { name: '三圆心叠交网格', exact: true }).click()
  await expect(algGroup.getByRole('button', { name: '三圆心叠交网格', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await algGroup.getByRole('button', { name: '同心圆分段弧', exact: true }).click()

  await page.getByRole('group', { name: '热门圆规画示例' }).getByRole('button', { name: '几何玫瑰', exact: true }).click()
  await expect(page.locator('.compass-board canvas')).toHaveAttribute('aria-label', /三心叠交玫瑰/)

  await page.getByRole('button', { name: '分步跟画教程', exact: true }).click()
  await expect(page.locator('.compass-stats')).toHaveCount(0)
  await expect(page.locator('.compass-workspace > .compass-player')).toBeVisible()
  await expect(page.getByRole('button', { name: '自动跟画', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '复制本段 30 步口令', exact: true })).toHaveCount(0)
  await expect(page.locator('.compass-seq-list')).not.toContainText('R=')
  const callout = page.locator('.compass-step-callout')
  await expect(callout).toContainText(/第 1 \/ \d+ 步/)
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(callout).toContainText(/第 2 \/ \d+ 步/)
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(callout).toContainText(/第 1 \/ \d+ 步/)

  await page.locator('.compass-right-column .compass-layer-pills button').nth(1).click()
  await expect(callout).toContainText(/圆心|半径/)

  // Upload a custom local image
  const buffer = await fixtureImage(page)
  await page.locator('input[aria-label="选择圆规画来源图片"]').setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer })
  await expect(page.locator('.compass-board canvas')).toHaveAttribute('aria-label', /portrait/)
  await page.getByRole('button', { name: '保存作品', exact: true }).click()
  await expect(page.locator('#compass-title')).toHaveValue(/portrait/)
  await page.getByRole('button', { name: '确认保存' }).click()
  await expect(page.getByRole('button', { name: '更新作品', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: '照片取景预览', exact: true })).toBeVisible()

  // Pure white image yields empty state and disables exports cleanly, then recovers
  const white = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 80
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, 80, 80)
    return canvas.toDataURL().split(',')[1]
  })
  await page.locator('input[aria-label="选择圆规画来源图片"]').setInputFiles({ name: 'white.png', mimeType: 'image/png', buffer: Buffer.from(white, 'base64') })
  await expect(page.locator('.compass-empty-state')).toBeVisible()
  await expect(page.getByRole('button', { name: '导出图纸', exact: true })).toBeDisabled()

  await page.getByRole('group', { name: '热门圆规画示例' }).getByRole('button', { name: '光影肖像', exact: true }).click()
  await expect(page.locator('.compass-empty-state')).toHaveCount(0)
  await expect(page.locator('.compass-right-column .panel-title')).toHaveText('圆环角度')
  await page.getByRole('button', { name: '成品全览', exact: true }).click()
  await expect(page.locator('.compass-stats')).toBeVisible()
  await expect(page.locator('.compass-player')).toHaveCount(0)
  await page.getByRole('button', { name: '全屏浏览', exact: true }).click()
  const fullscreen = page.getByRole('dialog', { name: '全屏预览圆规画作品' })
  await expect(fullscreen).toBeVisible()
  await assertFullscreenModeStable(fullscreen, '分步跟画教程')
  const fullscreenGuide = fullscreen.locator('.studio-fullscreen-guide')
  await expect(fullscreenGuide).toBeVisible()
  const ghostToggle = fullscreen.getByLabel('总览底影')
  await expect(ghostToggle).toBeChecked()
  await ghostToggle.uncheck()
  await ghostToggle.check()
  await fullscreen.getByRole('button', { name: '全屏重置进度', exact: true }).click()
  await expect(fullscreenGuide).toContainText(/第 1 \/ \d+ 步/)
  await expect(fullscreenGuide).toContainText(/半径/)
  await fullscreenGuide.getByRole('button', { name: '下一步' }).click()
  await expect(fullscreenGuide).toContainText(/第 2 \/ \d+ 步/)
  await fullscreen.getByRole('button', { name: '关闭全屏预览', exact: true }).click()
  await expect(fullscreen).toHaveCount(0)
  await page.getByRole('button', { name: /建筑晒图/ }).click()

  const [svgDownload] = await exportFromModal(page, ['1:1 量角定位底稿'])
  const svg = await readFile((await svgDownload.path())!, 'utf8')
  expect(svg).toContain('<svg')
  expect(svg).toContain('width="236mm"')
  expect(svg).toContain('50 mm 比例尺')
  expect(svg).toContain('★ 中心圆心 O')
  expect(svg).toContain('TraceCraft')

  const [csvDownload] = await exportFromModal(page, ['圆环角度顺序表'])
  const csv = await readFile((await csvDownload.path())!, 'utf8')
  expect(csv).toContain('所属圆心')
  expect(csv).toContain('圆规半径(mm)')

  const [pngDownload] = await exportFromModal(page, ['高清圆规画图纸'])
  const pngBytes = await readFile((await pngDownload.path())!)
  expect(pngBytes.subarray(1, 4).toString()).toBe('PNG')
  expect(pngBytes.readUInt32BE(16)).toBe(1400)
  expect(pngBytes.readUInt32BE(20)).toBe(1040)

  expect(errors).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (page.viewportSize()!.width > 950) {
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true)
  }
})

test('雕刻画工坊支持上传照片、自动连桥防掉孤岛、三种雕刻算法切换及 1:1 底稿导出', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))

  await page.goto('/')
  await page.getByRole('button', { name: '打开雕刻画工坊', exact: true }).click()
  await expect(page).toHaveURL(/studio=carving/)
  await expect(page.getByRole('heading', { name: '雕刻画工坊' })).toBeVisible()
  expect(await page.locator('.carving-canvas-header .segmented button').allInnerTexts()).toEqual(['成品实感', '线稿底稿', '分步跟刻教程'])
  await expect(page.getByRole('button', { name: '成品实感', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.carving-bridge-badge')).toHaveCount(0)
  await expect(page.getByRole('checkbox', { name: /显示防掉连接桥/ })).toHaveCount(0)
  await expect(page.locator('.carving-stats')).toBeVisible()
  await expect(page.locator('.carving-player')).toHaveCount(0)

  const algGroup = page.getByRole('group', { name: '雕刻画算法模式' })
  await algGroup.getByRole('button', { name: '阴刻版画木刻', exact: true }).click()
  await expect(algGroup.getByRole('button', { name: '阴刻版画木刻', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await algGroup.getByRole('button', { name: '多层光影纸雕', exact: true }).click()
  await expect(page.locator('.carving-right-column .carving-layer-pills button')).toHaveCount(4)
  await algGroup.getByRole('button', { name: '阳刻连桥刻纸', exact: true }).click()

  await page.getByRole('group', { name: '热门雕刻画示例' }).getByRole('button', { name: '林间鹿影', exact: true }).click()
  await expect(page.locator('.carving-board canvas')).toHaveAttribute('aria-label', /林间鹿影/)

  await page.getByRole('button', { name: '线稿底稿', exact: true }).click()
  await expect(page.locator('.carving-stats')).toHaveCount(0)
  await page.getByRole('button', { name: '分步跟刻教程', exact: true }).click()
  await expect(page.locator('.carving-stats')).toHaveCount(0)
  await expect(page.locator('.carving-workspace > .carving-player')).toBeVisible()
  await expect(page.getByRole('button', { name: '自动跟刻', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '复制本段 30 步口令', exact: true })).toHaveCount(0)
  await expect(page.locator('.carving-seq-list')).not.toContainText(/细微五官孔|精细内镂空|主体轮廓区|外围大留白/)
  const callout = page.locator('.carving-step-callout')
  await expect(callout).toContainText(/第 1 \/ \d+ 刀/)
  await expect(callout).toContainText(/起刀 \(\d+(?:\.\d+)?, \d+(?:\.\d+)?\) mm/)
  await page.getByRole('button', { name: '下一刀', exact: true }).click()
  await expect(callout).toContainText(/第 2 \/ \d+ 刀/)
  await page.getByRole('button', { name: '上一刀', exact: true }).click()
  await expect(callout).toContainText(/第 1 \/ \d+ 刀/)

  await page.locator('.carving-right-column .carving-layer-pills button').nth(1).click()
  await expect(callout).toContainText('L2')

  const buffer = await fixtureImage(page)
  await page.locator('input[aria-label="选择雕刻画来源图片"]').setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer })
  await expect(page.locator('.carving-board canvas')).toHaveAttribute('aria-label', /portrait/)
  await page.getByRole('button', { name: '保存作品', exact: true }).click()
  await expect(page.locator('#carving-title')).toHaveValue(/portrait/)
  await page.getByRole('button', { name: '确认保存' }).click()
  await expect(page.getByRole('button', { name: '更新作品', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: '照片取景预览', exact: true })).toBeVisible()

  const white = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 80
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, 80, 80)
    return canvas.toDataURL().split(',')[1]
  })
  await page.locator('input[aria-label="选择雕刻画来源图片"]').setInputFiles({ name: 'white.png', mimeType: 'image/png', buffer: Buffer.from(white, 'base64') })
  await expect(page.locator('.carving-empty-state')).toBeVisible()
  await expect(page.getByRole('button', { name: '导出图纸', exact: true })).toBeDisabled()

  await page.getByRole('group', { name: '热门雕刻画示例' }).getByRole('button', { name: '光影人像', exact: true }).click()
  await expect(page.locator('.carving-empty-state')).toHaveCount(0)
  await expect(page.locator('.carving-right-column .panel-title')).toHaveText('雕刻步骤')
  await page.getByRole('button', { name: '成品实感', exact: true }).click()
  await page.getByRole('button', { name: '全屏浏览', exact: true }).click()
  const fullscreen = page.getByRole('dialog', { name: '全屏预览雕刻画作品' })
  await expect(fullscreen).toBeVisible()
  await assertFullscreenModeStable(fullscreen, '线稿底稿', { expectGuide: false })
  await assertFullscreenModeStable(fullscreen, '分步跟刻教程')
  const fullscreenGuide = fullscreen.locator('.studio-fullscreen-guide')
  await expect(fullscreenGuide).toBeVisible()
  const ghostToggle = fullscreen.getByLabel('未刻区域底影')
  await expect(ghostToggle).toBeChecked()
  await ghostToggle.uncheck()
  await ghostToggle.check()
  await fullscreen.getByRole('button', { name: '全屏重置进度', exact: true }).click()
  await expect(fullscreenGuide).toContainText(/第 1 \/ \d+ 刀/)
  await expect(fullscreenGuide).toContainText(/起刀 \(\d+(?:\.\d+)?, \d+(?:\.\d+)?\) mm/)
  await fullscreenGuide.getByRole('button', { name: '下一刀' }).click()
  await expect(fullscreenGuide).toContainText(/第 2 \/ \d+ 刀/)
  await fullscreen.getByRole('button', { name: '关闭全屏预览', exact: true }).click()
  await expect(fullscreen).toHaveCount(0)

  const [pngDownload, svgDownload, csvDownload] = await exportFromModal(page, [
    '高清雕刻画图纸',
    '1:1 雕刻底稿模板',
    '雕刻步骤顺序表',
  ])
  const pngBytes = await readFile((await pngDownload.path())!)
  expect(pngBytes.subarray(1, 4).toString()).toBe('PNG')
  expect(pngBytes.readUInt32BE(16)).toBe(1400)
  expect(pngBytes.readUInt32BE(20)).toBe(1040)

  const svg = await readFile((await svgDownload.path())!, 'utf8')
  expect(svg).toContain('<svg')
  expect(svg).toContain('width="216mm"')
  expect(svg).toContain('50 mm 比例尺')
  expect(svg).toContain('防掉连接桥')
  expect(svg).toContain('TraceCraft')

  const csv = await readFile((await csvDownload.path())!, 'utf8')
  expect(csv).toContain('自动加固悬空孤岛数')
  expect(csv).toContain('下刀步序')

  await page.getByRole('button', { name: '更新作品', exact: true }).click()
  await page.locator('#carving-title').fill('雕刻测试作品')
  await page.getByRole('button', { name: '确认保存' }).click()
  await expect(page.locator('.carving-board canvas')).toHaveAttribute('aria-label', /雕刻测试作品/)

  await page.goto('/?studio=library', { waitUntil: 'load' })
  await page.getByRole('button', { name: '雕刻画作品', exact: true }).click()
  await expect(page.getByRole('heading', { name: '雕刻测试作品' })).toBeVisible()
  await page.getByRole('button', { name: /继续编辑/ }).first().click()
  await expect(page.getByRole('button', { name: '更新作品', exact: true })).toBeVisible()
  await expect(page.locator('.carving-board canvas')).toHaveAttribute('aria-label', /雕刻测试作品/)

  expect(errors).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (page.viewportSize()!.width > 950) {
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true)
  }
})

test('刺绣工坊支持记住跟绣进度与切换自动抠除背景并持久化', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))

  await page.goto('/?studio=embroidery')
  await expect(page.getByRole('button', { name: '导出图纸', exact: true })).toBeEnabled()

  await page.getByRole('button', { name: '分步跟绣教程', exact: true }).click()
  const callout = page.locator('.embroidery-step-callout')
  await expect(callout).toContainText(/第 1 \/ \d+ 针/)
  const nextBtn = page.getByRole('button', { name: '下一针', exact: true })
  await nextBtn.click()
  await nextBtn.click()
  await nextBtn.click()
  await expect(callout).toContainText(/第 4 \/ \d+ 针/)

  // Reload and verify step progress is restored
  await page.goto('/?studio=embroidery')
  await expect(page.getByRole('button', { name: '导出图纸', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '分步跟绣教程', exact: true }).click()
  await expect(page.locator('.embroidery-step-callout')).toContainText(/第 4 \/ \d+ 针/)

  // Toggle removeBg off, save, reload via library, and verify persistence
  const removeBgCheckbox = page.getByRole('checkbox', { name: /自动抠除四角纯色背景/ })
  await expect(removeBgCheckbox).toBeChecked()
  await removeBgCheckbox.uncheck()
  await expect(removeBgCheckbox).not.toBeChecked()
  await expect(page.getByRole('button', { name: '导出图纸', exact: true })).toBeEnabled()

  await page.getByRole('button', { name: '保存作品', exact: true }).click()
  await page.locator('#embroidery-title').fill('保留背景刺绣测试')
  await page.getByRole('button', { name: '确认保存' }).click()
  await expect(page.getByRole('button', { name: '更新作品', exact: true })).toBeVisible()

  await page.goto('/?studio=library')
  await page.getByRole('button', { name: /继续编辑/ }).first().click()
  await expect(page).toHaveURL(/studio=embroidery&work=/)
  await expect(page.getByRole('checkbox', { name: /自动抠除四角纯色背景/ })).not.toBeChecked()
  expect(errors).toEqual([])
})

test('照片作品保存后推进步数并在刷新重开后保留进度', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))

  await page.goto('/?studio=embroidery')
  const buffer = await fixtureImage(page)
  await page.locator('input[aria-label="选择刺绣来源图片"]').setInputFiles({
    name: 'progress-photo.png',
    mimeType: 'image/png',
    buffer,
  })
  await expect(page.locator('.embroidery-stage-card canvas')).toHaveAttribute('aria-label', /progress-photo/)
  await expect(page.getByRole('button', { name: '导出图纸', exact: true })).toBeEnabled()

  await page.getByRole('button', { name: '保存作品', exact: true }).click()
  await page.locator('#embroidery-title').fill('照片跟绣进度')
  await page.getByRole('button', { name: '确认保存' }).click()
  await expect(page.getByRole('button', { name: '更新作品', exact: true })).toBeVisible()

  await page.getByRole('button', { name: '分步跟绣教程', exact: true }).click()
  const nextBtn = page.getByRole('button', { name: '下一针', exact: true })
  await nextBtn.click()
  await nextBtn.click()
  await nextBtn.click()
  await expect(page.locator('.embroidery-step-callout')).toContainText(/第 4 \/ \d+ 针/)

  const savedId = await page.evaluate(() => {
    const items = JSON.parse(localStorage.getItem('tracecraft.artworks.v1') || '[]')
    return items[0]?.id as string
  })
  expect(savedId).toBeTruthy()

  await page.goto(`/?studio=embroidery&work=${savedId}`)
  await expect(page.locator('.embroidery-source-thumb')).toBeVisible()
  await expect(page.getByRole('button', { name: '导出图纸', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '分步跟绣教程', exact: true }).click()
  await expect(page.locator('.embroidery-step-callout')).toContainText(/第 4 \/ \d+ 针/)
  expect(errors).toEqual([])
})
