import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Compass,
  Eye,
  FileImage,
  Info,
  Maximize2,
  Palette,
  Play,
  RotateCcw,
  Ruler,
  Save,
  UploadCloud,
  X,
} from 'lucide-react'
import ExportArtworkModal from '../../components/ExportArtworkModal'
import SaveArtworkModal from '../../components/SaveArtworkModal'
import { canvasThumbnailDataUrl, compressImageForStorage, loadStoredPhoto } from '../../lib/artworkImage'
import { downloadFile } from '../../lib/export'
import { isMediaRef } from '../../lib/mediaStore'
import { hasOpaquePixels, PersistentWorkerRunner } from '../../lib/persistentWorker'
import { readStepProgress, writeStepProgress } from '../../lib/storage'
import { useStudio } from '../../lib/studio'
import type { CompassArtworkData } from '../../lib/types'
import {
  buildCompassTemplateSvg,
  COMPASS_ALGORITHM_INFO,
  COMPASS_EXAMPLES,
  COMPASS_PALETTES,
  compassStepsCsv,
  DEFAULT_COMPASS_MAP_SIZE,
  padRing,
  PAPER_SIZES_CM,
  RING_COUNTS,
  safeCompassFilename,
} from './compass'
import type {
  CompassAlgorithm,
  CompassColorMode,
  CompassContrastMode,
  CompassExampleId,
  CompassPalette,
  CompassPlan,
  PaperSizeCm,
  RingCount,
} from './compass'
import {
  canvasPngBlob,
  compassSheetCanvas,
  decodeLocalImage,
  DEFAULT_PHOTO_FRAMING,
  readCroppedImageRgba,
  renderCompassBoard,
  renderPhotoFraming,
  sourcePreview,
} from './compassCanvas'
import type { PhotoFraming } from './compassCanvas'
import type { CompassWorkerRequest } from './compass.worker'
import './compass.css'

function emptyCompassPlan(
  algorithm: CompassAlgorithm,
  ringCount: number,
  paperSizeCm: PaperSizeCm,
  colorMode: CompassColorMode,
  contrastMode: CompassContrastMode,
): CompassPlan {
  return {
    algorithm,
    colorMode,
    contrastMode,
    mapSize: DEFAULT_COMPASS_MAP_SIZE,
    ringCount,
    paperSizeCm,
    maxRadiusMm: Number(((paperSizeCm * 10) * 0.43).toFixed(1)),
    ringSpacingNorm: 1 / ringCount,
    centers: [{ id: 'O', label: '中心圆心 O', nx: 0, ny: 0, xMm: 0, yMm: 0 }],
    steps: [],
    layers: [],
    totalLengthMeters: 0,
  }
}

const PROGRESS_STORAGE_KEY = 'tracecraft.compass-art-progress.v1'

type SourceState =
  | { kind: 'example'; id: CompassExampleId; label: string; preview: '' }
  | { kind: 'photo'; uploadId: string; name: string; image: HTMLImageElement; preview: string }

function clampStep(step: number, totalSteps: number): number {
  if (totalSteps === 0) return 0
  return Math.max(1, Math.min(totalSteps, Number.isFinite(step) ? Math.trunc(step) : 1))
}

function readSavedProgress(signature: string): number | null {
  return readStepProgress(PROGRESS_STORAGE_KEY, signature)
}

function writeSavedProgress(signature: string, step: number) {
  writeStepProgress(PROGRESS_STORAGE_KEY, signature, step)
}

