import { useEffect, useId, useState, type DragEvent } from 'react'
import { EbookUploadTask, formatBytes, formatRemaining, isUploadBusy, type UploadState } from './ebookUpload'
import type { EbookConfig } from './types'

export default function EbookUploadField({ task, state, config, existing, disabled, onRetry }: {
  task: EbookUploadTask
  state: UploadState
  config: EbookConfig
  existing?: boolean
  disabled: boolean
  onRetry: () => void
}) {
  const id = useId()
  const [dragging, setDragging] = useState(false)
  const [dropError, setDropError] = useState('')
  const [offline, setOffline] = useState(!navigator.onLine)
  const label = task.kind === 'pdf' ? 'PDF' : 'cover image'
  const busy = isUploadBusy(state.phase)
  const limit = task.kind === 'pdf' ? config.maxPdfSizeLabel : formatBytes(config.maxCoverSizeBytes)

  useEffect(() => {
    const online = () => setOffline(false)
    const offline = () => setOffline(true)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
  }, [])

  function select(files: FileList | null) {
    setDropError('')
    if (!files?.length) return
    if (files.length !== 1) { setDropError(`Choose one ${label} at a time.`); return }
    void task.select(files[0])
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    if (!disabled && !busy) select(event.dataTransfer.files)
  }

  return (
    <section className="ebook-upload-field" aria-label={`${label} upload`}>
      <div className="ebook-upload-heading">
        <h3>{existing ? `Replace ${label}` : task.kind === 'pdf' ? 'Upload ebook PDF' : 'Cover image (optional)'}</h3>
        <span className="hint">Maximum size: {limit}</span>
      </div>
      <div className={`ebook-dropzone ${dragging ? 'is-dragging' : ''}`}
        onDragOver={event => { event.preventDefault(); if (!busy && !disabled) setDragging(true) }}
        onDragLeave={() => setDragging(false)} onDrop={drop}>
        <span className="ebook-file-mark" aria-hidden="true">{task.kind === 'pdf' ? 'PDF' : 'IMG'}</span>
        <p>Drag &amp; drop {task.kind === 'pdf' ? 'PDF' : 'cover image'} here</p>
        <span className="hint">or choose a file from your device</span>
        <label className={`ebook-file-picker ${disabled || busy ? 'is-disabled' : ''}`} htmlFor={id}>
          Choose {label}
          <input id={id} type="file" disabled={disabled || busy} aria-label={`Choose ${label}`}
            accept={task.kind === 'pdf' ? '.pdf,application/pdf' : config.allowedCoverTypes.join(',')}
            onChange={event => { select(event.target.files); event.target.value = '' }} />
        </label>
      </div>
      {existing && <p className="field-note">The existing {label} is kept until its replacement has been uploaded and verified.</p>}
      {state.file && <div className="ebook-upload-progress">
        <div className="ebook-upload-heading"><strong className="ebook-filename">{state.file.name}</strong><span>{formatBytes(state.file.size)}</span></div>
        {(busy || state.phase === 'complete' || state.retryVerification) && <>
          <progress aria-label={`${label} upload progress`} value={state.percentage} max="100" />
          <div className="ebook-upload-heading"><span>{formatBytes(state.loaded)} / {formatBytes(state.total)}</span><strong>{Math.floor(state.percentage)}%</strong></div>
        </>}
        <p role="status" aria-live="polite">
          {state.phase === 'selected' && 'Ready to upload when you save this ebook.'}
          {state.phase === 'authorizing' && 'Authorizing secure upload…'}
          {state.phase === 'uploading' && 'Uploading directly to Vercel Blob…'}
          {state.phase === 'processing' && 'Processing: verifying file type, size, and contents…'}
          {state.phase === 'complete' && (task.kind === 'pdf' ? '✓ Ebook uploaded successfully' : '✓ Cover uploaded successfully')}
        </p>
        {state.phase === 'uploading' && state.bytesPerSecond > 0 && <p className="hint">{formatBytes(state.bytesPerSecond)}/s · {formatRemaining(state.remainingSeconds)}</p>}
        {offline && busy && <p role="alert" className="status error">You are offline. Reconnect to continue, or cancel and retry.</p>}
        <div className="form-actions">
          {busy && state.phase !== 'processing' && <button type="button" className="ghost" onClick={() => { void task.cancel() }}>Cancel {label} upload</button>}
          {['failed', 'cancelled'].includes(state.phase) && <button type="button" disabled={disabled} onClick={onRetry}>{state.retryVerification ? 'Retry verification' : `Retry ${label} upload`}</button>}
          {!busy && <button type="button" className="ghost" disabled={disabled} onClick={() => { void task.clear() }}>Clear selection</button>}
        </div>
      </div>}
      {state.phase === 'validating' && <p role="status" className="hint">Checking the selected file…</p>}
      {(state.error || dropError) && <p role="alert" className={`status ${state.phase === 'cancelled' ? '' : 'error'}`}>{dropError || state.error}</p>}
    </section>
  )
}
