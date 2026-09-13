import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { usePublicDigests } from '../hooks/usePublicDigests'

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function DigestPreview() {
  const headingRef = useScrollReveal()
  const cardsRef = useScrollReveal({ selector: '.reveal-digest-card', stagger: 0.15 })
  const [email, setEmail] = useState('')
  const { issues: allIssues, loading } = usePublicDigests()

  // Latest three issues, oldest to newest — matches the "three cards in a
  // row" preview described in the design spec. `allIssues` is already
  // newest-first from the hook.
  const issues = allIssues.slice(0, 3).reverse()

  const handleSubscribe = (e) => {
    e.preventDefault()
    // Placeholder only — no subscription actually happens yet, so this
    // intentionally does not show a fake "subscribed" confirmation.
    // TODO: replace this whole form with the real Beehiiv embed snippet
    // (Beehiiv > Publication Settings > Subscribe Forms > Embed) once the
    // publication exists. It will handle validation, sending, and the
    // success state itself.
  }

  return (
    <section id="digest-preview" className="relative py-16 sm:py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div ref={headingRef} className="text-center mb-10 sm:mb-12">
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-ink">This week in building.</h2>
          <p className="mt-4 text-base text-ink-soft max-w-xl mx-auto">
            A weekly roundup of what's happening in AI and technology — curated for student builders. Free, every Sunday.
          </p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-3 gap-6" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass-card rounded-3xl p-7 h-48 animate-pulse" />
            ))}
          </div>
        ) : issues.length === 0 ? (
          <div className="glass-card rounded-3xl p-10 text-center max-w-xl mx-auto">
            <p className="text-[15px] text-ink-soft">No issues published yet — check back soon.</p>
          </div>
        ) : (
          <div ref={cardsRef} className="grid sm:grid-cols-3 gap-6">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="reveal-digest-card glass-card rounded-3xl overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_-20px_rgba(54,109,204,0.25)]"
              >
                {issue.teaserImage && (
                  <img src={issue.teaserImage} alt="" className="w-full h-40 object-cover" />
                )}
                <div className="p-7 flex flex-col flex-1">
                  <p className="eyebrow text-accent-blue mb-4">
                    Issue {String(issue.issueNumber).padStart(2, '0')} · {formatDate(issue.date)}
                  </p>
                  <h3 className="text-lg font-bold tracking-tight text-ink mb-2.5">{issue.headline}</h3>
                  {!issue.teaserImage && (
                    <p className="text-[14px] leading-relaxed text-ink-soft flex-1">{issue.teaser}</p>
                  )}
                  <Link
                    to={`/digest/${issue.id}`}
                    className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent-blue"
                  >
                    Read issue <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="glass-panel mt-8 rounded-3xl p-6 sm:p-8 max-w-xl mx-auto text-center">
          <p className="text-[15px] font-semibold text-ink mb-1">Get it in your inbox</p>
          <p className="text-[13px] text-ink-soft mb-5">One email, every Sunday. Unsubscribe whenever.</p>

          {/*
            Placeholder subscribe form — UI only, not wired to anything yet.
            TODO: swap this <form> for the Beehiiv embed snippet once the
            publication is created. Leave the surrounding markup/spacing as
            a fallback in case the embed needs a moment to load.
          */}
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email address"
              className="flex-1 rounded-xl bg-white/80 border border-black/[0.08] px-4 py-3 text-[14px] text-ink placeholder:text-ink-soft/50 outline-none focus:ring-2 focus:ring-accent-blue/40 transition-shadow"
            />
            <button type="submit" className="solid-btn rounded-xl px-6 py-3 text-[14px] font-semibold text-white whitespace-nowrap">
              Subscribe
            </button>
          </form>
        </div>

        <div className="text-center mt-8">
          <Link to="/digest" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink hover:text-accent-blue transition-colors">
            View all issues <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
