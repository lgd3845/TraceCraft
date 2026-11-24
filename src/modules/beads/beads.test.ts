import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BeadsData } from '../../lib/types'
import { BEAD_EXAMPLES, BEADS_PALETTE, cloneBeads, countMaterials, createExample, detectImageType, gridDimensions, hexToRgb, materialsCsv, MAX_IMAGE_BYTES, nearestColor, paintCell, PALETTE_NOTICE, physicalSize, quantizePixels, resamplePattern, safeFilename, validateImageFile } from './beads'
import { canvasPngBlob, decodeLocalImage, patternCanvas, renderPreview, sampleImage, thumbnailPng } from './beadsCanvas'

const rgba = (...hexes: string[]) => new Uint8ClampedArray(hexes.flatMap(hex => [...hexToRgb(hex), 255]))
const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])

describe('proportional grid and physical size', () => {
  it('fits the longest edge without cropping or stretching', () => {
    expect(gridDimensions(1200, 800, 24)).toEqual({ columns: 24, rows: 16 })
    expect(gridDimensions(800, 1200, 48)).toEqual({ columns: 32, rows: 48 })
    expect(gridDimensions(100, 100, 64)).toEqual({ columns: 64, rows: 64 })
    expect(gridDimensions(10000, 1, 64)).toEqual({ columns: 64, rows: 1 })
    for (const edge of [16, 24, 32, 48, 64]) {
      const result = gridDimensions(101, 67, edge)
      expect(result.columns).toBe(edge)
      expect(Math.abs(result.rows - 67 * edge / 101)).toBeLessThanOrEqual(0.5)
    }
  })
  it('rejects invalid dimensions and caps memory use', () => {
    expect(() => gridDimensions(0, 50, 24)).toThrow()
    expect(() => gridDimensions(Infinity, 50, 24)).toThrow()
    expect(() => gridDimensions(50, 50, -1)).toThrow()
    expect(gridDimensions(50, 50, 999)).toEqual({ columns: 128, rows: 128 })
  })
  it('uses actual columns, rows, and bead diameter for measurements', () => {
    expect(physicalSize(32, 24, 5)).toEqual({ widthMm: 160, heightMm: 120 })
    expect(physicalSize(16, 16, 2.6)).toEqual({ widthMm: 41.6, heightMm: 41.6 })
  })
})

describe('palette matching and transparency', () => {
  it('matches every exact reference color to itself', () => {
    expect(BEADS_PALETTE).toHaveLength(28)
    expect(new Set(BEADS_PALETTE.map(color => color.code)).size).toBe(28)
    for (const color of BEADS_PALETTE) expect(nearestColor(hexToRgb(color.color))).toEqual(color)
    expect(nearestColor([199, 77, 78]).code).toBe('C12')
    expect(nearestColor([69, 95, 145]).code).toBe('C20')
  })
  it('ignores hidden RGB values and treats low alpha as a blank cell', () => {
    const data = quantizePixels(new Uint8ClampedArray([255, 0, 0, 0, 0, 255, 0, 127, 250, 249, 245, 255]), 3, 1, 8)
    expect(data.cells).toEqual(['', '', 'C01'])
    expect(countMaterials(data).map(color => color.count)).toEqual([1])
    expect(data.palette).toHaveLength(1)
  })
  it('composites semi-transparent visible pixels over white', () => {
    const data = quantizePixels(new Uint8ClampedArray([0, 0, 0, 128]), 1, 1, 8)
    expect(data.cells).toEqual([nearestColor([127, 127, 127]).code])
  })
  it('supports completely transparent images without inventing a background', () => {
    const data = quantizePixels(new Uint8ClampedArray(16 * 16 * 4), 16, 16, 8)
    expect(data.cells.every(code => code === '')).toBe(true)
    expect(data.palette).toEqual([])
    expect(countMaterials(data)).toEqual([])
  })
  it.each([8, 16, 24])('limits to %i actual colors and preserves the total bead count', limit => {
    const pixels = rgba(...BEADS_PALETTE.map(color => color.color))
    const before = [...pixels]
    const data = quantizePixels(pixels, 7, 4, limit)
    expect(data.palette).toHaveLength(limit)
    expect(new Set(data.cells).size).toBe(limit)
    expect(countMaterials(data).reduce((sum, color) => sum + color.count, 0)).toBe(28)
    expect(data.cells.every(code => data.palette.some(color => color.code === code))).toBe(true)
    expect([...pixels]).toEqual(before)
    expect(quantizePixels(pixels, 7, 4, limit)).toEqual(data)
  })
  it('does not force unused colors into a simple image', () => {
    const data = quantizePixels(rgba('#E77D70', '#E77D70'), 2, 1, 24)
    expect(data.palette).toHaveLength(1)
    expect(countMaterials(data)[0].count).toBe(2)
  })
  it('rejects malformed pixel buffers and invalid palette limits', () => {
    expect(() => quantizePixels([0, 0, 0], 1, 1, 8)).toThrow()
    expect(() => quantizePixels([0, 0, 0, 255], 1, 1, 0)).toThrow()
    expect(() => nearestColor([1, 2, 3], [])).toThrow()
  })
})

