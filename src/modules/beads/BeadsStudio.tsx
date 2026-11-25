import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import { ArrowDownToLine, Check, ChevronRight, Circle, Eraser, FileImage, Flower2, Grid2X2, Info, LoaderCircle, Maximize2, Paintbrush, Palette, Ruler, Save, UploadCloud, X } from 'lucide-react'
import ExportArtworkModal from '../../components/ExportArtworkModal'
import SaveArtworkModal from '../../components/SaveArtworkModal'
import { downloadFile } from '../../lib/export'
import { useStudio } from '../../lib/studio'
import type { BeadsData } from '../../lib/types'
import { BEAD_EXAMPLES, BEADS_PALETTE, cloneBeads, COLOR_LIMITS, countMaterials, createExample, GRID_SIZES, materialsCsv, paintCell, physicalSize, resamplePattern, safeFilename } from './beads'
import type { ExampleKind } from './beads'
import { canvasPngBlob, decodeLocalImage, patternCanvas, PREVIEW_CELL, previewPadding, renderPreview, sampleImage, sourcePreview, thumbnailPng } from './beadsCanvas'
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
  const { editingArtwork, saveArtwork, notify } = useStudio()
  const [initial] = useState(() => {
    if (editingArtwork?.kind === 'beads') return { data: cloneBeads(editingArtwork.data), name: editingArtwork.name, id: editingArtwork.id }
    return { data: createExample('flower'), name: '小雏菊 · 示例', id: undefined }
  })
  const [data, setData] = useState(initial.data)
  const [name, setName] = useState(initial.name)
  const [savedId, setSavedId] = useState(initial.id)
  const savedIdRef = useRef(initial.id)
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
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [previewError, setPreviewError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [paintActive, setPaintActive] = useState(false)
  const [brushCode, setBrushCode] = useState<string>(BEADS_PALETTE[0].code)
  const painting = useRef(false)
  const dragDepth = useRef(0)
  const requestId = useRef(0)
  const mounted = useRef(true)
  const fileInput = useRef<HTMLInputElement>(null)
  const previewCanvas = useRef<HTMLCanvasElement>(null)
  const fullscreenCanvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; requestId.current++ }
  }, [])

  useEffect(() => {
    if (fullscreenOpen || !previewCanvas.current) return
    try { renderPreview(previewCanvas.current, data, mode, showCodes); setPreviewError('') }
    catch (cause) { setPreviewError(messageFrom(cause, '预览暂时不可用，请换用支持 Canvas 的浏览器。')) }
  }, [fullscreenOpen, data, mode, showCodes])

  useEffect(() => {
    if (!fullscreenOpen || !fullscreenCanvas.current) return
    try { renderPreview(fullscreenCanvas.current, data, mode, showCodes) } catch { /* main previewError already handles canvas failure */ }
  }, [fullscreenOpen, data, mode, showCodes])

  useEffect(() => {
    if (!fullscreenOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreenOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fullscreenOpen])

  const materials = useMemo(() => countMaterials(data), [data])
  const total = materials.reduce((sum, material) => sum + material.count, 0)
  const size = physicalSize(data.columns, data.rows, data.beadSize)
  const unavailable = busy || total === 0 || Boolean(previewError)
  const gridOptions = [...new Set<number>([...GRID_SIZES, parameters.grid])].sort((a, b) => a - b)
  const colorOptions = [...new Set<number>([...COLOR_LIMITS, parameters.colors])].sort((a, b) => a - b)
  const canvasWidth = data.columns * PREVIEW_CELL + previewPadding(mode) * 2
  const canvasHeight = data.rows * PREVIEW_CELL + previewPadding(mode) * 2
  const boardRatio = canvasWidth / canvasHeight

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
    const meta = BEAD_EXAMPLES.find(item => item.id === kind)
    const nextData = { ...resamplePattern(original, parameters.grid, parameters.colors), beadSize: parameters.beadSize }
    source.current = { kind: 'pattern', data: original }
    setData(nextData)
    setSourceInfo({ name: original.sourceName, preview: '', restored: false, example: true })
    setSelectedExample(kind)
    setName(meta?.title ?? '拼豆作品')
    setError('')
  }

  function applyBrushAt(clientX: number, clientY: number) {
    if (!paintActive || busy || !previewCanvas.current) return
    const rect = previewCanvas.current.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const cx = (clientX - rect.left) / rect.width * previewCanvas.current.width
    const cy = (clientY - rect.top) / rect.height * previewCanvas.current.height
    const pad = previewPadding(mode)
    const col = Math.floor((cx - pad) / PREVIEW_CELL)
    const row = Math.floor((cy - pad) / PREVIEW_CELL)
    if (col < 0 || col >= data.columns || row < 0 || row >= data.rows) return
    const index = row * data.columns + col
    const next = paintCell(data, index, brushCode)
    if (next === data) return
    source.current = { kind: 'pattern', data: next }
    setData(next)
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    void upload(event.dataTransfer.files)
  }

  function openSaveDialog() {
    if (unavailable) return
    setSaveDialogOpen(true)
  }

  async function confirmSave(trimmed: string) {
    if (unavailable) return
    try {
      const saved = await saveArtwork(
        { kind: 'beads', name: trimmed, data: cloneBeads(data), thumbnail: thumbnailPng(data) },
        savedIdRef.current,
      )
      if (!mounted.current) return
      if (!saved) {
        setSaveDialogOpen(false)
        return
      }
      savedIdRef.current = saved.id
      setSavedId(saved.id)
      setName(saved.name)
      setSaveDialogOpen(false)
    } catch (cause) {
      if (!mounted.current) return
      notify(messageFrom(cause, '保存失败，请先导出图纸与材料清单。'))
      setSaveDialogOpen(false)
    }
  }

  async function exportPattern() {
    if (unavailable) return
    const png = await canvasPngBlob(patternCanvas(data, name))
    downloadFile(png, `${safeFilename(name)}-拼豆图纸.png`)
  }

  function exportMaterials() {
    if (unavailable) return
    downloadFile(materialsCsv(data, name.trim() || '我的拼豆作品'), `${safeFilename(name)}-材料清单.csv`, 'text/csv;charset=utf-8')
  }

  return <div className="beads-studio">
    <header className="studio-heading beads-heading">
      <div><div className="eyebrow"><Flower2 size={13} /> PERLER BEADS</div><h1>拼豆工坊</h1></div>
      <div className="heading-actions beads-actions">
        <button className="btn btn-secondary" onClick={() => setExportDialogOpen(true)} disabled={unavailable} title="选择导出 PNG 图纸或材料清单 CSV"><ArrowDownToLine size={15} />导出图纸</button>
        <button className="btn btn-primary" onClick={openSaveDialog} disabled={unavailable}><Save size={15} />{savedId ? '更新作品' : '保存作品'}</button>
      </div>
    </header>

    <div className="beads-journey" aria-label="拼豆创作流程"><span><i>01</i> 选一张照片</span><ChevronRight size={12} /><span><i>02</i> 调一份配色</span><ChevronRight size={12} /><span><i>03</i> 拼一份心意</span></div>

    <div className="beads-layout">
      <aside className="panel beads-controls" aria-label="图片与拼豆参数">
        <h2 className="panel-title"><FileImage size={16} /> 上传图片</h2>
        <input ref={fileInput} className="beads-file-input" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" aria-label="选择拼豆来源图片" onChange={event => { void upload(event.currentTarget.files); event.currentTarget.value = '' }} />
        <button type="button" className={`beads-dropzone ${dragging ? 'beads-dragging' : ''}`} onClick={() => fileInput.current?.click()}
          onDragEnter={event => { event.preventDefault(); dragDepth.current++; setDragging(true) }}
          onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }}
          onDragLeave={event => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false) }}
          onDrop={onDrop} aria-label="点击选择图片，也可拖入 PNG、JPEG 或 WebP 图片">
          {sourceInfo.preview ? <img className="beads-source-image" src={sourceInfo.preview} alt="当前照片的本地缩略预览" /> : <span className="beads-upload-icon"><UploadCloud size={27} strokeWidth={1.4} /></span>}
          <strong>{busy ? '正在本地读取…' : dragging ? '松手，把图片放在这里' : '点击选择，或拖入图片'}</strong>
          <span>PNG / JPEG / WebP · 最大 10 MB</span>
        </button>
        <div className="beads-example-label">还没想好？精选示例：</div>
        <div className="beads-examples" role="group" aria-label="热门拼豆示例">
          {BEAD_EXAMPLES.map(example => (
            <button
              type="button"
              key={example.id}
              className={selectedExample === example.id ? 'beads-example-active' : ''}
              aria-pressed={selectedExample === example.id}
              onClick={() => chooseExample(example.id)}
            >
              {example.label}
            </button>
          ))}
        </div>
        {error && <p className="beads-error" role="alert"><Info size={14} />{error}</p>}
        <div className="beads-divider" />
        <h2 className="panel-title"><Grid2X2 size={16} /> 让细节刚刚好</h2>
        <fieldset className="beads-parameters" disabled={busy}>
          <div className="field"><span className="field-label" id="beads-grid-label">网格精度</span>
            <div className="beads-grid-options" role="group" aria-labelledby="beads-grid-label">{gridOptions.map(grid => <button key={grid} className={parameters.grid === grid ? 'beads-option-active' : ''} aria-pressed={parameters.grid === grid} onClick={() => changeParameters({ ...parameters, grid })}>{grid}</button>)}</div>
          </div>
          <div className="field"><span className="field-label" id="beads-colors-label">最多保留 <small>实际 {materials.length} 色</small></span>
            <div className="beads-color-options" role="group" aria-labelledby="beads-colors-label">{colorOptions.map(colors => <button key={colors} className={parameters.colors === colors ? 'beads-option-active' : ''} aria-pressed={parameters.colors === colors} onClick={() => changeParameters({ ...parameters, colors })}>{colors} 色</button>)}</div>
          </div>
          <div className="field beads-size-field"><label className="field-label" htmlFor="beads-size">拼豆直径</label><select id="beads-size" value={parameters.beadSize} onChange={event => changeParameters({ ...parameters, beadSize: Number(event.target.value) })}>{[...new Set([2.6, 5, parameters.beadSize])].sort((a, b) => a - b).map(beadSize => <option key={beadSize} value={beadSize}>{beadSize} mm{beadSize === 5 ? ' · 标准豆' : beadSize === 2.6 ? ' · 迷你豆' : ' · 已存尺寸'}</option>)}</select></div>
        </fieldset>
        {sourceInfo.restored && <p className="beads-restored"><Check size={13} />已还原完整图纸，无需原照片。调整精度与用色时，将以已存图纸重新采样。</p>}
      </aside>

      <section className="beads-preview-column" aria-label="拼豆作品预览">
        <div className="beads-canvas-panel" aria-busy={busy}>
          <div className="beads-canvas-header"><div className="segmented" role="group" aria-label="预览方式"><button className={mode === 'beads' ? 'active' : ''} aria-pressed={mode === 'beads'} onClick={() => setMode('beads')}><Circle size={13} /> 拼豆实感</button><button className={mode === 'pixels' ? 'active' : ''} aria-pressed={mode === 'pixels'} onClick={() => setMode('pixels')}><Grid2X2 size={13} /> 像素图纸</button></div><div className="beads-header-tools">{mode === 'pixels' && <label className="studio-codes-toggle"><input type="checkbox" checked={showCodes} onChange={event => setShowCodes(event.target.checked)} /><span>显示格内色号</span></label>}<button type="button" className={`beads-paint-toggle${paintActive ? ' is-active' : ''}`} aria-pressed={paintActive} onClick={() => setPaintActive(value => !value)}><Paintbrush size={13} /> {paintActive ? '微调中' : '点格微调'}</button><button type="button" className="studio-fullscreen-btn" onClick={() => setFullscreenOpen(true)} disabled={unavailable} aria-label="全屏浏览"><Maximize2 size={13} /><span>全屏浏览</span></button></div></div>
          {paintActive && <div className="beads-paint-bar" role="group" aria-label="点格微调画笔选色">
            <button type="button" className={`beads-eraser-btn${brushCode === '' ? ' is-selected' : ''}`} onClick={() => setBrushCode('')} aria-pressed={brushCode === ''} title="橡皮擦（留空不放豆）"><Eraser size={12} />留空</button>
            <div className="beads-brush-swatches">
              {BEADS_PALETTE.map(swatch => <button type="button" key={swatch.code} className={brushCode === swatch.code ? 'is-selected' : ''} style={{ backgroundColor: swatch.color }} onClick={() => setBrushCode(swatch.code)} aria-label={`画笔颜色：${swatch.code} ${swatch.name}`} aria-pressed={brushCode === swatch.code} title={`${swatch.code} ${swatch.name}`} />)}
            </div>
          </div>}
          <div className="beads-stage" tabIndex={0} aria-label="作品画布">
            <div className="beads-stage-inner">
              <div className={`beads-board${paintActive ? ' beads-board-paint' : ''}`} style={{ '--board-ratio': String(boardRatio) } as CSSProperties}>
                <canvas
                  ref={previewCanvas}
                  role="img"
                  aria-label={`${sourceInfo.example ? '示例：' : ''}${name || '拼豆作品'}，${data.columns} 列 ${data.rows} 行，${total} 颗拼豆，${materials.length} 种颜色，${mode === 'beads' ? '圆孔拼豆预览' : '带色号的像素图纸'}`}
                  onPointerDown={event => {
                    if (!paintActive || event.button !== 0) return
                    painting.current = true
                    event.currentTarget.setPointerCapture(event.pointerId)
                    applyBrushAt(event.clientX, event.clientY)
                  }}
                  onPointerMove={event => {
                    if (painting.current) applyBrushAt(event.clientX, event.clientY)
                  }}
                  onPointerUp={() => { painting.current = false }}
                  onPointerCancel={() => { painting.current = false }}
                >拼豆预览：{data.columns} × {data.rows}，{total} 颗。请查看右侧材料清单。</canvas>
              </div>
            </div>
          </div>
          {busy && <div className="beads-processing" role="status"><LoaderCircle size={15} className="beads-spin" /> 正在本地转成小小拼豆…</div>}
          {previewError && <p className="beads-error" role="alert">{previewError}</p>}
          {!total && !busy && <p className="beads-empty-grid" role="status">这张图片采样后全部透明，没有可用拼豆。请换图或提高精度。</p>}
        </div>
        {mode === 'beads' && <div className="beads-stats" aria-live="polite"><div><Grid2X2 size={17} /><span>图纸网格<strong>{data.columns} × {data.rows}<small>格</small></strong></span></div><div><Ruler size={17} /><span>预计成品<strong>{centimeters(size.widthMm)} × {centimeters(size.heightMm)}<small>cm</small></strong></span></div><div><Circle size={17} /><span>拼豆总数<strong>{total.toLocaleString()}<small>颗</small></strong></span></div></div>}
      </section>

      <aside className="beads-material-column" aria-label="材料清单">
        <section className="panel beads-materials"><h2 className="panel-title"><Palette size={16} /> 你的材料色卡 <small>{materials.length} 色</small></h2><div className="beads-material-summary"><strong>{total.toLocaleString()}<small>颗拼豆</small></strong><span>{data.beadSize} mm / 颗</span></div>
          <div className="beads-material-list">{materials.length ? <table><thead><tr><th scope="col">参考色号 / 颜色</th><th scope="col">数量</th></tr></thead><tbody>{materials.map(material => <tr key={material.code}><td><span className="beads-material-color" style={{ '--beads-color': material.color } as CSSProperties} /><span><strong>{material.code}</strong><small>{material.name}</small></span></td><td>{material.count}<small>颗</small></td></tr>)}</tbody></table> : <p className="hint">透明格不放豆，也不计入材料数量。</p>}</div>
        </section>
      </aside>
    </div>
    <footer className="studio-footer">把日常的一帧，拼成一份能握在手里的心意。</footer>

    <ExportArtworkModal
      open={exportDialogOpen}
      onClose={() => setExportDialogOpen(false)}
      options={[
        {
          id: 'png',
          format: 'PNG',
          label: '高清拼豆图纸',
          defaultChecked: true,
          disabled: unavailable,
          onExport: exportPattern,
          successMessage: 'PNG 图纸已生成，包含行列编号、参考色号和材料图例。',
        },
        {
          id: 'csv',
          format: 'CSV',
          label: '拼豆材料清单',
          defaultChecked: false,
          disabled: unavailable,
          onExport: exportMaterials,
          successMessage: '材料清单已导出，请按实体色卡核对采购。',
        },
      ]}
    />

    <SaveArtworkModal
      open={saveDialogOpen}
      isUpdate={Boolean(savedId)}
      initialName={name}
      inputId="beads-name"
      placeholder="例如：送给你的晴天"
      onClose={() => setSaveDialogOpen(false)}
      onConfirm={confirmSave}
    />

    {fullscreenOpen && (
      <div className="studio-fullscreen-overlay" role="dialog" aria-modal="true" aria-label="全屏预览拼豆作品" onClick={event => { if (event.target === event.currentTarget) setFullscreenOpen(false) }}>
        <div className="studio-fullscreen-bar">
          <div className="studio-fullscreen-meta">
            <strong>{name || '拼豆作品'}</strong>
            <span>{data.columns} × {data.rows} 格 · {total.toLocaleString()} 颗 · {materials.length} 色</span>
          </div>
          <div className="studio-fullscreen-tools">
            {mode === 'pixels' && (
              <label className="studio-codes-toggle is-dark">
                <input type="checkbox" checked={showCodes} onChange={event => setShowCodes(event.target.checked)} />
                <span>显示格内色号</span>
              </label>
            )}
            <div className="segmented" role="group" aria-label="全屏预览方式">
              <button type="button" className={mode === 'beads' ? 'active' : ''} aria-pressed={mode === 'beads'} onClick={() => setMode('beads')}><Circle size={13} /> 拼豆实感</button>
              <button type="button" className={mode === 'pixels' ? 'active' : ''} aria-pressed={mode === 'pixels'} onClick={() => setMode('pixels')}><Grid2X2 size={13} /> 像素图纸</button>
            </div>
            <button type="button" className="studio-fullscreen-close" onClick={() => setFullscreenOpen(false)} aria-label="关闭全屏预览">
              <X size={16} />
              <span>关闭</span>
            </button>
          </div>
        </div>
        <div className="studio-fullscreen-stage" onClick={event => { if (event.target === event.currentTarget) setFullscreenOpen(false) }}>
          <div className="studio-fullscreen-board" style={{ '--board-ratio': String(boardRatio) } as CSSProperties}>
            <canvas ref={fullscreenCanvas} aria-label={`${name || '拼豆作品'} 全屏预览`} />
          </div>
        </div>
      </div>
    )}
  </div>
}
