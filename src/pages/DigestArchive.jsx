import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { usePublicDigests } from '../hooks/usePublicDigests'

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function DigestArchive() {
  const { issues, loading, error } = usePublicDigests()

  return (
    <div className="app-surface relative min-h-screen">
      <Navbar />
      <main className="landing-hero px-6">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow accent-text mb-3">The Builders Weekly</p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-ink mb-4">All issues.</h1>
          <p className="text-base text-ink-soft mb-10 sm:mb-12">
            Every roundup we've published, newest first.
          </p>

          {error && <p role="alert" className="text-sm text-red-600 mb-6">{error}</p>}

          {loading ? (
            <div className="space-y-5" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="glass-card rounded-3xl p-7 h-32 animate-pulse" />
              ))}
            </div>
          ) : issues.length === 0 ? (
            <div className="glass-card rounded-3xl p-10 text-center">
              <p className="text-[15px] text-ink-soft">No issues published yet — check back soon.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {issues.map((issue) => (
                <Link
                  key={issue.id}
                  to={`/digest/${issue.id}`}
                  className="glass-card flex flex-col sm:flex-row gap-5 items-start rounded-3xl p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_-20px_rgba(54,109,204,0.25)]"
                >
                  {issue.teaserImage && (
                    <img src={issue.teaserImage} alt="" className="w-full sm:w-40 h-32 rounded-2xl object-cover shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="eyebrow text-accent-blue mb-3">
                      Issue {String(issue.issueNumber).padStart(2, '0')} · {formatDate(issue.date)}
                    </p>
                    <h2 className="text-xl font-bold tracking-tight text-ink mb-2">{issue.headline}</h2>
                    {!issue.teaserImage && <p className="text-[15px] leading-relaxed text-ink-soft">{issue.teaser}</p>}
                    <span className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent-blue">
                      Read <span aria-hidden="true">&rarr;</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
