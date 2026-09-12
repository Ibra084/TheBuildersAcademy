import { Link } from 'react-router-dom'
import logo from '../../lib/logo.png'

// Shared glass surfaces connect the public site and member portal.


export default function AuthLayout({ eyebrow, title, subtitle, children, footer, compact = false, className = '' }) {
  return (
    <div className={`app-surface min-h-screen flex lg:grid lg:grid-cols-[40%_minmax(0,1fr)] lg:h-dvh lg:min-h-0 lg:overflow-hidden ${className}`}>
      <div className="auth-scroll hidden lg:flex flex-col justify-between min-h-0 glass-dark px-14 py-12 relative overflow-x-hidden overflow-y-auto">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-28 -bottom-28 w-80 h-80 rounded-full border border-white/15" />
        <div className="absolute -right-6 -bottom-44 w-60 h-60 rounded-full border border-white/10" />
        </div>

        <Link to="/" className="relative flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
            <img src={logo} alt="" className="w-6 h-6 object-contain" />
          </span>
          <span className="text-white font-semibold tracking-tight">The Builders</span>
        </Link>

        <div className="relative">
          <p className="text-white text-[2rem] leading-[1.15] font-extrabold tracking-tight max-w-xs">
            Build something that matters.
          </p>
          <p className="mt-4 text-white/70 text-[15px] leading-relaxed max-w-xs">
            Sessions, tracks, and teams for secondary students who want to learn, create, and build together.
          </p>
        </div>

        <p className="relative text-white/45 text-[13px]">The Builders · A community for secondary students</p>
      </div>

      <div className="auth-scroll min-w-0 min-h-0 flex-1 flex flex-col items-center px-6 py-8 lg:overflow-y-auto">
        <div className="glass-panel rounded-[28px] p-6 sm:p-8 w-full max-w-[440px] shrink-0 my-auto">
          <Link to="/" className="lg:hidden inline-flex items-center gap-2 mb-12">
            <img src={logo} alt="The Builders" className="w-8 h-8 object-contain" />
            <span className="font-semibold tracking-tight text-ink">The Builders</span>
          </Link>

          {eyebrow && <p className="text-[13px] font-semibold text-accent-blue mb-3">{eyebrow}</p>}
          <h1 className="text-[1.75rem] font-extrabold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] text-ink-soft">{subtitle}</p>}

          <div className={compact ? 'mt-5' : 'mt-8'}>{children}</div>

          {footer && <div className={`${compact ? 'mt-4' : 'mt-7'} text-center text-[14px] text-ink-soft`}>{footer}</div>}
        </div>
      </div>
    </div>
  )
}





