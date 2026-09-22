import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export default function EbookDialog({ title, children, onClose, busy = false }: {
  title: string; children: ReactNode; onClose: () => void; busy?: boolean
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const busyRef = useRef(busy)
  useEffect(() => { onCloseRef.current = onClose; busyRef.current = busy }, [onClose, busy])
  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const firstInput = dialogRef.current?.querySelector<HTMLInputElement>('input:not([type=file])')
    const initialFocus = firstInput || dialogRef.current?.querySelector<HTMLButtonElement>('button') || dialogRef.current
    initialFocus?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) onCloseRef.current()
      if (event.key !== 'Tab') return
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]') ?? [])
        .filter(element => element.offsetParent !== null)
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first) { event.preventDefault(); dialogRef.current?.focus(); return }
      if (!dialogRef.current?.contains(document.activeElement)) { event.preventDefault(); first.focus() }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', handleKey)
      previouslyFocused?.focus()
    }
  }, [])
  return createPortal(<div className="blog-dialog-overlay ebook-dialog-overlay">
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="blog-dialog ebook-dialog">
      <header className="blog-dialog-header"><h2>{title}</h2><button type="button" className="ghost" onClick={onClose} disabled={busy}>Close</button></header>
      <div className="blog-dialog-body">{children}</div>
    </div>
  </div>, document.body)
}
