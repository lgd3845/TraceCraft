import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Eye,
  FileImage,
  Info,
  LoaderCircle,
  Maximize2,
  Palette,
  Play,
  RotateCcw,
  Ruler,
  Save,
  Spline,
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
import type { WireCraftArtworkData } from '../../lib/types'
import {
  BOARD_SIZES_CM,
  buildNailTemplateSvg,
  CONTOUR_PEG_COUNTS,
  CONTOUR_STEP_COUNTS,
  DEFAULT_STRING_MAP_SIZE,
  DEFAULT_THREAD_DARKNESS,
  generateStringArt,
  padPeg,
  RING_PEG_COUNTS,
  RING_STEP_COUNTS,
  safeStringArtFilename,
  STRING_EXAMPLES,
  STRING_PALETTES,
  windingSequenceCsv,
} from './stringArt'
import type {
  BoardSizeCm,
  ColorWeaveMode,
  ContrastMode,
  NailLayoutMode,
  StringArtPlan,
  StringExampleId,
} from './stringArt'
import {
  canvasPngBlob,
  decodeLocalImage,
  DEFAULT_PHOTO_FRAMING,
  readCroppedImageRgba,
  renderPhotoFraming,
  renderStringArtBoard,
  sourcePreview,
  stringArtSheetCanvas,
} from './stringArtCanvas'
import type { PhotoFraming } from './stringArtCanvas'
import type { StringArtWorkerRequest } from './stringArt.worker'
import './wire-craft.css'

const PROGRESS_STORAGE_KEY = 'tracecraft.string-art-progress.v3'

type SourceState =
  | { kind: 'example'; id: StringExampleId; label: string; preview: '' }
  | { kind: 'photo'; uploadId: string; name: string; image: HTMLImageElement; preview: string }

function readSavedProgress(signature: string): number | null {
  return readStepProgress(PROGRESS_STORAGE_KEY, signature)
}

function writeSavedProgress(signature: string, step: number) {
  writeStepProgress(PROGRESS_STORAGE_KEY, signature, step)
}

function clampStep(step: number, totalSteps: number): number {
  if (totalSteps === 0) return 0
  return Math.max(1, Math.min(totalSteps, Number.isFinite(step) ? Math.trunc(step) : 1))
}

