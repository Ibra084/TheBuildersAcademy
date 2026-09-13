import { useState } from 'react'
import { getAllUsers, getInitials } from '../../lib/auth'
import { useAuth } from '../../context/AuthContext'
import { useSessions } from '../../hooks/useSessions'
import CreateSession from '../../components/portal/CreateSession'
import DigestManager from '../../components/portal/DigestManager'
import { useCheckIns, startCheckIn, endCheckIn } from '../../lib/checkin'

function statusLabel(status) {
  if (status === 'present') return 'Present'
  if (status === 'absent') return 'Not in session'
  return 'Waiting…'
}

function statusClasses(status) {
  if (status === 'present') return 'text-accent-teal bg-accent-teal/10'
  if (status === 'absent') return 'text-red-500 bg-red-500/10'
  return 'text-ink-soft/60 bg-black/[0.04]'
}

export default function Admin() {
  const { user } = useAuth()
  const { sessions: SESSIONS, loading: sessionsLoading, error: sessionsError } = useSessions()
  const members = getAllUsers()
  const { active, responses, history, error: checkInError, loading: checkInLoading, refresh } = useCheckIns()
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const selectedId = selectedSessionId || SESSIONS[0]?.id || ''

  const handleStart = async () => {
    const session = SESSIONS.find(s => s.id === selectedId)
    if (!session) return
    setBusy(true); setActionError('')
    try { await startCheckIn(session); refresh() } catch (err) { setActionError(err.message); refresh() } finally { setBusy(false) }
  }
  const handleEnd = async () => {
    setBusy(true); setActionError('')
    try { await endCheckIn(active.id); refresh() } catch (err) { setActionError(err.message) } finally { setBusy(false) }
  }
  const presentCount = Object.values(responses).filter((r) => r.status === 'present').length
  const absentCount = Object.values(responses).filter((r) => r.status === 'absent').length
  const pendingCount = Math.max(members.length - presentCount - absentCount, 0)

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">Admin</h1>
        <p className="mt-1.5 text-[15px] text-ink-soft">Take the register and manage community access.</p>
      </div>

      {(actionError || checkInError) && <p role="alert" className="text-sm text-red-600">{actionError || checkInError}</p>}

      <DigestManager />

      <CreateSession onCreated={session => setSelectedSessionId(session.id)} />
      {sessionsError && <p role="alert" className="text-sm text-red-600">Could not load sessions: {sessionsError}</p>}
      <div className="glass-card rounded-[1.75rem] p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft/60 mb-5">Check-in</p>

        {active ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-[18px] font-bold tracking-tight text-ink">{active.sessionTitle}</p>
                <p className="text-[13px] text-ink-soft">
                  Started {new Date(active.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button disabled={busy} onClick={handleEnd} className="rounded-full px-5 py-2.5 text-[14px] font-semibold text-white bg-ink">
                End check-in
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl bg-accent-teal/10 p-4">
                <p className="text-2xl font-extrabold text-accent-teal">{presentCount}</p>
                <p className="text-[12px] text-ink-soft">Present</p>
              </div>
              <div className="rounded-xl bg-red-500/10 p-4">
                <p className="text-2xl font-extrabold text-red-500">{absentCount}</p>
                <p className="text-[12px] text-ink-soft">Not in session</p>
              </div>
              <div className="rounded-xl bg-black/[0.04] p-4">
                <p className="text-2xl font-extrabold text-ink-soft">{pendingCount}</p>
                <p className="text-[12px] text-ink-soft">Waiting</p>
              </div>
            </div>

            <div className="divide-y divide-black/[0.06]">
              {members.map((member) => {
                const response = responses[member.id]
                return (
                  <div key={member.id} className="flex items-center justify-between py-2.5">
                    <p className="text-[14px] text-ink">{member.name}</p>
                    <span className={`text-[12px] font-semibold rounded-full px-2.5 py-1 ${statusClasses(response?.status)}`}>
                      {statusLabel(response?.status)}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[220px]">
              <label htmlFor="checkin-session" className="block text-sm font-medium text-ink mb-2">Session</label>
              <select id="checkin-session"
                value={selectedId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full rounded-xl bg-white/80 border border-black/[0.08] px-4 py-2.5 text-[14px] text-ink outline-none focus:ring-2 focus:ring-accent-blue/40 transition-shadow"
              >
                {SESSIONS.length === 0 && <option value="">{sessionsLoading ? 'Loading sessions…' : 'No sessions published yet'}</option>}
                {SESSIONS.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title}
                  </option>
                ))}
              </select>
            </div>
            <button disabled={!selectedId || sessionsLoading || checkInLoading || busy} onClick={handleStart} className="solid-btn rounded-xl px-6 py-2.5 text-[14px] font-semibold text-white">
              Start check-in
            </button>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft/60 mb-4">Past check-ins</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {history.map((entry) => {
              const present = Object.values(entry.responses).filter((r) => r.status === 'present').length
              return (
                <div key={entry.id} className="glass-card rounded-2xl p-5">
                  <p className="text-[14px] font-semibold text-ink">{entry.sessionTitle}</p>
                  <p className="text-[13px] text-ink-soft mt-1">
                    {new Date(entry.startedAt).toLocaleDateString()} · {present} of {members.length} present
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft/60 mb-4">Members &amp; admin access</p>
        <div className="glass-card rounded-2xl divide-y divide-black/[0.06]">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between gap-4 px-6 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-accent-blue flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {getInitials(member.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-ink truncate">{member.name}</p>
                  <p className="text-[12px] text-ink-soft truncate">{member.year}</p>
                </div>
              </div>
              <span className="text-xs text-ink-soft">{member.id === user?.id && user?.isAdmin ? 'Owner' : 'Member'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}




