import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function waitCanvasReady(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }),
  )
}

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Visual canvas anchors run on desktop viewport only')
  await page.route('https://fonts.googleapis.com/**', route => route.abort())
  await page.route('https://fonts.gstatic.com/**', route => route.abort())
})

test('拼豆工坊主画布视觉锚', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))

  await page.goto('/?studio=beads')
  await expect(page.locator('.beads-stats')).toBeVisible()
  await expect(page.locator('.beads-canvas-panel')).toHaveAttribute('aria-busy', 'false')
  await waitCanvasReady(page)

  await expect(page.locator('.beads-board canvas')).toHaveScreenshot('beads-default.png', {
    maxDiffPixelRatio: 0.002,
  })
  expect(errors).toEqual([])
})

test('刺绣工坊主画布视觉锚（成品 + 第 5 针跟绣）', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))

  await page.goto('/?studio=embroidery')
  await expect(page.getByRole('button', { name: '导出图纸', exact: true })).toBeEnabled({ timeout: 15_000 })
  await expect(page.locator('.embroidery-stats')).toBeVisible()
  await waitCanvasReady(page)

  await expect(page.locator('.embroidery-stage-card canvas')).toHaveScreenshot('embroidery-default.png', {
    maxDiffPixelRatio: 0.002,
  })

  await page.getByRole('button', { name: '分步跟绣教程', exact: true }).click()
  const nextButton = page.getByRole('button', { name: '下一针', exact: true })
  for (let i = 0; i < 4; i++) {
    await nextButton.click()
  }
  await expect(page.locator('.embroidery-step-callout')).toContainText(/第 5 \/ \d+ 针/)
  await waitCanvasReady(page)

  await expect(page.locator('.embroidery-stage-card canvas')).toHaveScreenshot('embroidery-guide-step5.png', {
    maxDiffPixelRatio: 0.002,
  })
  expect(errors).toEqual([])
})

test('绕线画工坊主画布视觉锚（成品 + 第 5 步跟绕）', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))

  await page.goto('/?studio=wire-craft')
  await expect(page.getByRole('button', { name: '导出图纸', exact: true })).toBeEnabled({ timeout: 15_000 })
  await expect(page.locator('.string-stats')).toBeVisible()
  await waitCanvasReady(page)

  await expect(page.locator('.string-stage canvas')).toHaveScreenshot('wire-craft-default.png', {
    maxDiffPixelRatio: 0.002,
  })

  await page.getByRole('button', { name: '分步跟绕教程', exact: true }).click()
  const nextButton = page.getByRole('button', { name: '下一步', exact: true })
  for (let i = 0; i < 4; i++) {
    await nextButton.click()
  }
  await expect(page.locator('.string-step-callout')).toContainText(/第 5 \/ \d+ 步/)
  await waitCanvasReady(page)

  await expect(page.locator('.string-stage canvas')).toHaveScreenshot('wire-craft-guide-step5.png', {
    maxDiffPixelRatio: 0.002,
  })
  expect(errors).toEqual([])
})

test('圆规画工坊主画布视觉锚', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))

  await page.goto('/?studio=compass')
  await expect(page.getByRole('button', { name: '导出图纸', exact: true })).toBeEnabled({ timeout: 15_000 })
  await expect(page.locator('.compass-stats')).toBeVisible()
  await waitCanvasReady(page)

  await expect(page.locator('.compass-board canvas')).toHaveScreenshot('compass-default.png', {
    maxDiffPixelRatio: 0.002,
  })
  expect(errors).toEqual([])
})

test('雕刻画工坊主画布视觉锚', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))

  await page.goto('/?studio=carving')
  await expect(page.getByRole('button', { name: '导出图纸', exact: true })).toBeEnabled({ timeout: 15_000 })
  await expect(page.locator('.carving-stats')).toBeVisible()
  await waitCanvasReady(page)

  await expect(page.locator('.carving-board canvas')).toHaveScreenshot('carving-default.png', {
    maxDiffPixelRatio: 0.002,
  })
  expect(errors).toEqual([])
})
