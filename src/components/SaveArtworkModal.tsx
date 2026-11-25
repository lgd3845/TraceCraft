import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Save, X } from 'lucide-react'
import { useStudio } from '../lib/studio'

interface SaveArtworkModalProps {
  open: boolean
  isUpdate: boolean
  initialName: string
  inputId: string
  placeholder: string
  onClose: () => void
  onConfirm: (trimmedName: string) => void | Promise<void>
}

export default function SaveArtworkModal({
  open,
  isUpdate,
  initialName,
  inputId,
  placeholder,
  onClose,
  onConfirm,
}: SaveArtworkModalProps) {
  const { notify } = useStudio()
  const [draftName, setDraftName] = useState(initialName)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const openRef = useRef(open)
  openRef.current = open

  useEffect(() => {
    if (!open) {
      setSubmitting(false)
      return
    }
    setDraftName(initialName)
    setSubmitting(false)
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
    return () => cancelAnimationFrame(frame)
  }, [open, initialName])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        if (!submitting) onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, onClose, submitting])

  if (!open) return null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    const trimmed = draftName.trim()
    if (!trimmed) {
      notify('先给这份作品起个名字吧。')
      inputRef.current?.focus()
      return
    }
    setSubmitting(true)
    try {
      await onConfirm(trimmed)
    } finally {
      if (openRef.current) setSubmitting(false)
    }
  }

  return (
    <div
      className="studio-modal-backdrop"
      onClick={event => {
        if (event.target === event.currentTarget && !submitting) onClose()
      }}
    >
      <div className="studio-modal" role="dialog" aria-modal="true" aria-labelledby={`${inputId}-save-title`}>
        <div className="studio-modal-header">
          <h2 id={`${inputId}-save-title`}>{isUpdate ? '更新作品名称' : '保存作品'}</h2>
          <button type="button" className="icon-button" aria-label="关闭弹窗" disabled={submitting} onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <form className="studio-modal-form" onSubmit={event => { void handleSubmit(event) }}>
          <label className="field-label" htmlFor={inputId}>作品名称</label>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={draftName}
            maxLength={60}
            placeholder={placeholder}
            disabled={submitting}
            onChange={event => setDraftName(event.target.value)}
          />
          <div className="studio-modal-actions">
            <button type="button" className="btn btn-secondary" disabled={submitting} onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Save size={14} />{submitting ? '正在保存…' : '确认保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
