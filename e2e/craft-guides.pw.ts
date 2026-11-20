import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const guides = [
  { route: 'paper-cutting', title: '剪纸小课堂' },
  { route: 'origami', title: '折纸小课堂' },
  { route: 'chinese-knots', title: '中国结与编绳' },
]

for (const guide of guides) {
  for (const projectIndex of [0, 1]) {
    test(`${guide.title}教程${projectIndex + 1}：步骤、配色、进度与完整图解下载`, async ({ page }, testInfo) => {
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(`/?studio=${guide.route}`)
      await expect(page.locator('.craft-guide')).toBeVisible()
      await expect(page.locator('.craft-project-card')).toHaveCount(2)
      await page.locator('.craft-project-card').nth(projectIndex).click()
      const name = (await page.locator('.craft-lesson-heading h2').textContent())!
      const steps = page.locator('.craft-step-nav button')
      const count = await steps.count()
      expect(count).toBeGreaterThanOrEqual(5)
      await expect(steps.first()).toHaveAttribute('aria-current', 'step')
      await expect(page.getByRole('button', { name: '上一步', exact: true })).toBeDisabled()
      await expect(page.getByRole('progressbar')).toHaveAttribute('value', '0')

      const firstTitle = await page.locator('.craft-step-detail h3').textContent()
      await page.getByRole('button', { name: '放大图解', exact: true }).click()
      await expect(page.getByRole('dialog', { name: '放大步骤图' })).toBeVisible()
      await expect(page.locator('.craft-zoom-dialog h2')).toContainText(firstTitle!)
      if (page.viewportSize()!.width < 700) {
        expect(await page.locator('.craft-zoom-content').evaluate(element => element.scrollWidth > element.clientWidth && element.scrollLeft > 0)).toBe(true)
      }
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog', { name: '放大步骤图' })).not.toBeVisible()
      await page.getByRole('button', { name: '下一步', exact: true }).click()
      await expect(page.locator('.craft-step-detail h3')).not.toHaveText(firstTitle!)
      await expect(page.getByRole('progressbar')).toHaveAttribute('value', '0')
      await page.getByRole('button', { name: '上一步', exact: true }).click()
      await page.getByRole('checkbox', { name: '显示辅助线' }).uncheck()
      await expect(page.getByRole('checkbox', { name: '显示辅助线' })).not.toBeChecked()
      await page.getByRole('checkbox', { name: '显示辅助线' }).check()
      await steps.nth(1).click()
      const beforeColor = await page.locator('.craft-diagram').innerHTML()
      await page.locator('.craft-color-options button').nth(1).click()
      await expect(page.locator('.craft-color-options button').nth(1)).toHaveAttribute('aria-pressed', 'true')
      expect(await page.locator('.craft-diagram').innerHTML()).not.toBe(beforeColor)
      await steps.first().click()

      await page.getByRole('button', { name: '标记本步完成', exact: true }).click()
      await expect(page.getByRole('progressbar')).toHaveAttribute('value', '1')
      await page.locator('.craft-project-card').nth(projectIndex).click()
      await expect(page.getByRole('progressbar')).toHaveAttribute('value', '1')
      await page.getByRole('button', { name: '本步已完成', exact: true }).click()
      await expect(page.getByRole('progressbar')).toHaveAttribute('value', '0')
      const titles: string[] = []
      const diagrams = new Set<string>()
      for (let index = 0; index < count; index++) {
        await steps.nth(index).click()
        await expect(steps.nth(index)).toHaveAttribute('aria-current', 'step')
        titles.push((await page.locator('.craft-step-detail h3').textContent())!)
        await expect(page.locator('.craft-checkpoint')).toContainText('完成检查')
        const diagram = await page.locator('.craft-diagram').innerHTML()
        expect(diagram).not.toMatch(/NaN|undefined/)
        diagrams.add(diagram)
        await page.getByRole('button', { name: '标记本步完成', exact: true }).click()
      }
      expect(diagrams.size).toBe(count)
      await expect(page.getByRole('progressbar')).toHaveAttribute('value', String(count))
      await expect(page.locator('.craft-finished')).toContainText('这份小手作，完成了')
      await expect(page.getByRole('button', { name: '下一步', exact: true })).toBeDisabled()
      await page.locator('.craft-diagram').screenshot({ path: testInfo.outputPath('completed-diagram.png') })

      const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '下载完整图解', exact: true }).click()])
      expect(download.suggestedFilename()).toBe(`${name}-GiftCraft完整图解.svg`)
      const svg = await readFile((await download.path())!, 'utf8')
      for (const title of titles) expect(svg).toContain(title)
      expect(svg).toContain('安全提示')
      expect(svg).toContain('技法参考')
      expect(svg).not.toMatch(/undefined|NaN|foreignObject/)
      const parsed = await page.evaluate(content => {
        const document = new DOMParser().parseFromString(content, 'image/svg+xml')
        return {
          error: document.querySelector('parsererror')?.textContent,
          sources: Array.from(document.querySelectorAll('a')).map(link => link.getAttribute('href')),
          images: document.querySelectorAll('image').length,
          width: document.documentElement.getAttribute('width'),
          diagrams: document.querySelectorAll('svg').length,
        }
      }, svg)
      expect(parsed.error).toBeUndefined()
      expect(parsed.width).toBe('1120')
      expect(parsed.diagrams).toBe(count + 1)
      expect(parsed.images).toBe(0)
      const sources = page.locator('.craft-sources a')
      expect(await sources.count()).toBeGreaterThan(0)
      for (const link of await sources.all()) {
        const url = await link.getAttribute('href')
        expect(url).toMatch(/^https?:\/\//)
        expect(parsed.sources).toContain(url)
        await expect(link).toHaveAttribute('rel', /noopener/)
      }
      await download.saveAs(testInfo.outputPath('complete-guide.svg'))
      await page.getByRole('button', { name: '重学本教程', exact: true }).click()
      await expect(page.getByRole('progressbar')).toHaveAttribute('value', '0')
      await expect(steps.first()).toHaveAttribute('aria-current', 'step')
      await expect(page.locator('.craft-finished')).toHaveCount(0)
      await page.getByRole('button', { name: '标记本步完成', exact: true }).click()
      await page.locator('.craft-project-card').nth(1 - projectIndex).click()
      await expect(page.getByRole('progressbar')).toHaveAttribute('value', '0')
      await expect(page.locator('.craft-step-nav button').first()).toHaveAttribute('aria-current', 'step')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      expect(await page.evaluate(() => localStorage.getItem('giftcraft.artworks.v1'))).toBeNull()
      expect(errors).toEqual([])
    })
  }
}

test('首页和侧栏均可进入新教程，刷新与返回正常', async ({ page }) => {
  for (const guide of guides) {
    await page.goto('/')
    await page.getByRole('button', { name: `打开${guide.title}`, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`studio=${guide.route}`))
    await expect(page.locator('.craft-guide')).toBeVisible()
    await page.reload()
    await expect(page.locator('.craft-project-card')).toHaveCount(2)
    if (page.viewportSize()!.width < 700) await page.getByRole('button', { name: '打开导航', exact: true }).click()
    const navigation = page.getByRole('navigation', { name: '工坊导航' })
    await expect(navigation.getByRole('button', { name: guide.title, exact: true })).toHaveAttribute('aria-current', 'page')
    await navigation.getByRole('button', { name: '创作灵感', exact: true }).click()
    await expect(page.locator('.traditional-grid')).toBeVisible()
    await page.goBack()
    await expect(page.locator('.craft-guide')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})
