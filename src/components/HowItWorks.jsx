import { UserPlus, CalendarCheck, Hammer } from 'lucide-react'
import { useScrollReveal } from '../hooks/useScrollReveal'

const steps = [
  { number: '01', title: 'Join', icon: UserPlus, description: 'Sign in to the portal. Takes less than a minute, no commitment yet.' },
  { number: '02', title: 'Show up', icon: CalendarCheck, description: 'Come to a weekly session. See what we’re building and who’s building it.' },
  { number: '03', title: 'Build', icon: Hammer, description: 'Pick a project, bring an idea, or just start learning alongside everyone else.' },
]

export default function HowItWorks() {
  const headingRef = useScrollReveal()
  const stepsRef = useScrollReveal({ selector: '.reveal-step', stagger: 0.18 })

  return (
    <section id="how-it-works" className="relative py-20 sm:py-28 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div ref={headingRef} className="max-w-md mb-14 sm:mb-20">
          <p className="text-[13px] font-semibold text-accent mb-3">How it works</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.1] text-ink">Simple by design.</h2>
        </div>

        <div ref={stepsRef} className="grid sm:grid-cols-3 gap-x-8 gap-y-12">
          {steps.map(({ number, title, icon: Icon, description }) => (
            <div key={number} className="reveal-step flex sm:flex-col gap-4 sm:gap-0">
              <div className="shrink-0 sm:mb-6 flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center">
                  <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="hidden sm:inline text-[13px] font-bold text-ink-faint tabular-nums">{number}</span>
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-ink mb-1.5">{title}</h3>
                <p className="text-[14px] leading-relaxed text-ink-soft max-w-[240px]">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
