import { useSessions } from '../../hooks/useSessions'

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function SessionCard({ session, past }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <h3 className="text-[16px] font-bold tracking-tight text-ink">{session.title}</h3>
        {past && (
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-ink-soft bg-black/[0.05]">Past</span>
        )}
      </div>
      <p className="text-[13px] font-medium text-ink-soft mb-3">
        {formatDate(session.date)} · {session.location}
      </p>
      <p className="text-[14px] text-ink-soft leading-relaxed mb-4">{session.description}</p>

      {session.resources.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {session.resources.map((resource) => (
            <a
              key={resource.label}
              href={resource.url}
              className="text-[13px] font-semibold text-accent-blue rounded-full px-3 py-1.5 bg-accent-blue/10 hover:bg-accent-blue/15 transition-colors"
            >
              {resource.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sessions() {
  const { sessions: SESSIONS, loading, error } = useSessions()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcoming = [...SESSIONS].filter((s) => new Date(s.date) >= today).sort((a, b) => new Date(a.date) - new Date(b.date))
  const past = [...SESSIONS].filter((s) => new Date(s.date) < today).sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div className="space-y-10">
      {loading && <p role="status">Loading sessions…</p>}
      {error && <p role="alert" className="text-red-600">Could not load sessions: {error}</p>}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">Sessions</h1>
        <p className="mt-1.5 text-[15px] text-ink-soft">Missed one? Slides and notes are attached below so you can catch up.</p>
      </div>

      {loading && <p role="status">Loading sessions…</p>}
      {error && <p role="alert" className="text-red-600">Could not load sessions: {error}</p>}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft/60 mb-4">Upcoming</p>
        <div className="grid sm:grid-cols-2 gap-5">
          {upcoming.length === 0 && <p className="text-sm text-ink-soft">No upcoming sessions published yet.</p>}
          {upcoming.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      </div>

      {loading && <p role="status">Loading sessions…</p>}
      {error && <p role="alert" className="text-red-600">Could not load sessions: {error}</p>}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft/60 mb-4">Past sessions</p>
        <div className="grid sm:grid-cols-2 gap-5">
          {past.length === 0 && <p className="text-sm text-ink-soft">No past sessions.</p>}
          {past.map((session) => (
            <SessionCard key={session.id} session={session} past />
          ))}
        </div>
      </div>
    </div>
  )
}


