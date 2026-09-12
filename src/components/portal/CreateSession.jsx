import { useState } from 'react'
import { createSession } from '../../hooks/useSessions'
const input = 'mt-1 w-full min-w-0 rounded-xl border border-black/10 bg-white/80 px-3 py-2.5 text-sm'
export default function CreateSession({ onCreated }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', date: '', location: '', description: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      const session = await createSession(form)
      onCreated(session)
      setForm({ title: '', date: '', location: '', description: '' }); setOpen(false)
      setMessage('Session published. It is selected below, ready for check-in.')
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <section className="glass-card rounded-3xl p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Sessions</h2><p className="text-sm text-ink-soft mt-1">Publish a session for the community.</p></div><button type="button" disabled={busy} onClick={() => { setOpen(!open); setMessage('') }} className="solid-btn rounded-full px-5 py-2.5 text-sm text-white">{open ? 'Cancel' : '+ Create session'}</button></div>
    {message && <p role="status" className="mt-4 text-sm text-accent-teal">{message}</p>}
    {open && <form onSubmit={submit} className="mt-5 grid sm:grid-cols-2 gap-4">
      <label className="text-sm font-medium sm:col-span-2">Session title<input required maxLength={160} className={input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
      <label className="text-sm font-medium">Date and time<input required type="datetime-local" className={input} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /><span className="text-xs text-ink-soft">Your timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</span></label>
      <label className="text-sm font-medium">Location or meeting link<input required maxLength={500} className={input} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></label>
      <label className="text-sm font-medium sm:col-span-2">Description (optional)<textarea rows={2} maxLength={2000} className={input} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
      {error && <p role="alert" className="sm:col-span-2 text-sm text-red-600">{error}</p>}
      <button disabled={busy} className="solid-btn rounded-xl px-5 py-3 text-sm text-white sm:col-span-2 disabled:opacity-50">{busy ? 'Publishing…' : 'Publish session'}</button>
    </form>}
  </section>
}
