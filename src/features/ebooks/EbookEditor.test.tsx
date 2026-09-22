import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { put } from '@vercel/blob/client'
import EbookEditor from './EbookEditor'
import { config, ebook, mockEbookApi, pdfFile, uploadedBlob } from '../../test/ebookFixtures'

vi.mock('@vercel/blob/client', () => ({ put: vi.fn() }))

describe('ebook editor uploads', () => {
  beforeEach(() => { vi.mocked(put).mockReset().mockResolvedValue(uploadedBlob) })

  it('requires a PDF before creating and never saves an invalid selection', async () => {
    const api = mockEbookApi()
    const user = userEvent.setup()
    render(<EbookEditor api={api} config={config} initialEbook={null} onChanged={vi.fn()} onClose={vi.fn()} />)
    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'New ebook')
    await user.click(screen.getByRole('button', { name: 'Create & upload' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a valid PDF')
    await user.upload(screen.getByLabelText('Choose PDF'), pdfFile('large.pdf', config.maxPdfSizeBytes + 1))
    expect(await screen.findByText('Ebook PDF must be 500 MB or smaller.')).toBeVisible()
    expect(api.save).not.toHaveBeenCalled()
    expect(put).not.toHaveBeenCalled()
  })

  it('accepts drag and drop, saves metadata, uploads, verifies, then enables publish', async () => {
    const api = mockEbookApi()
    const user = userEvent.setup()
    render(<EbookEditor api={api} config={config} initialEbook={null} onChanged={vi.fn()} onClose={vi.fn()} />)
    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'New ebook')
    await user.type(screen.getByRole('textbox', { name: 'Author' }), 'NIT Team')
    fireEvent.drop(screen.getByText('Drag & drop PDF here').parentElement!, { dataTransfer: { files: [pdfFile()] } })
    expect(await screen.findByText('Ready to upload when you save this ebook.')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Create & upload' }))
    expect(await screen.findByText('✓ Ebook uploaded successfully')).toBeVisible()
    expect(api.save).toHaveBeenCalledWith(expect.objectContaining({ title: 'New ebook', author: 'NIT Team', allowDownload: true }), undefined)
    expect(screen.getByRole('button', { name: 'Publish ebook' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Publish ebook' }))
    expect(api.publish).toHaveBeenCalledWith(ebook._id, true)
  })

  it('shows real progress, cancels a transfer, and retries it', async () => {
    const api = mockEbookApi()
    const user = userEvent.setup()
    let progress: ((event: { loaded: number; total: number; percentage: number }) => void) | undefined
    let uploadSignal: AbortSignal | undefined
    vi.mocked(put).mockImplementationOnce((_pathname, _file, options) => new Promise((_resolve, reject) => {
      progress = options.onUploadProgress
      uploadSignal = options.abortSignal
      uploadSignal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    render(<EbookEditor api={api} config={config} initialEbook={ebook} onChanged={vi.fn()} onClose={vi.fn()} />)
    const file = pdfFile('replacement.pdf', 1024 * 1024)
    await user.upload(screen.getByLabelText('Choose PDF'), file)
    await screen.findByText('Ready to upload when you save this ebook.')
    await user.click(screen.getByRole('button', { name: 'Save ebook' }))
    await waitFor(() => expect(put).toHaveBeenCalledOnce())
    act(() => progress?.({ loaded: 512 * 1024, total: 1024 * 1024, percentage: 50 }))
    expect(screen.getByRole('progressbar', { name: 'PDF upload progress' })).toHaveAttribute('value', '50')
    expect(screen.getByText('512 KB / 1 MB')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Cancel PDF upload' }))
    expect(uploadSignal?.aborted).toBe(true)
    expect(await screen.findByText('Upload cancelled. You can retry when ready.')).toBeVisible()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Retry PDF upload' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Retry PDF upload' }))
    expect(await screen.findByText('✓ Ebook uploaded successfully')).toBeVisible()
    expect(api.authorize).toHaveBeenCalledTimes(2)
  })

  it('retains a draft and retries verification after a completion error', async () => {
    const api = mockEbookApi()
    api.complete.mockRejectedValueOnce(new Error('verification timed out'))
    const user = userEvent.setup()
    render(<EbookEditor api={api} config={config} initialEbook={ebook} onChanged={vi.fn()} onClose={vi.fn()} />)
    await user.upload(screen.getByLabelText('Choose PDF'), pdfFile())
    await screen.findByText('Ready to upload when you save this ebook.')
    await user.click(screen.getByRole('button', { name: 'Save ebook' }))
    const retry = await screen.findByRole('button', { name: 'Retry verification' })
    await user.click(retry)
    expect(await screen.findByText('✓ Ebook uploaded successfully')).toBeVisible()
    expect(put).toHaveBeenCalledTimes(1)
  })

  it('cancels in-flight uploads when the editor unmounts', async () => {
    const api = mockEbookApi()
    const user = userEvent.setup()
    let signal: AbortSignal | undefined
    vi.mocked(put).mockImplementationOnce((_pathname, _file, options) => new Promise((_resolve, reject) => {
      signal = options.abortSignal
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const { unmount } = render(<EbookEditor api={api} config={config} initialEbook={ebook} onChanged={vi.fn()} onClose={vi.fn()} />)
    await user.upload(screen.getByLabelText('Choose PDF'), pdfFile())
    await screen.findByText('Ready to upload when you save this ebook.')
    await user.click(screen.getByRole('button', { name: 'Save ebook' }))
    await waitFor(() => expect(put).toHaveBeenCalledOnce())
    unmount()
    expect(signal?.aborted).toBe(true)
    await waitFor(() => expect(api.cancel).toHaveBeenCalled())
  })
})