export default function CompassStudio() {
  const { editingArtwork, saveArtwork, notify } = useStudio()
  const [savedWork] = useState<CompassArtworkData | null>(() =>
    editingArtwork?.kind === 'compass' ? editingArtwork.data : null,
  )
  const [savedId, setSavedId] = useState<string | undefined>(() =>
    editingArtwork?.kind === 'compass' ? editingArtwork.id : undefined,
  )
  const savedIdRef = useRef<string | undefined>(savedId)
  const initialWorkId = useRef<string | undefined>(savedId)
  const savedPhotoRef = useRef<{ uploadId: string; ref: string } | null>(
    savedWork?.sourceKind === 'photo' && isMediaRef(savedWork.photoDataUrl)
      ? { uploadId: `saved:${initialWorkId.current ?? 'work'}`, ref: savedWork.photoDataUrl }
      : null,
  )
  const [source, setSource] = useState<SourceState>(() => {
    const fallbackEx = COMPASS_EXAMPLES[0]
    if (savedWork?.sourceKind === 'example') {
      const ex = COMPASS_EXAMPLES.find(item => item.id === savedWork.exampleId) ?? fallbackEx
      return { kind: 'example', id: ex.id, label: savedWork.sourceName || ex.sourceName, preview: '' }
    }
    return { kind: 'example', id: fallbackEx.id, label: fallbackEx.sourceName, preview: '' }
  })
  const [title, setTitle] = useState<string>(() =>
    editingArtwork?.kind === 'compass' ? editingArtwork.name : COMPASS_EXAMPLES[0].title,
  )
  const [algorithm, setAlgorithm] = useState<CompassAlgorithm>(() =>
    savedWork?.algorithm ?? COMPASS_EXAMPLES[0].recommendedAlgorithm,
  )
  const [colorMode, setColorMode] = useState<CompassColorMode>(() =>
    savedWork?.colorMode ?? COMPASS_EXAMPLES[0].recommendedColorMode,
  )
  const [contrastMode, setContrastMode] = useState<CompassContrastMode>(() => savedWork?.contrastMode ?? 'portrait')
  const [ringCount, setRingCount] = useState<RingCount>(() =>
    (RING_COUNTS.includes(savedWork?.ringCount as RingCount) ? savedWork?.ringCount : 40) as RingCount,
  )
  const [paperSizeCm, setPaperSizeCm] = useState<PaperSizeCm>(() =>
    (PAPER_SIZES_CM.includes(savedWork?.paperSizeCm as PaperSizeCm) ? savedWork?.paperSizeCm : 20) as PaperSizeCm,
  )
  const [paletteId, setPaletteId] = useState<string>(() => savedWork?.paletteId ?? COMPASS_EXAMPLES[0].defaultPaletteId)
  const [usePhotoColors, setUsePhotoColors] = useState(() => savedWork?.usePhotoColors ?? true)
  const [framing, setFraming] = useState<PhotoFraming>(() => savedWork?.framing ?? DEFAULT_PHOTO_FRAMING)

  const [mode, setMode] = useState<'guide' | 'full'>('full')
  const [requestedStep, setCurrentStep] = useState(1)
  const showProtractor = mode !== 'full'
  const [showGhost, setShowGhost] = useState(true)
  const [listFilter, setListFilter] = useState<'window' | 'all'>('window')
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [previewError, setPreviewError] = useState('')
  const [framingError, setFramingError] = useState('')

  const mounted = useRef(true)
  const requestId = useRef(0)
  const dragDepth = useRef(0)
  const workerRunnerRef = useRef<PersistentWorkerRunner<CompassWorkerRequest, CompassPlan> | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const boardCanvas = useRef<HTMLCanvasElement>(null)
  const fullscreenCanvas = useRef<HTMLCanvasElement>(null)
  const photoFramingCanvas = useRef<HTMLCanvasElement>(null)

  const palette = useMemo(
    () => COMPASS_PALETTES.find(item => item.id === paletteId) ?? COMPASS_PALETTES[0],
    [paletteId],
  )
  const autoInvert = palette.darkPaper

  const signature = useMemo(() => {
    const id = source.kind === 'example' ? `ex:${source.id}` : `ph:${source.uploadId}:${usePhotoColors ? 1 : 0}`
    return `compass-v1|${id}|${framing.zoom}:${framing.x}:${framing.y}|${algorithm}|${colorMode}|${contrastMode}|${ringCount}|${paperSizeCm}|${paletteId}|${autoInvert ? 1 : 0}`
  }, [source, framing, algorithm, colorMode, contrastMode, ringCount, paperSizeCm, paletteId, usePhotoColors, autoInvert])

  const sampledPhoto = useMemo(() => {
    if (source.kind !== 'photo') {
      return { source: null as CompassWorkerRequest['source'] | null, error: '' }
    }
    try {
      const rgba = readCroppedImageRgba(source.image, DEFAULT_COMPASS_MAP_SIZE, framing)
      if (!hasOpaquePixels(rgba, 16)) {
        return {
          source: null,
          error: '这张图片全部透明，无法提取圆规画，请换一张主体清晰的图片。',
        }
      }
      return {
        source: {
          kind: 'photo' as const,
          rgba,
          width: DEFAULT_COMPASS_MAP_SIZE,
          height: DEFAULT_COMPASS_MAP_SIZE,
          key: `ph:${source.uploadId}:${framing.zoom}:${framing.x}:${framing.y}`,
        },
        error: '',
      }
    } catch (cause) {
      return {
        source: null,
        error: cause instanceof Error ? cause.message : '图片采样失败，请调整取景或更换照片。',
      }
    }
  }, [source, framing])

  const workerPayload = useMemo<CompassWorkerRequest | null>(() => {
    const workerSource: CompassWorkerRequest['source'] | null =
      source.kind === 'example' ? { kind: 'example', id: source.id } : sampledPhoto.source
    if (!workerSource) return null
    return {
      source: workerSource,
      mapSize: DEFAULT_COMPASS_MAP_SIZE,
      algorithm,
      ringCount,
      paperSizeCm,
      colorMode,
      contrastMode,
      palette,
      usePhotoColors,
      autoInvert,
    }
  }, [source, sampledPhoto.source, algorithm, ringCount, paperSizeCm, colorMode, contrastMode, palette, usePhotoColors, autoInvert])

  const generationJob = useMemo(
    () => ({ signature, payload: workerPayload }),
    [signature, workerPayload],
  )
  const [result, setResult] = useState<{
    job: typeof generationJob | null
    plan: CompassPlan
    palette: CompassPalette
    title: string
  }>(() => ({
    job: null,
    plan: emptyCompassPlan(algorithm, ringCount, paperSizeCm, colorMode, contrastMode),
    palette,
    title: '',
  }))
  const [generationFailure, setGenerationFailure] = useState<{ job: typeof generationJob; message: string } | null>(null)
  const titleRef = useRef(title)
  titleRef.current = title

  const plan = result.plan
  const totalSteps = plan.steps.length
  const hasSteps = totalSteps > 0
  const isPlanCurrent = result.job === generationJob
  const displayTitle = isPlanCurrent ? title : result.title
  const generationError = sampledPhoto.error || (generationFailure?.job === generationJob ? generationFailure.message : '')
  const currentStep = clampStep(requestedStep, totalSteps)
  const canUsePlan = isPlanCurrent && !busy && hasSteps && !generationError

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
    const id = ++requestId.current
    const uploadId = `saved:${initialWorkId.current ?? 'work'}`
    void loadStoredPhoto(savedWork.photoDataUrl)
      .then(({ image, preview }) => {
        if (!cancelled && mounted.current && id === requestId.current) {
          setSource({
            kind: 'photo',
            uploadId,
            name: savedWork.sourceName,
            image,
            preview,
          })
        }
      })
      .catch(() => {
        if (!cancelled && mounted.current && id === requestId.current) {
          setError('已保存的作品源图已缺失或无法读取，已暂时显示示例图，你可以重新上传照片后更新保存。')
          notify('已保存的作品源图缺失，已暂时显示示例图，可重新上传照片恢复。')
        }
      })
    return () => { cancelled = true }
  }, [savedWork, notify])

  useEffect(() => {
    if (
      editingArtwork?.kind === 'compass' &&
      editingArtwork.id === initialWorkId.current &&
      editingArtwork.data.sourceKind === 'photo' &&
      isMediaRef(editingArtwork.data.photoDataUrl) &&
      !savedPhotoRef.current
    ) {
      savedPhotoRef.current = {
        uploadId: `saved:${editingArtwork.id}`,
        ref: editingArtwork.data.photoDataUrl,
      }
    }
  }, [editingArtwork])

  useEffect(() => {
    if (!generationJob.payload) {
      workerRunnerRef.current?.cancelCurrent()
      return
    }
    if (typeof Worker === 'undefined') return
    let cancelled = false
    const submittedTitle = titleRef.current
    const submittedPalette = generationJob.payload.palette
    const runner = (workerRunnerRef.current ??= new PersistentWorkerRunner(
      () => new Worker(new URL('./compass.worker.ts', import.meta.url), { type: 'module' }),
      { cachePhotoSource: true },
    ))
    runner.submit(generationJob.payload, {
      onSuccess: nextPlan => {
        if (cancelled || !mounted.current) return
        const saved = readSavedProgress(generationJob.signature)
        setCurrentStep(clampStep(saved ?? 1, nextPlan.steps.length))
        if (nextPlan.steps.length === 0) setMode('full')
        setResult({
          job: generationJob,
          plan: nextPlan,
          palette: submittedPalette,
          title: submittedTitle,
        })
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
    if (isPlanCurrent) writeSavedProgress(signature, currentStep)
  }, [isPlanCurrent, signature, currentStep])

  useEffect(() => {
    if (source.kind !== 'photo' || !photoFramingCanvas.current) return
    try {
      renderPhotoFraming(photoFramingCanvas.current, source.image, framing)
      setFramingError('')
    } catch (cause) {
      setFramingError(cause instanceof Error ? cause.message : '当前浏览器不支持取景预览。')
    }
  }, [source, framing])

  useEffect(() => {
    if (fullscreenOpen || !boardCanvas.current) return
    try {
      renderCompassBoard(boardCanvas.current, plan, result.palette, {
        mode,
        currentStep,
        showProtractor,
        showGhost,
      })
      setPreviewError('')
    } catch (cause) {
      setPreviewError(cause instanceof Error ? cause.message : '当前浏览器不支持画布预览。')
    }
  }, [fullscreenOpen, plan, result.palette, mode, currentStep, showProtractor, showGhost])

  useEffect(() => {
    if (!fullscreenOpen || !fullscreenCanvas.current) return
    try {
      renderCompassBoard(fullscreenCanvas.current, plan, result.palette, {
        mode,
        currentStep,
        showProtractor,
        showGhost,
      }, 960)
    } catch { /* main previewError already handles canvas failure */ }
  }, [fullscreenOpen, plan, result.palette, mode, currentStep, showProtractor, showGhost])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && fullscreenOpen) {
        setFullscreenOpen(false)
        return
      }
      if (!canUsePlan || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
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
        setMode('guide')
        setCurrentStep(prev => clampStep(clampStep(prev, totalSteps) + 1, totalSteps))
      } else if (event.key === 'ArrowLeft') {
        setMode('guide')
        setCurrentStep(prev => clampStep(clampStep(prev, totalSteps) - 1, totalSteps))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canUsePlan, totalSteps, fullscreenOpen])

  function chooseExample(id: CompassExampleId) {
    const meta = COMPASS_EXAMPLES.find(item => item.id === id) ?? COMPASS_EXAMPLES[0]
    requestId.current++
    setBusy(false)
    setFraming(DEFAULT_PHOTO_FRAMING)
    setFramingError('')
    setError('')
    setSource({ kind: 'example', id: meta.id, label: meta.sourceName, preview: '' })
    setTitle(meta.title)
    setPaletteId(meta.defaultPaletteId)
    setColorMode(meta.recommendedColorMode)
    setAlgorithm(meta.recommendedAlgorithm)
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
      const rgba = readCroppedImageRgba(image, DEFAULT_COMPASS_MAP_SIZE, DEFAULT_PHOTO_FRAMING)
      if (!hasOpaquePixels(rgba, 16)) {
        throw new Error('这张图片全部透明，无法提取圆规画，请换一张主体清晰的图片。')
      }
      const preview = sourcePreview(image)
      const baseName = file.name.replace(/\.[^.]+$/, '') || '照片圆规画'
      setFraming(DEFAULT_PHOTO_FRAMING)
      setFramingError('')
      setSource({ kind: 'photo', uploadId, name: file.name, image, preview })
      setTitle(`${baseName} · 圆规画`)
      notify('照片已在本机读取，可切换三种圆规画法或调整取景。')
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
    const svg = buildCompassTemplateSvg(plan, title, palette)
    downloadFile(
      svg,
      `${safeCompassFilename(title)}-1比1量角底稿.svg`,
      'image/svg+xml;charset=utf-8',
    )
  }

  function exportStepsCsv() {
    if (!canUsePlan) return
    const csv = compassStepsCsv(plan, title, palette.name)
    downloadFile(csv, `${safeCompassFilename(title)}-圆环角度表.csv`, 'text/csv;charset=utf-8')
  }

  async function exportSheetPng() {
    if (!canUsePlan || previewError) return
    const canvas = compassSheetCanvas(plan, palette, title)
    const png = await canvasPngBlob(canvas)
    downloadFile(png, `${safeCompassFilename(title)}-圆规画图纸.png`, 'image/png')
  }

  const active = hasSteps ? plan.steps[currentStep - 1] : undefined
  const visibleSteps = useMemo(() => {
    if (listFilter === 'all') return plan.steps
    const start = Math.max(0, currentStep - 8)
    const end = Math.min(plan.steps.length, start + 40)
    return plan.steps.slice(start, end)
  }, [plan.steps, currentStep, listFilter])

  async function confirmSave(trimmed: string) {
    if (!canUsePlan || previewError) return
    try {
      const thumbnail = boardCanvas.current ? canvasThumbnailDataUrl(boardCanvas.current) : ''
      const photoRef = source.kind === 'photo'
        ? (savedPhotoRef.current?.uploadId === source.uploadId
            ? savedPhotoRef.current.ref
            : compressImageForStorage(source.image))
        : undefined
      const data: CompassArtworkData = {
        sourceKind: source.kind,
        exampleId: source.kind === 'example' ? source.id : undefined,
        sourceName: source.kind === 'photo' ? source.name : source.label,
        photoDataUrl: photoRef,
        algorithm,
        colorMode,
        contrastMode,
        ringCount,
        paperSizeCm,
        paletteId,
        usePhotoColors,
        framing,
      }
      const saved = await saveArtwork({ kind: 'compass', name: trimmed, data, thumbnail }, savedIdRef.current)
      if (!mounted.current) return
      if (!saved) {
        setSaveDialogOpen(false)
        return
      }
      if (source.kind === 'photo' && saved.kind === 'compass' && saved.data.photoDataUrl) {
        savedPhotoRef.current = { uploadId: source.uploadId, ref: saved.data.photoDataUrl }
      }
      savedIdRef.current = saved.id
      setSavedId(saved.id)
      setTitle(saved.name)
      setSaveDialogOpen(false)
    } catch {
      if (!mounted.current) return
      notify('保存失败，请先导出图纸与角度清单。')
      setSaveDialogOpen(false)
    }
  }

  const progressPct = hasSteps ? Math.round((currentStep / totalSteps) * 100) : 0

  return (
    <div className="compass-studio">
      <header className="studio-heading compass-heading">
        <div>
          <div className="eyebrow">
            <Compass size={13} /> COMPASS HALFTONE
          </div>
          <h1>圆规画工坊</h1>
        </div>
        <div className="heading-actions compass-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setExportDialogOpen(true)}
            disabled={!canUsePlan}
          >
            <ArrowDownToLine size={15} />
            导出图纸
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setSaveDialogOpen(true)}
            disabled={!canUsePlan || Boolean(previewError)}
          >
            <Save size={15} />
            {savedId ? '更新作品' : '保存作品'}
          </button>
        </div>
      </header>

      <div className="compass-journey" aria-label="圆规画制作流程">
        <span><i>01</i> 选一张照片</span>
        <ChevronRight size={12} />
        <span><i>02</i> 挑一种画法</span>
        <ChevronRight size={12} />
        <span><i>03</i> 绘一幅版画</span>
      </div>

      <div className="compass-layout">
        <aside className="panel compass-controls" aria-label="图片与圆规参数">
          <h2 className="panel-title">
            <FileImage size={16} /> 上传图片
          </h2>
          <input
            ref={fileInput}
            className="compass-file-input"
            type="file"
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            aria-label="选择圆规画来源图片"
            onChange={event => {
              void upload(event.currentTarget.files)
              event.currentTarget.value = ''
            }}
          />
          <button
            type="button"
            className={`compass-dropzone${dragging ? ' compass-dragging' : ''}`}
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
            aria-label="点击选择图片，也可拖入 PNG、JPEG 或 WebP 图片"
          >
            {source.kind === 'photo' && source.preview ? (
              <img className="compass-source-image" src={source.preview} alt="上传照片缩略预览" />
            ) : (
              <span className="compass-upload-icon">
                <UploadCloud size={24} strokeWidth={1.5} />
              </span>
            )}
            <strong>
              {busy ? '正在读取照片…' : dragging ? '松手，把图片放在这里' : '点击选择，或拖入图片'}
            </strong>
            <span>PNG / JPEG / WebP · 最大 10 MB</span>
          </button>

          {source.kind === 'photo' && (
            <div className="compass-photo-framing" key={source.uploadId}>
              <canvas ref={photoFramingCanvas} width={200} height={200} role="img" aria-label="照片取景预览" />
              <p>可放大聚焦五官后生成更清晰的圆弧层次</p>
              <details>
                <summary>调整取景</summary>
                <div className="compass-framing-controls">
                  <label htmlFor="compass-framing-zoom">放大 <span>{framing.zoom.toFixed(2)}×</span></label>
                  <input
                    id="compass-framing-zoom"
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={framing.zoom}
                    onChange={event => setFraming(value => ({ ...value, zoom: Number(event.target.value) }))}
                  />
                  <label htmlFor="compass-framing-x">横向焦点 <span>{Math.round(framing.x * 100)}%</span></label>
                  <input
                    id="compass-framing-x"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={framing.x}
                    onChange={event => setFraming(value => ({ ...value, x: Number(event.target.value) }))}
                  />
                  <label htmlFor="compass-framing-y">纵向焦点 <span>{Math.round(framing.y * 100)}%</span></label>
                  <input
                    id="compass-framing-y"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={framing.y}
                    onChange={event => setFraming(value => ({ ...value, y: Number(event.target.value) }))}
                  />
                  <button type="button" className="compass-reset-btn" onClick={() => setFraming(DEFAULT_PHOTO_FRAMING)}>
                    <RotateCcw size={12} /> 重置取景
                  </button>
                </div>
              </details>
              {framingError && <p className="compass-error" role="alert">{framingError}</p>}
            </div>
          )}

          {(error || generationError) && (
            <p className="compass-error" role="alert">
              <Info size={14} />
              {error || generationError}
            </p>
          )}

          <div className="compass-example-label">还没想好？精选示例：</div>
          <div className="compass-examples" role="group" aria-label="热门圆规画示例">
            {COMPASS_EXAMPLES.map(example => (
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

          <div className="compass-divider" />
          <h2 className="panel-title">
            <Ruler size={16} /> 让细节刚刚好
          </h2>

          <div className="field compass-param-field">
            <span className="field-label" id="compass-alg-label">
              圆规画法
            </span>
            <div className="compass-algo-modes" role="group" aria-label="圆规画算法模式">
              {(Object.keys(COMPASS_ALGORITHM_INFO) as CompassAlgorithm[]).map(algKey => {
                const info = COMPASS_ALGORITHM_INFO[algKey]
                return (
                  <button
                    type="button"
                    key={algKey}
                    className={algorithm === algKey ? 'is-active' : ''}
                    aria-pressed={algorithm === algKey}
                    onClick={() => setAlgorithm(algKey)}
                  >
                    {info.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="field compass-param-field">
            <span className="field-label" id="compass-contrast-label">
              主次对比度
            </span>
            <div className="compass-option-row" role="group" aria-labelledby="compass-contrast-label">
              <button
                type="button"
                className={contrastMode === 'portrait' ? 'is-active' : ''}
                aria-pressed={contrastMode === 'portrait'}
                onClick={() => setContrastMode('portrait')}
              >
                默认
              </button>
              <button
                type="button"
                className={contrastMode === 'soft' ? 'is-active' : ''}
                aria-pressed={contrastMode === 'soft'}
                onClick={() => setContrastMode('soft')}
              >
                柔和
              </button>
              <button
                type="button"
                className={contrastMode === 'dramatic' ? 'is-active' : ''}
                aria-pressed={contrastMode === 'dramatic'}
                onClick={() => setContrastMode('dramatic')}
              >
                强对比
              </button>
            </div>
          </div>

          <div className="field compass-param-field">
            <span className="field-label" id="compass-color-label">画笔色彩层次</span>
            <div className="compass-option-row" role="group" aria-labelledby="compass-color-label">
              <button
                type="button"
                className={colorMode === 'mono' ? 'is-active' : ''}
                aria-pressed={colorMode === 'mono'}
                onClick={() => setColorMode('mono')}
              >
                经典单色
              </button>
              <button
                type="button"
                className={colorMode === 'multi' ? 'is-active' : ''}
                aria-pressed={colorMode === 'multi'}
                onClick={() => setColorMode('multi')}
              >
                三色叠画
              </button>
            </div>
          </div>

          <div className="field compass-param-field">
            <span className="field-label" id="compass-rings-label">
              目标圈数
            </span>
            <div className="compass-option-row" role="group" aria-labelledby="compass-rings-label">
              {RING_COUNTS.map(count => (
                <button
                  type="button"
                  key={count}
                  className={ringCount === count ? 'is-active' : ''}
                  aria-pressed={ringCount === count}
                  onClick={() => setRingCount(count)}
                >
                  {count} 圈
                </button>
              ))}
            </div>
          </div>

          <div className="field compass-param-field">
            <span className="field-label" id="compass-paper-label">画幅直径</span>
            <div className="compass-option-row" role="group" aria-labelledby="compass-paper-label">
              {PAPER_SIZES_CM.map(size => (
                <button
                  type="button"
                  key={size}
                  className={paperSizeCm === size ? 'is-active' : ''}
                  aria-pressed={paperSizeCm === size}
                  onClick={() => setPaperSizeCm(size)}
                >
                  {size} cm
                </button>
              ))}
            </div>
          </div>

          <div className="field compass-param-field">
            <span className="field-label" id="compass-palette-label">画纸与墨色预设</span>
            <div className="compass-palettes" role="group" aria-labelledby="compass-palette-label">
              {COMPASS_PALETTES.map(item => (
                <button
                  type="button"
                  key={item.id}
                  className={palette.id === item.id ? 'is-active' : ''}
                  aria-pressed={palette.id === item.id}
                  onClick={() => setPaletteId(item.id)}
                >
                  <span className="compass-palette-dots" style={{ backgroundColor: item.paper }} aria-hidden="true">
                    {colorMode === 'mono' ? (
                      <i style={{ backgroundColor: item.pens[0].color }} />
                    ) : (
                      item.pens.map(p => <i key={p.code} style={{ backgroundColor: p.color }} />)
                    )}
                  </span>
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          {source.kind === 'photo' && colorMode === 'multi' && (
            <label className="compass-toggle">
              <input
                type="checkbox"
                checked={usePhotoColors}
                onChange={event => setUsePhotoColors(event.target.checked)}
              />
              <span>
                提取照片近似笔色（3 色）
                <small>关闭后改用上方预设墨水颜色</small>
              </span>
            </label>
          )}
        </aside>

        <section className="compass-workspace" aria-label="圆规画预览与分步跟画">
          <div className="compass-canvas-panel">
            <div className="compass-canvas-header">
              <div className="segmented" role="group" aria-label="预览模式">
                <button
                  type="button"
                  className={mode === 'full' ? 'active' : ''}
                  aria-pressed={mode === 'full'}
                  onClick={() => setMode('full')}
                >
                  <Eye size={13} /> 成品全览
                </button>
                <button
                  type="button"
                  className={mode === 'guide' ? 'active' : ''}
                  aria-pressed={mode === 'guide'}
                  onClick={() => setMode('guide')}
                  disabled={!canUsePlan}
                >
                  <Play size={13} /> 分步跟画教程
                </button>
              </div>
              <div className="compass-header-toggles">
                {mode === 'guide' && (
                  <label>
                    <input
                      type="checkbox"
                      checked={showGhost}
                      onChange={event => setShowGhost(event.target.checked)}
                    />
                    总览底影
                  </label>
                )}
                <button
                  type="button"
                  className="studio-fullscreen-btn"
                  onClick={() => setFullscreenOpen(true)}
                  disabled={!canUsePlan || Boolean(previewError)}
                  aria-label="全屏浏览"
                >
                  <Maximize2 size={13} />
                  <span>全屏浏览</span>
                </button>
              </div>
            </div>

            {isPlanCurrent && !hasSteps && (
              <p className="compass-empty-state" role="status">
                未生成圆规画步骤：目标为空（如纯白图片），或当前对比度下无可绘制的暗区。请换图或调低对比度 / 开启反相。
              </p>
            )}

            <div className="compass-stage">
              <div className="compass-stage-inner">
                <div className="compass-board">
                  <canvas
                    ref={boardCanvas}
                    role="img"
                    aria-label={`${displayTitle} 圆规画画布：${plan.paperSizeCm} 厘米画幅，${plan.ringCount} 圈，${hasSteps ? `当前第 ${currentStep} / ${totalSteps} 步` : '暂无可用画弧步骤'}`}
                  >
                    {hasSteps ? '圆规画预览画布：请查看右侧半径与角度清单或导出图纸。' : '暂无可用圆规画步骤，请更换图片或调整参数。'}
                  </canvas>
                </div>
              </div>
            </div>

            {previewError && (
              <p className="compass-error" role="alert">
                <Info size={14} />
                {previewError}
              </p>
            )}
          </div>

          {mode === 'full' && (
            <div className="compass-stats" aria-live="polite">
              <div>
                <span>画幅 / 最大半径</span>
                <strong>{plan.paperSizeCm}<small>cm · R≤{plan.maxRadiusMm}mm</small></strong>
              </div>
              <div>
                <span>总画弧步骤 / 笔色</span>
                <strong>{plan.steps.length}<small>笔 · {plan.layers.length} 色</small></strong>
              </div>
              <div>
                <span>预计总走笔线长</span>
                <strong>约 {plan.totalLengthMeters}<small>m</small></strong>
              </div>
            </div>
          )}

          {mode === 'guide' && hasSteps && active && (
            <div className="compass-player" aria-label="交互式圆规分步跟画器">
              <div className="compass-player-top">
                <div className="compass-step-callout">
                  <span className="compass-step-badge">第 {currentStep} / {plan.steps.length} 步</span>
                  <strong className="compass-arc-jump">
                    {plan.centers.length > 1 ? `${active.centerLabel} · ` : ''}半径 {active.radiusMm} mm · {Math.round(active.startDeg)}° → {Math.round(active.endDeg)}°
                  </strong>
                  {active.isPenChange && (
                    <span className="compass-alert" role="status">
                      ★ 换笔：{active.colorName}
                    </span>
                  )}
                  {!active.isPenChange && active.isCenterChange && (
                    <span className="compass-alert" role="status">
                      移针至{active.centerLabel}
                    </span>
                  )}
                </div>
                <div className="compass-player-actions">
                  <button
                    type="button"
                    className="compass-step-btn"
                    onClick={() => setCurrentStep(prev => clampStep(clampStep(prev, totalSteps) - 1, totalSteps))}
                    disabled={!canUsePlan || currentStep <= 1}
                  >
                    <ArrowLeft size={14} /> 上一步
                  </button>
                  <button
                    type="button"
                    className="compass-step-btn compass-next-btn"
                    onClick={() => setCurrentStep(prev => clampStep(clampStep(prev, totalSteps) + 1, totalSteps))}
                    disabled={!canUsePlan || currentStep >= plan.steps.length}
                  >
                    下一步 <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    className="compass-reset-btn"
                    onClick={() => setCurrentStep(1)}
                    disabled={!canUsePlan}
                    aria-label="重置进度"
                    title="重置进度到第 1 步"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              </div>
              <div className="compass-player-scrub">
                <div className="compass-scrub-controls">
                  <input
                    type="range"
                    min={1}
                    max={Math.max(1, totalSteps)}
                    value={currentStep}
                    aria-label="圆规步数进度跳转"
                    disabled={!canUsePlan}
                    onChange={event => setCurrentStep(Number(event.target.value))}
                  />
                  <span className="compass-pct">{progressPct}%</span>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="compass-right-column" aria-label="圆环角度与手绘指南">
          <section className="panel compass-sequence-panel">
            <div className="compass-seq-header">
              <h2 className="panel-title">
                <Compass size={16} /> 圆环角度
              </h2>
              <div className="compass-seq-tabs" role="group" aria-label="显示步数范围">
                <button
                  type="button"
                  className={listFilter === 'window' ? 'is-active' : ''}
                  onClick={() => setListFilter('window')}
                  disabled={!canUsePlan}
                >
                  当前附近
                </button>
                <button
                  type="button"
                  className={listFilter === 'all' ? 'is-active' : ''}
                  onClick={() => setListFilter('all')}
                  disabled={!canUsePlan}
                >
                  全部 {plan.steps.length}
                </button>
              </div>
            </div>
            {hasSteps && plan.layers.length > 0 && (
              <div className="compass-layer-bar" aria-label="分色画笔快捷跳转">
                <span className="compass-layer-title">
                  <Palette size={12} /> 画笔色层：
                </span>
                <div className="compass-layer-pills">
                  {plan.layers.map(layer => {
                    const isCurrent = currentStep >= layer.startStep && currentStep <= layer.endStep
                    return (
                      <button
                        type="button"
                        key={layer.index}
                        className={isCurrent ? 'is-active' : ''}
                        onClick={() => {
                          setMode('guide')
                          setCurrentStep(layer.startStep)
                        }}
                        disabled={!canUsePlan}
                        title={`点击跳至「${layer.name}」起始第 ${layer.startStep} 步`}
                      >
                        <i style={{ backgroundColor: layer.color }} />
                        <span>{layer.name}</span>
                        <small>{layer.startStep}–{layer.endStep}</small>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {!hasSteps && <p className="compass-seq-empty">暂无圆规画弧步骤。</p>}
            <div className="compass-seq-list" role="list" aria-label="每步圆规半径与角度列表">
              {visibleSteps.map(step => (
                <button
                  type="button"
                  key={step.step}
                  role="listitem"
                  className={`compass-seq-item${plan.centers.length > 1 ? ' is-multi-center' : ''}${step.step === currentStep ? ' is-current' : step.step < currentStep ? ' is-done' : ''}`}
                  disabled={!canUsePlan}
                  onClick={() => {
                    setMode('guide')
                    setCurrentStep(step.step)
                  }}
                >
                  <span className="compass-seq-num">
                    <i className="compass-seq-dot" style={{ backgroundColor: step.color }} />
                    #{padRing(step.step, plan.steps.length)}
                  </span>
                  {plan.centers.length > 1 && <span className="compass-seq-center">{step.centerId}</span>}
                  <span className="compass-seq-radius">{step.radiusMm.toFixed(1)}mm</span>
                  <span className="compass-seq-angle">{Math.round(step.startDeg)}°–{Math.round(step.endDeg)}°</span>
                  <small>{step.pressureLabel.slice(0, 2)}</small>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <footer className="studio-footer">把难忘的瞬间，一规一弧转成复古版画。</footer>

      <ExportArtworkModal
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        options={[
          {
            id: 'png',
            format: 'PNG',
            label: '高清圆规画图纸',
            defaultChecked: true,
            disabled: !canUsePlan || Boolean(previewError),
            disabledReason: previewError || '画布尚未就绪',
            onExport: exportSheetPng,
            successMessage: '已导出高清圆规画图纸 PNG。',
          },
          {
            id: 'svg',
            format: 'SVG',
            label: '1:1 量角定位底稿',
            defaultChecked: false,
            disabled: !canUsePlan,
            onExport: exportTemplateSvg,
            successMessage: `已下载 ${plan.paperSizeCm} cm 1:1 圆规量角底稿 SVG。`,
          },
          {
            id: 'csv',
            format: 'CSV',
            label: '圆环角度顺序表',
            defaultChecked: false,
            disabled: !canUsePlan,
            onExport: exportStepsCsv,
            successMessage: `已导出完整 ${plan.steps.length} 步圆环角度清单 CSV。`,
          },
        ]}
      />

      <SaveArtworkModal
        open={saveDialogOpen}
        isUpdate={Boolean(savedId)}
        initialName={title}
        inputId="compass-title"
        placeholder="例如：阿基米德肖像圆规画"
        onClose={() => setSaveDialogOpen(false)}
        onConfirm={confirmSave}
      />

      {fullscreenOpen && (
        <div
          className="studio-fullscreen-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="全屏预览圆规画作品"
          onClick={event => {
            if (event.target === event.currentTarget) setFullscreenOpen(false)
          }}
        >
          <div className="studio-fullscreen-bar">
            <div className="studio-fullscreen-meta">
              <strong>{title || '圆规画作品'}</strong>
              <span>{plan.paperSizeCm} cm · {plan.ringCount} 圈 · {plan.steps.length} 笔 · {plan.layers.length} 色</span>
            </div>
            <div className="studio-fullscreen-tools">
              <div className="segmented" role="group" aria-label="全屏预览模式">
                <button
                  type="button"
                  className={mode === 'full' ? 'active' : ''}
                  aria-pressed={mode === 'full'}
                  onClick={() => setMode('full')}
                >
                  <Eye size={13} /> 成品全览
                </button>
                <button
                  type="button"
                  className={mode === 'guide' ? 'active' : ''}
                  aria-pressed={mode === 'guide'}
                  onClick={() => setMode('guide')}
                  disabled={!canUsePlan}
                >
                  <Play size={13} /> 分步跟画教程
                </button>
              </div>
              {mode === 'guide' && (
                <label className="studio-fullscreen-toggle">
                  <input
                    type="checkbox"
                    checked={showGhost}
                    onChange={event => setShowGhost(event.target.checked)}
                  />
                  <span>总览底影</span>
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
                <canvas ref={fullscreenCanvas} aria-label={`${title || '圆规画作品'} 全屏预览`} />
              </div>
            </div>
            {mode === 'guide' && hasSteps && active && (
              <aside className="studio-fullscreen-guide" aria-label="全屏分步跟画控制">
                <div className="studio-fullscreen-guide-top">
                  <span className="studio-fullscreen-guide-badge">
                    第 {currentStep} / {plan.steps.length} 步
                  </span>
                  <span className="studio-fullscreen-guide-pct">{progressPct}%</span>
                </div>
                <div className="studio-fullscreen-guide-desc">
                  <strong>
                    <i className="studio-fullscreen-guide-dot" style={{ backgroundColor: active.color }} />
                    {plan.centers.length > 1 ? `${active.centerLabel} · ` : ''}半径 {active.radiusMm} mm
                  </strong>
                  <span>
                    角度 {Math.round(active.startDeg)}° → {Math.round(active.endDeg)}° · {active.colorName}
                  </span>
                  {active.isPenChange && (
                    <span className="studio-fullscreen-guide-alert" role="status">
                      ★ 换笔：{active.colorName}
                    </span>
                  )}
                  {!active.isPenChange && active.isCenterChange && (
                    <span className="studio-fullscreen-guide-alert" role="status">
                      移针至{active.centerLabel}
                    </span>
                  )}
                </div>
                <div className="studio-fullscreen-guide-actions">
                  <button
                    type="button"
                    className="studio-fullscreen-guide-btn"
                    onClick={() => setCurrentStep(prev => clampStep(clampStep(prev, totalSteps) - 1, totalSteps))}
                    disabled={!canUsePlan || currentStep <= 1}
                  >
                    <ArrowLeft size={14} /> 上一步
                  </button>
                  <button
                    type="button"
                    className="studio-fullscreen-guide-btn is-primary"
                    onClick={() => setCurrentStep(prev => clampStep(clampStep(prev, totalSteps) + 1, totalSteps))}
                    disabled={!canUsePlan || currentStep >= plan.steps.length}
                  >
                    下一步 <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    className="studio-fullscreen-guide-btn is-reset"
                    onClick={() => setCurrentStep(1)}
                    disabled={!canUsePlan}
                    aria-label="全屏重置进度"
                    title="重置进度到第 1 步"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
                <input
                  type="range"
                  className="studio-fullscreen-guide-range"
                  min={1}
                  max={Math.max(1, totalSteps)}
                  value={currentStep}
                  aria-label="全屏圆规步数进度跳转"
                  disabled={!canUsePlan}
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
