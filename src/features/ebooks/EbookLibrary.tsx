import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ebookError, type EbookApi } from './ebookApi'
import type { AdminUser, Ebook, EbookConfig, EbookPage } from './types'
import { formatBytes } from './ebookUpload'
import EbookEditor from './EbookEditor'
import EbookDialog from './EbookDialog'

const statuses = ['DRAFT', 'UPLOADING', 'PROCESSING', 'READY', 'PUBLISHED', 'FAILED']

export default function EbookLibrary({ api, user, onSignOut }: { api: EbookApi; user: AdminUser; onSignOut: () => void }) {
  const [config, setConfig] = useState<EbookConfig | null>(null)
  const [configError, setConfigError] = useState('')
  const [result, setResult] = useState<EbookPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState({ page: 1, limit: 9, q: '', status: '' })
  const [revision, setRevision] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<Ebook | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<Ebook | null>(null)
  const [actingId, setActingId] = useState('')
  const reload = useCallback(() => setRevision(value => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    api.config(controller.signal).then(value => { setConfig(value); setConfigError('') })
      .catch(error => { if (!controller.signal.aborted) setConfigError(ebookError(error, 'Unable to load upload settings. Refresh and try again.')) })
    return () => controller.abort()
  }, [api, revision])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    api.list(query, controller.signal).then(value => {
      if (controller.signal.aborted) return
      if (value.pagination.pages > 0 && query.page > value.pagination.pages) {
        setQuery(previous => ({ ...previous, page: value.pagination.pages }))
      } else setResult(value)
    }).catch(error => {
      if (!controller.signal.aborted) setError(ebookError(error, 'Unable to load ebooks. Check your connection and try again.'))
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [api, query, revision])

  useEffect(() => {
    if (editing !== undefined || !result?.data.some(ebook => ['UPLOADING', 'PROCESSING'].includes(ebook.status) || ebook.pendingUploads?.length || ebook.pendingPdfUpload || ebook.pendingCoverUpload)) return
    const timer = window.setInterval(reload, 15000)
    return () => window.clearInterval(timer)
  }, [result, editing, reload])

  useEffect(() => {
    if (editing !== undefined || !result?.data.length) return
    const expiry = Math.min(...result.data.map(ebook => new Date(ebook.assetUrlsExpireAt ?? '').getTime()).filter(Number.isFinite))
    if (!Number.isFinite(expiry)) return
    const timer = window.setTimeout(reload, Math.max(1000, expiry - Date.now() - 60000))
    return () => window.clearTimeout(timer)
  }, [result, editing, reload])

  function search(event: FormEvent) {
    event.preventDefault()
    setQuery(previous => ({ ...previous, q: searchInput.trim(), page: 1 }))
  }

  async function edit(id: string) {
    setActingId(id)
    setError('')
    try { setEditing(await api.get(id)) }
    catch (error) { setError(ebookError(error, 'Unable to open this ebook. Refresh and try again.')) }
    finally { setActingId('') }
  }

  async function togglePublish(ebook: Ebook) {
    setActingId(ebook._id)
    setError('')
    try {
      await api.publish(ebook._id, !ebook.isPublished)
      setNotice(ebook.isPublished ? 'Ebook unpublished.' : 'Ebook published to the library.')
      reload()
    } catch (error) { setError(ebookError(error, 'Unable to change publication status. Check that the PDF has finished processing.')) }
    finally { setActingId('') }
  }

  async function remove() {
    if (!deleting) return
    setActingId(deleting._id)
    setError('')
    try {
      await api.remove(deleting._id)
      setDeleting(null)
      setNotice('Ebook deleted. Its stored files are being cleaned up.')
      reload()
    } catch (error) { setError(ebookError(error, 'Unable to delete this ebook. Please retry.')) }
    finally { setActingId('') }
  }

  return <section className="ebook-admin" aria-label="Ebook management">
    <header className="header ebook-header">
      <div className="header-content"><p className="kicker">NIT Library</p><h1>Ebooks</h1><p className="subtitle">Build a thoughtful library. Upload, review, and publish resources for your readers.</p></div>
      <div className="stats"><div><span>Total ebooks</span><strong>{result?.pagination.total ?? '—'}</strong></div><button type="button" disabled={!config} onClick={() => { setEditing(null); setNotice('') }}>Add Ebook</button></div>
    </header>
    <div className="ebook-session"><span>Signed in as {user.name || user.email}</span><button type="button" className="ghost" onClick={onSignOut}>Sign out</button></div>
    {notice && <p role="status" className="status success">{notice}</p>}
    {configError && <p role="alert" className="status error">{configError}</p>}
    <div className="panel list-panel">
      <div className="panel-header ebook-library-toolbar">
        <form className="search ebook-search" onSubmit={search}><label className="ebook-search-label">Search ebooks<input type="search" value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Title, author, or category" maxLength={120} /></label><button type="submit" disabled={loading}>Search</button></form>
        <label>Status<select value={query.status} onChange={event => setQuery(previous => ({ ...previous, status: event.target.value, page: 1 }))}><option value="">All statuses</option>{statuses.map(status => <option key={status} value={status}>{status[0]}{status.slice(1).toLowerCase()}</option>)}</select></label>
        <button type="button" className="ghost" disabled={loading} onClick={reload}>Refresh</button>
      </div>
      {error && <div role="alert" className="status error"><p>{error}</p><button type="button" className="ghost" onClick={reload}>Try again</button></div>}
      {loading ? <div role="status" aria-label="Loading ebooks"><p className="hint">Loading ebooks…</p><div className="ebook-admin-grid" aria-hidden="true">{[1, 2, 3].map(index => <div key={index} className="ebook-skeleton" />)}</div></div>
        : !error && !result?.data.length ? <div className="ebook-empty"><span className="ebook-file-mark" aria-hidden="true">PDF</span><h2>{query.q || query.status ? 'No matching ebooks' : 'Your library starts here'}</h2><p className="hint">{query.q || query.status ? 'Try a different search or status filter.' : 'Add your first ebook and publish it when the PDF is ready.'}</p>{!query.q && !query.status && <button type="button" disabled={!config} onClick={() => setEditing(null)}>Create first ebook</button>}</div>
          : !error && <div className="ebook-admin-grid">
            {result?.data.map(ebook => <article className="ebook-admin-card" key={ebook._id}>
              <div className="ebook-cover-frame">{ebook.coverBlobUrl ? <img src={ebook.coverBlobUrl} alt={`${ebook.title} cover`} loading="lazy" onLoad={event => { event.currentTarget.style.display = '' }} onError={event => { event.currentTarget.style.display = 'none' }} /> : null}<div className="ebook-cover-fallback" aria-hidden="true"><span>NIT LIBRARY</span><strong>{ebook.title}</strong><span>PDF · {ebook.category || 'Ebook'}</span></div></div>
              <div className="ebook-admin-card-body"><div className="ebook-upload-heading"><span className={`ebook-status ebook-status-${ebook.status.toLowerCase()}`}>{ebook.status}</span><span className="hint">{ebook.pdfSizeBytes ? formatBytes(ebook.pdfSizeBytes) : 'No PDF yet'}</span></div>
                <h2>{ebook.title}</h2><p className="hint">{ebook.author || 'Author not specified'}</p><p className="ebook-admin-description">{ebook.description || 'Add a description to introduce this ebook.'}</p>
                <div className="ebook-card-meta"><span>{ebook.category || 'Uncategorized'}</span><span>{ebook.publicationDate ? new Date(ebook.publicationDate).toLocaleDateString() : 'No publication date'}</span></div>
                {ebook.pendingUploads?.length ? <p className="hint">Upload: {ebook.pendingUploads.map(upload => `${upload.kind} ${upload.status.toLowerCase()}`).join(', ')}</p> : null}
                {!ebook.pendingUploads?.length && (ebook.pendingPdfUpload || ebook.pendingCoverUpload) ? <p className="hint">Pending upload: {[ebook.pendingPdfUpload && 'PDF', ebook.pendingCoverUpload && 'cover'].filter(Boolean).join(' and ')}. Open Edit for processing details.</p> : null}
                <div className="ebook-card-actions"><button type="button" disabled={Boolean(actingId) || !config} onClick={() => { void edit(ebook._id) }}>Edit</button><button type="button" className="ghost" disabled={Boolean(actingId) || (!ebook.isPublished && ebook.status !== 'READY')} onClick={() => { void togglePublish(ebook) }}>{ebook.isPublished ? 'Unpublish' : 'Publish'}</button><button type="button" className="ghost ebook-danger" disabled={Boolean(actingId)} onClick={() => setDeleting(ebook)}>Delete</button></div>
              </div>
            </article>)}
          </div>}
      {result && result.pagination.pages > 1 && !error && <nav className="pagination" aria-label="Ebook library pages"><button type="button" className="ghost" disabled={loading || query.page <= 1} onClick={() => setQuery(previous => ({ ...previous, page: previous.page - 1 }))}>Previous</button><span>Page {query.page} of {result.pagination.pages}</span><button type="button" className="ghost" disabled={loading || query.page >= result.pagination.pages} onClick={() => setQuery(previous => ({ ...previous, page: previous.page + 1 }))}>Next</button></nav>}
    </div>
    {editing !== undefined && config && <EbookEditor api={api} config={config} initialEbook={editing} onClose={() => setEditing(undefined)} onChanged={reload} />}
    {deleting && <EbookDialog title="Delete ebook?" onClose={() => setDeleting(null)} busy={Boolean(actingId)}><div className="panel"><p>Delete “{deleting.title}” and its PDF and cover? Readers will no longer be able to open this ebook.</p>{error && <p className="status error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="ebook-danger-button" disabled={Boolean(actingId)} onClick={() => { void remove() }}>{actingId ? 'Deleting…' : 'Delete ebook'}</button><button type="button" className="ghost" disabled={Boolean(actingId)} onClick={() => setDeleting(null)}>Keep ebook</button></div></div></EbookDialog>}
  </section>
}