describe('original examples and self-contained saved artwork', () => {
  it.each(BEAD_EXAMPLES.map(example => example.id))('creates a local %s example with a truthful material list', kind => {
    const data = createExample(kind)
    expect(data.columns).toBe(24)
    expect(data.rows).toBe(24)
    expect(data.cells.length).toBe(data.columns * data.rows)
    expect(data.sourceName).toContain('原创示例')
    expect(data.beadSize).toBe(5)
    expect(data.cells.some(code => code === '')).toBe(true)
    const materials = countMaterials(data)
    expect(materials.length).toBeGreaterThan(0)
    expect(materials.reduce((sum, color) => sum + color.count, 0)).toBe(data.cells.filter(Boolean).length)
  })

  it('paints and erases individual cells while updating the active palette', () => {
    const start = createExample('capybara')
    const painted = paintCell(start, 0, 'C12')
    expect(painted.cells[0]).toBe('C12')
    expect(painted.palette.some(color => color.code === 'C12')).toBe(true)
    const erased = paintCell(painted, 0, '')
    expect(erased.cells[0]).toBe('')
    expect(erased.palette.some(color => color.code === 'C12')).toBe(false)
  })
  it('round-trips every cell, custom color, and measurement without a photo', () => {
    const data: BeadsData = { columns: 2, rows: 2, cells: ['CUSTOM', '', '', 'CUSTOM'], palette: [{ code: 'CUSTOM', name: '自定义颜色', color: '#123456' }], beadSize: 2.6, sourceName: '不再需要的原图.png' }
    const restored: BeadsData = JSON.parse(JSON.stringify(data))
    expect(resamplePattern(restored, 2, 8)).toEqual(data)
    const larger = resamplePattern(restored, 4, 8)
    expect(larger.columns).toBe(4)
    expect(larger.rows).toBe(4)
    expect(larger.cells.filter(Boolean)).toHaveLength(8)
    expect(larger.palette).toEqual(data.palette)
    const copy = cloneBeads(restored)
    copy.cells[0] = ''
    copy.palette[0].color = '#ffffff'
    expect(restored).toEqual(data)
  })
  it('resamples empty saved patterns safely', () => {
    const blank: BeadsData = { columns: 2, rows: 1, cells: ['', ''], palette: [], beadSize: 5, sourceName: '透明.png' }
    expect(resamplePattern(blank, 4, 8).cells).toEqual(Array(8).fill(''))
  })
})

describe('local file validation', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp'])('accepts %s up to and including 10 MB', type => {
    expect(validateImageFile({ name: 'photo', type, size: MAX_IMAGE_BYTES })).toBeNull()
  })
  it('rejects oversized, empty, and unsupported files', () => {
    expect(validateImageFile({ name: 'big.png', type: 'image/png', size: MAX_IMAGE_BYTES + 1 })).toContain('10 MB')
    expect(validateImageFile({ name: 'empty.png', type: 'image/png', size: 0 })).toContain('空文件')
    expect(validateImageFile({ name: 'renamed.png', type: 'image/gif', size: 12 })).toContain('仅支持')
    expect(validateImageFile({ name: 'unsafe.svg', type: '', size: 12 })).toContain('仅支持')
    expect(validateImageFile({ name: 'camera.JPEG', type: '', size: 12 })).toBeNull()
  })
  it('checks actual file signatures rather than extensions alone', () => {
    expect(detectImageType(pngHeader)).toBe('image/png')
    expect(detectImageType(new Uint8Array([255, 216, 255, 224]))).toBe('image/jpeg')
    expect(detectImageType(new TextEncoder().encode('RIFF1234WEBP'))).toBe('image/webp')
    expect(detectImageType(new TextEncoder().encode('GIF89a'))).toBeNull()
    expect(detectImageType(new Uint8Array())).toBeNull()
  })
})

