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
  onConfirm: (trimmedName: string) => void
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
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setDraftName(initialName)
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
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, onClose])

  if (!open) return null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = draftName.trim()
    if (!trimmed) {
      notify('先给这份作品起个名字吧。')
      inputRef.current?.focus()
      return
    }
    onConfirm(trimmed)
  }

  return (
    <div
      className="studio-modal-backdrop"
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="studio-modal" role="dialog" aria-modal="true" aria-labelledby={`${inputId}-save-title`}>
        <div className="studio-modal-header">
          <h2 id={`${inputId}-save-title`}>{isUpdate ? '更新作品名称' : '保存作品'}</h2>
          <button type="button" className="icon-button" aria-label="关闭弹窗" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <form className="studio-modal-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor={inputId}>作品名称</label>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={draftName}
            maxLength={60}
            placeholder={placeholder}
            onChange={event => setDraftName(event.target.value)}
          />
          <div className="studio-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary">
              <Save size={14} />确认保存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
