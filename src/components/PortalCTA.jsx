import { Link } from 'react-router-dom'
import { useScrollReveal } from '../hooks/useScrollReveal'

export default function PortalCTA() {
  const panelRef = useScrollReveal()
  return (
    <section id="portal" className="relative py-16 sm:py-24 px-6">
      <div ref={panelRef} className="glass-dark max-w-6xl mx-auto rounded-[32px] p-8 sm:p-16 text-white text-center">
        <p className="eyebrow text-white/60">Your people. Your projects. Your place.</p>
        <h2 className="mt-5 text-4xl sm:text-6xl font-semibold tracking-[-.045em]">Let's build something.</h2>
        <p className="mt-5 text-base text-white/70 max-w-md mx-auto">Bring an idea or just your curiosity. Your next chapter starts in the member portal.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4"><Link to="/signup" className="rounded-full bg-white text-ink px-7 py-3.5 text-sm font-semibold hover:bg-white/90">Join The Builders <span aria-hidden="true">↗</span></Link><Link to="/login" className="rounded-full border border-white/25 px-7 py-3.5 text-sm font-medium hover:bg-white/10">Log in</Link></div>
        <p className="mt-6 text-xs text-white/60">Free to join. Open to every year group.</p>
      </div>
    </section>
  )
}
