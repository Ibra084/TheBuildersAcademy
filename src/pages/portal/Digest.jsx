import { Link } from 'react-router-dom'
import { usePublicDigests } from '../../hooks/usePublicDigests'

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

// Shows the same published issues as the public /digest pages — members
// see them here without leaving the portal, and "Read issue" opens the
// full article (public page, so it also works if they share the link).
export default function Digest() {
  const { issues, loading, error } = usePublicDigests()

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">Weekly Digest</h1>
        <p className="mt-1.5 text-[15px] text-ink-soft">A few things happening in AI and tech, published every week.</p>
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass-card rounded-2xl h-40 animate-pulse" />
          ))}
        </div>
      ) : issues.length === 0 ? (
        <p className="glass-card rounded-2xl p-6 text-sm text-ink-soft">Nothing published yet. Check back for community updates.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {issues.map((issue) => (
            <div key={issue.id} className="glass-card rounded-2xl p-5 flex flex-col">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft/60 mb-2">
                Issue {String(issue.issueNumber).padStart(2, '0')} · {formatDate(issue.date)}
              </p>
              <p className="text-[14px] font-semibold text-ink leading-snug mb-1.5">{issue.headline}</p>
              <p className="text-[13px] text-ink-soft leading-relaxed flex-1">{issue.teaser}</p>
              <Link to={`/digest/${issue.id}`} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent-blue">
                Read issue <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
