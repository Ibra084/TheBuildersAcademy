import { Link } from 'react-router-dom'
import logo from '../../lib/logo.png'
import Orbs from '../Orbs'

/** Dot-grid backdrop with a white wash toward the card, wordmark header and footer links. */
export function AuthLayout({ children }) {
  return (
    <div className="auth-backdrop auth-typography relative flex min-h-dvh flex-col overflow-hidden">
      <Orbs />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 45%, #ffffff 30%, rgba(255,255,255,0) 100%)' }} />
      <header className="relative z-10 flex h-16 items-center px-5 sm:px-8">
        <Link to="/" className="flex select-none items-center gap-2">
          <img src={logo} alt="" className="h-7 w-7 object-contain" />
          <span className="text-[17px] font-bold leading-none tracking-tight text-ink">The Builders</span>
        </Link>
      </header>
      <main className="relative z-10 flex flex-1 items-start justify-center px-4 pb-10 pt-4 sm:items-center sm:pt-0">{children}</main>
      <footer className="relative z-10 flex items-center justify-center gap-4 pb-6 text-xs text-gray-400">
        <Link to="/" className="transition-colors duration-150 hover:text-gray-600">Home</Link>
        <span aria-hidden="true">·</span>
        <Link to="/privacy" className="transition-colors duration-150 hover:text-gray-600">Privacy</Link>
      </footer>
    </div>
  )
}

/** The glass card: 408px, 28px radius, white/82 with a saturated blur and a soft slate drop shadow. */
export function AuthCard({ children }) {
  return (
    <AuthLayout>
      <div
        className="animate-auth-card-in w-full max-w-[408px] rounded-[28px] border px-6 pb-6 pt-6 sm:px-7"
        style={{
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          borderColor: 'rgba(255,255,255,0.6)',
          boxShadow: '0 20px 60px -18px rgba(15,23,42,0.22), 0 1px 1px rgba(255,255,255,0.5) inset, 0 0 0 1px rgba(15,23,42,0.04)',
        }}
      >
        {children}
      </div>
    </AuthLayout>
  )
}

export function AuthHeading({ title, subtitle }) {
  return (
    <div className="mb-5">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
      {subtitle && <p className="text-[15px] leading-relaxed text-gray-400">{subtitle}</p>}
    </div>
  )
}

/** Pill segmented control, as links between the two routes. */
export function AuthTabs({ active }) {
  const tab = (to, label, isActive) => (
    <Link
      to={to}
      role="tab"
      aria-selected={isActive}
      className={`flex-1 rounded-full py-2.5 text-center text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
        isActive ? 'text-gray-900 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_10px_-4px_rgba(15,23,42,0.12)]' : 'text-gray-500 hover:bg-black/[0.03] hover:text-gray-700'
      }`}
      style={isActive ? { background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)' } : undefined}
    >
      {label}
    </Link>
  )
  return (
    <div role="tablist" aria-label="Sign in or create an account" className="mb-5 flex items-center gap-1 rounded-full border border-black/[0.04] p-1" style={{ background: 'rgba(15,23,42,0.04)' }}>
      {tab('/sign-in', 'Sign in', active === 'sign-in')}
      {tab('/sign-up', 'Create account', active === 'sign-up')}
    </div>
  )
}

export function AuthDivider({ children }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-gray-100" />
      <span className="text-xs text-gray-400">{children}</span>
      <div className="h-px flex-1 bg-gray-100" />
    </div>
  )
}

export function AuthFootnote({ children }) {
  return <p className="mt-4 text-center text-sm text-gray-400">{children}</p>
}

export function TextLink({ to, children }) {
  return <Link to={to} className="font-medium text-blue-600 transition-colors duration-150 hover:underline">{children}</Link>
}
