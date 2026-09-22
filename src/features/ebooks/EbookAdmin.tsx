import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { AxiosInstance } from 'axios'
import { createEbookApi } from './ebookApi'
import type { AdminUser } from './types'
import EbookLibrary from './EbookLibrary'
import './ebooks.css'

const sessionKey = 'nit_admin_token'

function savedToken(): string {
  try { return window.sessionStorage.getItem(sessionKey) || '' } catch { return '' }
}

export default function EbookAdmin({ api }: { api: AxiosInstance }) {
  const [token, setToken] = useState(savedToken)
  const [user, setUser] = useState<AdminUser | null>(null)
  const [checking, setChecking] = useState(Boolean(token))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const signOut = useCallback(() => {
    try { window.sessionStorage.removeItem(sessionKey) } catch { /* Session stays in memory when storage is unavailable. */ }
    setUser(null)
    setToken('')
    setChecking(false)
  }, [])

  const unauthorized = useCallback(() => {
    signOut()
    setError('Your admin session has ended. Please sign in again.')
  }, [signOut])

  const ebookApi = useMemo(() => createEbookApi(api, token, unauthorized), [api, token, unauthorized])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    api.get<AdminUser>('/auth/me', { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return
        if (data.role !== 'admin') {
          signOut()
          setError('Only an authorized admin can manage ebooks.')
          return
        }
        setUser(data)
      })
      .catch(() => {
        if (!controller.signal.aborted) unauthorized()
      })
      .finally(() => { if (!controller.signal.aborted) setChecking(false) })
    return () => controller.abort()
  }, [api, token, signOut, unauthorized])

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setSubmitting(true)
    setError('')
    try {
      const { data } = await api.post<AdminUser>('/auth/login', { email: fields.get('email'), password: fields.get('password') })
      if (data.role !== 'admin' || !data.token) {
        setError('Only an authorized admin can manage ebooks.')
        return
      }
      try { window.sessionStorage.setItem(sessionKey, data.token) } catch { /* The current session can still proceed in memory. */ }
      setChecking(true)
      setToken(data.token)
    } catch {
      setError('Unable to sign in. Check your email and password and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (checking) return <div className="panel ebook-login" role="status">Checking your admin access…</div>

  if (!token || !user) return (
    <section className="panel ebook-login" aria-labelledby="ebook-login-heading">
      <p className="kicker">NIT Library</p>
      <h1 id="ebook-login-heading">Manage Ebooks</h1>
      <p className="hint">Sign in with your existing admin account to upload, edit, and publish ebooks.</p>
      <form onSubmit={login} className="blog-form">
        <label>Email<input type="email" name="email" autoComplete="username" required maxLength={254} /></label>
        <label>Password<input type="password" name="password" autoComplete="current-password" required /></label>
        {error && <p role="alert" className="status error">{error}</p>}
        <button type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </section>
  )

  return <EbookLibrary api={ebookApi} user={user} onSignOut={signOut} />
}
