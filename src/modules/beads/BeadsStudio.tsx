import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import { ArrowDownToLine, Check, ChevronRight, Circle, FileImage, Flower2, Gift, Grid2X2, Heart, Info, LoaderCircle, Minus, Palette, Plus, Ruler, Save, ShieldCheck, Sparkles, UploadCloud } from 'lucide-react'
import { downloadFile } from '../../lib/export'
import { useStudio } from '../../lib/studio'
import type { BeadsData } from '../../lib/types'
import { ALPHA_NOTICE, cloneBeads, COLOR_LIMITS, countMaterials, createExample, GRID_SIZES, materialsCsv, PALETTE_NOTICE, physicalSize, resamplePattern, safeFilename } from './beads'
import type { ExampleKind } from './beads'
import { canvasPngBlob, decodeLocalImage, patternCanvas, renderPreview, sampleImage, sourcePreview, thumbnailPng } from './beadsCanvas'
import type { PreviewMode } from './beadsCanvas'
import './beads.css'

type Source = { kind: 'pattern'; data: BeadsData } | { kind: 'image'; image: HTMLImageElement; name: string }
interface Parameters { grid: number; colors: number; beadSize: number }

function messageFrom(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function centimeters(mm: number) {
  return Number((mm / 10).toFixed(2)).toString()
}

export default function BeadsStudio() {
  const { editingArtwork, saveArtwork, navigate, notify } = useStudio()
  const [initial] = useState(() => {
    if (editingArtwork?.kind === 'beads') return { data: cloneBeads(editingArtwork.data), name: editingArtwork.name, id: editingArtwork.id }
    return { data: createExample('flower'), name: '小雏菊 · 示例', id: undefined }
  })
  const [data, setData] = useState(initial.data)
  const [name, setName] = useState(initial.name)
  const [savedId, setSavedId] = useState(initial.id)
  const savedIdRef = useRef(initial.id)
  const [dirty, setDirty] = useState(!initial.id)
  const [parameters, setParameters] = useState<Parameters>(() => ({
    grid: Math.max(initial.data.columns, initial.data.rows),
    colors: COLOR_LIMITS.find(limit => limit >= initial.data.palette.length) ?? initial.data.palette.length,
    beadSize: initial.data.beadSize,
  }))
  const parametersRef = useRef(parameters)
  const source = useRef<Source>({ kind: 'pattern', data: cloneBeads(initial.data) })
  const [sourceInfo, setSourceInfo] = useState({ name: initial.data.sourceName, preview: '', restored: Boolean(initial.id), example: !initial.id })
  const [selectedExample, setSelectedExample] = useState<ExampleKind | null>(initial.id ? null : 'flower')
  const [mode, setMode] = useState<PreviewMode>('beads')
  const [showCodes, setShowCodes] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [busy, setBusy] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [previewError, setPreviewError] = useState('')
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)
  const requestId = useRef(0)
  const mounted = useRef(true)
  const fileInput = useRef<HTMLInputElement>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  const previewCanvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; requestId.current++ }
  }, [])

  useEffect(() => {
    if (!previewCanvas.current) return
    try { renderPreview(previewCanvas.current, data, mode, showCodes); setPreviewError('') }
    catch (cause) { setPreviewError(messageFrom(cause, '预览暂时不可用，请换用支持 Canvas 的浏览器。')) }
  }, [data, mode, showCodes])

  const materials = useMemo(() => countMaterials(data), [data])
  const total = materials.reduce((sum, material) => sum + material.count, 0)
  const size = physicalSize(data.columns, data.rows, data.beadSize)
  const unavailable = busy || total === 0 || Boolean(previewError)
  const gridOptions = [...new Set<number>([...GRID_SIZES, parameters.grid])].sort((a, b) => a - b)
  const colorOptions = [...new Set<number>([...COLOR_LIMITS, parameters.colors])].sort((a, b) => a - b)

  function changeParameters(next: Parameters) {
    try {
      // Bead diameter changes physical measurements only, never the saved colors.
      const nextData = next.grid === parameters.grid && next.colors === parameters.colors
        ? { ...data, beadSize: next.beadSize }
        : source.current.kind === 'image'
          ? sampleImage(source.current.image, next.grid, next.colors, source.current.name, next.beadSize)
          : { ...resamplePattern(source.current.data, next.grid, next.colors), beadSize: next.beadSize }
      parametersRef.current = next
      setParameters(next)
      setData(nextData)
      setDirty(true)
      setError('')
    } catch (cause) { setError(messageFrom(cause, '转换失败，请尝试更小的网格。')) }
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return
    const currentRequest = ++requestId.current
    setError('')
    if (files.length !== 1) {
      setBusy(false)
      setError('每次请选择一张图片，当前作品已保留。')
      return
    }
    const file = files[0]
    setBusy(true)
    try {
      const image = await decodeLocalImage(file)
      if (currentRequest !== requestId.current || !mounted.current) return
      const current = parametersRef.current
      const nextData = sampleImage(image, current.grid, current.colors, file.name, current.beadSize)
      const preview = sourcePreview(image)
      source.current = { kind: 'image', image, name: file.name }
      setData(nextData)
      setSourceInfo({ name: file.name, preview, restored: false, example: false })
      setSelectedExample(null)
      setName(file.name.replace(/\.[^.]+$/, '').slice(0, 60) || '我的拼豆作品')
      setDirty(true)
      setZoom(1)
    } catch (cause) {
      if (currentRequest === requestId.current && mounted.current) setError(`${messageFrom(cause, '图片读取失败，请重新选择。')} 当前作品已保留。`)
    } finally {
      if (currentRequest === requestId.current && mounted.current) setBusy(false)
    }
  }

  function chooseExample(kind: ExampleKind) {
    requestId.current++
    setBusy(false)
    const original = createExample(kind)
    const nextData = { ...resamplePattern(original, parameters.grid, parameters.colors), beadSize: parameters.beadSize }
    source.current = { kind: 'pattern', data: original }
    setData(nextData)
    setSourceInfo({ name: original.sourceName, preview: '', restored: false, example: true })
    setSelectedExample(kind)
    setName(kind === 'flower' ? '小雏菊 · 示例' : '一颗心 · 示例')
    setError('')
    setDirty(true)
    setZoom(1)
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    void upload(event.dataTransfer.files)
  }

  function save(toGiftBox = false) {
    if (unavailable) return
    if (!name.trim()) { notify('先给这份拼豆作品起个名字吧。'); nameInput.current?.focus(); return }
    try {
      const saved = saveArtwork({ kind: 'beads', name: name.trim(), data: cloneBeads(data), thumbnail: thumbnailPng(data) }, savedIdRef.current)
      if (!saved) return
      savedIdRef.current = saved.id
      setSavedId(saved.id)
      setName(saved.name)
      setDirty(false)
      if (toGiftBox) navigate('gift-box', saved.id)
    } catch (cause) { notify(messageFrom(cause, '保存失败，请先导出图纸与材料清单。')) }
  }

  async function exportPattern() {
    if (unavailable || exporting) return
    setExporting(true)
    try {
      const png = await canvasPngBlob(patternCanvas(data, name))
      if (!mounted.current) return
      downloadFile(png, `${safeFilename(name)}-拼豆图纸.png`)
      notify('PNG 图纸已生成，包含行列编号、参考色号和材料图例。')
    } catch (cause) { if (mounted.current) notify(messageFrom(cause, '图纸导出失败，请重试。')) }
    finally { if (mounted.current) setExporting(false) }
  }

  function exportMaterials() {
    downloadFile(materialsCsv(data, name.trim() || '我的拼豆作品'), `${safeFilename(name)}-材料清单.csv`, 'text/csv;charset=utf-8')
    notify('材料清单已导出，请按实体色卡核对采购。')
  }

  return <div className="beads-studio">
    <header className="studio-heading beads-heading">
      <div><div className="eyebrow"><Flower2 size={13} /> LITTLE PIXELS, LOTS OF LOVE</div><h1>照片转拼豆</h1><p>把日常的一帧，拼成一份能握在手里的心意。</p></div>
      <div className="heading-actions beads-actions">
        <button className="btn btn-secondary" onClick={() => void exportPattern()} disabled={unavailable || exporting} title="下载带行列、色号及图例的 PNG 图纸">{exporting ? <LoaderCircle size={15} className="beads-spin" /> : <ArrowDownToLine size={15} />}导出图纸</button>
        <button className="btn btn-secondary" onClick={() => save()} disabled={unavailable}><Save size={15} />{savedId ? '更新作品' : '保存作品'}</button>
        <button className="btn btn-primary" onClick={() => save(true)} disabled={unavailable}><Gift size={16} />放入礼盒</button>
      </div>
    </header>

    <div className="beads-journey" aria-label="拼豆创作流程"><span><i>01</i> 选一张照片</span><ChevronRight size={12} /><span><i>02</i> 调一份配色</span><ChevronRight size={12} /><span><i>03</i> 拼一份心意</span><span className="beads-local"><ShieldCheck size={13} /> 只在你的设备上处理</span></div>

    <div className="beads-layout">
      <aside className="panel beads-controls" aria-label="图片与拼豆参数">
        <h2 className="panel-title"><FileImage size={16} /> 从一张照片开始</h2>
        <input ref={fileInput} className="beads-file-input" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" aria-label="选择拼豆来源图片" onChange={event => { void upload(event.currentTarget.files); event.currentTarget.value = '' }} />
        <button type="button" className={`beads-dropzone ${dragging ? 'beads-dragging' : ''}`} onClick={() => fileInput.current?.click()}
          onDragEnter={event => { event.preventDefault(); dragDepth.current++; setDragging(true) }}
          onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }}
          onDragLeave={event => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false) }}
          onDrop={onDrop} aria-label="点击选择照片，也可拖入 PNG、JPEG 或 WebP 图片">
          {sourceInfo.preview ? <img className="beads-source-image" src={sourceInfo.preview} alt="当前照片的本地缩略预览" /> : <span className="beads-upload-icon"><UploadCloud size={27} strokeWidth={1.4} /></span>}
          <strong>{busy ? '正在本地读取…' : dragging ? '松手，把照片放在这里' : '点击选择，或拖入照片'}</strong>
          <span>PNG / JPEG / WebP · 最大 10 MB</span><span className="beads-upload-link">{busy ? '也可选择另一张，替换本次读取' : sourceInfo.preview ? '换一张照片' : '选择本地图片'} <Plus size={12} /></span>
        </button>
        <p className="beads-privacy"><ShieldCheck size={13} /> 照片不上传，不需要登录。</p>
        <div className="beads-example-label">还没想好？先玩一份原创示例</div>
        <div className="beads-examples">
          <button className={selectedExample === 'flower' ? 'beads-example-active' : ''} aria-pressed={selectedExample === 'flower'} onClick={() => chooseExample('flower')}><Flower2 size={14} /> 花朵示例</button>
          <button className={selectedExample === 'heart' ? 'beads-example-active' : ''} aria-pressed={selectedExample === 'heart'} onClick={() => chooseExample('heart')}><Heart size={14} /> 爱心示例</button>
        </div>
        {error && <p className="beads-error" role="alert"><Info size={14} />{error}</p>}
        <div className="beads-divider" />
        <h2 className="panel-title"><Grid2X2 size={16} /> 让细节刚刚好</h2>
        <fieldset className="beads-parameters" disabled={busy}>
          <div className="field"><span className="field-label" id="beads-grid-label">网格精度 <small>最长边格数</small></span>
            <div className="beads-grid-options" role="group" aria-labelledby="beads-grid-label">{gridOptions.map(grid => <button key={grid} className={parameters.grid === grid ? 'beads-option-active' : ''} aria-pressed={parameters.grid === grid} onClick={() => changeParameters({ ...parameters, grid })}>{grid}</button>)}</div>
            <p className="beads-field-hint">保持原图比例，不裁切 · 当前 {data.columns} × {data.rows}</p>
          </div>
          <div className="field"><span className="field-label" id="beads-colors-label">最多保留 <small>实际 {materials.length} 色</small></span>
            <div className="beads-color-options" role="group" aria-labelledby="beads-colors-label">{colorOptions.map(colors => <button key={colors} className={parameters.colors === colors ? 'beads-option-active' : ''} aria-pressed={parameters.colors === colors} onClick={() => changeParameters({ ...parameters, colors })}>{colors} 色</button>)}</div>
            <p className="beads-field-hint">从 28 种参考色匹配，少一些颜色更易上手。</p>
          </div>
          <div className="field beads-size-field"><label className="field-label" htmlFor="beads-size">拼豆直径</label><select id="beads-size" value={parameters.beadSize} onChange={event => changeParameters({ ...parameters, beadSize: Number(event.target.value) })}>{[...new Set([2.6, 5, parameters.beadSize])].sort((a, b) => a - b).map(beadSize => <option key={beadSize} value={beadSize}>{beadSize} mm{beadSize === 5 ? ' · 标准豆' : beadSize === 2.6 ? ' · 迷你豆' : ' · 已存尺寸'}</option>)}</select></div>
        </fieldset>
        <p className="hint beads-alpha-note">{ALPHA_NOTICE}</p>
        {sourceInfo.restored && <p className="beads-restored"><Check size={13} />已还原完整图纸，无需原照片。调整精度与用色时，将以已存图纸重新采样。</p>}
        <div className="beads-divider" />
        <div className="field beads-name-field"><label className="field-label" htmlFor="beads-name">给这份心意起个名字</label><input ref={nameInput} id="beads-name" type="text" value={name} maxLength={60} placeholder="例如：送给你的晴天" onChange={event => { setName(event.target.value); setDirty(true) }} />
          <span className="beads-save-status">{savedId ? dirty ? '有修改未保存 · 保存将更新原作品' : '已保存在当前浏览器' : '尚未收藏 · 保存后可放入礼盒'}</span>
        </div>
      </aside>

      <section className="beads-preview-column" aria-label="拼豆作品预览">
        <div className="beads-canvas-panel" aria-busy={busy}>
          <div className="beads-canvas-header"><div className="segmented" role="group" aria-label="预览方式"><button className={mode === 'beads' ? 'active' : ''} aria-pressed={mode === 'beads'} onClick={() => setMode('beads')}><Circle size={13} /> 拼豆实感</button><button className={mode === 'pixels' ? 'active' : ''} aria-pressed={mode === 'pixels'} onClick={() => setMode('pixels')}><Grid2X2 size={13} /> 像素图纸</button></div><span className="beads-preview-tag">{sourceInfo.example ? '原创示例' : sourceInfo.restored ? '已存作品' : '本地转图'}</span></div>
          <div className="beads-stage-caption"><Sparkles size={12} /><span>{mode === 'beads' ? '一格一颗，慢慢拼出喜欢的模样' : '每格一颗豆，空白处不放豆'}</span></div>
          <div className="beads-stage" tabIndex={0} aria-label="作品画布，放大后可滚动查看">
            <div className="beads-stage-inner" style={{ width: `${zoom * 100}%` }}>
              <div className="beads-board" style={{ maxWidth: `${(data.columns / Math.max(data.columns, data.rows)) * 500 * zoom}px` }}>
                <canvas ref={previewCanvas} role="img" aria-label={`${sourceInfo.example ? '示例：' : ''}${name || '拼豆作品'}，${data.columns} 列 ${data.rows} 行，${total} 颗拼豆，${materials.length} 种颜色，${mode === 'beads' ? '圆孔拼豆预览' : '带色号的像素图纸'}`}>拼豆预览：{data.columns} × {data.rows}，{total} 颗。请查看右侧材料清单。</canvas>
              </div>
            </div>
          </div>
          {busy && <div className="beads-processing" role="status"><LoaderCircle size={15} className="beads-spin" /> 正在本地转成小小拼豆…</div>}
          {previewError && <p className="beads-error" role="alert">{previewError}</p>}
          {!total && !busy && <p className="beads-empty-grid" role="status">这张图片采样后全部透明，没有可用拼豆。请换图或提高精度。</p>}
          <div className="beads-canvas-footer"><span className="beads-source-name" title={sourceInfo.name}>{sourceInfo.name}</span><div className="beads-zoom"><button className="icon-button" aria-label="缩小预览" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - 0.5))}><Minus size={13} /></button><button className="beads-zoom-reset" onClick={() => setZoom(1)} title="恢复适应画布">{Math.round(zoom * 100)}%</button><button className="icon-button" aria-label="放大预览" disabled={zoom >= 3} onClick={() => setZoom(value => Math.min(3, value + 0.5))}><Plus size={13} /></button></div></div>
        </div>
        <div className="beads-preview-note">{mode === 'pixels' ? <label><input type="checkbox" checked={showCodes} onChange={event => setShowCodes(event.target.checked)} /> 显示格内色号 <span>导出图纸始终包含色号</span></label> : <span><Info size={12} /> 圆孔为实感模拟，熨烫效果及实物色彩可能不同。</span>}</div>
        <div className="beads-stats" aria-live="polite"><div><Grid2X2 size={17} /><span>图纸网格<strong>{data.columns} × {data.rows}<small>格</small></strong></span></div><div><Ruler size={17} /><span>预计成品<strong>{centimeters(size.widthMm)} × {centimeters(size.heightMm)}<small>cm</small></strong></span></div><div><Circle size={17} /><span>拼豆总数<strong>{total.toLocaleString()}<small>颗</small></strong></span></div></div>
        <p className="beads-dimensions-note">尺寸按网格外框 × 豆径估算，含透明留白；熨烫后会有变化。</p>
        <div className="beads-little-note"><Flower2 size={25} strokeWidth={1.2} /><div><strong>让一张照片，多一种被珍藏的方式。</strong><p>主体清晰、背景简单的照片，通常能拼出更好的效果。</p></div></div>
      </section>

      <aside className="beads-material-column" aria-label="材料清单和制作步骤">
        <section className="panel beads-materials"><h2 className="panel-title"><Palette size={16} /> 你的材料色卡 <small>{materials.length} 色</small></h2><div className="beads-material-summary"><strong>{total.toLocaleString()}<small>颗拼豆</small></strong><span>{data.beadSize} mm / 颗</span></div>
          <div className="beads-material-list">{materials.length ? <table><thead><tr><th scope="col">参考色号 / 颜色</th><th scope="col">数量</th></tr></thead><tbody>{materials.map(material => <tr key={material.code}><td><span className="beads-material-color" style={{ '--beads-color': material.color } as CSSProperties} /><span><strong>{material.code}</strong><small>{material.name}</small></span></td><td>{material.count}<small>颗</small></td></tr>)}</tbody></table> : <p className="hint">透明格不放豆，也不计入材料数量。</p>}</div>
          <button className="btn btn-secondary beads-csv-button" onClick={exportMaterials} disabled={unavailable}><ArrowDownToLine size={14} /> 导出材料 CSV</button>
          <p className="beads-palette-notice"><Info size={13} />{PALETTE_NOTICE}。</p><p className="beads-material-hint">数量不含备用损耗，可按需准备少量余豆。</p>
        </section>
        <section className="panel beads-instructions"><h2 className="panel-title"><Heart size={15} /> 把心意，拼出来</h2><ol><li><span>01</span><div><strong>备好颜色与底板</strong><p>核对实体色卡，备好镊子、拼豆底板和配套隔热纸。</p></div></li><li><span>02</span><div><strong>从左上角，逐行拼放</strong><p>跟着导出图纸的行列与色号摆豆，检查孤立色块是否相连。</p></div></li><li><span>03</span><div><strong>小心熨烫，耐心冷却</strong><p>由成人按材料说明操作，保持通风，冷却后再取下。</p></div></li></ol><div className="beads-safety"><Info size={14} /><span>熨斗高温，请勿徒手接触。小颗粒远离幼儿，儿童请在成人陪同下制作。</span></div></section>
      </aside>
    </div>
    <footer className="beads-footer"><ShieldCheck size={13} /> 照片不离开设备 · 作品仅保存在当前浏览器 · 清理数据前请及时导出</footer>
  </div>
}
