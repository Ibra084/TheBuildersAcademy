import { useScrollReveal } from '../hooks/useScrollReveal'

const cards = [
  {
    title: 'Learn',
    description:
      'Weekly sessions on AI, technology, and what’s happening at the frontier. No fluff, just what’s actually worth knowing.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-accent-blue">
        <path d="M12 3 2 8l10 5 10-5-10-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Build',
    description:
      'Real projects, real outcomes, not just theory. You ship things you can point to and say: I made that.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-accent-blue">
        <path d="M14.7 3.3a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4l-2.1 2.1-6-6 2.1-2.1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M11.3 6.7l6 6-7.9 7.9a2 2 0 0 1-1 .55l-3.7.85.85-3.7a2 2 0 0 1 .55-1l7.9-7.9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Connect',
    description:
      'A community of ambitious students, no gatekeeping, no judgement. Bring an idea or bring curiosity — both get you in.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-accent-blue">
        <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17" cy="7" r="2.4" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 20c0-3.3 2.5-5.5 5.6-5.5S14.2 16.7 14.2 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M15.2 14.8c2.6.2 4.6 2.1 4.6 5.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function WhatWeDo() {
  const headingRef = useScrollReveal()
  const cardsRef = useScrollReveal({ selector: '.reveal-card', stagger: 0.15 })

  return (
    <section id="what-we-do" className="relative py-16 sm:py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 ref={headingRef} className="text-4xl sm:text-5xl font-semibold tracking-tight text-center text-ink mb-10 sm:mb-12">
          Everything you need to get going.
        </h2>

        <div ref={cardsRef} className="grid sm:grid-cols-3 gap-6">
          {cards.map((card) => (
            <div
              key={card.title}
              className="reveal-card glass-card group rounded-3xl p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_-20px_rgba(99,102,241,0.3)]"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 shadow-sm flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110">
                {card.icon}
              </div>
              <h3 className="text-xl font-bold tracking-tight text-ink mb-3">{card.title}</h3>
              <p className="text-[15px] leading-relaxed text-ink-soft">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

