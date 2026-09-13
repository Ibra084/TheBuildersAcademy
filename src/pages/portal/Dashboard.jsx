import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSessions } from '../../hooks/useSessions'
import { useAuth } from '../../context/AuthContext'
import { getAllUsers, getInitials } from '../../lib/auth'
import { getDigests, getProjects } from '../../lib/store'
import { useCheckIns, submitResponse } from '../../lib/checkin'

function firstName(name = '') {
  return name.trim().split(/\s+/)[0]
}

function StatIcon({ type }) {
  const paths = {
    users: (
      <>
        <circle cx="9" cy="8.5" r="3" />
        <path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
        <circle cx="17" cy="8.5" r="2.3" />
        <path d="M15 15.3c2.4.3 4.5 2.1 4.5 4.7" />
      </>
    ),
    calendar: (
      <>
        <rect x="4" y="5.5" width="16" height="14.5" rx="1.8" />
        <path d="M4 9.5h16M8 3.5v3M16 3.5v3" strokeLinecap="round" />
      </>
    ),
    folder: <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h4l2 2H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5v-11Z" />,
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] text-ink-soft/50">
      {paths[type]}
    </svg>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { active: activeCheckIn, responses: checkInResponses, history, error: checkInError, refresh } = useCheckIns()
  const [responseError, setResponseError] = useState('')
  const [responding, setResponding] = useState(false)
  const myResponse = user ? checkInResponses[user.id] : null
  const respond = async status => {
    setResponding(true); setResponseError('')
    try { await submitResponse(activeCheckIn.id, user.id, status); refresh() }
    catch (err) { setResponseError(err.message) } finally { setResponding(false) }
  }
  const { sessions: SESSIONS, error: sessionsError } = useSessions()
  const DIGESTS = getDigests()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcoming = SESSIONS.filter((s) => new Date(s.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3)
  const pastCount = SESSIONS.filter((s) => new Date(s.date) < today).length

  const latestDigest = DIGESTS[0]
  const members = getAllUsers()
  const projects = getProjects()


  const attendedCount = history.filter((h) => h.responses[user?.id]?.status === 'present').length
  const attendancePct = history.length ? Math.round((attendedCount / history.length) * 100) : 0
  const ringOffset = 2 * Math.PI * 18 * (1 - attendancePct / 100)

  const stats = [
    { value: members.length, label: 'Members in the community', icon: 'users' },
    { value: pastCount, label: 'Past scheduled sessions', icon: 'calendar' },
    { value: projects.length, label: 'Projects showcased', icon: 'folder' },
  ]

  return (
    <div className="space-y-8">
      {(responseError || checkInError) && <p role="alert" className="text-sm text-red-600">{responseError || checkInError}</p>}
      {sessionsError && <p role="alert" className="text-sm text-red-600">Could not load sessions: {sessionsError}</p>}
      {user?.isAdmin && <Link to="/portal/admin" className="glass-card block rounded-2xl p-5 text-sm font-semibold">Admin workspace → Publish sessions, resources, and updates</Link>}
      {/* Hero / greeting */}
      <div className="relative overflow-hidden rounded-2xl glass-dark text-white">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 p-6 sm:p-8 md:p-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight">
                Welcome back, {firstName(user?.name)}.
              </h1>
              <p className="mt-2 text-gray-300 max-w-md">Here's what's happening in The Builders this week.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/portal/sessions" className="inline-flex items-center gap-2 rounded-full bg-white text-black px-4 py-2.5 text-sm font-semibold hover:bg-gray-100">
                  Explore sessions
                </Link>
                <Link
                  to="/portal/projects"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
                >
                  View projects
                </Link>
              </div>
            </div>
            {history.length > 0 && (
              <div className="hidden md:block shrink-0">
                <div className="relative grid place-items-center">
                  <svg width="112" height="112" viewBox="0 0 42 42" className="-rotate-90">
                    <circle cx="21" cy="21" r="18" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="4" />
                    <circle
                      cx="21"
                      cy="21"
                      r="18"
                      fill="none"
                      stroke="white"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 18}
                      strokeDashoffset={ringOffset}
                    />
                  </svg>
                  <div className="absolute text-center">
                    <div className="text-2xl font-semibold">{attendancePct}%</div>
                    <div className="text-[11px] text-gray-300">attendance</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {activeCheckIn && !myResponse && (
        <div className="rounded-2xl border-2 border-accent-blue/30 bg-white p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-semibold text-accent-blue mb-1">Check-in open</p>
            <p className="text-[16px] font-bold text-ink">{activeCheckIn.sessionTitle}</p>
            <p className="text-[13px] text-ink-soft">Let your lead know you're here.</p>
          </div>
          <div className="flex gap-3">
            <button disabled={responding} onClick={() => respond('present')} className="solid-btn rounded-full px-5 py-2.5 text-[14px] font-semibold text-white">
              I'm here
            </button>
            <button disabled={responding}
              onClick={() => respond('absent')}
              className="rounded-full px-5 py-2.5 text-[14px] font-semibold text-ink-soft border border-black/[0.1] hover:bg-black/[0.03] transition-colors"
            >
              Not in session
            </button>
          </div>
        </div>
      )}

      {activeCheckIn && myResponse && (
        <div className="rounded-2xl glass-card p-5 text-[14px] text-ink-soft">
          You're marked as <span className="font-semibold text-ink">{myResponse.status === 'present' ? 'present' : 'not in session'}</span> for{' '}
          {activeCheckIn.sessionTitle}.
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl glass-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-ink-soft text-[13px]">{stat.label}</span>
              <StatIcon type={stat.icon} />
            </div>
            <div className="mt-2 text-2xl font-semibold text-ink">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 rounded-2xl glass-card p-6">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft/60 mb-4">Your profile</p>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-accent-blue flex items-center justify-center text-white font-semibold overflow-hidden shrink-0">
              {user?.photo ? <img src={user.photo} alt="" className="w-full h-full object-cover" /> : user && getInitials(user.name)}
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-ink truncate">{user?.name}</p>
              <p className="text-[13px] text-ink-soft">{user?.year}</p>
            </div>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft/60 mb-1.5">Building</p>
          <p className="text-[14px] text-ink-soft leading-relaxed">
            {user?.whatBuilding || 'What are you building? Tell the community.'}
          </p>
          <Link to="/portal/profile" className="mt-4 inline-block text-[13px] font-semibold text-accent-blue">
            Edit profile
          </Link>
        </div>

        <div className="lg:col-span-3 rounded-2xl glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft/60">Upcoming sessions</p>
            <Link to="/portal/sessions" className="text-[13px] font-semibold text-accent-blue">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {upcoming.length === 0 && <p className="text-[14px] text-ink-soft">Nothing scheduled yet — check back soon.</p>}
            {upcoming.map((session) => (
              <div key={session.id} className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-ink truncate">{session.title}</p>
                  <p className="text-[13px] text-ink-soft">{session.location}</p>
                </div>
                <p className="text-[13px] font-medium text-ink-soft whitespace-nowrap">
                  {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft/60">This week's digest</p>
          <Link to="/portal/digest" className="text-[13px] font-semibold text-accent-blue">
            View archive
          </Link>
        </div>
        {!latestDigest && <p className="glass-card rounded-2xl p-6 text-sm text-ink-soft">No updates published yet.</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {latestDigest?.items.map((item) => (
            <div key={item.title} className="rounded-xl glass-card p-5">
              <p className="text-[14px] font-semibold text-ink leading-snug mb-1.5">{item.title}</p>
              <p className="text-[13px] text-ink-soft leading-relaxed">{item.summary}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}





