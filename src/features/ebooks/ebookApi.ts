import axios, { type AxiosInstance } from 'axios'
import type { Ebook, EbookConfig, EbookMetadata, EbookPage, UploadAuthorization, UploadKind } from './types'

export function ebookError(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback
  const messages: Record<string, string> = {
    INVALID_PDF: 'This file is not a valid PDF. Choose another PDF and retry.',
    INVALID_COVER: 'This file is not a valid cover image. Choose another image and retry.',
    INVALID_BLOB: 'The stored file could not be verified. Select it again and retry the upload.',
    SIZE_MISMATCH: 'The uploaded file size did not match. Select the file again and retry.',
    UPLOAD_EXPIRED: 'The upload authorization expired. Retry the upload to receive a new authorization.',
    UPLOAD_CANCELLED: 'This upload was cancelled or replaced. Select the file again or retry the upload.',
    INVALID_METADATA: 'Some ebook details are invalid. Check the title, publication date, and tags, then retry.',
    INVALID_FILE: 'Choose a supported file with a valid filename and content type.',
  }
  const code = error.response?.data?.code
  if (typeof code === 'string' && messages[code]) return messages[code]
  switch (error.response?.status) {
    case 401: return 'Your session has expired. Please sign in again.'
    case 403: return 'Only an authorized admin can manage ebooks.'
    case 404: return 'This ebook or upload no longer exists. Refresh the library and try again.'
    case 409: return 'This ebook has changed or another upload is active. Refresh and try again.'
    case 410: return 'The upload authorization has expired. Select the file and retry the upload.'
    case 413: return 'The selected file exceeds the configured upload limit.'
    case 415: return 'The file type is not supported. Choose a valid PDF, JPEG, PNG, or WebP file.'
    case 422: return 'The uploaded file could not be validated. Choose a valid file and try again.'
    case 429: return 'Too many requests. Please wait a moment and try again.'
    default: return fallback
  }
}

export function createEbookApi(api: AxiosInstance, token: string, onUnauthorized: () => void) {
  const headers = { Authorization: `Bearer ${token}` }
  async function request<T>(method: string, url: string, data?: unknown, signal?: AbortSignal): Promise<T> {
    try {
      const response = await api.request<T>({ method, url, data, signal, headers, timeout: 45000 })
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) onUnauthorized()
      throw error
    }
  }
  const base = '/admin/ebooks'
  return {
    config: (signal?: AbortSignal) => request<EbookConfig>('GET', `${base}/config`, undefined, signal),
    list: (query: { page: number; limit: number; q: string; status: string }, signal?: AbortSignal) => {
      const params = new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]))
      return request<EbookPage>('GET', `${base}?${params}`, undefined, signal)
    },
    get: (id: string) => request<Ebook>('GET', `${base}/${id}`),
    save: (metadata: EbookMetadata, id?: string) => request<Ebook>(id ? 'PATCH' : 'POST', `${base}${id ? `/${id}` : ''}`, metadata),
    publish: (id: string, published: boolean) => request<Ebook>('POST', `${base}/${id}/${published ? 'publish' : 'unpublish'}`, {}),
    remove: (id: string) => request<{ message: string }>('DELETE', `${base}/${id}`),
    authorize: (id: string, payload: { kind: UploadKind; filename: string; size: number; contentType: string }) =>
      request<UploadAuthorization>('POST', `${base}/${id}/uploads`, payload),
    complete: (id: string, uploadId: string) => request<Ebook>('POST', `${base}/${id}/uploads/${uploadId}/complete`, {}),
    cancel: (id: string, uploadId: string) => request<{ message: string }>('POST', `${base}/${id}/uploads/${uploadId}/cancel`, {}),
  }
}

export type EbookApi = ReturnType<typeof createEbookApi>
