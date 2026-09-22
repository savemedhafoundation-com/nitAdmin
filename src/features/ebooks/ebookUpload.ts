import { put } from '@vercel/blob/client'
import axios from 'axios'
import { ebookError, type EbookApi } from './ebookApi'
import type { Ebook, EbookConfig, UploadKind } from './types'

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1) return '0 B'
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3)
  return `${(bytes / 1024 ** unit).toLocaleString(undefined, { maximumFractionDigits: unit === 0 ? 0 : 1 })} ${['B', 'KB', 'MB', 'GB'][unit]}`
}

export function formatRemaining(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 1) return 'Finishing…'
  if (seconds < 60) return `${Math.ceil(seconds)}s remaining`
  return `${Math.ceil(seconds / 60)} min remaining`
}

export async function validateEbookFile(file: File, kind: UploadKind, config: EbookConfig): Promise<string | null> {
  if (file.size === 0) return 'The selected file is empty.'
  if (kind === 'pdf') {
    if (file.size > config.maxPdfSizeBytes) return `Ebook PDF must be ${config.maxPdfSizeLabel} or smaller.`
    if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) return 'Choose a PDF file (.pdf).'
    const header = new TextDecoder().decode(await file.slice(0, 1024).arrayBuffer())
    if (!/%PDF-(1\.[0-7]|2\.0)/.test(header)) return 'This file is not a valid PDF. Please choose another file.'
  } else {
    if (file.size > config.maxCoverSizeBytes) return `Cover image must be ${formatBytes(config.maxCoverSizeBytes)} or smaller.`
    if (!config.allowedCoverTypes.includes(file.type)) return 'Choose a JPEG, PNG, or WebP cover image.'
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
    const ascii = new TextDecoder().decode(bytes)
    const valid = file.type === 'image/jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : file.type === 'image/png' ? bytes[0] === 0x89 && ascii.slice(1, 4) === 'PNG'
      : ascii.slice(0, 4) === 'RIFF' && ascii.slice(8, 12) === 'WEBP'
    if (!valid) return 'This file is not a valid cover image.'
  }
  return null
}

export type UploadPhase = 'idle' | 'validating' | 'selected' | 'authorizing' | 'uploading' | 'processing' | 'complete' | 'failed' | 'cancelled'
export interface UploadState {
  phase: UploadPhase
  file: File | null
  loaded: number
  total: number
  percentage: number
  bytesPerSecond: number
  remainingSeconds: number
  error: string
  retryVerification: boolean
}

export const idleUpload: UploadState = {
  phase: 'idle', file: null, loaded: 0, total: 0, percentage: 0,
  bytesPerSecond: 0, remainingSeconds: 0, error: '', retryVerification: false,
}
export const isUploadBusy = (phase: UploadPhase) => ['validating', 'authorizing', 'uploading', 'processing'].includes(phase)

// A task owns only the File reference and measured progress, never the PDF bytes.
// Keeping verification separate also lets a failed completion request retry safely.
export class EbookUploadTask {
  state: UploadState = { ...idleUpload }
  private controller: AbortController | null = null
  private session: { ebookId: string; uploadId: string; transferred: boolean } | null = null
  private listeners = new Set<(state: UploadState) => void>()
  private selection = 0
  private running = false

  constructor(private api: EbookApi, readonly kind: UploadKind, private config: EbookConfig) {}

