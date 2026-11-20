import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { ArrowDown, ArrowUp, Check, CircleUserRound, Download, Gift, Grid2X2, Heart, Layers3, Leaf, LoaderCircle, MousePointer2, Plus, RotateCcw, Ruler, Save, Trash2 } from 'lucide-react'
import { useStudio } from '../../lib/studio'
import { downloadFile } from '../../lib/export'
import type { Artwork, GiftBoxData, GiftBoxItem } from '../../lib/types'
import GiftBoxScene from './GiftBoxScene'
import { createPreviewPng, createThumbnail, prepareGiftBoxSvg } from './export'
import { BOX_COLORS, canPack, changeShape, constrainItem, createInitialBox, FILLER_COLORS, formatMaterials, getBoxGeometry, getScaleLimit, MAX_ITEMS, MAX_NOTE_LENGTH, MIN_SCALE, moveLayer, RIBBON_COLORS, safeFilename, summarizeMaterials, updateItem } from './logic'
import './gift-box.css'

interface DragState {
  id: string
  pointerId: number
  svg: SVGSVGElement
  startX: number
  startY: number
  itemX: number
  itemY: number
}

function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const matrix = svg.getScreenCTM()
  if (!matrix) return null
  return new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse())
}

function ColorChoices({ label, colors, value, onChange }: { label: string; colors: { name: string; value: string }[]; value: string; onChange: (value: string) => void }) {
  return <div className="field giftbox-color-field">
    <div className="field-label"><span>{label}</span><span className="giftbox-color-name">{colors.find(color => color.value === value)?.name ?? '自定义配色'}</span></div>
    <div className="swatches" role="group" aria-label={label}>
      {colors.map(color => <button key={color.value} type="button" className={`swatch giftbox-swatch${value === color.value ? ' active' : ''}`} style={{ backgroundColor: color.value }} onClick={() => onChange(color.value)} aria-label={`${label}：${color.name}`} aria-pressed={value === color.value} title={color.name}>{value === color.value && <Check size={12} strokeWidth={2} />}</button>)}
    </div>
  </div>
}

