import { beforeEach, describe, expect, it, vi } from 'vitest'
import { put } from '@vercel/blob/client'
import { EbookUploadTask, validateEbookFile } from './ebookUpload'
import { authorization, config, ebook, mockEbookApi, pdfFile, uploadedBlob } from '../../test/ebookFixtures'

vi.mock('@vercel/blob/client', () => ({ put: vi.fn() }))

describe('file validation', () => {
  it('allows the 500 MiB boundary without allocating a 500 MiB file', async () => {
    await expect(validateEbookFile(pdfFile('large.pdf', config.maxPdfSizeBytes), 'pdf', config)).resolves.toBeNull()
  })
  it('rejects one byte above the configured PDF maximum', async () => {
    await expect(validateEbookFile(pdfFile('too-large.pdf', config.maxPdfSizeBytes + 1), 'pdf', config)).resolves.toBe('Ebook PDF must be 500 MB or smaller.')
  })
  it('uses the server-configured limit', async () => {
    await expect(validateEbookFile(pdfFile('book.pdf', 1048577), 'pdf', { ...config, maxPdfSizeBytes: 1048576, maxPdfSizeLabel: '1 MB' })).resolves.toBe('Ebook PDF must be 1 MB or smaller.')
  })
  it('rejects empty files, a wrong extension, spoofed MIME type, and a non-PDF header', async () => {
    expect(await validateEbookFile(new File([], 'empty.pdf'), 'pdf', config)).toMatch(/empty/)
    expect(await validateEbookFile(pdfFile('book.exe'), 'pdf', config)).toMatch(/Choose a PDF/)
    expect(await validateEbookFile(new File(['%PDF-1.7'], 'spoof.pdf', { type: 'text/plain' }), 'pdf', config)).toMatch(/Choose a PDF/)
    expect(await validateEbookFile(new File(['this is not a pdf'], 'spoof.pdf', { type: 'application/pdf' }), 'pdf', config)).toMatch(/not a valid PDF/)
  })
  it('reads only the PDF signature', async () => {
    const file = pdfFile('large.pdf', config.maxPdfSizeBytes)
    const slice = vi.spyOn(file, 'slice')
    await validateEbookFile(file, 'pdf', config)
    expect(slice).toHaveBeenCalledExactlyOnceWith(0, 1024)
  })
  it('validates cover MIME type, size, and signature', async () => {
    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], 'cover.png', { type: 'image/png' })
    expect(await validateEbookFile(png, 'cover', config)).toBeNull()
    expect(await validateEbookFile(new File(['not png'], 'cover.png', { type: 'image/png' }), 'cover', config)).toMatch(/not a valid cover/)
    expect(await validateEbookFile(new File(['svg'], 'cover.svg', { type: 'image/svg+xml' }), 'cover', config)).toMatch(/JPEG, PNG, or WebP/)
    Object.defineProperty(png, 'size', { value: config.maxCoverSizeBytes + 1 })
    expect(await validateEbookFile(png, 'cover', config)).toMatch(/5 MB or smaller/)
  })
})

