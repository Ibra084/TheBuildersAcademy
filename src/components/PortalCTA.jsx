import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { useScrollReveal } from '../hooks/useScrollReveal'

export default function PortalCTA() {
  const panelRef = useScrollReveal()
  return (
    <section id="portal" className="relative py-20 sm:py-28 px-6 bg-white">
      <div ref={panelRef} className="relative overflow-hidden bg-gray-900 max-w-6xl mx-auto rounded-3xl p-8 sm:p-16 text-white text-center">
        <div aria-hidden="true" className="pointer-events-none absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 w-64 h-64 bg-blue-600/15 rounded-full -translate-x-1/2 translate-y-1/2 blur-3xl" />
        <div className="relative">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full">Your people. Your projects. Your place.</span>
          <h2 className="mt-5 text-4xl sm:text-6xl font-bold tracking-tight">Let's build something.</h2>
          <p className="mt-5 text-base text-gray-400 max-w-md mx-auto">Bring an idea or just your curiosity. Your next chapter starts in the member portal.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white px-7 py-3.5 text-sm font-semibold shadow-lg shadow-blue-600/25 transition-all">Join The Builders <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" /></Link>
            <Link to="/sign-in" className="rounded-full border border-white/20 hover:border-white/40 hover:bg-white/5 px-7 py-3.5 text-sm font-semibold transition-all">Log in</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