export default function GiftBoxStudio() {
  const { artworks, editingArtwork, saveArtwork, navigate, notify } = useStudio()
  const [data, setData] = useState<GiftBoxData>(() => createInitialBox(editingArtwork))
  const [name, setName] = useState(editingArtwork?.kind === 'gift-box' ? editingArtwork.name : '把心意装进日常')
  const [selectedId, setSelectedId] = useState<string | null>(data.items[0]?.id ?? null)
  const [busy, setBusy] = useState<'save' | 'export' | null>(null)
  const [format, setFormat] = useState<'png' | 'svg'>('png')
  const [dirty, setDirty] = useState(editingArtwork?.kind !== 'gift-box')
  const [hasSaved, setHasSaved] = useState(editingArtwork?.kind === 'gift-box')
  const [dragging, setDragging] = useState(false)
  const savedId = useRef(editingArtwork?.kind === 'gift-box' ? editingArtwork.id : undefined)
  const operation = useRef(false)
  const drag = useRef<DragState | null>(null)
  const library = useMemo(() => artworks.filter(canPack), [artworks])
  const contentKey = data.items.map(item => item.artworkId).sort().join('|')
  // Position/rotation changes don't alter supplies; avoid recounting large bead grids while dragging.
  const summary = useMemo(() => summarizeMaterials(data, library), [contentKey, data.shape, data.color, data.fillerColor, data.ribbonColor, library])
  const selected = data.items.find(item => item.id === selectedId)
  const selectedArtwork = library.find(artwork => artwork.id === selected?.artworkId)
  const selectedIndex = data.items.findIndex(item => item.id === selectedId)

  function editData(update: (previous: GiftBoxData) => GiftBoxData) {
    setData(update)
    setDirty(true)
  }

  function addArtwork(artwork: Artwork) {
    if (!canPack(artwork)) return
    if (data.items.length >= MAX_ITEMS) { notify(`一盒最多放入 ${MAX_ITEMS} 件作品，留一点呼吸感吧。`); return }
    const item = constrainItem({ id: crypto.randomUUID(), artworkId: artwork.id, x: 35 + data.items.length % 3 * 15, y: 37 + data.items.length % 2 * 20, rotation: -8 + data.items.length % 3 * 8, scale: 1 }, data.shape)
    editData(previous => ({ ...previous, items: [...previous.items, item] }))
    setSelectedId(item.id)
    notify(`「${artwork.name}」已放入礼盒，可以拖拽调整。`)
  }

  function removeItem(id: string) {
    editData(previous => ({ ...previous, items: previous.items.filter(item => item.id !== id) }))
    if (selectedId === id) setSelectedId(null)
  }

  function adjustItem(id: string, patch: Partial<Pick<GiftBoxItem, 'x' | 'y' | 'scale' | 'rotation'>>) {
    editData(previous => updateItem(previous, id, patch))
  }

  function startDrag(event: PointerEvent<SVGGElement>, item: GiftBoxItem) {
    if (!event.isPrimary || event.button !== 0 || busy) return
    const svg = event.currentTarget.ownerSVGElement
    if (!svg) return
    const point = svgPoint(svg, event.clientX, event.clientY)
    if (!point) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.focus()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { id: item.id, pointerId: event.pointerId, svg, startX: point.x, startY: point.y, itemX: item.x, itemY: item.y }
    setSelectedId(item.id)
    setDragging(true)
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const active = drag.current
    if (!active || event.pointerId !== active.pointerId || busy) return
    const point = svgPoint(active.svg, event.clientX, event.clientY)
    if (!point) return
    const { width, height } = getBoxGeometry(data.shape)
    adjustItem(active.id, { x: active.itemX + (point.x - active.startX) / width * 100, y: active.itemY + (point.y - active.startY) / height * 100 })
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return
    drag.current = null
    setDragging(false)
  }

  function handleItemKey(event: KeyboardEvent<SVGGElement>, item: GiftBoxItem) {
    const step = event.shiftKey ? 5 : 1
    const moves: Record<string, { x?: number; y?: number }> = {
      ArrowLeft: { x: item.x - step }, ArrowRight: { x: item.x + step },
      ArrowUp: { y: item.y - step }, ArrowDown: { y: item.y + step },
    }
    if (moves[event.key]) { event.preventDefault(); adjustItem(item.id, moves[event.key]) }
    else if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); removeItem(item.id) }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(item.id) }
    else if (event.key === 'Escape') { setSelectedId(null); event.currentTarget.blur() }
  }

  function checkReady() {
    if (!data.items.length) { notify('先从作品库加入一份手作，再保存或导出礼盒吧。'); return false }
    if (summary.missing) { notify('有作品来源不可用，请从盒内作品列表移除，再重新加入。'); return false }
    if (!name.trim()) { notify('先给这份礼盒起个名字吧。'); return false }
    return true
  }

  async function save() {
    if (operation.current || !checkReady()) return
    operation.current = true
    setBusy('save')
    try {
      const svg = await prepareGiftBoxSvg(data, library, name)
      const thumbnail = await createThumbnail(svg)
      const saved = saveArtwork({ kind: 'gift-box', name: name.trim(), thumbnail, data }, savedId.current)
      if (saved) { savedId.current = saved.id; setHasSaved(true); setDirty(false) }
    } catch (error) {
      notify(error instanceof Error ? `保存失败：${error.message}` : '保存失败，请稍后重试。')
    } finally { operation.current = false; setBusy(null) }
  }

  async function exportPreview() {
    if (operation.current || !checkReady()) return
    operation.current = true
    setBusy('export')
    try {
      const svg = await prepareGiftBoxSvg(data, library, name)
      const filename = `${safeFilename(name)}-礼盒预览`
      if (format === 'svg') downloadFile(svg, `${filename}.svg`, 'image/svg+xml;charset=utf-8')
      else downloadFile(await createPreviewPng(svg), `${filename}.png`, 'image/png')
      notify('礼盒预览已生成。包装与内容材料清单可单独下载。')
    } catch (error) {
      notify(error instanceof Error ? `导出失败：${error.message}` : '导出失败，请稍后重试。')
    } finally { operation.current = false; setBusy(null) }
  }

  function exportMaterials() {
    if (!checkReady()) return
    downloadFile(formatMaterials(name, data, summary), `${safeFilename(name)}-材料清单.txt`)
    notify('包装与内容制作材料清单已生成，请按实物尺寸核对。')
  }

  return <div className="giftbox-studio">
    <header className="studio-heading giftbox-heading">
      <div><div className="eyebrow"><Gift size={12} /> THE FINISHING TOUCH</div><h1>礼盒摆盘<span className="giftbox-heading-dot">.</span></h1><p>把亲手做的小美好，装成一份刚刚好的心意。</p></div>
      <div className="giftbox-heading-right">
        <div className="giftbox-save-state" aria-live="polite">{busy ? '正在整理这份心意，请稍候…' : hasSaved && !dirty ? '已保存到本机 · 可继续编辑' : '本地创作 · 尚有未保存的心意'}</div>
        <div className="heading-actions giftbox-actions">
          <div className="giftbox-export-group"><select aria-label="预览导出格式" value={format} onChange={event => setFormat(event.target.value as 'png' | 'svg')} disabled={Boolean(busy)}><option value="png">PNG</option><option value="svg">SVG</option></select><button className="btn btn-secondary" onClick={exportPreview} disabled={Boolean(busy)}>{busy === 'export' ? <LoaderCircle size={15} className="giftbox-loading" /> : <Download size={15} />}导出预览</button></div>
          <button className="btn btn-primary" onClick={save} disabled={Boolean(busy)}>{busy === 'save' ? <LoaderCircle size={15} className="giftbox-loading" /> : <Save size={15} />}{busy === 'save' ? '正在保存' : hasSaved ? '保存修改' : '保存礼盒'}</button>
        </div>
      </div>
    </header>

    <fieldset className="giftbox-workspace" disabled={Boolean(busy)} aria-busy={Boolean(busy)}>
      <legend className="giftbox-sr-only">礼盒设计工作台</legend>
      <aside className="giftbox-library-column">
        <section className="panel giftbox-library-panel">
          <h2 className="panel-title"><Layers3 size={15} />手作作品库<small>{library.length} 份</small></h2>
          <p className="giftbox-section-intro">挑一份手作，点击放入礼盒。</p>
          {library.length ? <div className="giftbox-library-list">{library.map(artwork => {
            const count = data.items.filter(item => item.artworkId === artwork.id).length
            return <button key={artwork.id} className="giftbox-library-item" onClick={() => addArtwork(artwork)} aria-label={`将${artwork.name}加入礼盒`}>
              <span className={`giftbox-library-image giftbox-library-image-${artwork.kind}`}><img src={artwork.thumbnail} alt="" />{count > 0 && <span className="giftbox-added-count">{count}</span>}</span>
              <span className="giftbox-library-copy"><strong>{artwork.name}</strong><small>{artwork.kind === 'bracelet' ? '串饰作品' : '拼豆作品'}</small></span><Plus size={15} />
            </button>
          })}</div> : <div className="giftbox-library-empty">
            <div className="giftbox-empty-illustration" aria-hidden="true"><span className="giftbox-empty-orbit" /><Heart size={26} strokeWidth={1.2} /><Leaf className="giftbox-empty-leaf" size={26} strokeWidth={1.2} /></div>
            <h3>好礼物，从一份手作开始</h3><p>这里还没有已保存的作品。<br />先创作，再把心意带回来。</p>
            <button className="btn btn-dark" onClick={() => navigate('bracelet')}><CircleUserRound size={14} />去做一份串饰</button>
            <button className="btn btn-secondary" onClick={() => navigate('beads')}><Grid2X2 size={14} />去做一幅拼豆</button>
          </div>}
          {library.length > 0 && <div className="giftbox-create-links"><span>再做一份新的？</span><button onClick={() => navigate('bracelet')}>串饰 <Plus size={11} /></button><button onClick={() => navigate('beads')}>拼豆 <Plus size={11} /></button></div>}
          <div className="giftbox-library-note"><Leaf size={12} /><span>只展示你的真实手作，不支持礼盒套娃。</span></div>
        </section>
        {data.items.length > 0 && <section className="panel giftbox-layers-panel">
          <h2 className="panel-title">盒内作品<small>{data.items.length} / {MAX_ITEMS}</small></h2>
          <p className="giftbox-section-intro">列表上方的作品显示在最前层。</p>
          <div className="giftbox-layers">{[...data.items].reverse().map(item => {
            const artwork = library.find(work => work.id === item.artworkId)
            return <div key={item.id} className={`giftbox-layer${selectedId === item.id ? ' giftbox-layer-active' : ''}`}>
              <button className="giftbox-layer-select" onClick={() => setSelectedId(item.id)} aria-pressed={selectedId === item.id}><span className="giftbox-layer-dot" /><span>{artwork?.name ?? '原作品不可用'}</span></button>
              <button className="icon-button giftbox-delete" onClick={() => removeItem(item.id)} aria-label={`移除${artwork?.name ?? '来源不可用的作品'}`}><Trash2 size={13} /></button>
            </div>
          })}</div>
        </section>}
      </aside>

      <div className="giftbox-center-column">
        <section className={`giftbox-stage${dragging ? ' giftbox-is-dragging' : ''}`} aria-label="礼盒俯视编辑器" onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}>
          <div className="giftbox-stage-heading"><span><span className="giftbox-live-dot" />心意预览</span><span className="giftbox-stage-meta">TOP VIEW <i />{data.items.length} 件手作</span></div>
          <GiftBoxScene data={data} artworks={library} name={name} selectedId={selectedId} onSelect={setSelectedId} onItemPointerDown={startDrag} onItemKeyDown={handleItemKey} onBackgroundPointerDown={() => setSelectedId(null)} disabled={Boolean(busy)} />
          <div className="giftbox-canvas-help"><MousePointer2 size={13} /><span>点击选中 · 拖拽摆放 · 卡片固定在右下</span><span className="giftbox-view-tag">{data.shape === 'rectangle' ? '矩形盒' : '方形盒'}</span></div>
        </section>
        <div className="giftbox-dimension-note"><Ruler size={14} /><p>这是配色与摆放预览，<strong>不保证实际尺寸</strong>。请核对作品大小、礼盒内径及厚度后再采购。</p></div>
        <section className="panel giftbox-item-panel" aria-label="选中作品调整">
          {selected ? <>
            <div className="giftbox-item-heading"><div><div className="eyebrow">A LITTLE ADJUSTMENT</div><h2>{selectedArtwork?.name ?? '原作品不可用'}</h2></div><button className="icon-button giftbox-delete" onClick={() => removeItem(selected.id)} aria-label="删除选中作品" title="删除选中作品"><Trash2 size={16} /></button></div>
            <div className="giftbox-transform-grid">
              <label className="giftbox-slider"><span>作品大小 <output>{Math.round(selected.scale * 100)}%</output></span><input type="range" min={MIN_SCALE} max={getScaleLimit(data.shape, selected.rotation)} step="0.01" value={selected.scale} onChange={event => adjustItem(selected.id, { scale: Number(event.target.value) })} /></label>
              <label className="giftbox-slider"><span>旋转角度 <output>{Math.round(selected.rotation)}°</output></span><input type="range" min="-180" max="179" step="1" value={selected.rotation} onChange={event => adjustItem(selected.id, { rotation: Number(event.target.value) })} /></label>
              <label className="giftbox-slider"><span>水平位置 <output>{Math.round(selected.x)}%</output></span><input type="range" min="0" max="100" step="1" value={selected.x} onChange={event => adjustItem(selected.id, { x: Number(event.target.value) })} /></label>
              <label className="giftbox-slider"><span>垂直位置 <output>{Math.round(selected.y)}%</output></span><input type="range" min="0" max="100" step="1" value={selected.y} onChange={event => adjustItem(selected.id, { y: Number(event.target.value) })} /></label>
            </div>
            <div className="giftbox-transform-actions"><button onClick={() => editData(previous => ({ ...previous, items: moveLayer(previous.items, selected.id, -1) }))} disabled={selectedIndex === 0}><ArrowDown size={13} />后移一层</button><button onClick={() => editData(previous => ({ ...previous, items: moveLayer(previous.items, selected.id, 1) }))} disabled={selectedIndex === data.items.length - 1}><ArrowUp size={13} />前移一层</button><button onClick={() => adjustItem(selected.id, { x: 50, y: 50, scale: 1, rotation: 0 })}><RotateCcw size={12} />居中复位</button></div>
            <p className="hint giftbox-keyboard-hint">也可聚焦画布中的作品，用方向键微调，Shift + 方向键加速。触及盒壁时自动限制位置与大小。</p>
          </> : <div className="giftbox-selection-empty"><MousePointer2 size={21} strokeWidth={1.3} /><div><h2>给每份心意，找到合适的位置</h2><p>选中盒内作品，即可调整大小、角度与前后层级。</p></div></div>}
        </section>
      </div>

      <aside className="giftbox-details-column">
        <section className="panel giftbox-packaging-panel">
          <h2 className="panel-title"><Gift size={16} />包装小细节</h2>
          <div className="field"><label className="field-label" htmlFor="giftbox-name">给礼盒起个名字</label><input id="giftbox-name" type="text" value={name} maxLength={60} placeholder="为谁准备的心意？" onChange={event => { setName(event.target.value); setDirty(true) }} /></div>
          <div className="field"><span className="field-label">礼盒形状</span><div className="segmented giftbox-shape" role="group" aria-label="礼盒形状"><button className={data.shape === 'rectangle' ? 'active' : ''} aria-pressed={data.shape === 'rectangle'} onClick={() => editData(previous => changeShape(previous, 'rectangle'))}><span className="giftbox-shape-rectangle" />矩形</button><button className={data.shape === 'square' ? 'active' : ''} aria-pressed={data.shape === 'square'} onClick={() => editData(previous => changeShape(previous, 'square'))}><span className="giftbox-shape-square" />方形</button></div></div>
          <ColorChoices label="盒身颜色" colors={BOX_COLORS} value={data.color} onChange={color => editData(previous => ({ ...previous, color }))} />
          <ColorChoices label="柔软填充" colors={FILLER_COLORS} value={data.fillerColor} onChange={fillerColor => editData(previous => ({ ...previous, fillerColor }))} />
          <ColorChoices label="点睛丝带" colors={RIBBON_COLORS} value={data.ribbonColor} onChange={ribbonColor => editData(previous => ({ ...previous, ribbonColor }))} />
          <div className="giftbox-card-field"><label className="field-label" htmlFor="giftbox-note"><span><Heart size={12} />写在卡片上</span><small>{Array.from(data.note).length}/{MAX_NOTE_LENGTH}</small></label><textarea id="giftbox-note" rows={3} maxLength={MAX_NOTE_LENGTH} value={data.note} onChange={event => editData(previous => ({ ...previous, note: event.target.value }))} placeholder="有些话，想亲手写给你。" /><p>卡片自动排版，也可以留白。</p></div>
        </section>
        <section className="panel giftbox-materials-panel">
          <h2 className="panel-title"><Leaf size={15} />这份礼物，需要<small>{data.items.length} 件手作</small></h2>
          <ul className="giftbox-materials">{summary.packaging.map(line => <li key={line.label}><span>{line.label}</span><span>× {line.quantity}</span></li>)}</ul>
          <div className="giftbox-materials-contents">{summary.contents.length ? summary.contents.map((line, index) => <div key={`${index}-${line.label}`}><span>{line.label}</span><span>× {line.quantity}</span></div>) : <p>加入作品后，自动汇总内容材料。</p>}</div>
          {summary.missing > 0 && <p className="giftbox-warning" role="alert">{summary.missing} 件作品来源不可用，请移除后重新加入。</p>}
          <button className="btn btn-secondary giftbox-materials-download" onClick={exportMaterials}><Download size={13} />下载材料清单</button>
          <p className="hint">包含包装与串饰 / 拼豆制作材料；与预览分开下载，方便备料。</p>
        </section>
      </aside>
    </fieldset>
    <footer className="giftbox-footer"><Heart size={12} /><span>礼物的分量，从来不只在盒子里。</span><span>MADE WITH A LITTLE LOVE</span></footer>
  </div>
}
