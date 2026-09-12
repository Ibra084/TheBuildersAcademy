import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import Sidebar from '../../components/portal/Sidebar'
import { mainLinks } from '../../components/portal/links'
import { useAuth } from '../../context/AuthContext'
import { getInitials } from '../../lib/auth'

export default function PortalLayout() {
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="portal-surface portal-typography min-h-screen overflow-x-clip">
      <Sidebar collapsed={collapsed} onToggle={setCollapsed} />

      <div className={`min-w-0 transition-[margin] duration-300 ${collapsed ? 'lg:ml-20' : 'lg:ml-72'}`}>
        <header className="portal-header sticky z-20 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold tracking-tight">The Builders <span className="hidden sm:inline font-normal text-ink-soft ml-2">/ Member portal</span></div><div className="flex items-center gap-4">
            <span aria-hidden="true" className="relative w-9 h-9 rounded-full flex items-center justify-center text-ink-soft hover:bg-black/[0.04] transition-colors">
              <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px]">
                <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <Link
              to="/portal/profile"
              className="w-9 h-9 rounded-full bg-accent-blue flex items-center justify-center text-white text-[13px] font-semibold overflow-hidden"
              title={user?.name}
            >
              {user?.photo ? <img src={user.photo} alt="" className="w-full h-full object-cover" /> : user ? getInitials(user.name) : ''}
            </Link>
          </div>
          <nav aria-label="Portal navigation" className="lg:hidden flex w-full gap-2 overflow-x-auto pb-1 text-xs">
            {[...mainLinks, ...(user?.isAdmin ? [{ label: 'Admin', to: '/portal/admin' }] : []), { label: 'Profile', to: '/portal/profile' }].map(link => <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => `shrink-0 rounded-full px-3 py-2 ${isActive ? 'bg-ink text-white' : 'bg-white/60 text-ink-soft'}`}>{link.label}</NavLink>)}
            <button onClick={logout} className="shrink-0 rounded-full px-3 py-2 bg-white/60 text-ink-soft">Log out</button>
          </nav>
        </header>

        <main className="px-6 sm:px-10 py-8 max-w-6xl">
          <Outlet />
        </main>
      </div>
    </div>
  )
}





