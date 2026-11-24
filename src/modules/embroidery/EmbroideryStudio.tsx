import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Eye,
  FileImage,
  Grid2X2,
  Info,
  Maximize2,
  Palette,
  Play,
  RotateCcw,
  Ruler,
  Save,
  Sparkles,
  Spline,
  UploadCloud,
  X,
} from 'lucide-react'
import ExportArtworkModal from '../../components/ExportArtworkModal'
import SaveArtworkModal from '../../components/SaveArtworkModal'
import { canvasThumbnailDataUrl, compressImageForStorage, loadImageFromDataUrl } from '../../lib/artworkImage'
import { downloadFile } from '../../lib/export'
import { hasOpaquePixels, PersistentWorkerRunner } from '../../lib/persistentWorker'
import { useStudio } from '../../lib/studio'
import type { EmbroideryArtworkData } from '../../lib/types'
import {
  buildEmbroideryTemplateSvg,
  COLOR_LIMITS,
  DENSITY_LEVELS,
  EMBROIDERY_EXAMPLES,
  embroideryMaterialsCsv,
  FABRIC_PRESETS,
  HOOP_SIZES_CM,
  safeEmbroideryFilename,
  STITCH_MODE_INFO,
} from './embroidery'
import type {
  ColorLimit,
  DensityLevel,
  EmbroideryExampleId,
  EmbroideryPlan,
  HoopSizeCm,
  StitchMode,
} from './embroidery'
import {
  canvasPngBlob,
  decodeLocalImage,
  embroiderySheetCanvas,
  readEmbroideryImageRgba,
  renderEmbroideryBoard,
  sourcePreview,
} from './embroideryCanvas'
import type { EmbroideryViewMode } from './embroideryCanvas'
import type { EmbroideryWorkerRequest } from './embroidery.worker'
import './embroidery.css'

type SourceState =
  | { kind: 'example'; id: EmbroideryExampleId; label: string; preview: '' }
  | { kind: 'photo'; uploadId: string; name: string; image: HTMLImageElement; preview: string }

function emptyEmbroideryPlan(stitchMode: StitchMode, hoopSizeCm: number): EmbroideryPlan {
  return {
    stitchMode,
    hoopSizeCm,
    gridWidth: 36,
    gridHeight: 36,
    cellSizeNorm: 1.68 / 36,
    stitches: [],
    layers: [],
    contours: [],
    totalStitches: 0,
    totalMeters: 0,
    estimatedMinutes: 0,
    darkFabric: false,
  }
}

