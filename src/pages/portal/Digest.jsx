import { getDigests } from '../../lib/store'

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function Digest() {
  const DIGESTS = getDigests()
  return (
    <div className="space-y-10">
      {Object.keys(DIGESTS).length === 0 && <p className="glass-card rounded-2xl p-6 text-sm text-ink-soft">Nothing published yet. Check back for community updates.</p>}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">Weekly Digest</h1>
        <p className="mt-1.5 text-[15px] text-ink-soft">A few things happening in AI and tech, published every week.</p>
      </div>

      {DIGESTS.map((digest) => (
        <div key={digest.id}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft/60 mb-4">{formatDate(digest.date)}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {digest.items.map((item) => (
              <div key={item.title} className="glass-card rounded-2xl p-5">
                <p className="text-[14px] font-semibold text-ink leading-snug mb-1.5">{item.title}</p>
                <p className="text-[13px] text-ink-soft leading-relaxed">{item.summary}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