  subscribe(listener: (state: UploadState) => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private update(changes: Partial<UploadState>) {
    this.state = { ...this.state, ...changes }
    this.listeners.forEach(listener => listener(this.state))
  }

  async select(file: File): Promise<boolean> {
    if (this.running) return false
    const selection = ++this.selection
    await this.cleanup()
    this.update({ ...idleUpload, phase: 'validating' })
    try {
      const error = await validateEbookFile(file, this.kind, this.config)
      if (selection !== this.selection) return false
      if (error) {
        this.update({ phase: 'failed', error })
        return false
      }
      this.update({ phase: 'selected', file, total: file.size })
      return true
    } catch {
      if (selection === this.selection) this.update({ phase: 'failed', error: 'Unable to read this file. Please choose it again.' })
      return false
    }
  }

  private async cleanup() {
    const session = this.session
    this.session = null
    if (session) {
      try { await this.api.cancel(session.ebookId, session.uploadId) } catch {
        // The server retains pending cleanup metadata and retries expired uploads.
      }
    }
  }

  async cancel(): Promise<void> {
    ++this.selection
    this.controller?.abort()
    this.update({ phase: 'cancelled', error: 'Upload cancelled. You can retry when ready.', retryVerification: false })
    await this.cleanup()
  }

  async clear(): Promise<void> {
    await this.cancel()
    this.update({ ...idleUpload })
  }

  dispose(): void {
    ++this.selection
    this.listeners.clear()
    this.controller?.abort()
    void this.cleanup()
  }

  async start(ebookId: string): Promise<Ebook | null> {
    const file = this.state.file
    if (!file || this.running || this.state.phase === 'complete') return null
    this.running = true
    const controller = new AbortController()
    this.controller = controller
    this.update({ error: '', retryVerification: false })
    try {
      if (!this.session?.transferred) {
        await this.cleanup()
        this.update({ phase: 'authorizing', loaded: 0, percentage: 0, bytesPerSecond: 0, remainingSeconds: 0 })
        const authorization = await this.api.authorize(ebookId, {
          kind: this.kind, filename: file.name, size: file.size,
          contentType: this.kind === 'pdf' ? 'application/pdf' : file.type,
        })
        this.session = { ebookId, uploadId: authorization.uploadId, transferred: false }
        if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
        const startedAt = performance.now()
        this.update({ phase: 'uploading' })
        const uploaded = await put(authorization.pathname, file, {
          access: authorization.access,
          token: authorization.clientToken,
          contentType: this.kind === 'pdf' ? 'application/pdf' : file.type,
          multipart: true,
          abortSignal: controller.signal,
          onUploadProgress: progress => {
            if (controller.signal.aborted) return
            const elapsed = (performance.now() - startedAt) / 1000
            const speed = elapsed > 0 ? progress.loaded / elapsed : 0
            this.update({
              loaded: progress.loaded, total: progress.total, percentage: progress.percentage,
              bytesPerSecond: speed, remainingSeconds: speed > 0 ? (progress.total - progress.loaded) / speed : 0,
            })
          },
        })
        if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
        if (uploaded.pathname !== authorization.pathname) throw new Error('Unexpected upload result')
        this.session.transferred = true
      }
      if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
      this.update({ phase: 'processing', loaded: file.size, percentage: 100 })
      const ebook = await this.api.complete(ebookId, this.session.uploadId)
      this.session = null
      if (controller.signal.aborted) {
        this.update({ phase: 'cancelled', error: 'The upload finished while cancellation was requested. Refresh the ebook to confirm its current file.' })
        return null
      }
      this.update({ phase: 'complete', error: '', retryVerification: false })
      return ebook
    } catch (error) {
      if (controller.signal.aborted) {
        await this.cleanup()
        this.update({ phase: 'cancelled', error: 'Upload cancelled. You can retry when ready.' })
      } else {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined
        const code = axios.isAxiosError(error) ? error.response?.data?.code : undefined
        const rejected = (status !== undefined && [400, 404, 410, 413, 415, 422].includes(status)) || ['UPLOAD_EXPIRED', 'UPLOAD_CANCELLED'].includes(code)
        if (rejected || !this.session?.transferred) await this.cleanup()
        const retryVerification = Boolean(this.session?.transferred)
        this.update({
          phase: 'failed', retryVerification,
          error: status === 413 || code === 'FILE_TOO_LARGE'
            ? this.kind === 'pdf'
              ? `Ebook PDF must be ${this.config.maxPdfSizeLabel} or smaller.`
              : `Cover image must be ${formatBytes(this.config.maxCoverSizeBytes)} or smaller.`
            : ebookError(error, retryVerification
              ? 'The upload reached storage, but verification did not finish. Retry verification without uploading again.'
              : 'Upload failed. Check your connection, then retry. Your existing ebook has been kept.'),
        })
      }
      return null
    } finally {
      this.controller = null
      this.running = false
    }
  }
}
