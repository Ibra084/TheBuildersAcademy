import { Link } from 'react-router-dom'
import HeroMockup from './HeroMockup'
import Orbs from './Orbs'
import { ArrowUpRight, ArrowDown } from 'lucide-react'

export default function Hero() {
  return (
    <section id="top" className="landing-hero relative overflow-hidden px-5 sm:px-8 bg-gradient-to-b from-accent-subtle via-white to-white">
      <Orbs />
      <div className="relative max-w-6xl mx-auto">
        <div className="hero-copy text-center mx-auto max-w-3xl">
          <h1 className="mt-7 text-[clamp(3rem,7.5vw,6rem)] font-bold tracking-[-0.045em] leading-[1.02]">Big ideas.<br /><span className="text-accent">Built together.</span></h1>
          <p className="mt-6 text-base sm:text-lg text-ink-soft max-w-lg mx-auto leading-relaxed">Learn something new, meet people who like making things, and turn your ideas into real projects.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/sign-up" className="solid-btn inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white">Start building <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" className="" /></Link>
            <a href="#portal-preview" className="glass-card inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold">Explore the portal <ArrowDown size={16} strokeWidth={2} aria-hidden="true" /></a>
          </div>
        </div>
        <div id="portal-preview" className="mt-14 sm:mt-16 scroll-mt-28"><HeroMockup /></div>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-7 text-xs text-ink-muted"><span>Weekly sessions.</span><span>Real projects.</span><span>Room for your ideas.</span></div>
      </div>
    </section>
  )
}

