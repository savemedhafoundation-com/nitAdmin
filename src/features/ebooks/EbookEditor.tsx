import { useEffect, useState, type FormEvent } from 'react'
import type { Ebook, EbookConfig, EbookMetadata, UploadKind } from './types'
import { ebookError, type EbookApi } from './ebookApi'
import EbookUploadField from './EbookUploadField'
import { useEbookUpload } from './useEbookUpload'
import { formatBytes, isUploadBusy } from './ebookUpload'
import EbookDialog from './EbookDialog'

export default function EbookEditor({ api, config, initialEbook, onClose, onChanged }: {
  api: EbookApi; config: EbookConfig; initialEbook: Ebook | null; onClose: () => void; onChanged: () => void
}) {
  const [ebook, setEbook] = useState(initialEbook)
  const [form, setForm] = useState<EbookMetadata>({
    title: initialEbook?.title ?? '', author: initialEbook?.author ?? '',
    description: initialEbook?.description ?? '', category: initialEbook?.category ?? '',
    tags: initialEbook?.tags ?? [], publicationDate: initialEbook?.publicationDate?.slice(0, 10) ?? null,
    allowDownload: initialEbook?.allowDownload ?? true,
  })
  const [tagsText, setTagsText] = useState(form.tags.join(', '))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const pdf = useEbookUpload(api, 'pdf', config)
  const cover = useEbookUpload(api, 'cover', config)
  const busy = saving || isUploadBusy(pdf.state.phase) || isUploadBusy(cover.state.phase)

  useEffect(() => {
    if (!ebook?._id || !ebook.assetUrlsExpireAt || busy) return
    const expiresAt = new Date(ebook.assetUrlsExpireAt).getTime()
    if (!Number.isFinite(expiresAt)) return
    let stopped = false
    const refresh = () => {
      api.get(ebook._id).then(fresh => {
        if (!stopped) setEbook(previous => previous ? { ...previous, pdfBlobUrl: fresh.pdfBlobUrl, pdfDownloadUrl: fresh.pdfDownloadUrl, coverBlobUrl: fresh.coverBlobUrl, assetUrlsExpireAt: fresh.assetUrlsExpireAt } : previous)
      }).catch(() => {
        if (!stopped) setMessage({ type: 'error', text: 'Preview links could not be refreshed. Use Refresh file links before opening the PDF.' })
      })
    }
    const timer = window.setTimeout(refresh, Math.max(1000, expiresAt - Date.now() - 60000))
    const focus = () => { if (expiresAt - Date.now() < 60000) refresh() }
    window.addEventListener('focus', focus)
    return () => { stopped = true; window.clearTimeout(timer); window.removeEventListener('focus', focus) }
  }, [api, ebook?._id, ebook?.assetUrlsExpireAt, busy])

  useEffect(() => {
    if (!busy) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [busy])

  function update<K extends keyof EbookMetadata>(key: K, value: EbookMetadata[K]) {
    setForm(previous => ({ ...previous, [key]: value }))
  }

  async function save(only?: UploadKind) {
    setMessage({ type: '', text: '' })
    if (!form.title.trim()) { setMessage({ type: 'error', text: 'Title is required.' }); return }
    const tags = [...new Set(tagsText.split(',').map(tag => tag.trim()).filter(Boolean))]
    if (tags.length > 20 || tags.some(tag => tag.length > 60)) { setMessage({ type: 'error', text: 'Use at most 20 tags, with 60 characters or fewer per tag.' }); return }
    if (!ebook?.pdfSizeBytes && !pdf.state.file) { setMessage({ type: 'error', text: 'Choose a valid PDF before creating this ebook.' }); return }
    if (busy) return
    setSaving(true)
    try {
      let current = ebook
      if (!only || !current) {
        current = await api.save({ ...form, title: form.title.trim(), tags }, ebook?._id)
        setEbook(current)
        onChanged()
      }
      if ((!only || only === 'pdf') && pdf.state.file && pdf.state.phase !== 'complete') {
        const result = await pdf.task.start(current._id)
        if (!result) { onChanged(); return }
        current = result
        setEbook(result)
        onChanged()
      }
      if ((!only || only === 'cover') && cover.state.file && cover.state.phase !== 'complete') {
        const result = await cover.task.start(current._id)
        if (!result) { onChanged(); return }
        current = result
        setEbook(result)
        onChanged()
      }
      setMessage({ type: 'success', text: current.isPublished ? 'Ebook changes saved.' : 'Ebook saved. Publish it when you are ready.' })
    } catch (error) {
      setMessage({ type: 'error', text: ebookError(error, 'Unable to save this ebook. Your selected files and metadata are still here. Please retry.') })
    } finally { setSaving(false) }
  }

  async function publish() {
    if (!ebook || busy) return
    setSaving(true)
    try {
      const updated = await api.publish(ebook._id, !ebook.isPublished)
      setEbook(updated)
      onChanged()
      setMessage({ type: 'success', text: updated.isPublished ? 'Ebook published to the library.' : 'Ebook unpublished.' })
    } catch (error) {
      setMessage({ type: 'error', text: ebookError(error, 'Unable to change publication status. Verify the PDF has completed processing and try again.') })
    } finally { setSaving(false) }
  }

  function submit(event: FormEvent) { event.preventDefault(); void save() }

  async function refreshFiles() {
    if (!ebook || busy) return
    setSaving(true)
    try { setEbook(await api.get(ebook._id)); setMessage({ type: 'success', text: 'File links and upload status refreshed.' }) }
    catch (error) { setMessage({ type: 'error', text: ebookError(error, 'Unable to refresh file links. Please retry.') }) }
    finally { setSaving(false) }
  }

  async function recoverUpload(uploadId: string, cancel: boolean) {
    if (!ebook || busy) return
    setSaving(true)
    try {
      if (cancel) await api.cancel(ebook._id, uploadId)
      else await api.complete(ebook._id, uploadId)
      setEbook(await api.get(ebook._id))
      onChanged()
      setMessage({ type: 'success', text: cancel ? 'Pending upload cancelled.' : 'Upload verified successfully.' })
    } catch (error) { setMessage({ type: 'error', text: ebookError(error, 'Unable to finish this upload. Retry after the transfer completes, or cancel it and select the file again.') }) }
    finally { setSaving(false) }
  }

  const pendingSelection = [pdf.state, cover.state].some(state => state.file && state.phase !== 'complete')
  return <EbookDialog title={initialEbook ? 'Edit Ebook' : 'Create Ebook'} onClose={onClose} busy={busy}>
    <form className="panel blog-form ebook-editor" onSubmit={submit}>
      <div className="ebook-editor-intro">
        <div><p className="kicker">Ebook details</p><p className="hint">Save your ebook, verify its PDF, then publish it to the library.</p></div>
        {ebook && <span className={`ebook-status ebook-status-${ebook.status.toLowerCase()}`}>{ebook.status}</span>}
      </div>
      <div className="grid">
        <label className="full">Title <input required name="title" value={form.title} maxLength={200} disabled={busy} onChange={event => update('title', event.target.value)} /></label>
        <label>Author<input name="author" value={form.author} maxLength={160} disabled={busy} onChange={event => update('author', event.target.value)} /></label>
        <label>Category<input name="category" value={form.category} maxLength={100} disabled={busy} onChange={event => update('category', event.target.value)} placeholder="e.g. Wellness" /></label>
        <label className="full">Description<textarea name="description" rows={4} value={form.description} maxLength={10000} disabled={busy} onChange={event => update('description', event.target.value)} /></label>
        <label>Tags<input name="tags" value={tagsText} maxLength={1600} disabled={busy} onChange={event => setTagsText(event.target.value)} placeholder="Comma-separated tags" /></label>
        <label>Publication date<input type="date" name="publicationDate" value={form.publicationDate ?? ''} disabled={busy} onChange={event => update('publicationDate', event.target.value || null)} /></label>
        <label className="checkbox full">Show download action<input type="checkbox" name="allowDownload" checked={form.allowDownload} disabled={busy} onChange={event => update('allowDownload', event.target.checked)} /></label>
      </div>
      <p className="field-note">PDF readers may still offer saving or printing. This setting controls the library’s download button.</p>
      {ebook?.pdfSizeBytes ? <div className="ebook-current-file"><span>Current PDF · {formatBytes(ebook.pdfSizeBytes)}</span>{ebook.pdfBlobUrl && <a href={ebook.pdfBlobUrl} target="_blank" rel="noopener noreferrer">Open PDF ↗</a>}<button type="button" className="ghost" disabled={busy} onClick={() => { void refreshFiles() }}>Refresh file links</button></div> : null}
      {ebook?.coverBlobUrl && <img className="ebook-current-cover" src={ebook.coverBlobUrl} alt={`${ebook.title} cover`} />}
      {!config.storageConfigured && <p role="alert" className="status error">Uploads are unavailable until Vercel Blob is configured on the backend. You can still edit existing metadata.</p>}
      <EbookUploadField task={pdf.task} state={pdf.state} config={config} existing={Boolean(ebook?.pdfSizeBytes)} disabled={busy || !config.storageConfigured} onRetry={() => { void save('pdf') }} />
      <EbookUploadField task={cover.task} state={cover.state} config={config} existing={Boolean(ebook?.coverBlobUrl)} disabled={busy || !config.storageConfigured} onRetry={() => { void save('cover') }} />
      {ebook?.pendingUploads?.length ? <section className="ebook-pending-uploads"><h3>Pending uploads</h3><p className="hint">An earlier upload can be verified after its transfer finishes, or cancelled before selecting a replacement.</p>{ebook.pendingUploads.map(upload => <div className="ebook-pending-upload" key={upload._id}><p><strong>{upload.filename}</strong> · {formatBytes(upload.size)} · {upload.status.toLowerCase()}</p><div className="form-actions"><button type="button" className="ghost" disabled={busy} onClick={() => { void recoverUpload(upload._id, false) }}>Verify uploaded {upload.kind}</button><button type="button" className="ghost" disabled={busy} onClick={() => { void recoverUpload(upload._id, true) }}>Cancel pending {upload.kind}</button></div></div>)}</section> : null}
      {message.text && <p role={message.type === 'error' ? 'alert' : 'status'} className={`status ${message.type}`}>{message.text}</p>}
      <footer className="form-actions ebook-editor-actions">
        <button type="submit" disabled={busy || (!ebook && !config.storageConfigured)}>{busy ? 'Saving / uploading…' : ebook ? 'Save ebook' : 'Create & upload'}</button>
        {ebook && <button type="button" className="ghost" disabled={busy || pendingSelection || (!ebook.isPublished && ebook.status !== 'READY')} onClick={() => { void publish() }}>{ebook.isPublished ? 'Unpublish' : 'Publish ebook'}</button>}
        <button type="button" className="ghost" onClick={onClose} disabled={busy}>Done</button>
      </footer>
      {busy && <p className="hint">Keep this page open until verification finishes. Use the upload’s Cancel button to stop a transfer.</p>}
    </form>
  </EbookDialog>
}
