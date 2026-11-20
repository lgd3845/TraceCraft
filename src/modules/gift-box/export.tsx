import { renderToStaticMarkup } from 'react-dom/server'
import { svgToDataUrl } from '../../lib/export'
import type { Artwork, GiftBoxData } from '../../lib/types'
import GiftBoxScene from './GiftBoxScene'
import { canPack } from './logic'

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const finish = () => { window.clearTimeout(timer); image.onload = null; image.onerror = null }
    const timer = window.setTimeout(() => { finish(); reject(new Error('图片读取超时，请重新保存原作品后再试。')) }, 15000)
    image.onload = () => { finish(); resolve(image) }
    image.onerror = () => { finish(); reject(new Error('作品缩略图无法读取，请重新保存原作品后再试。')) }
    image.src = source
  })
}

function drawImage(image: HTMLImageElement, width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('浏览器暂不支持图片导出，请尝试其他浏览器。')
  context.drawImage(image, 0, 0, width, height)
  return canvas
}

// SVG embedded inside an SVG <image> is inconsistently rendered by browsers.
// Flatten every source thumbnail first, so the final SVG has only self-contained PNG images.
export async function flattenArtworkImages(data: GiftBoxData, artworks: Artwork[]) {
  const byId = new Map(artworks.filter(canPack).map(artwork => [artwork.id, artwork]))
  const ids = [...new Set(data.items.map(item => item.artworkId))]
  const images = await Promise.all(ids.map(async id => {
    const source = byId.get(id)?.thumbnail
    if (!source || !/^data:image\/(svg\+xml|png|jpeg|webp)[;,]/i.test(source)) {
      throw new Error('有作品的缩略图不可用，请移除或重新保存原作品。')
    }
    const image = await loadImage(source)
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('作品缩略图尺寸无效。')
    const ratio = Math.min(1, 720 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = drawImage(image, Math.max(1, Math.round(image.naturalWidth * ratio)), Math.max(1, Math.round(image.naturalHeight * ratio)))
    return [id, canvas.toDataURL('image/png')] as const
  }))
  return new Map(images)
}

export function renderGiftBoxSvg(data: GiftBoxData, artworks: Artwork[], name: string, images: Map<string, string>) {
  if (data.items.some(item => !images.get(item.artworkId)?.startsWith('data:image/png;base64,'))) {
    throw new Error('作品图片尚未转换完成，无法生成自包含预览。')
  }
  // React escapes every text/attribute value, including the user-provided name and note.
  return `<?xml version="1.0" encoding="UTF-8"?>\n${renderToStaticMarkup(<GiftBoxScene data={data} artworks={artworks} name={name} images={images} />)}`
}

export async function prepareGiftBoxSvg(data: GiftBoxData, artworks: Artwork[], name: string) {
  return renderGiftBoxSvg(data, artworks, name, await flattenArtworkImages(data, artworks))
}

export async function createThumbnail(svg: string) {
  const image = await loadImage(svgToDataUrl(svg))
  return drawImage(image, 680, 580).toDataURL('image/png')
}

export async function createPreviewPng(svg: string): Promise<Blob> {
  const image = await loadImage(svgToDataUrl(svg))
  return new Promise((resolve, reject) => {
    drawImage(image, 1360, 1160).toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('PNG 生成失败，请尝试导出 SVG。'))
    }, 'image/png')
  })
}
