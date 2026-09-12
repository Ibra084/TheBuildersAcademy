import { useScrollReveal } from '../hooks/useScrollReveal'

const steps = [
  { number: '01', title: 'Join', description: 'Sign in to the portal. Takes less than a minute, no commitment yet.' },
  { number: '02', title: 'Show up', description: 'Come to a weekly session. See what we’re building and who’s building it.' },
  { number: '03', title: 'Build', description: 'Pick a project, bring an idea, or just start learning alongside everyone else.' },
]

export default function HowItWorks() {
  const headingRef = useScrollReveal()
  const stepsRef = useScrollReveal({ selector: '.reveal-step', stagger: 0.18 })

  return (
    <section id="how-it-works" className="relative py-16 sm:py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 ref={headingRef} className="text-4xl sm:text-5xl font-semibold tracking-tight text-center text-ink mb-10 sm:mb-12">
          Simple by design.
        </h2>

        <div className="glass-panel rounded-[2rem] p-8 sm:p-14">
          <div ref={stepsRef} className="relative grid sm:grid-cols-3 gap-14 sm:gap-8">
            <div
              className="hidden sm:block absolute top-7 left-[16.6%] right-[16.6%] h-px border-t-2 border-dotted border-ink/15"
              aria-hidden="true"
            />

            {steps.map((step) => (
              <div key={step.number} className="reveal-step relative text-center sm:text-left">
                <span className="accent-text text-5xl font-semibold tracking-tight tabular-nums">{step.number}</span>
                <h3 className="mt-4 text-xl font-bold tracking-tight text-ink">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft max-w-[16rem] mx-auto sm:mx-0">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

