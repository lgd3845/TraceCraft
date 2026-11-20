import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import type { Artwork } from '../src/lib/types'

const storageKey = 'giftcraft.artworks.v1'
const works = (page: Page): Promise<Artwork[]> => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), storageKey)

async function openNavigation(page: Page) {
  if (page.viewportSize()!.width < 700) await page.getByRole('button', { name: '打开导航', exact: true }).click()
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

test('串饰支持增删排序、导出、覆盖保存和同路由新建', async ({ page }) => {
  await page.goto('/?studio=bracelet')
  await expect(page.getByRole('heading', { name: '串饰工坊.' })).toBeVisible()
  await page.getByRole('button', { name: '添加森林石，10毫米', exact: true }).click()
  await expect(page.locator('.bracelet-stats')).toContainText('27')
  await page.getByRole('button', { name: '选中珠子前移一位' }).click()
  await page.getByRole('button', { name: '移除选中珠子' }).click()
  await expect(page.locator('.bracelet-stats')).toContainText('26')
  await page.locator('#bracelet-name').fill('第一份手链')
  await page.locator('#bracelet-wrist').focus()
  await page.locator('#bracelet-wrist').press('ArrowRight')
  await page.getByRole('button', { name: '保存作品', exact: true }).click()
  await expect.poll(async () => (await works(page)).length).toBe(1)
  const first = (await works(page))[0]
  expect(first.kind).toBe('bracelet')
  if (first.kind === 'bracelet') expect(first.data.wristSize).toBe(17.5)
  await page.locator('#bracelet-name').fill('更新后的手链')
  await page.getByRole('button', { name: '保存修改', exact: true }).click()
  expect((await works(page))[0].id).toBe(first.id)
  expect((await works(page)).length).toBe(1)

  const [csvDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '导出材料清单', exact: true }).click()])
  const csv = await readFile((await csvDownload.path())!, 'utf8')
  expect(csv).toContain('更新后的手链')
  expect(csv).toContain('珠子总数')
  expect(csvDownload.suggestedFilename()).toMatch(/\.csv$/)
  await page.locator('.bracelet-export-menu > summary').click()
  const [svgDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /预览 SVG/ }).click()])
  const svg = await readFile((await svgDownload.path())!, 'utf8')
  expect(svg).toContain('<svg')
  expect(svg).toContain('更新后的手链')

  await openNavigation(page)
  await page.getByRole('button', { name: '开始一份新心意', exact: true }).click()
  await expect(page.locator('#bracelet-name')).toHaveValue('植野漫步')
  await expect(page.getByRole('button', { name: '保存作品', exact: true })).toBeVisible()
  await page.locator('#bracelet-name').fill('第二份手链')
  await page.getByRole('button', { name: '保存作品', exact: true }).click()
  expect((await works(page)).length).toBe(2)
  await page.getByRole('button', { name: '清空', exact: true }).click()
  await page.getByRole('button', { name: '确认清空', exact: true }).click()
  await page.getByRole('button', { name: '保存修改', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('串饰还是空的')
  expect((await works(page)).length).toBe(2)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('真实图片本地转图、尺寸与材料一致，重载后能继续编辑导出', async ({ page }) => {
  await page.goto('/?studio=beads')
  const png = await fixtureImage(page)
  await page.locator('input[type=file]').setInputFiles({ name: '小小色彩.png', mimeType: 'image/png', buffer: png })
  await expect(page.locator('#beads-name')).toHaveValue('小小色彩')
  await page.getByRole('group', { name: '网格精度 最长边格数' }).getByRole('button', { name: '32', exact: true }).click()
  await expect(page.locator('.beads-field-hint').first()).toContainText('32 × 16')
  await page.getByRole('button', { name: '像素图纸', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: /显示格内色号/ })).toBeChecked()
  await page.getByRole('checkbox', { name: /显示格内色号/ }).uncheck()
  await page.getByRole('button', { name: '拼豆实感', exact: true }).click()
  await page.getByRole('button', { name: '保存作品', exact: true }).click()
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
  const [csvDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '导出材料 CSV', exact: true }).click()])
  const csv = await readFile((await csvDownload.path())!, 'utf8')
  expect(csv).toContain(`"总豆数","${count}"`)
  expect(csv).toContain('非品牌官方色号')
  const [pattern] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '导出图纸', exact: true }).click()])
  const patternPng = await readFile((await pattern.path())!)
  expect(patternPng.subarray(1, 4).toString()).toBe('PNG')
  expect(patternPng.readUInt32BE(16)).toBeGreaterThan(900)

  await page.goto(`/?studio=beads&work=${saved.id}`)
  await expect(page.locator('.beads-restored')).toContainText('已还原完整图纸')
  await page.getByRole('group', { name: '网格精度 最长边格数' }).getByRole('button', { name: '48', exact: true }).click()
  await page.getByRole('button', { name: '更新作品', exact: true }).click()
  const updated = (await works(page))[0]
  expect(updated.id).toBe(saved.id)
  expect((await works(page)).length).toBe(1)
  if (updated.kind === 'beads') { expect(updated.data.columns).toBe(48); expect(updated.data.rows).toBe(24) }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
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

