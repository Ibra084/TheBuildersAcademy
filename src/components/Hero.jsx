import { Link } from 'react-router-dom'
import HeroMockup from './HeroMockup'

export default function Hero() {
  return (
    <section id="top" className="landing-hero px-5 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="hero-copy text-center mx-auto max-w-3xl">
          <h1 className="mt-7 text-[clamp(3rem,7.5vw,6rem)] font-semibold tracking-[-0.065em] leading-[1.02]">Big ideas.<br /><span className="text-ink-soft">Built together.</span></h1>
          <p className="mt-6 text-base sm:text-lg text-ink-soft max-w-lg mx-auto leading-relaxed">Learn something new. Find your people. Turn your next idea into something real with a community of secondary students.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/signup" className="solid-btn rounded-full px-7 py-3.5 text-sm font-semibold text-white">Start building <span aria-hidden="true" className="ml-2">↗</span></Link>
            <a href="#portal-preview" className="glass-card rounded-full px-7 py-3.5 text-sm font-semibold">Explore the portal <span aria-hidden="true" className="ml-2">↓</span></a>
          </div>
          <p className="mt-5 text-xs text-ink-soft">Free to join · Open to secondary students</p>
        </div>
        <div id="portal-preview" className="mt-14 sm:mt-16 scroll-mt-28"><HeroMockup /></div>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-7 text-xs text-ink-soft"><span>One community.</span><span>Weekly sessions.</span><span>Real projects.</span><span>Room for your ideas.</span></div>
      </div>
    </section>
  )
}

