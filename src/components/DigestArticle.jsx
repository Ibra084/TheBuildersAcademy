import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { marked } from 'marked'

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

// Shared article rendering, used by both the public /digest/:id page and
// the portal's own /portal/digest/:id page — so members reading a digest
// from inside the portal stay inside the portal instead of getting bounced
// out to the public site.
export default function DigestArticle({ issue, backTo, showSubscribe = true }) {
  const bodyHtml = useMemo(() => (issue?.body ? marked.parse(issue.body) : ''), [issue?.body])

  return (
    <article className="max-w-[680px] mx-auto">
      <Link to={backTo} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft hover:text-ink transition-colors mb-8">
        <span aria-hidden="true">&larr;</span> All issues
      </Link>

      <p className="text-[13px] font-medium text-ink-soft/70 mb-3">
        Issue {String(issue.issueNumber).padStart(2, '0')} · {formatDate(issue.date)}
      </p>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-ink leading-[1.15]">{issue.headline}</h1>

      {issue.teaserImage && (
        <img src={issue.teaserImage} alt="" className="w-full rounded-3xl mt-8 object-cover max-h-[420px]" />
      )}

      <hr className="my-8 border-t border-ink/10" />

      {issue.sourceUrl && (
        <p className="text-[13px] text-ink-soft/70 mb-8">
          Originally published on{' '}
          <a href={issue.sourceUrl} className="text-accent-blue font-medium">
            Medium
          </a>
          .
        </p>
      )}

      {bodyHtml ? (
        <div className="digest-body mb-12" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      ) : (
        <>
          {issue.aiNews.length > 0 && (
            <section className="mb-10">
              <h2 className="eyebrow accent-text mb-5">This week in AI</h2>
              <div className="space-y-6">
                {issue.aiNews.map((item) => (
                  <div key={item.title}>
                    <p className="text-[16px] font-bold text-ink mb-1.5">{item.title}</p>
                    <p className="text-[15px] leading-relaxed text-ink-soft">{item.body}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {issue.buildSomething?.title && (
            <section className="mb-10">
              <h2 className="eyebrow accent-text mb-5">Something to build</h2>
              <p className="text-[16px] font-bold text-ink mb-1.5">{issue.buildSomething.title}</p>
              <p className="text-[15px] leading-relaxed text-ink-soft">{issue.buildSomething.description}</p>
            </section>
          )}

          {issue.resourceOfWeek?.title && (
            <section className="mb-10">
              <h2 className="eyebrow accent-text mb-5">Resource of the week</h2>
              <p className="text-[16px] font-bold text-ink mb-1.5">{issue.resourceOfWeek.title}</p>
              <p className="text-[15px] leading-relaxed text-ink-soft mb-2">{issue.resourceOfWeek.description}</p>
              {issue.resourceOfWeek.url && (
                <a href={issue.resourceOfWeek.url} className="text-[14px] font-semibold text-accent-blue break-all">
                  {issue.resourceOfWeek.url}
                </a>
              )}
            </section>
          )}

          {issue.communityUpdate && (
            <section className="mb-12">
              <h2 className="eyebrow accent-text mb-5">Community update</h2>
              <p className="text-[15px] leading-relaxed text-ink-soft">{issue.communityUpdate}</p>
            </section>
          )}
        </>
      )}

      {showSubscribe && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 text-center">
          <p className="text-[15px] font-semibold text-ink mb-4">Subscribe to get this every Sunday</p>

          {/*
            Placeholder — same as the landing page subscribe form.
            TODO: replace with the real Beehiiv embed snippet once the
            publication exists.
          */}
          <form onSubmit={(e) => e.preventDefault()} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              required
              placeholder="you@example.com"
              aria-label="Email address"
              className="flex-1 rounded-xl bg-white/80 border border-black/[0.08] px-4 py-3 text-[14px] text-ink placeholder:text-ink-soft/50 outline-none focus:ring-2 focus:ring-accent-blue/40 transition-shadow"
            />
            <button type="submit" className="solid-btn rounded-xl px-6 py-3 text-[14px] font-semibold text-white whitespace-nowrap">
              Subscribe
            </button>
          </form>
        </div>
      )}
    </article>
  )
}