test('完整送礼流程：两类作品入盒、摆放、保存重载和图像导出', async ({ page, isMobile }, testInfo) => {
  test.setTimeout(60000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/?studio=beads')
  await page.getByRole('button', { name: '爱心示例', exact: true }).click()
  await page.locator('#beads-name').fill('一颗拼豆心')
  await page.getByRole('button', { name: '保存作品', exact: true }).click()
  await openNavigation(page)
  await page.getByRole('button', { name: '串饰工坊', exact: true }).click()
  await page.locator('#bracelet-name').fill('一串小美好')
  await page.getByRole('button', { name: '放入礼盒', exact: true }).click()
  await expect(page.getByRole('heading', { name: '礼盒摆盘.' })).toBeVisible()
  await expect(page.locator('.giftbox-placed-item')).toHaveCount(1)
  await page.getByRole('button', { name: '将一颗拼豆心加入礼盒', exact: true }).click()
  await expect(page.locator('.giftbox-placed-item')).toHaveCount(2)
  await page.getByRole('button', { name: '方形', exact: true }).click()
  await page.getByRole('button', { name: '盒身颜色：奶油白', exact: true }).click()
  await page.getByRole('button', { name: '点睛丝带：苔绿缎带', exact: true }).click()
  await page.locator('#giftbox-name').fill('生日的专属心意')
  await page.locator('#giftbox-note').fill('生日快乐 <3 & 祝你天天开心')
  const placed = page.locator('.giftbox-placed-item').last()
  await placed.focus()
  const beforeKey = await placed.getAttribute('transform')
  await placed.press('ArrowRight')
  await expect(placed).not.toHaveAttribute('transform', beforeKey!)
  const before = await placed.getAttribute('transform')
  await placed.scrollIntoViewIfNeeded()
  const bounds = (await placed.boundingBox())!
  const x = bounds.x + bounds.width / 2
  const y = bounds.y + bounds.height / 2
  if (isMobile) {
    const session = await page.context().newCDPSession(page)
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let step = 1; step <= 6; step++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + step * 5, y: y + step * 3 }] })
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await session.detach()
  } else {
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 30, y + 20, { steps: 6 })
    await page.mouse.up()
  }
  await expect(placed).not.toHaveAttribute('transform', before!)
  await page.getByRole('slider', { name: /旋转角度/ }).focus()
  await page.getByRole('slider', { name: /旋转角度/ }).press('ArrowRight')
  await page.getByRole('button', { name: '保存礼盒', exact: true }).click()
  await expect(page.locator('.giftbox-save-state')).toContainText('已保存到本机')
  expect((await works(page)).length).toBe(3)
  const box = (await works(page)).find(work => work.kind === 'gift-box')!
  if (box.kind !== 'gift-box') throw new Error('Expected a gift box')
  expect(box.data.items).toHaveLength(2)
  expect(box.data.shape).toBe('square')
  expect(box.thumbnail).toMatch(/^data:image\/png/)

  const [preview] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '导出预览', exact: true }).click()])
  const output = await readFile((await preview.path())!)
  expect(output.subarray(1, 4).toString()).toBe('PNG')
  expect(output.readUInt32BE(16)).toBe(1360)
  expect(output.readUInt32BE(20)).toBe(1160)
  await preview.saveAs(testInfo.outputPath('gift-box-preview.png'))
  await page.getByRole('combobox', { name: '预览导出格式' }).selectOption('svg')
  const [vector] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '导出预览', exact: true }).click()])
  const svg = await readFile((await vector.path())!, 'utf8')
  expect(svg).toContain('data:image/png;base64,')
  expect(svg).toContain('&lt;3 &amp;')
  expect(svg).not.toContain('data:image/svg+xml')
  const [materials] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '下载材料清单', exact: true }).click()])
  const list = await readFile((await materials.path())!, 'utf8')
  expect(list).toContain('一颗拼豆心')
  expect(list).toContain('一串小美好')
  expect(list).toContain('C12')
  await page.goto(`/?studio=gift-box&work=${box.id}`)
  await expect(page.locator('.giftbox-placed-item')).toHaveCount(2)
  await expect(page.locator('#giftbox-note')).toHaveValue(box.data.note)
  await page.getByRole('button', { name: '保存修改', exact: true }).click()
  await expect(page.locator('.giftbox-save-state')).toContainText('已保存到本机')
  expect((await works(page)).length).toBe(3)
  await page.getByRole('button', { name: '移除一颗拼豆心', exact: true }).click()
  await page.getByRole('button', { name: '保存修改', exact: true }).click()
  await expect(page.locator('.giftbox-save-state')).toContainText('已保存到本机')
  const edited = (await works(page)).find(work => work.id === box.id)!
  if (edited.kind === 'gift-box') expect(edited.data.items).toHaveLength(1)
  expect(errors).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('空礼盒和浏览器存储失败不会显示保存成功', async ({ page }) => {
  await page.goto('/?studio=gift-box')
  await page.getByRole('button', { name: '保存礼盒', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('先从作品库加入')
  expect(await works(page)).toEqual([])
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'giftcraft.artworks.v1') throw new DOMException('Storage full', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  })
  await page.goto('/?studio=bracelet')
  await page.getByRole('button', { name: '保存作品', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('保存失败')
  expect(await works(page)).toEqual([])
  await expect(page.getByRole('button', { name: '保存作品', exact: true })).toBeVisible()
})