export default function EmbroideryStudio() {
  const { editingArtwork, saveArtwork, notify } = useStudio()
  const [savedWork] = useState<EmbroideryArtworkData | null>(() =>
    editingArtwork?.kind === 'embroidery' ? editingArtwork.data : null,
  )
  const [savedId, setSavedId] = useState<string | undefined>(() =>
    editingArtwork?.kind === 'embroidery' ? editingArtwork.id : undefined,
  )
  const savedIdRef = useRef<string | undefined>(savedId)
  const [source, setSource] = useState<SourceState>(() => {
    const fallbackEx = EMBROIDERY_EXAMPLES[0]
    if (savedWork?.sourceKind === 'example') {
      const ex = EMBROIDERY_EXAMPLES.find(item => item.id === savedWork.exampleId) ?? fallbackEx
      return { kind: 'example', id: ex.id, label: savedWork.sourceName || ex.sourceName, preview: '' }
    }
    return { kind: 'example', id: fallbackEx.id, label: fallbackEx.sourceName, preview: '' }
  })
  const [title, setTitle] = useState<string>(() =>
    editingArtwork?.kind === 'embroidery' ? editingArtwork.name : EMBROIDERY_EXAMPLES[0].title,
  )
  const [stitchMode, setStitchMode] = useState<StitchMode>(() =>
    savedWork?.stitchMode ?? EMBROIDERY_EXAMPLES[0].recommendedMode,
  )
  const [gridSize, setGridSize] = useState<DensityLevel>(() =>
    (DENSITY_LEVELS.includes(savedWork?.gridSize as DensityLevel) ? savedWork?.gridSize : 36) as DensityLevel,
  )
  const [maxColors, setMaxColors] = useState<ColorLimit>(() =>
    (COLOR_LIMITS.includes(savedWork?.maxColors as ColorLimit) ? savedWork?.maxColors : 12) as ColorLimit,
  )
  const [hoopSizeCm, setHoopSizeCm] = useState<HoopSizeCm>(() =>
    (HOOP_SIZES_CM.includes(savedWork?.hoopSizeCm as HoopSizeCm) ? savedWork?.hoopSizeCm : 15) as HoopSizeCm,
  )
  const [fabricId, setFabricId] = useState<string>(() =>
    savedWork?.fabricId ?? EMBROIDERY_EXAMPLES[0].recommendedFabricId,
  )

  const [viewMode, setViewMode] = useState<EmbroideryViewMode>('realistic')
  const [currentStep, setCurrentStep] = useState(1)
  const [showGhost, setShowGhost] = useState(true)
  const showGrid = viewMode !== 'realistic'
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  const fileInput = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fullscreenCanvas = useRef<HTMLCanvasElement>(null)
  const dragDepth = useRef(0)
  const requestId = useRef(0)
  const mounted = useRef(true)
  const workerRunnerRef = useRef<PersistentWorkerRunner<EmbroideryWorkerRequest, EmbroideryPlan> | null>(null)

  const fabric = useMemo(
    () => FABRIC_PRESETS.find(item => item.id === fabricId) ?? FABRIC_PRESETS[0],
    [fabricId],
  )

  const sampledPhoto = useMemo(() => {
    if (source.kind !== 'photo') {
      return { source: null as EmbroideryWorkerRequest['source'] | null, error: '' }
    }
    try {
      const { rgba, width, height } = readEmbroideryImageRgba(source.image, 128)
      if (!hasOpaquePixels(rgba, 32)) {
        return {
          source: null,
          error: '这张图片全部透明，无法提取刺绣图案，请换一张主体清晰的图片。',
        }
      }
      return {
        source: {
          kind: 'photo' as const,
          rgba,
          width,
          height,
          key: `ph:${source.uploadId}`,
        },
        error: '',
      }
    } catch (cause) {
      return {
        source: null,
        error: cause instanceof Error ? cause.message : '图片采样失败，请换一张清晰图片重试。',
      }
    }
  }, [source])

  const workerPayload = useMemo<EmbroideryWorkerRequest | null>(() => {
    const workerSource: EmbroideryWorkerRequest['source'] | null =
      source.kind === 'example' ? { kind: 'example', id: source.id } : sampledPhoto.source
    if (!workerSource) return null
    return {
      source: workerSource,
      stitchMode,
      gridSize,
      maxColors,
      hoopSizeCm,
    }
  }, [source, sampledPhoto.source, stitchMode, gridSize, maxColors, hoopSizeCm])

  const generationJob = useMemo(() => ({ payload: workerPayload }), [workerPayload])
  const [result, setResult] = useState(() => ({
    job: null as typeof generationJob | null,
    plan: emptyEmbroideryPlan(stitchMode, hoopSizeCm),
    title: '',
  }))
  const [generationFailure, setGenerationFailure] = useState<{ job: typeof generationJob; message: string } | null>(null)
  const titleRef = useRef(title)
  titleRef.current = title

  const plan = result.plan
  const isPlanCurrent = result.job === generationJob
  const displayTitle = isPlanCurrent ? title : result.title
  const generationError = sampledPhoto.error || (generationFailure?.job === generationJob ? generationFailure.message : '')
  const canUsePlan = isPlanCurrent && !busy && plan.totalStitches > 0 && !generationError

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      requestId.current++
      workerRunnerRef.current?.dispose()
      workerRunnerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (savedWork?.sourceKind !== 'photo' || !savedWork.photoDataUrl) return
    let cancelled = false
    void loadImageFromDataUrl(savedWork.photoDataUrl)
      .then(image => {
        if (!cancelled && mounted.current) {
          setSource({
            kind: 'photo',
            uploadId: `saved:${editingArtwork?.id ?? 'work'}`,
            name: savedWork.sourceName,
            image,
            preview: savedWork.photoDataUrl!,
          })
        }
      })
      .catch(() => { /* fallback example remains usable */ })
    return () => { cancelled = true }
  }, [savedWork, editingArtwork?.id])

  useEffect(() => {
    if (!generationJob.payload) {
      workerRunnerRef.current?.cancelCurrent()
      return
    }
    if (typeof Worker === 'undefined') return
    let cancelled = false
    const submittedTitle = titleRef.current
    const runner = (workerRunnerRef.current ??= new PersistentWorkerRunner(
      () => new Worker(new URL('./embroidery.worker.ts', import.meta.url), { type: 'module' }),
      { cachePhotoSource: true },
    ))
    runner.submit(generationJob.payload, {
      onSuccess: nextPlan => {
        if (cancelled || !mounted.current) return
        setCurrentStep(1)
        setResult({ job: generationJob, plan: nextPlan, title: submittedTitle })
        setGenerationFailure(null)
      },
      onError: message => {
        if (cancelled || !mounted.current) return
        setGenerationFailure({ job: generationJob, message })
      },
    })
    return () => {
      cancelled = true
    }
  }, [generationJob])

  useEffect(() => {
    setCurrentStep(prev => Math.max(1, Math.min(Math.max(1, plan.totalStitches), prev)))
  }, [plan.totalStitches])

  useEffect(() => {
    if (fullscreenOpen || !canvasRef.current) return
    renderEmbroideryBoard(
      canvasRef.current,
      plan,
      fabric,
      {
        mode: viewMode,
        currentStep,
        showGrid,
        showGhost,
      },
      720,
    )
  }, [fullscreenOpen, plan, fabric, viewMode, currentStep, showGrid, showGhost])

  useEffect(() => {
    if (!fullscreenOpen || !fullscreenCanvas.current) return
    renderEmbroideryBoard(
      fullscreenCanvas.current,
      plan,
      fabric,
      {
        mode: viewMode,
        currentStep,
        showGrid,
        showGhost,
      },
      960,
    )
  }, [fullscreenOpen, plan, fabric, viewMode, currentStep, showGrid, showGhost])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && fullscreenOpen) {
        setFullscreenOpen(false)
        return
      }
      if (!canUsePlan || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      if (event.key === 'ArrowRight') {
        setViewMode('guide')
        setCurrentStep(prev => Math.min(plan.totalStitches, prev + 1))
      } else if (event.key === 'ArrowLeft') {
        setViewMode('guide')
        setCurrentStep(prev => Math.max(1, prev - 1))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canUsePlan, plan.totalStitches, fullscreenOpen])

  function chooseExample(id: EmbroideryExampleId) {
    const meta = EMBROIDERY_EXAMPLES.find(item => item.id === id) ?? EMBROIDERY_EXAMPLES[0]
    requestId.current++
    setBusy(false)
    setError('')
    setSource({ kind: 'example', id: meta.id, label: meta.sourceName, preview: '' })
    setTitle(meta.title)
    setStitchMode(meta.recommendedMode)
    setFabricId(meta.recommendedFabricId)
    setCurrentStep(1)
  }

  async function upload(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    const id = ++requestId.current
    const uploadId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${id}-${Math.random().toString(36).slice(2)}`
    setBusy(true)
    setError('')
    try {
      const image = await decodeLocalImage(file)
      if (!mounted.current || id !== requestId.current) return
      const { rgba } = readEmbroideryImageRgba(image, 128)
      if (!hasOpaquePixels(rgba, 32)) {
        throw new Error('这张图片全部透明，无法提取刺绣图案，请换一张主体清晰的图片。')
      }
      const preview = sourcePreview(image)
      const baseName = file.name.replace(/\.[^.]+$/, '') || '刺绣作品'
      setSource({ kind: 'photo', uploadId, name: file.name, image, preview })
      setTitle(`${baseName} · 刺绣`)
      setCurrentStep(1)
      notify('已抽出 DMC 色卡、结构流场方向与跟绣针序，照片仅在本机处理。')
    } catch (cause) {
      if (!mounted.current || id !== requestId.current) return
      setError(cause instanceof Error ? cause.message : '图片读取失败，请换一张清晰照片重试。')
    } finally {
      if (mounted.current && id === requestId.current) setBusy(false)
    }
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    void upload(event.dataTransfer.files)
  }

  function exportTemplateSvg() {
    if (!canUsePlan) return
    const svg = buildEmbroideryTemplateSvg(plan, title, fabric)
    downloadFile(
      svg,
      `${safeEmbroideryFilename(title)}-1比1水消笔底稿.svg`,
      'image/svg+xml;charset=utf-8',
    )
  }

  function exportMaterialsCsv() {
    if (!canUsePlan) return
    const csv = embroideryMaterialsCsv(plan, title, fabric.name)
    downloadFile(csv, `${safeEmbroideryFilename(title)}-DMC绣线清单.csv`, 'text/csv;charset=utf-8')
  }

  async function exportSheetPng() {
    if (!canUsePlan) return
    const png = await canvasPngBlob(embroiderySheetCanvas(plan, title, fabric))
    downloadFile(png, `${safeEmbroideryFilename(title)}-刺绣图纸.png`)
  }

  function confirmSave(trimmed: string) {
    try {
      const thumbnail = canvasRef.current ? canvasThumbnailDataUrl(canvasRef.current) : ''
      const data: EmbroideryArtworkData = {
        sourceKind: source.kind,
        exampleId: source.kind === 'example' ? source.id : undefined,
        sourceName: source.kind === 'photo' ? source.name : source.label,
        photoDataUrl: source.kind === 'photo' ? compressImageForStorage(source.image) : undefined,
        stitchMode,
        gridSize,
        maxColors,
        hoopSizeCm,
        fabricId,
      }
      const saved = saveArtwork({ kind: 'embroidery', name: trimmed, data, thumbnail }, savedIdRef.current)
      if (!saved) {
        setSaveDialogOpen(false)
        return
      }
      savedIdRef.current = saved.id
      setSavedId(saved.id)
      setTitle(saved.name)
      setSaveDialogOpen(false)
    } catch {
      notify('保存失败，请先导出图纸或线材清单。')
      setSaveDialogOpen(false)
    }
  }

  const active = plan.stitches[Math.max(0, Math.min(plan.stitches.length - 1, currentStep - 1))]
  const windowStart = Math.max(0, currentStep - 4)
  const visibleSequence = plan.stitches.slice(windowStart, windowStart + 14)
  const modeMeta = STITCH_MODE_INFO[stitchMode]

  return (
    <div className="embroidery-studio">
      <header className="studio-heading embroidery-heading">
        <div>
          <div className="eyebrow">
            <Sparkles size={13} /> HAND EMBROIDERY
          </div>
          <h1>刺绣工坊</h1>
        </div>
        <div className="heading-actions embroidery-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setExportDialogOpen(true)} disabled={!canUsePlan}>
            <ArrowDownToLine size={15} /> 导出图纸
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setSaveDialogOpen(true)}
            disabled={!canUsePlan}
          >
            <Save size={15} />
            {savedId ? '更新作品' : '保存作品'}
          </button>
        </div>
      </header>

      <div className="embroidery-journey" aria-label="刺绣制作流程">
        <span><i>01</i> 选一张照片</span>
        <ChevronRight size={12} />
        <span><i>02</i> 挑一种针法</span>
        <ChevronRight size={12} />
        <span><i>03</i> 绣一份流光</span>
      </div>

      <div className="embroidery-layout">
        <aside className="panel embroidery-controls" aria-label="照片上传与针法设置">
          <h2 className="panel-title">
            <FileImage size={16} /> 上传图片
          </h2>

          <input
            ref={fileInput}
            className="embroidery-file-input"
            type="file"
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            aria-label="选择刺绣来源图片"
            onChange={event => {
              void upload(event.currentTarget.files)
              event.currentTarget.value = ''
            }}
          />

          <button
            type="button"
            className={`embroidery-dropzone ${dragging ? 'embroidery-dragging' : ''}`}
            onClick={() => fileInput.current?.click()}
            onDragEnter={event => {
              event.preventDefault()
              dragDepth.current++
              setDragging(true)
            }}
            onDragOver={event => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'copy'
            }}
            onDragLeave={event => {
              event.preventDefault()
              dragDepth.current = Math.max(0, dragDepth.current - 1)
              if (!dragDepth.current) setDragging(false)
            }}
            onDrop={onDrop}
            aria-label="点击或拖入 PNG、JPEG 或 WebP 图片"
          >
            {source.kind === 'photo' && source.preview ? (
              <img className="embroidery-source-thumb" src={source.preview} alt="已导入绣样缩略图" />
            ) : (
              <span className="embroidery-upload-icon">
                <UploadCloud size={26} strokeWidth={1.4} />
              </span>
            )}
            <strong>
              {busy ? '正在解析色块与流场…' : dragging ? '松手，把图片放在这里' : '点击选择，或拖入图片'}
            </strong>
            <span>PNG / JPEG / WebP · 最大 10 MB</span>
          </button>

          {(error || generationError) && (
            <p className="embroidery-error" role="alert">
              <Info size={14} />
              {error || generationError}
            </p>
          )}

          <div className="embroidery-example-label">还没想好？精选示例：</div>
          <div className="embroidery-examples" role="group" aria-label="热门刺绣示例">
            {EMBROIDERY_EXAMPLES.map(example => (
              <button
                type="button"
                key={example.id}
                className={source.kind === 'example' && source.id === example.id ? 'is-active' : ''}
                aria-pressed={source.kind === 'example' && source.id === example.id}
                onClick={() => chooseExample(example.id)}
              >
                {example.label}
              </button>
            ))}
          </div>

          <div className="embroidery-divider" />
          <h2 className="panel-title">
            <Spline size={16} /> 让细节刚刚好
          </h2>

          <div className="field embroidery-param-field">
            <span className="field-label" id="embroidery-mode-label">
              刺绣针法
            </span>
            <div className="embroidery-mode-list" role="group" aria-labelledby="embroidery-mode-label">
              {(['long-short', 'cross-stitch', 'punch-needle'] as const).map(modeKey => {
                const info = STITCH_MODE_INFO[modeKey]
                return (
                  <button
                    type="button"
                    key={modeKey}
                    className={stitchMode === modeKey ? 'is-active' : ''}
                    aria-pressed={stitchMode === modeKey}
                    onClick={() => setStitchMode(modeKey)}
                  >
                    {info.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="field embroidery-param-field">
            <span className="field-label" id="embroidery-density-label">
              绣面精细度
            </span>
            <div className="embroidery-option-row" role="group" aria-labelledby="embroidery-density-label">
              {DENSITY_LEVELS.map(d => (
                <button
                  type="button"
                  key={d}
                  className={gridSize === d ? 'is-active' : ''}
                  aria-pressed={gridSize === d}
                  onClick={() => setGridSize(d)}
                >
                  {d} 格
                </button>
              ))}
            </div>
          </div>

          <div className="field embroidery-param-field">
            <span className="field-label" id="embroidery-colors-label">
              DMC 绣线色数 <small>实际 {plan.layers.length} 色</small>
            </span>
            <div className="embroidery-option-row" role="group" aria-labelledby="embroidery-colors-label">
              {COLOR_LIMITS.map(limit => (
                <button
                  type="button"
                  key={limit}
                  className={maxColors === limit ? 'is-active' : ''}
                  aria-pressed={maxColors === limit}
                  onClick={() => setMaxColors(limit)}
                >
                  {limit} 色
                </button>
              ))}
            </div>
          </div>

          <div className="field embroidery-param-field">
            <span className="field-label" id="embroidery-hoop-label">绣绷直径</span>
            <div className="embroidery-option-row" role="group" aria-labelledby="embroidery-hoop-label">
              {HOOP_SIZES_CM.map(size => (
                <button
                  type="button"
                  key={size}
                  className={hoopSizeCm === size ? 'is-active' : ''}
                  aria-pressed={hoopSizeCm === size}
                  onClick={() => setHoopSizeCm(size)}
                >
                  {size} cm
                </button>
              ))}
            </div>
          </div>

          <div className="field embroidery-param-field">
            <span className="field-label" id="embroidery-fabric-label">绣布底色</span>
            <div className="embroidery-fabrics" role="group" aria-labelledby="embroidery-fabric-label">
              {FABRIC_PRESETS.map(item => (
                <button
                  type="button"
                  key={item.id}
                  className={fabric.id === item.id ? 'is-active' : ''}
                  aria-pressed={fabric.id === item.id}
                  onClick={() => setFabricId(item.id)}
                >
                  <i style={{ backgroundColor: item.board, borderColor: item.weave }} aria-hidden="true" />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="embroidery-stage-column" aria-label="刺绣实感画布与跟绣教学">
          <div className="embroidery-canvas-panel">
            <div className="embroidery-canvas-topbar">
              <div className="segmented" role="group" aria-label="视图模式">
                <button
                  type="button"
                  className={viewMode === 'realistic' ? 'active' : ''}
                  aria-pressed={viewMode === 'realistic'}
                  onClick={() => setViewMode('realistic')}
                >
                  <Eye size={13} /> 刺绣实感
                </button>
                <button
                  type="button"
                  className={viewMode === 'pattern' ? 'active' : ''}
                  aria-pressed={viewMode === 'pattern'}
                  onClick={() => setViewMode('pattern')}
                >
                  <Grid2X2 size={13} /> 水消笔底稿
                </button>
                <button
                  type="button"
                  className={viewMode === 'guide' ? 'active' : ''}
                  aria-pressed={viewMode === 'guide'}
                  onClick={() => setViewMode('guide')}
                  disabled={!canUsePlan}
                >
                  <Play size={13} /> 分步跟绣教程
                </button>
              </div>

              <div className="embroidery-topbar-toggles">
                {viewMode === 'guide' && (
                  <label>
                    <input
                      type="checkbox"
                      checked={showGhost}
                      onChange={event => setShowGhost(event.target.checked)}
                    />
                    未绣淡影
                  </label>
                )}
                <button
                  type="button"
                  className="studio-fullscreen-btn"
                  onClick={() => setFullscreenOpen(true)}
                  disabled={!canUsePlan}
                  aria-label="全屏浏览"
                >
                  <Maximize2 size={13} />
                  <span>全屏浏览</span>
                </button>
              </div>
            </div>

            <div className="embroidery-stage-card">
              <div className="embroidery-stage-inner">
                <div className="embroidery-board-wrap">
                  <canvas
                    ref={canvasRef}
                    role="img"
                    aria-label={`${displayTitle}刺绣画布预览，${STITCH_MODE_INFO[plan.stitchMode].name}，共 ${plan.totalStitches} 针`}
                  />
                </div>
              </div>
            </div>
          </div>

          {viewMode === 'realistic' && (
            <div className="embroidery-stats" aria-live="polite">
              <div>
                <Spline size={17} />
                <span>
                  总针数
                  <strong>{plan.totalStitches}<small>针</small></strong>
                </span>
              </div>
              <div>
                <Palette size={17} />
                <span>
                  DMC 用色
                  <strong>{plan.layers.length}<small>色</small></strong>
                </span>
              </div>
              <div>
                <Ruler size={17} />
                <span>
                  预计用线
                  <strong>{plan.totalMeters}<small>m</small></strong>
                </span>
              </div>
              <div>
                <Sparkles size={17} />
                <span>
                  参考耗时
                  <strong>{plan.estimatedMinutes}<small>分</small></strong>
                </span>
              </div>
            </div>
          )}

          {viewMode === 'guide' && active && (
            <div className="embroidery-player" aria-label="交互式跟绣控制器">
              <div className="embroidery-player-top">
                <div className="embroidery-step-callout">
                  <div className="embroidery-step-badges">
                    <span className="embroidery-step-badge">第 {currentStep} / {plan.totalStitches} 针</span>
                  </div>
                </div>

                <div className="embroidery-player-buttons">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                    disabled={!canUsePlan || currentStep <= 1}
                  >
                    <ArrowLeft size={14} /> 上一针
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setCurrentStep(prev => Math.min(plan.totalStitches, prev + 1))}
                    disabled={!canUsePlan || currentStep >= plan.totalStitches}
                  >
                    下一针 <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    title="回到第 1 针"
                    aria-label="回到第 1 针"
                    onClick={() => setCurrentStep(1)}
                    disabled={!canUsePlan}
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>

              <label className="embroidery-slider-row">
                <span>绣制进度</span>
                <input
                  type="range"
                  min={1}
                  max={Math.max(1, plan.totalStitches)}
                  value={currentStep}
                  aria-label="当前刺绣进度针步"
                  disabled={!canUsePlan}
                  onChange={event => setCurrentStep(Number(event.target.value))}
                />
                <span>{Math.round((currentStep / Math.max(1, plan.totalStitches)) * 100)}%</span>
              </label>
            </div>
          )}
        </section>

        <aside className="panel embroidery-bom-panel" aria-label="DMC 绣线清单与针步表">
          <h2 className="panel-title">
            <Palette size={16} /> 绣线色序
          </h2>
          <div className="embroidery-bom-head" aria-hidden="true">
            <span>色号</span>
            <span>符号</span>
            <span>股数</span>
            <span>线长</span>
          </div>
          <div className="embroidery-bom-list embroidery-layer-pills" aria-label="绣线色层跳转">
            {plan.layers.map(layer => {
              const isCurrent = currentStep >= layer.startStep && currentStep <= layer.endStep
              return (
                <button
                  type="button"
                  key={layer.index}
                  className={`embroidery-bom-row${isCurrent ? ' is-active' : ''}`}
                  disabled={!canUsePlan}
                  onClick={() => {
                    setViewMode('guide')
                    setCurrentStep(layer.startStep)
                  }}
                  title={`跳至 ${layer.dmcCode} ${layer.colorName}（第 ${layer.startStep}–${layer.endStep} 针）`}
                >
                  <span className="embroidery-bom-swatch">
                    <i style={{ backgroundColor: layer.color }} />
                    <span>
                      <strong>{layer.dmcCode}</strong>
                      <small>{layer.colorName} · {layer.stitchCount}针</small>
                    </span>
                  </span>
                  <span className="embroidery-bom-symbol">{layer.symbol}</span>
                  <span>{layer.strands}股</span>
                  <span>{layer.lengthMeters}m</span>
                </button>
              )
            })}
          </div>

          <div className="embroidery-divider" />
          <h2 className="panel-title">
            <Ruler size={16} /> 分步针序
          </h2>
          <div className="embroidery-seq-list" role="list">
            {visibleSequence.map(item => (
              <button
                type="button"
                role="listitem"
                key={item.index}
                className={`embroidery-seq-item ${item.index === currentStep && viewMode === 'guide' ? 'is-current' : ''}`}
                disabled={!canUsePlan}
                onClick={() => {
                  setViewMode('guide')
                  setCurrentStep(item.index)
                }}
              >
                <span className="embroidery-seq-num">#{item.index}</span>
                <span className="embroidery-seq-desc">
                  <i style={{ backgroundColor: item.color }} />
                  {item.dmcCode}
                </span>
                <small>{item.lengthMm}mm</small>
              </button>
            ))}
          </div>
        </aside>
      </div>

      <footer className="studio-footer">把心爱的画面，一针一线绣成温润流光。</footer>

      <ExportArtworkModal
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        options={[
          {
            id: 'png',
            format: 'PNG',
            label: '高清刺绣图纸',
            defaultChecked: true,
            disabled: !canUsePlan,
            onExport: exportSheetPng,
            successMessage: '高清刺绣图纸与 DMC 清单 PNG 已下载。',
          },
          {
            id: 'svg',
            format: 'SVG',
            label: '1:1 水消笔底稿',
            defaultChecked: false,
            disabled: !canUsePlan,
            onExport: exportTemplateSvg,
            successMessage: `已下载 ${plan.hoopSizeCm} cm 1:1 水消笔底稿 SVG。`,
          },
          {
            id: 'csv',
            format: 'CSV',
            label: 'DMC 绣线清单',
            defaultChecked: false,
            disabled: !canUsePlan,
            onExport: exportMaterialsCsv,
            successMessage: `已导出 ${plan.layers.length} 色 DMC 绣线与 ${plan.totalStitches} 针清单 CSV。`,
          },
        ]}
      />

      <SaveArtworkModal
        open={saveDialogOpen}
        isUpdate={Boolean(savedId)}
        initialName={title}
        inputId="embroidery-title"
        placeholder="例如：送给你的山茶手帕"
        onClose={() => setSaveDialogOpen(false)}
        onConfirm={confirmSave}
      />

      {fullscreenOpen && (
        <div
          className="studio-fullscreen-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="全屏预览刺绣作品"
          onClick={event => {
            if (event.target === event.currentTarget) setFullscreenOpen(false)
          }}
        >
          <div className="studio-fullscreen-bar">
            <div className="studio-fullscreen-meta">
              <strong>{title || '刺绣作品'}</strong>
              <span>{modeMeta.name} · {plan.totalStitches} 针 · {plan.layers.length} 色 · 绣绷 {plan.hoopSizeCm} cm</span>
            </div>
            <div className="studio-fullscreen-tools">
              <div className="segmented" role="group" aria-label="全屏视图模式">
                <button
                  type="button"
                  className={viewMode === 'realistic' ? 'active' : ''}
                  aria-pressed={viewMode === 'realistic'}
                  onClick={() => setViewMode('realistic')}
                >
                  <Eye size={13} /> 刺绣实感
                </button>
                <button
                  type="button"
                  className={viewMode === 'pattern' ? 'active' : ''}
                  aria-pressed={viewMode === 'pattern'}
                  onClick={() => setViewMode('pattern')}
                >
                  <Grid2X2 size={13} /> 水消笔底稿
                </button>
                <button
                  type="button"
                  className={viewMode === 'guide' ? 'active' : ''}
                  aria-pressed={viewMode === 'guide'}
                  onClick={() => setViewMode('guide')}
                >
                  <Play size={13} /> 分步跟绣教程
                </button>
              </div>
              {viewMode === 'guide' && (
                <label className="studio-fullscreen-toggle">
                  <input
                    type="checkbox"
                    checked={showGhost}
                    onChange={event => setShowGhost(event.target.checked)}
                  />
                  <span>未绣淡影</span>
                </label>
              )}
              <button
                type="button"
                className="studio-fullscreen-close"
                onClick={() => setFullscreenOpen(false)}
                aria-label="关闭全屏预览"
              >
                <X size={16} />
                <span>关闭</span>
              </button>
            </div>
          </div>
          <div
            className="studio-fullscreen-body"
            onClick={event => {
              if (event.target === event.currentTarget) setFullscreenOpen(false)
            }}
          >
            <div
              className="studio-fullscreen-stage"
              onClick={event => {
                if (event.target === event.currentTarget) setFullscreenOpen(false)
              }}
            >
              <div className="studio-fullscreen-board" style={{ '--board-ratio': '1' } as CSSProperties}>
                <canvas ref={fullscreenCanvas} aria-label={`${title || '刺绣作品'} 全屏预览`} />
              </div>
            </div>
            {viewMode === 'guide' && active && (
              <aside className="studio-fullscreen-guide" aria-label="全屏分步跟绣控制">
                <div className="studio-fullscreen-guide-top">
                  <span className="studio-fullscreen-guide-badge">
                    第 {currentStep} / {plan.totalStitches} 针
                  </span>
                  <span className="studio-fullscreen-guide-pct">
                    {Math.round((currentStep / Math.max(1, plan.totalStitches)) * 100)}%
                  </span>
                </div>
                <div className="studio-fullscreen-guide-desc">
                  <strong>
                    <i className="studio-fullscreen-guide-dot" style={{ backgroundColor: active.color }} />
                    DMC {active.dmcCode} · {active.colorName}
                  </strong>
                  <span>
                    针距 {active.lengthMm} mm · {active.strands} 股线
                    {active.gridX != null && active.gridY != null ? ` · X${active.gridX + 1} · Y${active.gridY + 1}` : ''}
                  </span>
                </div>
                <div className="studio-fullscreen-guide-actions">
                  <button
                    type="button"
                    className="studio-fullscreen-guide-btn"
                    onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                    disabled={currentStep <= 1}
                  >
                    <ArrowLeft size={14} /> 上一针
                  </button>
                  <button
                    type="button"
                    className="studio-fullscreen-guide-btn is-primary"
                    onClick={() => setCurrentStep(prev => Math.min(plan.totalStitches, prev + 1))}
                    disabled={currentStep >= plan.totalStitches}
                  >
                    下一针 <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    className="studio-fullscreen-guide-btn is-reset"
                    onClick={() => setCurrentStep(1)}
                    aria-label="全屏回到第 1 针"
                    title="回到第 1 针"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
                <input
                  type="range"
                  className="studio-fullscreen-guide-range"
                  min={1}
                  max={Math.max(1, plan.totalStitches)}
                  value={currentStep}
                  aria-label="全屏刺绣进度针步"
                  onChange={event => setCurrentStep(Number(event.target.value))}
                />
              </aside>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
