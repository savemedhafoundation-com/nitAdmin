export type EbookStatus = 'DRAFT' | 'UPLOADING' | 'PROCESSING' | 'READY' | 'PUBLISHED' | 'FAILED'

export interface Ebook {
  _id: string
  title: string
  author?: string
  description?: string
  category?: string
  tags?: string[]
  publicationDate?: string | null
  publishedAt?: string | null
  createdAt?: string
  updatedAt?: string
  status: EbookStatus
  isPublished: boolean
  allowDownload: boolean
  pdfBlobUrl?: string | null
  pdfDownloadUrl?: string | null
  pdfSizeBytes?: number | null
  coverBlobUrl?: string | null
  assetUrlsExpireAt?: string
  pendingPdfUpload?: string | null
  pendingCoverUpload?: string | null
  pendingUploads?: Array<{ _id: string; kind: UploadKind; status: string; filename: string; size: number; expiresAt: string; error?: string }>
}

export interface EbookMetadata {
  title: string
  author: string
  description: string
  category: string
  tags: string[]
  publicationDate: string | null
  allowDownload: boolean
}

export interface EbookConfig {
  maxPdfSizeBytes: number
  maxPdfSizeLabel: string
  maxCoverSizeBytes: number
  allowedCoverTypes: string[]
  storageConfigured: boolean
}

export interface EbookPage {
  data: Ebook[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

export type UploadKind = 'pdf' | 'cover'

export interface UploadAuthorization {
  uploadId: string
  pathname: string
  clientToken: string
  access: 'public' | 'private'
  expiresAt: string
}

export interface AdminUser {
  _id: string
  name: string
  email: string
  role: string
  token?: string
}
