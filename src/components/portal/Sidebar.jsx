import { Link, NavLink, useNavigate } from 'react-router-dom'
import logo from '../../lib/logo.png'
import { useAuth } from '../../context/AuthContext'
import { getInitials } from '../../lib/auth'

import { mainLinks } from './links'
import { NavIcon } from './navigation'

const adminLinks = [{ label: 'Admin', to: '/portal/admin', icon: 'shield' }]

function Tooltip({ label }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 whitespace-nowrap rounded-lg bg-gray-900/95 px-2.5 py-1 text-xs font-medium text-white shadow-lg ring-1 ring-black/10 opacity-0 group-hover:opacity-100 transition-opacity z-20">
      {label}
    </span>
  )
}

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout(() => navigate('/sign-in?notice=signed-out'))
  }

  const linkClasses = ({ isActive }) =>
    `relative group w-full flex items-center rounded-xl text-sm font-medium transition-all ${
      collapsed ? 'h-10 justify-center' : 'px-3 py-2 gap-3'
    } ${isActive ? 'bg-accent text-white shadow-sm' : 'text-ink-soft hover:bg-surface-sunken hover:text-ink'}`

  const renderLinks = (links) =>
    links.map((link) => (
      <NavLink key={link.label} to={link.to} end={link.end} className={linkClasses}>
        <NavIcon type={link.icon} size={16} />
        {!collapsed && <span>{link.label}</span>}
        {collapsed && <Tooltip label={link.label} />}
      </NavLink>
    ))

  return (
    <aside
      className={`hidden lg:flex flex-col fixed z-30 portal-sidebar glass-card text-ink transition-[width] duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {collapsed ? (
        <button
          onClick={() => onToggle(false)}
          className="relative flex w-full items-center justify-center px-2 py-4 border-b border-border-subtle hover:bg-surface-sunken"
          aria-label="Expand sidebar"
        >
          <div className="relative">
            <img src={logo} alt="" className="h-9 w-9 rounded-xl object-contain" />
            <span className="absolute -right-1 -bottom-1 grid h-5 w-5 place-items-center rounded-full bg-white text-ink shadow-sm ring-1 ring-border">
              <NavIcon type="chevronRight" size={12} />
            </span>
          </div>
        </button>
      ) : (
        <div className="flex items-center px-5 py-5 border-b border-border-subtle">
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <img src={logo} alt="" className="h-9 w-9 rounded-xl object-contain shrink-0" />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold tracking-tight truncate">The Builders</p>
              <p className="text-[11px] text-ink-muted">Member Portal</p>
            </div>
          </Link>
          <button
            onClick={() => onToggle(true)}
            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken hover:text-ink shrink-0"
            aria-label="Collapse sidebar"
          >
            <NavIcon type="chevronLeft" size={18} />
          </button>
        </div>
      )}

      <div className={`${collapsed ? 'px-2 py-3' : 'px-5 py-4'} border-b border-border-subtle`}>
        <Link to="/portal/profile" className={collapsed ? 'grid place-items-center' : 'flex items-center gap-3'}>
          <div
            className={`${
              collapsed ? 'h-9 w-9' : 'h-10 w-10'
            } rounded-xl bg-accent-subtle text-accent flex items-center justify-center text-sm font-bold overflow-hidden shrink-0`}
          >
            {user?.photo ? <img src={user.photo} alt="" className="w-full h-full object-cover" /> : user && getInitials(user.name)}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[14px] font-semibold truncate">{user?.name}</p>
              <p className="text-[12px] text-ink-muted">{user?.year}</p>
            </div>
          )}
        </Link>
      </div>

      <nav className={`flex-1 overflow-y-auto overflow-x-hidden space-y-0.5 ${collapsed ? 'px-2 py-3' : 'px-4 py-4'}`}>
        {renderLinks(mainLinks)}

        {user?.isAdmin && (
          <>
            {!collapsed && <p className="px-2 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Admin</p>}
            {renderLinks(adminLinks)}
          </>
        )}
      </nav>

      <div className={`border-t border-border-subtle ${collapsed ? 'px-2 py-2' : 'px-3 py-3'} space-y-1`}>
        <NavLink to="/portal/profile" className={linkClasses}>
          <NavIcon type="user" size={16} />
          {!collapsed && <span>My Profile</span>}
          {collapsed && <Tooltip label="My Profile" />}
        </NavLink>
        <button
          onClick={handleLogout}
          className={`relative group w-full flex items-center rounded-xl text-sm font-medium text-ink-soft hover:bg-surface-sunken hover:text-ink transition-all ${
            collapsed ? 'h-10 justify-center' : 'px-3 py-2 gap-3'
          }`}
        >
          <NavIcon type="logout" size={16} />
          {!collapsed && <span>Log out</span>}
          {collapsed && <Tooltip label="Log out" />}
        </button>
      </div>
    </aside>
  )
}



