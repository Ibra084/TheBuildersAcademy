import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, KeyRound, Plus, Search, Trash2, UserRound, X } from 'lucide-react'
import { buildersApi } from '../../lib/buildersApi'
import { isValidAlias, normalizeAlias } from '../../lib/identity'
import BulkAliasCreator from './BulkAliasCreator'
import ConfirmDialog from './ConfirmDialog'

function relativeTime(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** Shows a temporary password exactly once, with a copy button. */
function IssuedCard({ issued, onClose }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(`Alias: ${issued.alias}\nTemporary password: ${issued.password}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked; the details stay on screen to copy by hand.
    }
  }
  return (
    <div role="status" className="animate-rise-in rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[14px] font-semibold text-gray-900">{issued.kind === 'created' ? 'Alias created' : 'Password reset'}. Give these to the student:</p>
        <button type="button" onClick={onClose} aria-label="Hide these details" className="-m-1 rounded-lg p-1 text-gray-400 hover:bg-white/70 hover:text-gray-700">
          <X className="h-4 w-4" />
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[14px]">
        <dt className="text-gray-500">Alias</dt>
        <dd className="font-mono font-semibold text-gray-900">{issued.alias}</dd>
        <dt className="text-gray-500">Temporary password</dt>
        <dd className="font-mono font-semibold text-gray-900">{issued.password}</dd>
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={copy} className="btn-press flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy both'}
        </button>
        <p className="text-[12.5px] leading-snug text-gray-500">
          This password is shown once. The student signs in at <span className="font-medium text-gray-700">Sign in with a student alias</span> and then chooses their own.
        </p>
      </div>
    </div>
  )
}

export default function AliasManager() {
  const [aliases, setAliases] = useState(null)
  const [requests, setRequests] = useState([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [issued, setIssued] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [filter, setFilter] = useState('')
  const [creating, setCreating] = useState(false)
  const [working, setWorking] = useState(false)

  const closeConfirm = useCallback(() => setConfirm(null), [])
  const refresh = useCallback(() => buildersApi('list').then(data => { setAliases(data.aliases); setRequests(data.requests) }).catch(err => setError(err.message)), [])
  useEffect(() => {
    void refresh()
    // Temporary passwords never outlive the page.
    const clear = () => setIssued(null)
    window.addEventListener('pagehide', clear)
    return () => window.removeEventListener('pagehide', clear)
  }, [refresh])

  const normalized = normalizeAlias(draft)
  const draftProblem = draft && !isValidAlias(normalized) ? 'Use 3–32 lowercase letters or numbers, with single . _ or - between them.' : null
  const shown = (aliases || []).filter(a => !filter || a.alias.includes(filter.trim().toLowerCase()))

  async function create(e) {
    e.preventDefault()
    if (!normalized || draftProblem) return
    setCreating(true)
    try {
      const result = await buildersApi('alias-create', { alias: normalized })
      setError('')
      setIssued({ alias: result.alias, password: result.password, kind: 'created' })
      setDraft('')
      await refresh()
    } catch (err) { setError(err.message) } finally { setCreating(false) }
  }

  async function runConfirmed() {
    if (!confirm) return
    const { kind, alias } = confirm
    setWorking(true)
    try {
      if (kind === 'reset') {
        const result = await buildersApi('alias-reset', { alias })
        setIssued({ alias: result.alias, password: result.password, kind: 'reset' })
      } else {
        await buildersApi('alias-delete', { alias })
        if (issued?.alias === alias) setIssued(null)
      }
      setError('')
      await refresh()
    } catch (err) { setError(err.message) } finally { setWorking(false); setConfirm(null) }
  }

  async function resolveRequest(id) {
    try { await buildersApi('resolve-request', { id }); await refresh() } catch (err) { setError(err.message) }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Student aliases</h2>
        <p className="mt-0.5 text-sm text-gray-400">Create sign-ins for students without a personal email, and reset forgotten passwords.</p>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6">
        <h3 className="text-[16px] font-semibold text-gray-900">Create a student alias</h3>
        <p className="mt-0.5 text-sm text-gray-400">
          For students without a personal email. Avoid real names; something like <span className="font-mono text-gray-500">maths7b-01</span> works well.
        </p>
        <form onSubmit={create} noValidate className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex-1">
            <label htmlFor="new-alias" className="sr-only">New alias</label>
            <div className="relative">
              <UserRound aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" strokeWidth={1.6} />
              <input
                id="new-alias"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="e.g. maths7b-01"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={draftProblem ? true : undefined}
                aria-describedby={draftProblem ? 'new-alias-error' : undefined}
                className={`w-full rounded-2xl border bg-white/50 py-3 pl-11 pr-4 font-mono text-[15px] text-gray-900 placeholder:font-sans placeholder-gray-400 transition-all duration-150 focus:bg-white/80 focus:outline-none focus:ring-4 ${
                  draftProblem ? 'border-red-300 focus:border-red-400 focus:ring-red-500/10' : 'border-black/[0.08] focus:border-blue-500 focus:ring-blue-500/15'
                }`}
              />
            </div>
            {draftProblem && <p id="new-alias-error" className="mt-1.5 px-1 text-[13px] text-red-600">{draftProblem}</p>}
          </div>
          <button
            type="submit"
            disabled={creating || !normalized || Boolean(draftProblem)}
            className="flex h-[50px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {creating ? <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />}
            {creating ? 'Creating…' : 'Create alias'}
          </button>
        </form>
      </section>

      {error && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {issued && <IssuedCard issued={issued} onClose={() => setIssued(null)} />}

      <BulkAliasCreator onCreated={refresh} />

      <section aria-labelledby="aliases-heading">
        <div className="mb-3 mt-4 flex flex-wrap items-center justify-between gap-3">
          <h3 id="aliases-heading" className="text-[13px] font-semibold uppercase tracking-[0.04em] text-gray-400">
            Student aliases <span className="ml-1 font-normal normal-case tracking-normal">{aliases?.length ?? ''}</span>
          </h3>
          {aliases?.length > 6 && (
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-300" />
              <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Find an alias" aria-label="Find an alias" className="w-48 rounded-xl border border-black/[0.08] bg-white py-1.5 pl-8 pr-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15" />
            </div>
          )}
        </div>

        {aliases === null ? (
          <div className="h-40 animate-pulse rounded-2xl bg-white" />
        ) : aliases.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-10 text-center">
            <p className="text-[15px] font-medium text-gray-700">No student aliases yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-400">Aliases you create will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white">
            {shown.map(a => (
              <li key={a.userId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[14.5px] font-medium text-gray-900">{a.alias}</span>
                  <span className="block text-[12.5px] text-gray-400">{a.lastSignInAt ? `Last signed in ${relativeTime(a.lastSignInAt)}` : 'Never signed in'}</span>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${a.disabled ? 'bg-gray-100 text-gray-500' : a.pendingPasswordChange ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                  {a.disabled ? 'Paused' : a.pendingPasswordChange ? 'Temporary password' : 'Active'}
                </span>
                <span className="flex items-center gap-0.5">
                  <button type="button" onClick={() => setConfirm({ kind: 'reset', alias: a.alias })} className="tap-target flex items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 sm:min-h-8">
                    <KeyRound className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    Reset password
                  </button>
                  <button type="button" onClick={() => setConfirm({ kind: 'delete', alias: a.alias })} aria-label={`Delete ${a.alias}`} className="tap-target flex items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 sm:h-8 sm:min-h-8 sm:w-8 sm:min-w-8">
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </span>
              </li>
            ))}
            {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-400">No aliases match &ldquo;{filter}&rdquo;.</li>}
          </ul>
        )}
      </section>

      {requests.length > 0 && (
        <section aria-labelledby="requests-heading">
          <h3 id="requests-heading" className="mb-3 mt-4 text-[13px] font-semibold uppercase tracking-[0.04em] text-gray-400">
            Privacy requests <span className="ml-1 font-normal normal-case tracking-normal">{requests.length}</span>
          </h3>
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white">
            {requests.map(r => (
              <li key={r.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-gray-900">{r.name} · <span className="font-normal text-gray-500">{r.kind}</span></span>
                  <span className="block whitespace-pre-wrap text-[13px] text-gray-500">{r.message}</span>
                </span>
                <button type="button" onClick={() => void resolveRequest(r.id)} className="btn-press rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-50">Mark handled</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.kind === 'delete' ? `Delete ${confirm.alias}?` : `Reset ${confirm?.alias}'s password?`}
        description={confirm?.kind === 'delete'
          ? "The account and everything it has posted will be permanently deleted. This can't be undone."
          : "They'll be signed out everywhere and get a new temporary password, which you'll see once."}
        confirmLabel={confirm?.kind === 'delete' ? 'Delete' : 'Reset password'}
        danger={confirm?.kind === 'delete'}
        working={working}
        onConfirm={runConfirmed}
        onCancel={closeConfirm}
      />
    </div>
  )
}
