import { Link } from 'react-router-dom'
import logo from '../lib/logo.png'
import { mainLinks } from './portal/links'
import { NavIcon } from './portal/navigation'

export default function HeroMockup() {
  return (
    <div className="portal-preview glass-panel overflow-hidden rounded-[28px] text-left" aria-label="Illustrative member portal preview">
      <div className="preview-titlebar flex items-center justify-between px-5 py-3 border-b border-black/5">
        <div className="flex gap-1.5" aria-hidden="true"><i /><i /><i /></div>
        <span className="text-[11px] font-medium text-ink-soft">The Builders / Member Portal</span>
        <span className="text-[10px] text-ink-soft">Preview</span>
      </div>
      <div className="flex">
        <aside className="glass-dark hidden md:flex w-52 shrink-0 p-5 flex-col text-white">
          <div className="flex items-center gap-2 mb-8"><img src={logo} alt="" className="w-8 h-8 rounded-lg" /><div><p className="text-sm font-semibold">The Builders</p><p className="text-[10px] text-white/60">Member Portal</p></div></div>
          <div className="space-y-1.5">{mainLinks.map((link, index) => <div key={link.to} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs ${index === 0 ? 'bg-white/15 text-white border border-white/15' : 'text-white/65'}`}><NavIcon type={link.icon} size={16} />{link.label}</div>)}</div>
          <p className="mt-auto pt-8 text-[10px] text-white/50">A little curiosity goes a long way.</p>
        </aside>
        <div className="flex-1 min-w-0 p-4 sm:p-7 preview-content">
          <div className="flex justify-between items-center mb-5"><span className="eyebrow text-ink-soft">Your workspace</span><span className="rounded-full bg-white/80 px-3 py-1.5 text-[10px] text-ink-soft">Made for builders</span></div>
          <div className="glass-dark rounded-2xl p-5 sm:p-7 text-white">
            <p className="text-[10px] uppercase tracking-[.16em] text-white/60 mb-3">Learn. Build. Connect.</p>
            <h2 className="text-xl sm:text-3xl font-semibold tracking-tight">Your next idea starts here.</h2>
            <p className="mt-2 text-xs sm:text-sm text-white/70">A space for everything you're building.</p>
            <Link to="/signup" className="inline-flex mt-5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink">Join the community <span aria-hidden="true" className="ml-3">↗</span></Link>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4">{[['calendar', 'Sessions', 'Learn together'], ['folder', 'Projects', 'Make it real'], ['users', 'Members', 'Find your people']].map(([icon, title, detail]) => <div className="glass-card rounded-2xl p-3 sm:p-4" key={title}><NavIcon type={icon} size={18} /><p className="text-xs sm:text-sm font-semibold mt-3">{title}</p><p className="hidden sm:block text-[11px] text-ink-soft mt-1">{detail}</p></div>)}</div>
          <div className="glass-card rounded-2xl mt-4 p-4 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold">Stay curious. Stay in the loop.</p><p className="text-[11px] text-ink-soft mt-1">Your weekly digest of ideas worth exploring.</p></div><NavIcon type="digest" size={22} /></div>
        </div>
      </div>
    </div>
  )
}