describe('materials export', () => {
  it('includes UTF-8 BOM, actual quantities, size, and the reference-color warning', () => {
    const data = createExample('flower')
    const csv = materialsCsv(data, '小花,送给你')
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"作品名称","小花,送给你"')
    expect(csv).toContain(`"总豆数","${data.cells.filter(Boolean).length}"`)
    expect(csv).toContain('"成品宽 (mm)","120"')
    expect(csv).toContain(PALETTE_NOTICE)
    for (const color of countMaterials(data)) expect(csv).toContain(`"${color.code}","${color.name}","${color.color}","${color.count}"`)
  })
  it('quotes names correctly and blocks spreadsheet formula injection', () => {
    const data = { ...createExample('heart'), sourceName: '  =malicious.png' }
    const csv = materialsCsv(data, '=HYPERLINK("bad")')
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"')
    expect(csv).toContain('"\'  =malicious.png"')
    expect(safeFilename('../my/photo:*?')).toBe('myphoto')
    expect(safeFilename('')).toBe('TraceCraft-拼豆')
  })
})

function mockCanvas() {
  const gradient = { addColorStop: vi.fn() }
  const context = {
    createLinearGradient: vi.fn(() => gradient), beginPath: vi.fn(), arc: vi.fn(), rect: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
    fillRect: vi.fn(), strokeRect: vi.fn(), clearRect: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), fillText: vi.fn(),
    drawImage: vi.fn(), getImageData: vi.fn((_x: number, _y: number, width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) })),
  }
  const canvas = {
    width: 0, height: 0, getContext: vi.fn(() => context),
    toDataURL: vi.fn(() => 'data:image/png;base64,local'),
    toBlob: vi.fn((callback: BlobCallback) => callback(new Blob(['png'], { type: 'image/png' }))),
  }
  vi.stubGlobal('document', { createElement: vi.fn(() => canvas) })
  return { context, canvas: canvas as unknown as HTMLCanvasElement }
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('canvas output contracts', () => {
  it('renders thumbnails as transparent rings only, with no canvas background or text', () => {
    const { context, canvas } = mockCanvas()
    const data = createExample('flower')
    expect(thumbnailPng(data)).toContain('data:image/png')
    expect(context.fill).toHaveBeenCalledTimes(data.cells.filter(Boolean).length)
    expect(context.fill.mock.calls.every(args => args[0] === 'evenodd')).toBe(true)
    expect(context.fillRect).not.toHaveBeenCalled()
    expect(context.fillText).not.toHaveBeenCalled()
    expect(canvas.width).toBeLessThanOrEqual(488)
    expect(canvas.height).toBeLessThanOrEqual(488)
  })
  it('renders a chart from saved data alone with grid, axes, codes, legend, and size', async () => {
    const { context } = mockCanvas()
    const data: BeadsData = JSON.parse(JSON.stringify(createExample('heart')))
    const canvas = patternCanvas(data, '保存后仍可导出')
    const texts = context.fillText.mock.calls.map(args => args[0])
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height)
    expect(context.lineTo).toHaveBeenCalledTimes(data.columns + data.rows + 2)
    expect(texts).toContain('1')
    expect(texts).toContain('24')
    expect(texts).toContain('保存后仍可导出')
    expect(texts.some(text => String(text).includes('120 × 120 mm'))).toBe(true)
    expect(texts).toContain(PALETTE_NOTICE)
    expect(texts).toContain(data.cells.find(Boolean))
    expect((await canvasPngBlob(canvas)).type).toBe('image/png')
  })
  it('skips identical redraws and patches single painted cells incrementally', () => {
    const createCanvasMock = () => {
      const gradient = { addColorStop: vi.fn() }
      const context = {
        createLinearGradient: vi.fn(() => gradient), beginPath: vi.fn(), arc: vi.fn(), rect: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
        fillRect: vi.fn(), strokeRect: vi.fn(), clearRect: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), fillText: vi.fn(),
        drawImage: vi.fn(), getImageData: vi.fn((_x: number, _y: number, width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) })),
      }
      return {
        canvas: {
          width: 0, height: 0, getContext: vi.fn(() => context),
          toDataURL: vi.fn(() => 'data:image/png;base64,local'),
          toBlob: vi.fn((callback: BlobCallback) => callback(new Blob(['png'], { type: 'image/png' }))),
        } as unknown as HTMLCanvasElement,
        context,
      }
    }
    vi.stubGlobal('document', { createElement: vi.fn(() => createCanvasMock().canvas) })
    const { canvas: target, context } = createCanvasMock()
    const data = createExample('flower')

    renderPreview(target, data, 'beads', true)
    const initialClears = context.clearRect.mock.calls.length
    const initialDraws = context.drawImage.mock.calls.length
    expect(initialClears).toBe(1)
    expect(initialDraws).toBeGreaterThan(0)

    // Identical state is a no-op
    renderPreview(target, data, 'beads', true)
    expect(context.clearRect).toHaveBeenCalledTimes(initialClears)
    expect(context.drawImage).toHaveBeenCalledTimes(initialDraws)

    // Painting one cell clears & blits only that single cell
    const painted = paintCell(data, 0, 'C03')
    renderPreview(target, painted, 'beads', true)
    expect(context.clearRect).toHaveBeenCalledTimes(initialClears + 1)
    expect(context.drawImage).toHaveBeenCalledTimes(initialDraws + 1)
  })
  it('switches between a round-hole bead preview and a numbered pixel preview', () => {
    const { context, canvas } = mockCanvas()
    const data = createExample('flower')
    renderPreview(canvas, data, 'beads', true)
    expect(context.arc).toHaveBeenCalled()
    expect(context.fillText).not.toHaveBeenCalled()
    renderPreview(canvas, data, 'pixels', true)
    expect(context.fillText).toHaveBeenCalledWith('C03', expect.any(Number), expect.any(Number), expect.any(Number))
  })
  it('samples onto the proportional small canvas rather than allocating the full photo', () => {
    const { context, canvas } = mockCanvas()
    const image = { naturalWidth: 4000, naturalHeight: 2000 } as HTMLImageElement
    const data = sampleImage(image, 32, 8, 'landscape.png', 5)
    expect(context.drawImage).toHaveBeenCalledWith(image, 0, 0, 32, 16)
    expect(canvas.width).toBe(32)
    expect(canvas.height).toBe(16)
    expect(data.cells).toHaveLength(512)
  })
  it('reports failed PNG encoding rather than downloading an empty file', async () => {
    const { canvas } = mockCanvas()
    canvas.toBlob = callback => callback(null)
    await expect(canvasPngBlob(canvas)).rejects.toThrow('PNG 生成失败')
  })
})

describe('local decoding lifecycle', () => {
  it('refuses disguised files before allocating an object URL', async () => {
    const url = vi.spyOn(URL, 'createObjectURL')
    const file = new File(['this is not a photo'], 'fake.png', { type: 'image/png' })
    await expect(decodeLocalImage(file)).rejects.toThrow('文件内容')
    expect(url).not.toHaveBeenCalled()
  })
  it.each([true, false])('revokes the local URL after decoding, success=%s', async success => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local-photo')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.stubGlobal('Image', class {
      naturalWidth = 100
      naturalHeight = 60
      onload?: () => void
      onerror?: () => void
      set src(_value: string) { queueMicrotask(() => success ? this.onload?.() : this.onerror?.()) }
    })
    const file = new File([pngHeader], 'photo.png', { type: 'image/png' })
    if (success) await expect(decodeLocalImage(file)).resolves.toMatchObject({ naturalWidth: 100, naturalHeight: 60 })
    else await expect(decodeLocalImage(file)).rejects.toThrow('解码失败')
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:local-photo')
  })
})
