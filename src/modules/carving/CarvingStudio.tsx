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
  Layers,
  Maximize2,
  Play,
  RotateCcw,
  Ruler,
  Save,
  Scissors,
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
import type { CarvingArtworkData } from '../../lib/types'
import {
  BRIDGE_WIDTHS_MM,
  buildCarvingTemplateSvg,
  CARVING_ALGORITHM_INFO,
  CARVING_EXAMPLES,
  CARVING_MATERIALS,
  carvingStepsCsv,
  DEFAULT_CARVING_RESOLUTION,
  FRAME_SIZES_CM,
  GRID_RESOLUTIONS,
  padCutStep,
  safeCarvingFilename,
} from './carving'
import type {
  BridgeWidthMm,
  CarvingAlgorithm,
  CarvingContrastMode,
  CarvingExampleId,
  CarvingPlan,
  CarvingResolution,
  FrameSizeCm,
} from './carving'
import {
  canvasPngBlob,
  carvingSheetCanvas,
  decodeLocalImage,
  DEFAULT_PHOTO_FRAMING,
  readCroppedImageRgba,
  renderCarvingBoard,
  renderPhotoFraming,
  sourcePreview,
} from './carvingCanvas'
import type { PhotoFraming } from './carvingCanvas'
import type { CarvingWorkerRequest } from './carving.worker'
import './carving.css'

function emptyCarvingPlan(
  algorithm: CarvingAlgorithm,
  contrastMode: CarvingContrastMode,
  gridSize: CarvingResolution,
  frameSizeCm: FrameSizeCm,
  bridgeWidthMm: BridgeWidthMm,
): CarvingPlan {
  return {
    algorithm,
    contrastMode,
    gridSize,
    frameSizeCm,
    frameWidthMm: Number((frameSizeCm * 10).toFixed(1)),
    bridgeWidthMm,
    floatingIslandsBridged: 0,
    bridges: [],
    layers: [],
    steps: [],
    totalPerimeterMeters: 0,
  }
}

const PROGRESS_STORAGE_KEY = 'tracecraft.carving-progress.v1'

type SourceState =
  | { kind: 'example'; id: CarvingExampleId; label: string; preview: '' }
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

