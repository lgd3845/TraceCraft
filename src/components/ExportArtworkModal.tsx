import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowDownToLine, LoaderCircle, X } from 'lucide-react'
import { useStudio } from '../lib/studio'

export interface ExportOption {
  id: string
  format: 'PNG' | 'SVG' | 'CSV'
  label: string
  defaultChecked?: boolean
  disabled?: boolean
  disabledReason?: string
  onExport: () => Promise<void> | void
  successMessage: string
}

interface ExportArtworkModalProps {
  open: boolean
  title?: string
  options: ExportOption[]
  onClose: () => void
}

export default function ExportArtworkModal({
  open,
  title = '导出图纸',
  options,
  onClose,
}: ExportArtworkModalProps) {
  const { notify } = useStudio()
  const headingId = useId()
  const [prevOpen, setPrevOpen] = useState(open)
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    open ? options.filter(option => option.defaultChecked && !option.disabled).map(option => option.id) : [],
  )
  const [running, setRunning] = useState(false)
  const mounted = useRef(true)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setSelectedIds(options.filter(option => option.defaultChecked && !option.disabled).map(option => option.id))
      setRunning(false)
    }
  }

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !running) {
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, running, onClose])

  if (!open) return null

  const enabledOptions = options.filter(option => !option.disabled)
  const activeSelection = selectedIds.filter(id => enabledOptions.some(option => option.id === id))
  const allSelected = enabledOptions.length > 0 && activeSelection.length === enabledOptions.length

  function toggleOption(id: string) {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(enabledOptions.map(option => option.id))
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (running) return
    const chosen = enabledOptions.filter(option => activeSelection.includes(option.id))
    if (!chosen.length) {
      notify('请至少选择一项要导出的内容。')
      return
    }
    setRunning(true)
    try {
      for (let index = 0; index < chosen.length; index++) {
        await chosen[index].onExport()
        if (index < chosen.length - 1) {
          await new Promise(resolve => window.setTimeout(resolve, 180))
        }
      }
      if (!mounted.current) return
      notify(chosen.length === 1 ? chosen[0].successMessage : `已导出 ${chosen.length} 份图纸文件。`)
      onClose()
    } catch (cause) {
      if (mounted.current) {
        notify(cause instanceof Error ? cause.message : '图纸导出失败，请重试。')
      }
    } finally {
      if (mounted.current) setRunning(false)
    }
  }

  return (
    <div
      className="studio-modal-backdrop"
      onClick={event => {
        if (event.target === event.currentTarget && !running) onClose()
      }}
    >
      <div className="studio-modal studio-modal-export" role="dialog" aria-modal="true" aria-labelledby={headingId}>
        <div className="studio-modal-header">
          <h2 id={headingId}>{title}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="关闭弹窗"
            onClick={() => {
              if (!running) onClose()
            }}
          >
            <X size={16} />
          </button>
        </div>
        <form className="studio-modal-form" onSubmit={event => void handleSubmit(event)}>
          <div className="export-modal-toolbar">
            <span className="export-modal-count">
              选择要导出的文件（已选 {activeSelection.length} / {enabledOptions.length} 项）
            </span>
            <button
              type="button"
              className="export-select-all"
              onClick={toggleAll}
              disabled={running || enabledOptions.length === 0}
            >
              {allSelected ? '取消全选' : '全选'}
            </button>
          </div>
          <div className="export-option-list" role="group" aria-label="可导出的图纸与清单列表">
            {options.map(option => {
              const checked = !option.disabled && activeSelection.includes(option.id)
              return (
                <label
                  key={option.id}
                  className={`export-option-card${checked ? ' is-checked' : ''}${option.disabled ? ' is-disabled' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={option.disabled || running}
                    onChange={() => toggleOption(option.id)}
                  />
                  <span className="export-option-body">
                    <strong>{option.label}</strong>
                    {option.disabled && option.disabledReason && <span>{option.disabledReason}</span>}
                  </span>
                  <span className={`export-format-badge is-${option.format.toLowerCase()}`}>
                    {option.format}
                  </span>
                </label>
              )
            })}
          </div>
          <div className="studio-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={running}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={running || activeSelection.length === 0}>
              {running ? <LoaderCircle size={14} className="export-spin" /> : <ArrowDownToLine size={14} />}
              {running ? '正在导出…' : activeSelection.length > 0 ? `确认导出（${activeSelection.length}）` : '确认导出'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
