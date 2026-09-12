import { getResources } from '../../lib/store'

export default function Resources() {
  const RESOURCES = getResources()
  return (
    <div className="space-y-10">
      {Object.keys(RESOURCES).length === 0 && <p className="glass-card rounded-2xl p-6 text-sm text-ink-soft">Nothing published yet. Check back for community updates.</p>}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">Resources</h1>
        <p className="mt-1.5 text-[15px] text-ink-soft">A curated library to browse and learn from at your own pace.</p>
      </div>

      {Object.entries(RESOURCES).map(([category, items]) => (
        <div key={category}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft/60 mb-4">{category}</p>
          <div className="grid sm:grid-cols-2 gap-5">
            {items.map((item) => (
              <a key={item.title} href={item.url} className="glass-card rounded-2xl p-6 block transition-transform hover:-translate-y-1">
                <h3 className="text-[15px] font-bold tracking-tight text-ink mb-1.5">{item.title}</h3>
                <p className="text-[14px] text-ink-soft leading-relaxed">{item.description}</p>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

