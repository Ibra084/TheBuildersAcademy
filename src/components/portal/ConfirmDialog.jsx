import { useEffect, useRef } from 'react'

/** Small alert dialog: blurred backdrop, Escape or Cancel closes, focus starts on Cancel. */
export default function ConfirmDialog({ open, title, description, confirmLabel, danger, working, onConfirm, onCancel }) {
  const cancelRef = useRef(null)
  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKey = e => { if (e.key === 'Escape' && !working) onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, working, onCancel])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="animate-fade-in absolute inset-0 bg-black/10 backdrop-blur-[2px]" onClick={() => !working && onCancel()} />
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" className="animate-auth-card-in relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-popover)] ring-1 ring-black/5">
        <div className="p-5">
          <h2 id="confirm-title" className="font-semibold text-gray-900">{title}</h2>
          <p id="confirm-description" className="mt-1.5 text-sm leading-relaxed text-gray-500">{description}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/80 px-5 py-3">
          <button ref={cancelRef} type="button" disabled={working} onClick={onCancel} className="btn-press rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          <button type="button" disabled={working} onClick={onConfirm} className={`btn-press rounded-lg px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-60 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {working ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
