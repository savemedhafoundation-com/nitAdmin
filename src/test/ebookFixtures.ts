import { vi } from 'vitest'
import type { Ebook, EbookConfig } from '../features/ebooks/types'
import type { EbookApi } from '../features/ebooks/ebookApi'

export const config: EbookConfig = {
  maxPdfSizeBytes: 524288000,
  maxPdfSizeLabel: '500 MB',
  maxCoverSizeBytes: 5242880,
  allowedCoverTypes: ['image/jpeg', 'image/png', 'image/webp'],
  storageConfigured: true,
}
export const ebook: Ebook = {
  _id: 'ebook-1', title: 'A Guide to Wellbeing', author: 'NIT Team',
  description: 'Practical information for informed wellbeing.', category: 'Wellness',
  tags: ['care'], publicationDate: '2026-08-01T00:00:00.000Z', status: 'READY',
  isPublished: false, allowDownload: true, pdfSizeBytes: 1024 * 1024,
  pdfBlobUrl: 'https://private.blob.vercel-storage.com/ebooks/ebook-1/pdf/book.pdf?token=signed-read',
}
export const admin = { _id: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'admin' }
export const authorization = {
  uploadId: 'upload-1', pathname: 'ebooks/ebook-1/pdf/unique.pdf', clientToken: 'scoped-upload-token',
  access: 'private' as const, expiresAt: '2026-09-01T00:00:00.000Z',
}
export const uploadedBlob = {
  pathname: authorization.pathname, url: 'https://private.blob.vercel-storage.com/book.pdf',
  downloadUrl: 'https://private.blob.vercel-storage.com/book.pdf?download=1',
  contentType: 'application/pdf', contentDisposition: 'inline', etag: 'test-etag',
}
export function pdfFile(name = 'wellbeing.pdf', size?: number) {
  const file = new File(['%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n'], name, { type: 'application/pdf' })
  if (size !== undefined) Object.defineProperty(file, 'size', { value: size })
  return file
}
export function mockEbookApi() {
  return {
    config: vi.fn().mockResolvedValue(config),
    list: vi.fn().mockResolvedValue({ data: [ebook], pagination: { page: 1, limit: 9, total: 1, pages: 1 } }),
    get: vi.fn().mockResolvedValue(ebook),
    save: vi.fn().mockResolvedValue({ ...ebook, status: 'DRAFT', pdfSizeBytes: undefined, pdfBlobUrl: undefined }),
    publish: vi.fn().mockResolvedValue({ ...ebook, status: 'PUBLISHED', isPublished: true }),
    remove: vi.fn().mockResolvedValue({ message: 'Deleted' }),
    authorize: vi.fn().mockResolvedValue(authorization),
    complete: vi.fn().mockResolvedValue(ebook),
    cancel: vi.fn().mockResolvedValue({ message: 'Cancelled' }),
  } satisfies EbookApi
}