export default function WireCraftStudio() {
  const { editingArtwork, saveArtwork, notify } = useStudio()
  const [savedWork] = useState<WireCraftArtworkData | null>(() =>
    editingArtwork?.kind === 'wire-craft' ? editingArtwork.data : null,
  )
  const [savedId, setSavedId] = useState<string | undefined>(() =>
    editingArtwork?.kind === 'wire-craft' ? editingArtwork.id : undefined,
  )
  const savedIdRef = useRef<string | undefined>(savedId)
  const initialWorkId = useRef<string | undefined>(savedId)
  const savedPhotoRef = useRef<{ uploadId: string; ref: string } | null>(
    savedWork?.sourceKind === 'photo' && isMediaRef(savedWork.photoDataUrl)
      ? { uploadId: `saved:${initialWorkId.current ?? 'work'}`, ref: savedWork.photoDataUrl }
      : null,
  )
  const [source, setSource] = useState<SourceState>(() => {
    const fallbackEx = STRING_EXAMPLES[0]
    if (savedWork?.sourceKind === 'example') {
      const ex = STRING_EXAMPLES.find(item => item.id === savedWork.exampleId) ?? fallbackEx
      return { kind: 'example', id: ex.id, label: savedWork.sourceName || ex.sourceName, preview: '' }
    }
    return { kind: 'example', id: fallbackEx.id, label: fallbackEx.sourceName, preview: '' }
  })
  const [title, setTitle] = useState<string>(() =>
    editingArtwork?.kind === 'wire-craft' ? editingArtwork.name : STRING_EXAMPLES[0].title,
  )
  const [layoutMode, setLayoutMode] = useState<NailLayoutMode>(() => savedWork?.layoutMode ?? 'ring')
  const [colorWeaveMode, setColorWeaveMode] = useState<ColorWeaveMode>(() => savedWork?.colorWeaveMode ?? 'mono')
  const [contrastMode, setContrastMode] = useState<ContrastMode>(() => savedWork?.contrastMode ?? 'portrait')
  const [pegCount, setPegCount] = useState<number>(() => savedWork?.pegCount ?? 200)
  const [stepCount, setStepCount] = useState<number>(() => savedWork?.stepCount ?? 3200)
  const [threadDarkness, setThreadDarkness] = useState(() => savedWork?.threadDarkness ?? DEFAULT_THREAD_DARKNESS)
  const [boardSizeCm, setBoardSizeCm] = useState<BoardSizeCm>(() =>
    (BOARD_SIZES_CM.includes(savedWork?.boardSizeCm as BoardSizeCm) ? savedWork?.boardSizeCm : 20) as BoardSizeCm,
  )
  const [paletteId, setPaletteId] = useState<string>(() => savedWork?.paletteId ?? STRING_EXAMPLES[0].defaultPaletteId)
  const [usePhotoColors, setUsePhotoColors] = useState(() => savedWork?.usePhotoColors ?? true)
  const [framing, setFraming] = useState<PhotoFraming>(() => savedWork?.framing ?? DEFAULT_PHOTO_FRAMING)
  const [generationAttempt, setGenerationAttempt] = useState(0)

  // Start with the full preview; users can switch to step-by-step winding.
  const [mode, setMode] = useState<'guide' | 'full'>('full')
  const showNumbers = mode !== 'full'
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
  const workerRunnerRef = useRef<PersistentWorkerRunner<StringArtWorkerRequest, StringArtPlan> | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const boardCanvas = useRef<HTMLCanvasElement>(null)
  const fullscreenCanvas = useRef<HTMLCanvasElement>(null)
  const photoFramingCanvas = useRef<HTMLCanvasElement>(null)

  const palette = useMemo(
    () => STRING_PALETTES.find(item => item.id === paletteId) ?? STRING_PALETTES[0],
    [paletteId],
  )
  const autoInvert = palette.darkBoard

  const pegOptions = layoutMode === 'ring' ? RING_PEG_COUNTS : CONTOUR_PEG_COUNTS
  const stepOptions = layoutMode === 'ring' ? RING_STEP_COUNTS : CONTOUR_STEP_COUNTS

  const sourceSignature = useMemo(() => {
    const id = source.kind === 'example' ? `ex:${source.id}` : `ph:${source.uploadId}:${usePhotoColors ? 1 : 0}`
    return `linear-v1|${id}|${framing.zoom}:${framing.x}:${framing.y}|${layoutMode}|${colorWeaveMode}|${contrastMode}|${pegCount}|${stepCount}|${threadDarkness}|${boardSizeCm}|${paletteId}|${autoInvert ? 1 : 0}`
  }, [source, framing, layoutMode, colorWeaveMode, contrastMode, pegCount, stepCount, threadDarkness, boardSizeCm, paletteId, usePhotoColors, autoInvert])

  const sampledPhoto = useMemo(() => {
    if (source.kind !== 'photo') {
      return { source: null as StringArtWorkerRequest['source'] | null, error: '' }
    }
    try {
      const rgba = readCroppedImageRgba(source.image, DEFAULT_STRING_MAP_SIZE, framing)
      if (!hasOpaquePixels(rgba, 16)) {
        return {
          source: null,
          error: '这张图片全部透明，无法提取绕线轮廓，请换一张主体清晰的图片。',
        }
      }
      return {
        source: {
          kind: 'photo' as const,
          rgba,
          width: DEFAULT_STRING_MAP_SIZE,
          height: DEFAULT_STRING_MAP_SIZE,
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

  const workerPayload = useMemo<StringArtWorkerRequest | null>(() => {
    const workerSource: StringArtWorkerRequest['source'] | null =
      source.kind === 'example' ? { kind: 'example', id: source.id } : sampledPhoto.source
    if (!workerSource) return null
    return {
      source: workerSource,
      mapSize: DEFAULT_STRING_MAP_SIZE,
      pegCount,
      stepCount,
      boardSizeCm,
      layoutMode,
      palette,
      threadDarkness,
      colorWeaveMode,
      contrastMode,
      usePhotoColors,
      autoInvert,
    }
  }, [
    source,
    sampledPhoto.source,
    pegCount,
    stepCount,
    boardSizeCm,
    layoutMode,
    palette,
    threadDarkness,
    colorWeaveMode,
    contrastMode,
    usePhotoColors,
    autoInvert,
  ])

  const generationJob = useMemo(
    () => ({ signature: sourceSignature, payload: workerPayload, attempt: generationAttempt }),
    [sourceSignature, workerPayload, generationAttempt],
  )
  const [result, setResult] = useState(() => ({
    job: null as typeof generationJob | null,
    // A zero target is cheap and preserves the plan contract during SSR.
    plan: generateStringArt(new Float32Array(DEFAULT_STRING_MAP_SIZE ** 2), DEFAULT_STRING_MAP_SIZE, pegCount, 0, boardSizeCm, layoutMode, palette, threadDarkness),
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
  const generating = !isPlanCurrent && !generationError
  const canUsePlan = isPlanCurrent && !busy && hasSteps
  const [requestedStep, setCurrentStep] = useState(0)
  const currentStep = clampStep(requestedStep, totalSteps)

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
      editingArtwork?.kind === 'wire-craft' &&
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
      () => new Worker(new URL('./stringArt.worker.ts', import.meta.url), { type: 'module' }),
      { cooperativeCancel: true, cachePhotoSource: true },
    ))
    runner.submit(generationJob.payload, {
      onSuccess: nextPlan => {
        if (cancelled || !mounted.current) return
        setCurrentStep(clampStep(readSavedProgress(generationJob.signature) ?? 1, nextPlan.steps.length))
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
    if (isPlanCurrent) writeSavedProgress(sourceSignature, currentStep)
  }, [isPlanCurrent, sourceSignature, currentStep])

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
      renderStringArtBoard(boardCanvas.current, plan, result.palette, {
        mode,
        currentStep,
        showNumbers,
        showGhost,
      })
      setPreviewError('')
    } catch (cause) {
      setPreviewError(cause instanceof Error ? cause.message : '当前浏览器不支持画布预览。')
    }
  }, [fullscreenOpen, plan, result.palette, mode, currentStep, showNumbers, showGhost])

  useEffect(() => {
    if (!fullscreenOpen || !fullscreenCanvas.current) return
    try {
      renderStringArtBoard(fullscreenCanvas.current, plan, result.palette, {
        mode,
        currentStep,
        showNumbers,
        showGhost,
      }, 960)
    } catch { /* main previewError already handles canvas failure */ }
  }, [fullscreenOpen, plan, result.palette, mode, currentStep, showNumbers, showGhost])

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

  function switchLayoutMode(nextMode: NailLayoutMode) {
    setLayoutMode(nextMode)
    if (nextMode === 'ring') {
      if (!(RING_PEG_COUNTS as readonly number[]).includes(pegCount)) setPegCount(200)
      if (!(RING_STEP_COUNTS as readonly number[]).includes(stepCount)) setStepCount(2000)
    } else {
      if (!(CONTOUR_PEG_COUNTS as readonly number[]).includes(pegCount)) setPegCount(80)
      if (!(CONTOUR_STEP_COUNTS as readonly number[]).includes(stepCount)) setStepCount(500)
    }
  }

  function chooseExample(id: StringExampleId) {
    const meta = STRING_EXAMPLES.find(item => item.id === id) ?? STRING_EXAMPLES[0]
    requestId.current++
    setBusy(false)
    setFraming(DEFAULT_PHOTO_FRAMING)
    setFramingError('')
    setError('')
    setSource({ kind: 'example', id: meta.id, label: meta.sourceName, preview: '' })
    setTitle(meta.title)
    setPaletteId(meta.defaultPaletteId)
    setColorWeaveMode(meta.recommendedColorMode)
    switchLayoutMode(meta.recommendedLayout)
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
      const rgba = readCroppedImageRgba(image, DEFAULT_STRING_MAP_SIZE, DEFAULT_PHOTO_FRAMING)
      if (!hasOpaquePixels(rgba, 16)) {
        throw new Error('这张图片全部透明，无法提取绕线轮廓，请换一张主体清晰的图片。')
      }
      const preview = sourcePreview(image)
      const baseName = file.name.replace(/\.[^.]+$/, '') || '照片绕线画'
      setFraming(DEFAULT_PHOTO_FRAMING)
      setFramingError('')
      setSource({ kind: 'photo', uploadId, name: file.name, image, preview })
      setTitle(`${baseName} · 绕线画`)
      notify('照片已在本机读取，可调整参数查看绕线预览。')
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
    const svg = buildNailTemplateSvg(plan, title, palette)
    downloadFile(
      svg,
      `${safeStringArtFilename(title)}-1比1钉位模板.svg`,
      'image/svg+xml;charset=utf-8',
    )
  }

  function exportSequenceCsv() {
    if (!canUsePlan) return
    const csv = windingSequenceCsv(plan, title, palette.name)
    downloadFile(csv, `${safeStringArtFilename(title)}-针号顺序表.csv`, 'text/csv;charset=utf-8')
  }

  async function exportSheetPng() {
    if (!canUsePlan || previewError) return
    const canvas = stringArtSheetCanvas(plan, palette, title)
    const png = await canvasPngBlob(canvas)
    downloadFile(png, `${safeStringArtFilename(title)}-绕线画图纸.png`, 'image/png')
  }

  async function confirmSave(trimmed: string) {
    if (!canUsePlan || previewError) return
    try {
      const thumbnail = boardCanvas.current ? canvasThumbnailDataUrl(boardCanvas.current) : ''
      const photoRef = source.kind === 'photo'
        ? (savedPhotoRef.current?.uploadId === source.uploadId
            ? savedPhotoRef.current.ref
            : compressImageForStorage(source.image))
        : undefined
      const data: WireCraftArtworkData = {
        sourceKind: source.kind,
        exampleId: source.kind === 'example' ? source.id : undefined,
        sourceName: source.kind === 'photo' ? source.name : source.label,
        photoDataUrl: photoRef,
        layoutMode,
        colorWeaveMode,
        contrastMode,
        pegCount,
        stepCount,
        threadDarkness,
        boardSizeCm,
        paletteId,
        usePhotoColors,
        framing,
      }
      const saved = await saveArtwork({ kind: 'wire-craft', name: trimmed, data, thumbnail }, savedIdRef.current)
      if (!mounted.current) return
      if (!saved) {
        setSaveDialogOpen(false)
        return
      }
      if (source.kind === 'photo' && saved.kind === 'wire-craft' && saved.data.photoDataUrl) {
        savedPhotoRef.current = { uploadId: source.uploadId, ref: saved.data.photoDataUrl }
      }
      savedIdRef.current = saved.id
      setSavedId(saved.id)
      setTitle(saved.name)
      setSaveDialogOpen(false)
    } catch {
      if (!mounted.current) return
      notify('保存失败，请先导出模板与绕线清单。')
      setSaveDialogOpen(false)
    }
  }

  const active = hasSteps ? plan.steps[currentStep - 1] : undefined
  const visibleSteps = useMemo(() => {
    if (listFilter === 'all') return plan.steps
    const start = Math.max(0, currentStep - 10)
    const end = Math.min(plan.steps.length, start + 50)
    return plan.steps.slice(start, end)
  }, [plan.steps, currentStep, listFilter])

  const progressPct = hasSteps ? Math.round((currentStep / totalSteps) * 100) : 0

  return (
    <div className="string-studio">
      <header className="studio-heading string-heading">
        <div>
          <div className="eyebrow">
            <Spline size={13} /> STRING ART
          </div>
          <h1>绕线画工坊</h1>
        </div>
        <div className="heading-actions string-actions">
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

      <div className="string-journey" aria-label="绕线画制作流程">
        <span><i>01</i> 选一张照片</span>
        <ChevronRight size={12} />
        <span><i>02</i> 定一盘钉位</span>
        <ChevronRight size={12} />
        <span><i>03</i> 绕一幅光影</span>
      </div>

      <div className="string-layout">
        <aside className="panel string-controls" aria-label="图片与钉盘参数">
          <h2 className="panel-title">
            <FileImage size={16} /> 上传图片
          </h2>
          <input
            ref={fileInput}
            className="string-file-input"
            type="file"
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            aria-label="选择绕线画来源图片"
            onChange={event => {
              void upload(event.currentTarget.files)
              event.currentTarget.value = ''
            }}
          />
          <button
            type="button"
            className={`string-dropzone${dragging ? ' string-dragging' : ''}`}
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
              <img className="string-source-image" src={source.preview} alt="上传照片缩略预览" />
            ) : (
              <span className="string-upload-icon">
                <UploadCloud size={26} strokeWidth={1.4} />
              </span>
            )}
            <strong>
              {busy ? '正在读取照片…' : dragging ? '松手，把图片放在这里' : '点击选择，或拖入图片'}
            </strong>
            <span>PNG / JPEG / WebP · 最大 10 MB</span>
          </button>

          {source.kind === 'photo' && (
            <div className="string-photo-framing" key={source.uploadId}>
              <canvas ref={photoFramingCanvas} width={200} height={200} role="img" aria-label="照片取景预览" />
              <p>让脸部占画面大部分</p>
              <details>
                <summary>调整取景</summary>
                <div className="string-framing-controls">
                  <label htmlFor="string-framing-zoom">放大 <span>{framing.zoom.toFixed(2)}×</span></label>
                  <input
                    id="string-framing-zoom"
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={framing.zoom}
                    onChange={event => setFraming(value => ({ ...value, zoom: Number(event.target.value) }))}
                  />
                  <label htmlFor="string-framing-x">横向焦点 <span>{Math.round(framing.x * 100)}%</span></label>
                  <input
                    id="string-framing-x"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={framing.x}
                    onChange={event => setFraming(value => ({ ...value, x: Number(event.target.value) }))}
                  />
                  <label htmlFor="string-framing-y">纵向焦点 <span>{Math.round(framing.y * 100)}%</span></label>
                  <input
                    id="string-framing-y"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={framing.y}
                    onChange={event => setFraming(value => ({ ...value, y: Number(event.target.value) }))}
                  />
                  <button type="button" className="string-reset-btn" onClick={() => setFraming(DEFAULT_PHOTO_FRAMING)}>
                    <RotateCcw size={12} /> 重置取景
                  </button>
                </div>
              </details>
              {framingError && <p className="string-error" role="alert">{framingError}</p>}
            </div>
          )}

          {error && (
            <p className="string-error" role="alert">
              <Info size={14} />
              {error}
            </p>
          )}

          <div className="string-example-label">还没想好？精选示例：</div>
          <div className="string-examples" role="group" aria-label="热门绕线画示例">
            {STRING_EXAMPLES.map(example => (
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

          <div className="string-divider" />
          <h2 className="panel-title">
            <Ruler size={16} /> 让细节刚刚好
          </h2>

          <div className="field string-param-field">
            <span className="field-label" id="string-layout-label">
              钉位排布方式
            </span>
            <div className="string-option-row" role="group" aria-labelledby="string-layout-label">
              <button
                type="button"
                className={layoutMode === 'ring' ? 'is-active' : ''}
                aria-pressed={layoutMode === 'ring'}
                onClick={() => switchLayoutMode('ring')}
              >
                外圈固定钉
              </button>
              <button
                type="button"
                className={layoutMode === 'contour' ? 'is-active' : ''}
                aria-pressed={layoutMode === 'contour'}
                onClick={() => switchLayoutMode('contour')}
              >
                自由轮廓布钉
              </button>
            </div>
          </div>

          <div className="field string-param-field">
            <span className="field-label" id="string-contrast-label">
              主次对比度
            </span>
            <div className="string-option-row" role="group" aria-labelledby="string-contrast-label">
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

          <div className="field string-param-field">
            <span className="field-label" id="string-color-weave-label">丝线色彩层次</span>
            <div className="string-option-row" role="group" aria-labelledby="string-color-weave-label">
              <button
                type="button"
                className={colorWeaveMode === 'mono' ? 'is-active' : ''}
                aria-pressed={colorWeaveMode === 'mono'}
                onClick={() => setColorWeaveMode('mono')}
              >
                经典单色
              </button>
              <button
                type="button"
                className={colorWeaveMode === 'multi' ? 'is-active' : ''}
                aria-pressed={colorWeaveMode === 'multi'}
                onClick={() => setColorWeaveMode('multi')}
              >
                三色混绕
              </button>
            </div>
          </div>

          <div className="field string-param-field">
            <span className="field-label" id="string-pegs-label">
              目标钉数 <small>{layoutMode === 'ring' ? '人像推荐 200+' : '随轮廓微调'}</small>
            </span>
            <div className="string-option-row" role="group" aria-labelledby="string-pegs-label">
              {pegOptions.map(count => (
                <button
                  type="button"
                  key={count}
                  className={pegCount === count ? 'is-active' : ''}
                  aria-pressed={pegCount === count}
                  onClick={() => setPegCount(count)}
                >
                  {count} 钉
                </button>
              ))}
            </div>
          </div>

          <div className="field string-param-field">
            <span className="field-label" id="string-steps-label">
              最大步数 <small>无继续改善时停止</small>
            </span>
            <div className="string-option-row" role="group" aria-labelledby="string-steps-label">
              {stepOptions.map(count => (
                <button
                  type="button"
                  key={count}
                  className={stepCount === count ? 'is-active' : ''}
                  aria-pressed={stepCount === count}
                  onClick={() => setStepCount(count)}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {layoutMode === 'ring' && <div className="field string-param-field">
            <label className="field-label" htmlFor="string-darkness">每根线浓度 <span>{Math.round(threadDarkness * 100)}%</span></label>
            <input id="string-darkness" type="range" min="0.02" max="0.08" step="0.01" value={threadDarkness} onChange={event => setThreadDarkness(Number(event.target.value))} />
          </div>}

          <div className="field string-param-field">
            <span className="field-label" id="string-board-label">底板尺寸</span>
            <div className="string-option-row" role="group" aria-labelledby="string-board-label">
              {BOARD_SIZES_CM.map(size => (
                <button
                  type="button"
                  key={size}
                  className={boardSizeCm === size ? 'is-active' : ''}
                  aria-pressed={boardSizeCm === size}
                  onClick={() => setBoardSizeCm(size)}
                >
                  {size} cm
                </button>
              ))}
            </div>
          </div>

          <div className="field string-param-field">
            <span className="field-label" id="string-palette-label">
              丝线与底板配色
            </span>
            <div className="string-palettes" role="group" aria-labelledby="string-palette-label">
              {STRING_PALETTES.map(item => (
                <button
                  type="button"
                  key={item.id}
                  className={palette.id === item.id ? 'is-active' : ''}
                  aria-pressed={palette.id === item.id}
                  onClick={() => setPaletteId(item.id)}
                >
                  <span className="string-palette-dots" style={{ backgroundColor: item.board }} aria-hidden="true">
                    {colorWeaveMode === 'mono' ? (
                      <i style={{ backgroundColor: item.threads[0].color }} />
                    ) : (
                      item.threads.map(t => <i key={t.code} style={{ backgroundColor: t.color }} />)
                    )}
                  </span>
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          {source.kind === 'photo' && colorWeaveMode === 'multi' && (
            <label className="string-invert-toggle">
              <input
                type="checkbox"
                checked={usePhotoColors}
                onChange={event => setUsePhotoColors(event.target.checked)}
              />
              <span>
                提取照片近似配色（3 色）
                <small>关闭后改为套用上方所选预设丝线颜色</small>
              </span>
            </label>
          )}
        </aside>

        <section className="string-workspace" aria-label="绕线画预览与分步跟绕">
          <div className="string-canvas-panel">
            <div className="string-canvas-header">
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
                  <Play size={13} /> 分步跟绕教程
                </button>
              </div>
              <div className="string-header-toggles">
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

            {generating && (
              <p className="string-generation-status" role="status">
                <LoaderCircle size={13} className="string-spin" /> 正在生成…
              </p>
            )}
            {generationError && (
              <div className="string-generation-error string-error" role="alert">
                <Info size={14} />
                <span>{generationError}</span>
                <button type="button" className="string-reset-btn" onClick={() => setGenerationAttempt(value => value + 1)}>
                  重新生成
                </button>
              </div>
            )}

            {isPlanCurrent && !hasSteps && (
              <p className="string-empty-state" role="status">
                未生成绕线步骤：目标为空（如纯白图片），或当前参数下无可改善的路径。请换图或调整对比度 / 反相。
              </p>
            )}

            <div className="string-stage">
              <div className="string-stage-inner">
                <div className="string-board">
                  <canvas
                    ref={boardCanvas}
                    role="img"
                    aria-label={`${displayTitle} 绕线画画布：${plan.boardSizeCm} 厘米底板，${plan.pegCount} 颗钉子，${hasSteps ? `当前第 ${currentStep} / ${totalSteps} 步` : '暂无可用绕线步骤'}`}
                  >
                    {hasSteps ? '绕线画预览画布：请查看右侧钉号顺序列表或导出图纸。' : '暂无可用绕线步骤，请更换图片或调整参数。'}
                  </canvas>
                </div>
              </div>
            </div>

            {previewError && (
              <p className="string-error" role="alert">
                <Info size={14} />
                {previewError}
              </p>
            )}
          </div>

          {mode === 'full' && (
            <div className="string-stats" aria-live="polite">
              <div>
                <span>实际钉数</span>
                <strong>{plan.boardSizeCm}<small>cm · {plan.pegCount} 钉</small></strong>
              </div>
              <div>
                <span>总步骤 / 色数</span>
                <strong>{plan.steps.length}<small>步 · {plan.layers.length} 色</small></strong>
              </div>
              <div>
                <span>预计总用线</span>
                <strong>约 {plan.totalLengthMeters}<small>m</small></strong>
              </div>
            </div>
          )}

          {mode === 'guide' && hasSteps && active && (
            <div className="string-player" aria-label="交互式分步跟绕器">
              <div className="string-player-top">
                <div className="string-step-callout">
                  <span className="string-step-badge">第 {currentStep} / {plan.steps.length} 步</span>
                  <strong className="string-peg-jump">
                    {padPeg(active.from, plan.pegCount)} 号钉 → {padPeg(active.to, plan.pegCount)} 号钉
                  </strong>
                  {active.isColorChange && (
                    <span className="string-color-alert" role="status">
                      ★ 本步换线：{active.colorName}
                    </span>
                  )}
                  {!active.isColorChange && active.isRestart && (
                    <span className="string-color-alert" role="status">
                      本步重新起线
                    </span>
                  )}
                </div>
                <div className="string-player-actions">
                  <button
                    type="button"
                    className="string-step-btn"
                    onClick={() => setCurrentStep(prev => clampStep(clampStep(prev, totalSteps) - 1, totalSteps))}
                    disabled={!canUsePlan || currentStep <= 1}
                  >
                    <ArrowLeft size={14} /> 上一步
                  </button>
                  <button
                    type="button"
                    className="string-step-btn string-next-btn"
                    onClick={() => setCurrentStep(prev => clampStep(clampStep(prev, totalSteps) + 1, totalSteps))}
                    disabled={!canUsePlan || currentStep >= plan.steps.length}
                  >
                    下一步 <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    className="string-reset-btn"
                    onClick={() => setCurrentStep(1)}
                    disabled={!canUsePlan}
                    aria-label="重置进度"
                    title="重置绕线进度到第 1 步"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              </div>
              <div className="string-player-scrub">
                <div className="string-scrub-controls">
                  <input
                    type="range"
                    min={1}
                    max={Math.max(1, totalSteps)}
                    value={currentStep}
                    aria-label="绕线步数进度跳转"
                    disabled={!canUsePlan}
                    onChange={event => setCurrentStep(Number(event.target.value))}
                  />
                  <span className="string-pct">{progressPct}%</span>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="string-right-column" aria-label="针号顺序与制作步骤">
          <section className="panel string-sequence-panel">
            <div className="string-seq-header">
              <h2 className="panel-title">
                <Ruler size={16} /> 针号顺序
              </h2>
              <div className="string-seq-tabs" role="group" aria-label="显示步数范围">
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
              <div className="string-layer-bar" aria-label="分色图层快捷跳转">
                <span className="string-layer-title">
                  <Palette size={12} /> 丝线色层：
                </span>
                <div className="string-layer-pills">
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
            {!hasSteps && <p className="string-seq-empty">暂无绕线步骤。</p>}
            <div className="string-seq-list" role="list" aria-label="每步绕线起止钉号列表">
              {visibleSteps.map(step => (
                <button
                  type="button"
                  key={step.step}
                  role="listitem"
                  className={`string-seq-item${step.step === currentStep ? ' is-current' : step.step < currentStep ? ' is-done' : ''}`}
                  disabled={!canUsePlan}
                  onClick={() => {
                    setMode('guide')
                    setCurrentStep(step.step)
                  }}
                >
                  <span className="string-seq-num">
                    <i className="string-seq-dot" style={{ backgroundColor: step.color }} />
                    #{String(step.step).padStart(3, '0')}
                  </span>
                  <strong>
                    {padPeg(step.from, plan.pegCount)} → {padPeg(step.to, plan.pegCount)}
                  </strong>
                  <small>{step.kind === '轮廓锁边' ? '锁边' : `${step.span}钉`}</small>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <footer className="studio-footer">把熟悉的光影，一钉一线织成绵密轮廓。</footer>

      <ExportArtworkModal
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        options={[
          {
            id: 'png',
            format: 'PNG',
            label: '高清绕线画图纸',
            defaultChecked: true,
            disabled: !canUsePlan || Boolean(previewError),
            disabledReason: previewError || '画布尚未就绪',
            onExport: exportSheetPng,
            successMessage: '已导出高清绕线画图纸 PNG。',
          },
          {
            id: 'svg',
            format: 'SVG',
            label: '1:1 钉位打孔模板',
            defaultChecked: false,
            disabled: !canUsePlan,
            onExport: exportTemplateSvg,
            successMessage: `已下载 ${plan.boardSizeCm} cm 1:1 钉位打孔模板 SVG。`,
          },
          {
            id: 'csv',
            format: 'CSV',
            label: '针号顺序表',
            defaultChecked: false,
            disabled: !canUsePlan,
            onExport: exportSequenceCsv,
            successMessage: `已导出完整 ${plan.steps.length} 步针号顺序表 CSV。`,
          },
        ]}
      />

      <SaveArtworkModal
        open={saveDialogOpen}
        isUpdate={Boolean(savedId)}
        initialName={title}
        inputId="string-title"
        placeholder="例如：送给你的光影肖像"
        onClose={() => setSaveDialogOpen(false)}
        onConfirm={confirmSave}
      />

      {fullscreenOpen && (
        <div
          className="studio-fullscreen-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="全屏预览绕线画作品"
          onClick={event => {
            if (event.target === event.currentTarget) setFullscreenOpen(false)
          }}
        >
          <div className="studio-fullscreen-bar">
            <div className="studio-fullscreen-meta">
              <strong>{title || '绕线画作品'}</strong>
              <span>{plan.boardSizeCm} cm · {plan.pegCount} 钉 · {plan.steps.length} 步 · {plan.layers.length} 色</span>
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
                  <Play size={13} /> 分步跟绕教程
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
                <canvas ref={fullscreenCanvas} aria-label={`${title || '绕线画作品'} 全屏预览`} />
              </div>
            </div>
            {mode === 'guide' && hasSteps && active && (
              <aside className="studio-fullscreen-guide" aria-label="全屏分步跟绕控制">
                <div className="studio-fullscreen-guide-top">
                  <span className="studio-fullscreen-guide-badge">
                    第 {currentStep} / {plan.steps.length} 步
                  </span>
                  <span className="studio-fullscreen-guide-pct">{progressPct}%</span>
                </div>
                <div className="studio-fullscreen-guide-desc">
                  <strong>
                    <i className="studio-fullscreen-guide-dot" style={{ backgroundColor: active.color }} />
                    {padPeg(active.from, plan.pegCount)} 号钉 → {padPeg(active.to, plan.pegCount)} 号钉
                  </strong>
                  <span>
                    {active.kind === '轮廓锁边' ? '轮廓锁边' : `跨越 ${active.span} 钉`} · {active.colorName}
                  </span>
                  {active.isColorChange && (
                    <span className="studio-fullscreen-guide-alert" role="status">
                      ★ 本步换线：{active.colorName}
                    </span>
                  )}
                  {!active.isColorChange && active.isRestart && (
                    <span className="studio-fullscreen-guide-alert" role="status">
                      本步重新起线
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
                    title="重置绕线进度到第 1 步"
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
                  aria-label="全屏绕线步数进度跳转"
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
