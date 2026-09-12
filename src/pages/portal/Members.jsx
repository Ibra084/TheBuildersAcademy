import { useState } from 'react'
import { getAllUsers, getInitials } from '../../lib/auth'

const colors = ['bg-accent-blue', 'bg-accent-purple', 'bg-accent-teal']

export default function Members() {
  const [query, setQuery] = useState('')
  const members = getAllUsers()
  const filtered = members.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">Members</h1>
          <p className="mt-1.5 text-[15px] text-ink-soft">{members.length} builders in the community.</p>
        </div>
        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft/50">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members"
            className="w-56 rounded-xl bg-white/80 border border-black/[0.08] pl-10 pr-4 py-2.5 text-[14px] text-ink placeholder:text-ink-soft/50 outline-none focus:ring-2 focus:ring-accent-blue/40 transition-shadow"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((member, i) => (
          <div key={member.id} className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-11 h-11 rounded-full ${colors[i % colors.length]} flex items-center justify-center text-white text-sm font-semibold shrink-0 overflow-hidden`}
              >
                {member.photo ? <img src={member.photo} alt="" className="w-full h-full object-cover" /> : getInitials(member.name)}
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-ink truncate">{member.name}</p>
                <p className="text-[13px] text-ink-soft">{member.year}</p>
              </div>
            </div>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              {member.whatBuilding || 'Hasn’t shared what they’re building yet.'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

