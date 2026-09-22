import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosInstance } from 'axios'
import EbookAdmin from './EbookAdmin'
import { admin, config } from '../../test/ebookFixtures'

function apiMock() {
  const request = vi.fn().mockImplementation(({ url }: { url: string }) => Promise.resolve({ data: url.endsWith('/config') ? config : { data: [], pagination: { page: 1, limit: 9, total: 0, pages: 0 } } }))
  return { get: vi.fn().mockResolvedValue({ data: admin }), post: vi.fn().mockResolvedValue({ data: { ...admin, token: 'jwt-admin-token' } }), request }
}

describe('ebook admin authentication', () => {
  it('requires login, reuses the existing auth endpoints, and sends JWT only to the API', async () => {
    const api = apiMock()
    const user = userEvent.setup()
    render(<EbookAdmin api={api as unknown as AxiosInstance} />)
    expect(api.request).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText('Email'), admin.email)
    await user.type(screen.getByLabelText('Password'), 'test-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('heading', { name: 'Ebooks' })).toBeVisible()
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: admin.email, password: 'test-password' })
    expect(api.get).toHaveBeenCalledWith('/auth/me', expect.objectContaining({ headers: { Authorization: 'Bearer jwt-admin-token' } }))
    expect(api.request).toHaveBeenCalledWith(expect.objectContaining({ headers: { Authorization: 'Bearer jwt-admin-token' } }))
    expect(sessionStorage.getItem('nit_admin_token')).toBe('jwt-admin-token')
  })
  it('rejects non-admin login and never requests ebook management data', async () => {
    const api = apiMock()
    api.post.mockResolvedValueOnce({ data: { ...admin, role: 'user', token: 'user-token' } })
    const user = userEvent.setup()
    render(<EbookAdmin api={api as unknown as AxiosInstance} />)
    await user.type(screen.getByLabelText('Email'), 'reader@example.com')
    await user.type(screen.getByLabelText('Password'), 'test-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Only an authorized admin')
    expect(api.request).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('nit_admin_token')).toBeNull()
  })
  it('validates a saved session and signs out an expired token', async () => {
    sessionStorage.setItem('nit_admin_token', 'expired')
    const api = apiMock()
    api.get.mockRejectedValueOnce(new Error('401'))
    render(<EbookAdmin api={api as unknown as AxiosInstance} />)
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent('session has ended')
    await waitFor(() => expect(sessionStorage.getItem('nit_admin_token')).toBeNull())
    expect(api.request).not.toHaveBeenCalled()
  })
  it('shows a safe error for a failed login', async () => {
    const api = apiMock()
    api.post.mockRejectedValueOnce(new Error('SECRET internal credential error'))
    const user = userEvent.setup()
    render(<EbookAdmin api={api as unknown as AxiosInstance} />)
    await user.type(screen.getByLabelText('Email'), admin.email)
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Check your email and password')
    expect(screen.queryByText(/SECRET/)).not.toBeInTheDocument()
  })
})