describe('direct Blob uploads', () => {
  beforeEach(() => { vi.mocked(put).mockReset().mockResolvedValue(uploadedBlob) })

  it('authorizes on the server, uploads multipart with measured progress, then verifies', async () => {
    const api = mockEbookApi()
    const task = new EbookUploadTask(api, 'pdf', config)
    const updates = vi.fn()
    task.subscribe(updates)
    const file = pdfFile()
    await task.select(file)
    vi.mocked(put).mockImplementationOnce(async (pathname, body, options) => {
      expect(pathname).toBe(authorization.pathname)
      expect(body).toBe(file)
      expect(options).toMatchObject({ token: authorization.clientToken, access: 'private', multipart: true, contentType: 'application/pdf' })
      options.onUploadProgress?.({ loaded: 24, total: file.size, percentage: 49 })
      expect(task.state).toMatchObject({ phase: 'uploading', loaded: 24, total: file.size, percentage: 49 })
      expect(api.complete).not.toHaveBeenCalled()
      return uploadedBlob
    })
    await expect(task.start(ebook._id)).resolves.toEqual(ebook)
    expect(api.authorize).toHaveBeenCalledWith(ebook._id, { kind: 'pdf', filename: file.name, size: file.size, contentType: 'application/pdf' })
    expect(api.complete).toHaveBeenCalledWith(ebook._id, authorization.uploadId)
    expect(task.state.phase).toBe('complete')
    expect(updates.mock.calls.some(([state]) => state.phase === 'processing')).toBe(true)
  })

  it('never authorizes or uploads an invalid selection', async () => {
    const api = mockEbookApi()
    const task = new EbookUploadTask(api, 'pdf', config)
    expect(await task.select(pdfFile('large.pdf', config.maxPdfSizeBytes + 1))).toBe(false)
    expect(await task.start(ebook._id)).toBeNull()
    expect(api.authorize).not.toHaveBeenCalled()
    expect(put).not.toHaveBeenCalled()
  })

  it('aborts an in-flight transfer and cancels server upload metadata', async () => {
    const api = mockEbookApi()
    const task = new EbookUploadTask(api, 'pdf', config)
    await task.select(pdfFile())
    let signal: AbortSignal | undefined
    let transferStarted: (() => void) | undefined
    const started = new Promise<void>(resolve => { transferStarted = resolve })
    vi.mocked(put).mockImplementationOnce((_pathname, _body, options) => new Promise((_resolve, reject) => {
      signal = options.abortSignal
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      transferStarted?.()
    }))
    const transfer = task.start(ebook._id)
    await started
    await task.cancel()
    await transfer
    expect(signal?.aborted).toBe(true)
    expect(task.state.phase).toBe('cancelled')
    expect(api.cancel).toHaveBeenCalledWith(ebook._id, authorization.uploadId)
    expect(api.complete).not.toHaveBeenCalled()
    await task.start(ebook._id)
    expect(task.state.phase).toBe('complete')
    expect(api.authorize).toHaveBeenCalledTimes(2)
  })

  it('cleans an authorization that arrives after cancellation', async () => {
    const api = mockEbookApi()
    let releaseAuthorization: (value: typeof authorization) => void = () => {}
    api.authorize.mockReturnValueOnce(new Promise(resolve => { releaseAuthorization = resolve }))
    const task = new EbookUploadTask(api, 'pdf', config)
    await task.select(pdfFile())
    const transfer = task.start(ebook._id)
    await Promise.resolve()
    await task.cancel()
    releaseAuthorization(authorization)
    await transfer
    expect(put).not.toHaveBeenCalled()
    expect(api.cancel).toHaveBeenCalledWith(ebook._id, authorization.uploadId)
  })

  it('retries a network failure with a fresh authorization', async () => {
    const api = mockEbookApi()
    const task = new EbookUploadTask(api, 'pdf', config)
    await task.select(pdfFile())
    vi.mocked(put).mockRejectedValueOnce(new Error('network failed'))
    await task.start(ebook._id)
    expect(task.state.phase).toBe('failed')
    expect(task.state.error).toMatch(/Check your connection/)
    expect(api.complete).not.toHaveBeenCalled()
    await task.start(ebook._id)
    expect(task.state.phase).toBe('complete')
    expect(api.authorize).toHaveBeenCalledTimes(2)
  })

  it('retries completion without re-uploading or replacing the old PDF early', async () => {
    const api = mockEbookApi()
    api.complete.mockRejectedValueOnce(new Error('database unavailable'))
    const task = new EbookUploadTask(api, 'pdf', config)
    await task.select(pdfFile())
    expect(await task.start(ebook._id)).toBeNull()
    expect(task.state).toMatchObject({ phase: 'failed', retryVerification: true })
    expect(api.remove).not.toHaveBeenCalled()
    expect(api.cancel).not.toHaveBeenCalled()
    await task.start(ebook._id)
    expect(put).toHaveBeenCalledTimes(1)
    expect(api.authorize).toHaveBeenCalledTimes(1)
    expect(api.complete).toHaveBeenCalledTimes(2)
  })

  it('rejects an unexpected Blob pathname without saving metadata', async () => {
    const api = mockEbookApi()
    vi.mocked(put).mockResolvedValueOnce({ ...uploadedBlob, pathname: 'unexpected.pdf' })
    const task = new EbookUploadTask(api, 'pdf', config)
    await task.select(pdfFile())
    await task.start(ebook._id)
    expect(task.state.phase).toBe('failed')
    expect(api.complete).not.toHaveBeenCalled()
    expect(api.cancel).toHaveBeenCalled()
  })

  it.each(['UPLOAD_EXPIRED', 'UPLOAD_CANCELLED'])('re-authorizes instead of endlessly retrying verification for %s', async code => {
    const api = mockEbookApi()
    api.complete.mockRejectedValueOnce({ isAxiosError: true, response: { status: 409, data: { code } } })
    const task = new EbookUploadTask(api, 'pdf', config)
    await task.select(pdfFile())
    await task.start(ebook._id)
    expect(task.state.retryVerification).toBe(false)
    expect(api.cancel).toHaveBeenCalled()
    await task.start(ebook._id)
    expect(api.authorize).toHaveBeenCalledTimes(2)
    expect(put).toHaveBeenCalledTimes(2)
    expect(task.state.phase).toBe('complete')
  })

  it('keeps a recoverable database conflict available for verification retry', async () => {
    const api = mockEbookApi()
    api.complete.mockRejectedValueOnce({ isAxiosError: true, response: { status: 409, data: { code: 'EBOOK_CHANGED' } } })
    const task = new EbookUploadTask(api, 'pdf', config)
    await task.select(pdfFile())
    await task.start(ebook._id)
    expect(task.state.retryVerification).toBe(true)
    await task.start(ebook._id)
    expect(put).toHaveBeenCalledTimes(1)
    expect(task.state.phase).toBe('complete')
  })

  it('shows the exact configured size error when the server rejects a forged size', async () => {
    const api = mockEbookApi()
    api.complete.mockRejectedValueOnce({ isAxiosError: true, response: { status: 400, data: { code: 'FILE_TOO_LARGE', message: 'never display arbitrary server content' } } })
    const task = new EbookUploadTask(api, 'pdf', config)
    await task.select(pdfFile())
    await task.start(ebook._id)
    expect(task.state.error).toBe('Ebook PDF must be 500 MB or smaller.')
    expect(task.state.retryVerification).toBe(false)
  })

  it('shows clear invalid-PDF feedback for server signature validation', async () => {
    const api = mockEbookApi()
    api.complete.mockRejectedValueOnce({ isAxiosError: true, response: { status: 400, data: { code: 'INVALID_PDF' } } })
    const task = new EbookUploadTask(api, 'pdf', config)
    await task.select(pdfFile())
    await task.start(ebook._id)
    expect(task.state.error).toMatch(/not a valid PDF/)
    expect(task.state.retryVerification).toBe(false)
  })

  it('does not report success if cancellation races server completion', async () => {
    const api = mockEbookApi()
    let releaseCompletion: (value: typeof ebook) => void = () => {}
    api.complete.mockReturnValueOnce(new Promise(resolve => { releaseCompletion = resolve }))
    const task = new EbookUploadTask(api, 'pdf', config)
    await task.select(pdfFile())
    const transfer = task.start(ebook._id)
    while (task.state.phase !== 'processing') await new Promise(resolve => setTimeout(resolve, 0))
    await task.cancel()
    releaseCompletion(ebook)
    expect(await transfer).toBeNull()
    expect(task.state.phase).toBe('cancelled')
    expect(task.state.error).toMatch(/Refresh the ebook/)
  })
})