export default function CarvingStudio() {
  const { editingArtwork, saveArtwork, notify } = useStudio()
  const [savedWork] = useState<CarvingArtworkData | null>(() =>
    editingArtwork?.kind === 'carving' ? editingArtwork.data : null,
  )
  const [savedId, setSavedId] = useState<string | undefined>(() =>
    editingArtwork?.kind === 'carving' ? editingArtwork.id : undefined,
  )
  const savedIdRef = useRef<string | undefined>(savedId)
  const initialWorkId = useRef<string | undefined>(savedId)
  const savedPhotoRef = useRef<{ uploadId: string; ref: string } | null>(
    savedWork?.sourceKind === 'photo' && isMediaRef(savedWork.photoDataUrl)
      ? { uploadId: `saved:${initialWorkId.current ?? 'work'}`, ref: savedWork.photoDataUrl }
      : null,
  )
  const [source, setSource] = useState<SourceState>(() => {
    const fallbackEx = CARVING_EXAMPLES[0]
    if (savedWork?.sourceKind === 'example') {
      const ex = CARVING_EXAMPLES.find(item => item.id === savedWork.exampleId) ?? fallbackEx
      return { kind: 'example', id: ex.id, label: savedWork.sourceName || ex.sourceName, preview: '' }
    }
    return { kind: 'example', id: fallbackEx.id, label: fallbackEx.sourceName, preview: '' }
  })
  const [title, setTitle] = useState<string>(() =>
    editingArtwork?.kind === 'carving' ? editingArtwork.name : CARVING_EXAMPLES[0].title,
  )
  const [algorithm, setAlgorithm] = useState<CarvingAlgorithm>(() =>
    savedWork?.algorithm ?? CARVING_EXAMPLES[0].recommendedAlgorithm,
  )
  const [contrastMode, setContrastMode] = useState<CarvingContrastMode>(() => savedWork?.contrastMode ?? 'portrait')
  const [bridgeWidthMm, setBridgeWidthMm] = useState<BridgeWidthMm>(() =>
    (BRIDGE_WIDTHS_MM.includes(savedWork?.bridgeWidthMm as BridgeWidthMm) ? savedWork?.bridgeWidthMm : 1.8) as BridgeWidthMm,
  )
  const [gridSize, setGridSize] = useState<CarvingResolution>(() =>
    (GRID_RESOLUTIONS.includes(savedWork?.gridSize as CarvingResolution) ? savedWork?.gridSize : DEFAULT_CARVING_RESOLUTION) as CarvingResolution,
  )
  const [frameSizeCm, setFrameSizeCm] = useState<FrameSizeCm>(() =>
    (FRAME_SIZES_CM.includes(savedWork?.frameSizeCm as FrameSizeCm) ? savedWork?.frameSizeCm : 18) as FrameSizeCm,
  )
  const [materialId, setMaterialId] = useState<string>(() => savedWork?.materialId ?? CARVING_EXAMPLES[0].defaultMaterialId)
  const [framing, setFraming] = useState<PhotoFraming>(() => savedWork?.framing ?? DEFAULT_PHOTO_FRAMING)

  const [mode, setMode] = useState<'realistic' | 'draft' | 'guide'>('realistic')
  const [requestedStep, setCurrentStep] = useState(1)
  const showBridges = false
  const [showGhost, setShowGhost] = useState(true)
  const [listFilter, setListFilter] = useState<'window' | 'all'>('window')
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  const [busy, setBusy] = useState(false)
  const [restoringSavedPhoto, setRestoringSavedPhoto] = useState<boolean>(() =>
    Boolean(savedWork?.sourceKind === 'photo' && savedWork.photoDataUrl),
  )
  const [persistedUploadId, setPersistedUploadId] = useState<string | null>(() =>
    savedWork?.sourceKind === 'photo' ? `saved:${initialWorkId.current ?? 'work'}` : null,
  )
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [previewError, setPreviewError] = useState('')
  const [framingError, setFramingError] = useState('')

  const mounted = useRef(true)
  const requestId = useRef(0)
  const dragDepth = useRef(0)
  const workerRunnerRef = useRef<PersistentWorkerRunner<CarvingWorkerRequest, CarvingPlan> | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const boardCanvas = useRef<HTMLCanvasElement>(null)
  const fullscreenCanvas = useRef<HTMLCanvasElement>(null)
  const photoFramingCanvas = useRef<HTMLCanvasElement>(null)

  const material = useMemo(
    () => CARVING_MATERIALS.find(item => item.id === materialId) ?? CARVING_MATERIALS[0],
    [materialId],
  )

  const signature = useMemo(() => {
    const id = source.kind === 'example' ? `ex:${source.id}` : `ph:${source.uploadId}`
    return `carving-v1|${id}|${framing.zoom}:${framing.x}:${framing.y}|${algorithm}|${contrastMode}|${bridgeWidthMm}|${gridSize}|${frameSizeCm}`
  }, [source, framing, algorithm, contrastMode, bridgeWidthMm, gridSize, frameSizeCm])

  const progressSignature = useMemo(() => {
    if (source.kind !== 'photo' || !savedId || persistedUploadId !== source.uploadId) {
      return signature
    }
    return signature.replace(`ph:${source.uploadId}`, `ph:saved:${savedId}`)
  }, [signature, source, savedId, persistedUploadId])

  const sampledPhoto = useMemo(() => {
    if (source.kind !== 'photo') {
      return { source: null as CarvingWorkerRequest['source'] | null, error: '' }
    }
    try {
      const rgba = readCroppedImageRgba(source.image, gridSize, framing)
      if (!hasOpaquePixels(rgba, 16)) {
        return {
          source: null,
          error: '这张图片全部透明，无法生成雕刻画底稿，请换一张主体清晰的图片。',
        }
      }
      return {
        source: {
          kind: 'photo' as const,
          rgba,
          width: gridSize,
          height: gridSize,
          key: `ph:${source.uploadId}:${gridSize}:${framing.zoom}:${framing.x}:${framing.y}`,
        },
        error: '',
      }
    } catch (cause) {
      return {
        source: null,
        error: cause instanceof Error ? cause.message : '图片采样失败，请调整取景或更换照片。',
      }
    }
  }, [source, gridSize, framing])

  const workerPayload = useMemo<CarvingWorkerRequest | null>(() => {
    if (restoringSavedPhoto) return null
    const workerSource: CarvingWorkerRequest['source'] | null =
      source.kind === 'example' ? { kind: 'example', id: source.id } : sampledPhoto.source
    if (!workerSource) return null
    return {
      source: workerSource,
      gridSize,
      algorithm,
      frameSizeCm,
      bridgeWidthMm,
      contrastMode,
    }
  }, [restoringSavedPhoto, source, sampledPhoto.source, gridSize, algorithm, frameSizeCm, bridgeWidthMm, contrastMode])

  const generationJob = useMemo(
    () => ({ signature, payload: workerPayload }),
    [signature, workerPayload],
  )
  const [result, setResult] = useState<{
    job: typeof generationJob | null
    plan: CarvingPlan
    title: string
  }>(() => ({
    job: null,
    plan: emptyCarvingPlan(algorithm, contrastMode, gridSize, frameSizeCm, bridgeWidthMm),
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
          setRestoringSavedPhoto(false)
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
          setRestoringSavedPhoto(false)
          setError('已保存的作品源图已缺失或无法读取，已暂时显示示例图，你可以重新上传照片后更新保存。')
          notify('已保存的作品源图缺失，已暂时显示示例图，可重新上传照片恢复。')
        }
      })
    return () => { cancelled = true }
  }, [savedWork, notify])

  useEffect(() => {
    if (
      editingArtwork?.kind === 'carving' &&
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
    const runner = (workerRunnerRef.current ??= new PersistentWorkerRunner(
      () => new Worker(new URL('./carving.worker.ts', import.meta.url), { type: 'module' }),
      { cachePhotoSource: true },
    ))
    runner.submit(generationJob.payload, {
      onSuccess: nextPlan => {
        if (cancelled || !mounted.current) return
        const saved = readSavedProgress(generationJob.signature)
        setCurrentStep(clampStep(saved ?? 1, nextPlan.steps.length))
        if (nextPlan.steps.length === 0) {
          setMode(prev => (prev === 'guide' ? 'realistic' : prev))
        }
        setResult({
          job: generationJob,
          plan: nextPlan,
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
    if (isPlanCurrent) writeSavedProgress(progressSignature, currentStep)
  }, [isPlanCurrent, progressSignature, currentStep])

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
      renderCarvingBoard(boardCanvas.current, plan, material, {
        mode,
        currentStep,
        showBridges,
        showGhost,
      })
      setPreviewError('')
    } catch (cause) {
      setPreviewError(cause instanceof Error ? cause.message : '当前浏览器不支持画布预览。')
    }
  }, [fullscreenOpen, plan, material, mode, currentStep, showBridges, showGhost])

  useEffect(() => {
    if (!fullscreenOpen || !fullscreenCanvas.current) return
    try {
      renderCarvingBoard(fullscreenCanvas.current, plan, material, {
        mode,
        currentStep,
        showBridges,
        showGhost,
      }, 960)
    } catch { /* main previewError already handles canvas failure */ }
  }, [fullscreenOpen, plan, material, mode, currentStep, showBridges, showGhost])

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

  function chooseExample(id: CarvingExampleId) {
    const meta = CARVING_EXAMPLES.find(item => item.id === id) ?? CARVING_EXAMPLES[0]
    requestId.current++
    setRestoringSavedPhoto(false)
    setBusy(false)
    setFraming(DEFAULT_PHOTO_FRAMING)
    setFramingError('')
    setError('')
    setSource({ kind: 'example', id: meta.id, label: meta.sourceName, preview: '' })
    setTitle(meta.title)
    setMaterialId(meta.defaultMaterialId)
    setAlgorithm(meta.recommendedAlgorithm)
  }

  async function upload(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    const id = ++requestId.current
    const uploadId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${id}-${Math.random().toString(36).slice(2)}`
    setRestoringSavedPhoto(false)
    setBusy(true)
    setError('')
    try {
      const image = await decodeLocalImage(file)
      if (!mounted.current || id !== requestId.current) return
      const rgba = readCroppedImageRgba(image, gridSize, DEFAULT_PHOTO_FRAMING)
      if (!hasOpaquePixels(rgba, 16)) {
        throw new Error('这张图片全部透明，无法生成雕刻画底稿，请换一张主体清晰的图片。')
      }
      const preview = sourcePreview(image)
      const baseName = file.name.replace(/\.[^.]+$/, '') || '照片雕刻底稿'
      setFraming(DEFAULT_PHOTO_FRAMING)
      setFramingError('')
      setSource({ kind: 'photo', uploadId, name: file.name, image, preview })
      setTitle(`${baseName} · 雕刻底稿`)
      notify('照片已在本机提取镂空轮廓与防掉连桥，可切换三种雕刻底稿查看效果。')
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
    const svg = buildCarvingTemplateSvg(plan, title, material)
    downloadFile(
      svg,
      `${safeCarvingFilename(title)}-1比1雕刻底稿.svg`,
      'image/svg+xml;charset=utf-8',
    )
  }

  function exportStepsCsv() {
    if (!canUsePlan) return
    const csv = carvingStepsCsv(plan, title, material.name)
    downloadFile(csv, `${safeCarvingFilename(title)}-雕刻步骤表.csv`, 'text/csv;charset=utf-8')
  }

  async function exportSheetPng() {
    if (!canUsePlan || previewError) return
    const canvas = carvingSheetCanvas(plan, material, title)
    const png = await canvasPngBlob(canvas)
    downloadFile(png, `${safeCarvingFilename(title)}-雕刻画图纸.png`, 'image/png')
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
      const data: CarvingArtworkData = {
        sourceKind: source.kind,
        exampleId: source.kind === 'example' ? source.id : undefined,
        sourceName: source.kind === 'photo' ? source.name : source.label,
        photoDataUrl: photoRef,
        algorithm,
        contrastMode,
        bridgeWidthMm,
        gridSize,
        frameSizeCm,
        materialId,
        framing,
      }
      const saved = await saveArtwork({ kind: 'carving', name: trimmed, data, thumbnail }, savedIdRef.current)
      if (!mounted.current) return
      if (!saved) {
        setSaveDialogOpen(false)
        return
      }
      if (source.kind === 'photo' && saved.kind === 'carving') {
        if (saved.data.photoDataUrl) {
          savedPhotoRef.current = { uploadId: source.uploadId, ref: saved.data.photoDataUrl }
        }
        setPersistedUploadId(source.uploadId)
      }
      savedIdRef.current = saved.id
      setSavedId(saved.id)
      setTitle(saved.name)
      setSaveDialogOpen(false)
    } catch {
      if (!mounted.current) return
      notify('保存失败，请先导出底稿与下刀清单。')
      setSaveDialogOpen(false)
    }
  }

  const progressPct = hasSteps ? Math.round((currentStep / totalSteps) * 100) : 0

  return (
    <div className="carving-studio">
      <header className="studio-heading carving-heading">
        <div>
          <div className="eyebrow">
            <Scissors size={13} /> PAPER CARVING
          </div>
          <h1>雕刻画工坊</h1>
        </div>
        <div className="heading-actions carving-actions">
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

      <div className="carving-journey" aria-label="雕刻底稿制作流程">
        <span><i>01</i> 选一张照片</span>
        <ChevronRight size={12} />
        <span><i>02</i> 选一种刀法</span>
        <ChevronRight size={12} />
        <span><i>03</i> 刻一幅光影</span>
      </div>

      <div className="carving-layout">
        <aside className="panel carving-controls" aria-label="照片与雕刻底稿参数">
          <h2 className="panel-title">
            <FileImage size={16} /> 上传图片
          </h2>
          <input
            ref={fileInput}
            className="carving-file-input"
            type="file"
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            aria-label="选择雕刻画来源图片"
            onChange={event => {
              void upload(event.currentTarget.files)
              event.currentTarget.value = ''
            }}
          />
          <button
            type="button"
            className={`carving-dropzone${dragging ? ' carving-dragging' : ''}`}
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
              <img className="carving-source-image" src={source.preview} alt="上传照片缩略预览" />
            ) : (
              <span className="carving-upload-icon">
                <UploadCloud size={24} strokeWidth={1.5} />
              </span>
            )}
            <strong>
              {busy ? '正在读取照片…' : dragging ? '松手，把图片放在这里' : '点击选择，或拖入图片'}
            </strong>
            <span>PNG / JPEG / WebP · 最大 10 MB</span>
          </button>

          {source.kind === 'photo' && (
            <div className="carving-photo-framing" key={source.uploadId}>
              <canvas ref={photoFramingCanvas} width={200} height={200} role="img" aria-label="照片取景预览" />
              <p>放大聚焦主体，刻纸线条更稳固清晰</p>
              <details>
                <summary>调整取景</summary>
                <div className="carving-framing-controls">
                  <label htmlFor="carving-framing-zoom">放大 <span>{framing.zoom.toFixed(2)}×</span></label>
                  <input
                    id="carving-framing-zoom"
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={framing.zoom}
                    onChange={event => setFraming(value => ({ ...value, zoom: Number(event.target.value) }))}
                  />
                  <label htmlFor="carving-framing-x">横向焦点 <span>{Math.round(framing.x * 100)}%</span></label>
                  <input
                    id="carving-framing-x"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={framing.x}
                    onChange={event => setFraming(value => ({ ...value, x: Number(event.target.value) }))}
                  />
                  <label htmlFor="carving-framing-y">纵向焦点 <span>{Math.round(framing.y * 100)}%</span></label>
                  <input
                    id="carving-framing-y"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={framing.y}
                    onChange={event => setFraming(value => ({ ...value, y: Number(event.target.value) }))}
                  />
                  <button type="button" className="carving-reset-btn" onClick={() => setFraming(DEFAULT_PHOTO_FRAMING)}>
                    <RotateCcw size={12} /> 重置取景
                  </button>
                </div>
              </details>
              {framingError && <p className="carving-error" role="alert">{framingError}</p>}
            </div>
          )}

          {(error || generationError) && (
            <p className="carving-error" role="alert">
              <Info size={14} />
              {error || generationError}
            </p>
          )}

          <div className="carving-example-label">还没想好？精选示例：</div>
          <div className="carving-examples" role="group" aria-label="热门雕刻画示例">
            {CARVING_EXAMPLES.map(example => (
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

          <div className="carving-divider" />
          <h2 className="panel-title">
            <Ruler size={16} /> 让细节刚刚好
          </h2>

          <div className="field carving-param-field">
            <span className="field-label" id="carving-alg-label">
              雕刻底稿
            </span>
            <div className="carving-algo-modes" role="group" aria-label="雕刻画算法模式">
              {(Object.keys(CARVING_ALGORITHM_INFO) as CarvingAlgorithm[]).map(algKey => {
                const info = CARVING_ALGORITHM_INFO[algKey]
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

          <div className="field carving-param-field">
            <span className="field-label" id="carving-contrast-label">
              主次对比度
            </span>
            <div className="carving-option-row" role="group" aria-labelledby="carving-contrast-label">
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

          <div className="field carving-param-field">
            <span className="field-label" id="carving-bridge-label">
              连接桥加固宽度
            </span>
            <div className="carving-option-row" role="group" aria-label="连接桥加固宽度">
              {BRIDGE_WIDTHS_MM.map(width => (
                <button
                  type="button"
                  key={width}
                  className={bridgeWidthMm === width ? 'is-active' : ''}
                  aria-pressed={bridgeWidthMm === width}
                  onClick={() => setBridgeWidthMm(width)}
                >
                  {width} mm
                </button>
              ))}
            </div>
          </div>

          <div className="field carving-param-field">
            <span className="field-label" id="carving-res-label">底稿精细度</span>
            <div className="carving-option-row" role="group" aria-labelledby="carving-res-label">
              {GRID_RESOLUTIONS.map(res => (
                <button
                  type="button"
                  key={res}
                  className={gridSize === res ? 'is-active' : ''}
                  aria-pressed={gridSize === res}
                  onClick={() => setGridSize(res)}
                >
                  {res} 格
                </button>
              ))}
            </div>
          </div>

          <div className="field carving-param-field">
            <span className="field-label" id="carving-size-label">画幅尺寸</span>
            <div className="carving-option-row" role="group" aria-labelledby="carving-size-label">
              {FRAME_SIZES_CM.map(size => (
                <button
                  type="button"
                  key={size}
                  className={frameSizeCm === size ? 'is-active' : ''}
                  aria-pressed={frameSizeCm === size}
                  onClick={() => setFrameSizeCm(size)}
                >
                  {size} cm
                </button>
              ))}
            </div>
          </div>

          <div className="field carving-param-field">
            <span className="field-label" id="carving-mat-label">纸张与版材预设</span>
            <div className="carving-palettes" role="group" aria-labelledby="carving-mat-label">
              {CARVING_MATERIALS.map(item => (
                <button
                  type="button"
                  key={item.id}
                  className={material.id === item.id ? 'is-active' : ''}
                  aria-pressed={material.id === item.id}
                  onClick={() => setMaterialId(item.id)}
                >
                  <span className="carving-swatch" style={{ backgroundColor: item.backing }} aria-hidden="true">
                    <i style={{ backgroundColor: item.paper }} />
                  </span>
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="carving-workspace" aria-label="雕刻底稿预览与分步跟刻">
          <div className="carving-canvas-panel">
            <div className="carving-canvas-header">
              <div className="segmented" role="group" aria-label="预览模式">
                <button
                  type="button"
                  className={mode === 'realistic' ? 'active' : ''}
                  aria-pressed={mode === 'realistic'}
                  onClick={() => setMode('realistic')}
                >
                  <Eye size={13} /> 成品实感
                </button>
                <button
                  type="button"
                  className={mode === 'draft' ? 'active' : ''}
                  aria-pressed={mode === 'draft'}
                  onClick={() => setMode('draft')}
                >
                  <Scissors size={13} /> 线稿底稿
                </button>
                <button
                  type="button"
                  className={mode === 'guide' ? 'active' : ''}
                  aria-pressed={mode === 'guide'}
                  onClick={() => setMode('guide')}
                  disabled={!canUsePlan}
                >
                  <Play size={13} /> 分步跟刻教程
                </button>
              </div>
              <div className="carving-header-toggles">
                {mode === 'guide' && (
                  <label>
                    <input
                      type="checkbox"
                      checked={showGhost}
                      onChange={event => setShowGhost(event.target.checked)}
                    />
                    未刻区域底影
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
              <p className="carving-empty-state" role="status">
                未生成镂空下刀步骤：目标为空（如纯白图片），或当前对比度下未提取出可雕刻区域。请换图或开启阴阳反相。
              </p>
            )}

            <div className="carving-stage">
              <div className="carving-stage-inner">
                <div className="carving-board">
                  <canvas
                    ref={boardCanvas}
                    role="img"
                    aria-label={`${displayTitle} 雕刻画底稿画布：${plan.frameSizeCm} 厘米画幅，${hasSteps ? `共 ${totalSteps} 刀` : '暂无雕刻步骤'}`}
                  >
                    {hasSteps ? '雕刻画底稿预览画布：请查看右侧下刀清单或导出图纸。' : '暂无可用雕刻步骤，请更换图片或调整参数。'}
                  </canvas>
                </div>
              </div>
            </div>

            {previewError && (
              <p className="carving-error" role="alert">
                <Info size={14} />
                {previewError}
              </p>
            )}
          </div>

          {mode === 'realistic' && (
            <div className="carving-stats" aria-live="polite">
              <div>
                <span>画幅尺寸</span>
                <strong>{plan.frameSizeCm}<small>× {plan.frameSizeCm} cm</small></strong>
              </div>
              <div>
                <span>总镂空刀数 / 图层</span>
                <strong>{plan.steps.length}<small>刀 · {plan.layers.length} 层</small></strong>
              </div>
              <div>
                <span>预计总刻线长度</span>
                <strong>约 {plan.totalPerimeterMeters}<small>m</small></strong>
              </div>
            </div>
          )}

          {mode === 'guide' && hasSteps && active && (
            <div className="carving-player" aria-label="交互式分步跟刻器">
              <div className="carving-player-top">
                <div className="carving-step-callout">
                  <span className="carving-step-badge">第 {currentStep} / {plan.steps.length} 刀</span>
                  <strong className="carving-cut-jump">
                    {plan.layers.length > 1 ? `${active.layerName.split(' ')[0]} · ` : ''}起刀 ({active.startXMm}, {active.startYMm}) mm · {active.areaMm2} mm²
                  </strong>
                </div>
                <div className="carving-player-actions">
                  <button
                    type="button"
                    className="carving-step-btn"
                    onClick={() => setCurrentStep(prev => clampStep(clampStep(prev, totalSteps) - 1, totalSteps))}
                    disabled={!canUsePlan || currentStep <= 1}
                  >
                    <ArrowLeft size={14} /> 上一刀
                  </button>
                  <button
                    type="button"
                    className="carving-step-btn carving-next-btn"
                    onClick={() => setCurrentStep(prev => clampStep(clampStep(prev, totalSteps) + 1, totalSteps))}
                    disabled={!canUsePlan || currentStep >= plan.steps.length}
                  >
                    下一刀 <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    className="carving-reset-btn"
                    onClick={() => setCurrentStep(1)}
                    disabled={!canUsePlan}
                    aria-label="重置进度"
                    title="重置进度到第 1 刀"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              </div>
              <div className="carving-player-scrub">
                <div className="carving-scrub-controls">
                  <input
                    type="range"
                    min={1}
                    max={Math.max(1, totalSteps)}
                    value={currentStep}
                    aria-label="雕刻步数进度跳转"
                    disabled={!canUsePlan}
                    onChange={event => setCurrentStep(Number(event.target.value))}
                  />
                  <span className="carving-pct">{progressPct}%</span>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="carving-right-column" aria-label="雕刻步骤与运刀指南">
          <section className="panel carving-sequence-panel">
            <div className="carving-seq-header">
              <h2 className="panel-title">
                <Scissors size={16} /> 雕刻步骤
              </h2>
              <div className="carving-seq-tabs" role="group" aria-label="显示步数范围">
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
              <div className="carving-layer-bar" aria-label="雕刻图层切换">
                <span className="carving-layer-title">
                  <Layers size={12} /> 底稿图层：
                </span>
                <div className="carving-layer-pills">
                  {plan.layers.map(layer => {
                    const isCurrent =
                      layer.stepCount > 0 && currentStep >= layer.startStep && currentStep <= layer.endStep
                    return (
                      <button
                        type="button"
                        key={layer.index}
                        className={isCurrent ? 'is-active' : ''}
                        onClick={() => {
                          if (!layer.stepCount) return
                          setCurrentStep(layer.startStep)
                        }}
                        disabled={!canUsePlan || layer.stepCount === 0}
                        title={`点击切换至「${layer.name}」第 ${layer.startStep} 刀`}
                      >
                        <i style={{ backgroundColor: layer.tint, border: '1px solid #bbb' }} />
                        <span>{layer.name}</span>
                        <small>{layer.stepCount ? `${layer.startStep}–${layer.endStep}` : '整版'}</small>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {!hasSteps && <p className="carving-seq-empty">暂无雕刻镂空区域。</p>}
            <div className="carving-seq-list" role="list" aria-label="每步镂空起刀与面积列表">
              {visibleSteps.map(step => (
                <button
                  type="button"
                  key={step.step}
                  role="listitem"
                  className={`carving-seq-item${step.step === currentStep ? ' is-current' : step.step < currentStep ? ' is-done' : ''}`}
                  disabled={!canUsePlan}
                  onClick={() => {
                    setMode('guide')
                    setCurrentStep(step.step)
                  }}
                >
                  <span className="carving-seq-num">
                    <i className="carving-seq-dot" style={{ backgroundColor: '#b04434' }} />
                    #{padCutStep(step.step, plan.steps.length)}
                  </span>
                  <strong>
                    {plan.layers.length > 1 ? `${step.layerName.split(' ')[0]} · ` : ''}{step.areaMm2} mm²
                  </strong>
                  <small>{step.toolHint.slice(0, 3)}</small>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <footer className="studio-footer">把定格的剪影，一刀一影刻出玲珑层次。</footer>

      <ExportArtworkModal
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        options={[
          {
            id: 'png',
            format: 'PNG',
            label: '高清雕刻画图纸',
            defaultChecked: true,
            disabled: !canUsePlan || Boolean(previewError),
            disabledReason: previewError || '画布尚未就绪',
            onExport: exportSheetPng,
            successMessage: '已导出高清雕刻画图纸 PNG。',
          },
          {
            id: 'svg',
            format: 'SVG',
            label: '1:1 雕刻底稿模板',
            defaultChecked: false,
            disabled: !canUsePlan,
            onExport: exportTemplateSvg,
            successMessage: `已下载 ${plan.frameSizeCm}×${plan.frameSizeCm} cm 1:1 雕刻底稿 SVG。`,
          },
          {
            id: 'csv',
            format: 'CSV',
            label: '雕刻步骤顺序表',
            defaultChecked: false,
            disabled: !canUsePlan,
            onExport: exportStepsCsv,
            successMessage: `已导出完整 ${plan.steps.length} 步雕刻步骤顺序表 CSV。`,
          },
        ]}
      />

      <SaveArtworkModal
        open={saveDialogOpen}
        isUpdate={Boolean(savedId)}
        initialName={title}
        inputId="carving-title"
        placeholder="例如：阳刻人像刻纸底稿"
        onClose={() => setSaveDialogOpen(false)}
        onConfirm={confirmSave}
      />

      {fullscreenOpen && (
        <div
          className="studio-fullscreen-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="全屏预览雕刻画作品"
          onClick={event => {
            if (event.target === event.currentTarget) setFullscreenOpen(false)
          }}
        >
          <div className="studio-fullscreen-bar">
            <div className="studio-fullscreen-meta">
              <strong>{title || '雕刻画作品'}</strong>
              <span>{plan.frameSizeCm} cm · {plan.steps.length} 刀 · {plan.layers.length} 层</span>
            </div>
            <div className="studio-fullscreen-tools">
              <div className="segmented" role="group" aria-label="全屏预览模式">
                <button
                  type="button"
                  className={mode === 'realistic' ? 'active' : ''}
                  aria-pressed={mode === 'realistic'}
                  onClick={() => setMode('realistic')}
                >
                  <Eye size={13} /> 成品实感
                </button>
                <button
                  type="button"
                  className={mode === 'draft' ? 'active' : ''}
                  aria-pressed={mode === 'draft'}
                  onClick={() => setMode('draft')}
                >
                  <Scissors size={13} /> 线稿底稿
                </button>
                <button
                  type="button"
                  className={mode === 'guide' ? 'active' : ''}
                  aria-pressed={mode === 'guide'}
                  onClick={() => setMode('guide')}
                  disabled={!canUsePlan}
                >
                  <Play size={13} /> 分步跟刻教程
                </button>
              </div>
              {mode === 'guide' && (
                <label className="studio-fullscreen-toggle">
                  <input
                    type="checkbox"
                    checked={showGhost}
                    onChange={event => setShowGhost(event.target.checked)}
                  />
                  <span>未刻区域底影</span>
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
                <canvas ref={fullscreenCanvas} aria-label={`${title || '雕刻画作品'} 全屏预览`} />
              </div>
            </div>
            {mode === 'guide' && hasSteps && active && (
              <aside className="studio-fullscreen-guide" aria-label="全屏分步跟刻控制">
                <div className="studio-fullscreen-guide-top">
                  <span className="studio-fullscreen-guide-badge">
                    第 {currentStep} / {plan.steps.length} 刀
                  </span>
                  <span className="studio-fullscreen-guide-pct">{progressPct}%</span>
                </div>
                <div className="studio-fullscreen-guide-desc">
                  <strong>
                    <i className="studio-fullscreen-guide-dot" style={{ backgroundColor: '#b04434' }} />
                    起刀 ({active.startXMm}, {active.startYMm}) mm
                  </strong>
                  <span>
                    {plan.layers.length > 1 ? `${active.layerName.split(' ')[0]} · ` : ''}面积 {active.areaMm2} mm² · {active.toolHint}
                  </span>
                </div>
                <div className="studio-fullscreen-guide-actions">
                  <button
                    type="button"
                    className="studio-fullscreen-guide-btn"
                    onClick={() => setCurrentStep(prev => clampStep(clampStep(prev, totalSteps) - 1, totalSteps))}
                    disabled={!canUsePlan || currentStep <= 1}
                  >
                    <ArrowLeft size={14} /> 上一刀
                  </button>
                  <button
                    type="button"
                    className="studio-fullscreen-guide-btn is-primary"
                    onClick={() => setCurrentStep(prev => clampStep(clampStep(prev, totalSteps) + 1, totalSteps))}
                    disabled={!canUsePlan || currentStep >= plan.steps.length}
                  >
                    下一刀 <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    className="studio-fullscreen-guide-btn is-reset"
                    onClick={() => setCurrentStep(1)}
                    disabled={!canUsePlan}
                    aria-label="全屏重置进度"
                    title="重置进度到第 1 刀"
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
                  aria-label="全屏雕刻步数进度跳转"
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
