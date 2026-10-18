import { GraduationCap, Hammer, Users } from 'lucide-react'
import { useScrollReveal } from '../hooks/useScrollReveal'

const cards = [
  {
    title: 'Learn',
    description:
      'Weekly sessions on AI, technology, and what’s happening at the frontier. No fluff, just what’s actually worth knowing.',
    icon: <GraduationCap className="w-5 h-5 text-accent" strokeWidth={1.75} />,
  },
  {
    title: 'Build',
    description:
      'Real projects, real outcomes, not just theory. You ship things you can point to and say: I made that.',
    icon: <Hammer className="w-5 h-5 text-accent" strokeWidth={1.75} />,
  },
  {
    title: 'Connect',
    description:
      'Meet other students who like building things. Bring an idea, or just bring your curiosity.',
    icon: <Users className="w-5 h-5 text-accent" strokeWidth={1.75} />,
  },
]

export default function WhatWeDo() {
  const headingRef = useScrollReveal()
  const cardsRef = useScrollReveal({ selector: '.reveal-card', stagger: 0.15 })

  return (
    <section id="what-we-do" className="relative py-20 sm:py-28 px-6 bg-surface">
      <div className="max-w-6xl mx-auto">
        <div ref={headingRef} className="max-w-md mb-14 sm:mb-16">
          <p className="text-[13px] font-semibold text-accent mb-3">What we do</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.1] text-ink">Everything you need to get going.</h2>
        </div>

        <div ref={cardsRef} className="grid sm:grid-cols-3 gap-6">
          {cards.map((card) => (
            <div
              key={card.title}
              className="reveal-card glass-card card-hover rounded-[18px] p-8"
            >
              <div className="w-10 h-10 rounded-[10px] bg-accent-subtle flex items-center justify-center mb-6">
                {card.icon}
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-ink mb-3">{card.title}</h3>
              <p className="text-[15px] leading-relaxed text-ink-soft">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

