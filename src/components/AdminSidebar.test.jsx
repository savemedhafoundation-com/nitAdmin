import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminSidebar from './AdminSidebar'

describe('admin ebook navigation', () => {
  it('keeps existing sections and routes ebooks with an accessible active state', async () => {
    const navigate = vi.fn()
    const user = userEvent.setup()
    render(<AdminSidebar activeView="ebooks" onNavigate={navigate} />)
    expect(screen.getByRole('button', { name: /Blogs/ })).toBeVisible()
    expect(screen.getByRole('button', { name: /Case Studies/ })).toBeVisible()
    const ebooks = screen.getByRole('button', { name: /Ebooks/ })
    expect(ebooks).toHaveAttribute('aria-current', 'page')
    expect(ebooks).toHaveClass('active')
    await user.click(ebooks)
    expect(navigate).toHaveBeenCalledWith('ebooks')
  })
})
