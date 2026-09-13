import { useEffect, useRef, useState } from 'react'
import { getAllDigestIssuesForAdmin, createDigestIssue, updateDigestIssue, deleteDigestIssue } from '../../lib/publicDigests'
import { fetchArticleContent } from '../../lib/mediumImport'
import { uploadDigestImage } from '../../lib/digestImages'

const inputClass =
  'w-full rounded-xl bg-white/80 border border-black/[0.08] px-4 py-2.5 text-[14px] text-ink placeholder:text-ink-soft/50 outline-none focus:ring-2 focus:ring-accent-blue/40 transition-shadow'

function emptyAiNews() {
  return [
    { title: '', body: '' },
    { title: '', body: '' },
    { title: '', body: '' },
  ]
}

export default function DigestManager() {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [mediumUrl, setMediumUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const refresh = async () => {
    try {
      const data = await getAllDigestIssuesForAdmin()
      setIssues(data)
      setListError('')
    } catch (err) {
      setListError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const handleImport = async (e) => {
    e.preventDefault()
    setImporting(true)
    setImportError('')
    try {
      const { headline, teaser, body, sourceUrl } = await fetchArticleContent(mediumUrl)
      const nextIssueNumber = issues.reduce((max, item) => Math.max(max, item.issueNumber || 0), 0) + 1
      const draft = await createDigestIssue({
        issueNumber: nextIssueNumber,
        date: new Date().toISOString().slice(0, 10),
        headline,
        teaser,
        aiNews: emptyAiNews(),
        buildSomething: { title: '', description: '' },
        resourceOfWeek: { title: '', description: '', url: '' },
        communityUpdate: '',
        sourceUrl,
        // The full article text goes straight into `body` — this is what
        // actually renders on the public page, not a fragment to retype.
        body,
        published: false,
      })
      setMediumUrl('')
      setIssues((prev) => [draft, ...prev])
      setExpandedId(draft.id)
    } catch (err) {
      setImportError(err.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-[1.75rem] p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft/60 mb-5">Import content</p>
        <form onSubmit={handleImport} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <label htmlFor="medium-url" className="block text-sm font-medium text-ink mb-2">
              Medium article URL
            </label>
            <input
              id="medium-url"
              type="url"
              required
              value={mediumUrl}
              onChange={(e) => setMediumUrl(e.target.value)}
              placeholder="https://medium.com/@you/article-slug"
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={importing}
            className="solid-btn rounded-xl px-6 py-2.5 text-[14px] font-semibold text-white whitespace-nowrap disabled:opacity-60"
          >
            {importing ? 'Importing…' : 'Import from Medium'}
          </button>
        </form>
        {importError && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {importError}
          </p>
        )}
        <p className="mt-3 text-[12px] text-ink-soft/70">
          Pulls the full article — title and body — into a new draft below. Give it a quick proofread (scraped
          formatting can be rough in places), then publish.
        </p>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft/60 mb-4">Digest issues</p>
        {listError && (
          <p role="alert" className="text-sm text-red-600 mb-4">
            {listError}
          </p>
        )}
        {loading ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : issues.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-sm text-ink-soft">
            No issues yet — import one above, or add one by hand.
          </div>
        ) : (
          <div className="space-y-4">
            {issues.map((issue) => (
              <IssueEditor
                key={issue.id}
                issue={issue}
                expanded={expandedId === issue.id}
                onToggle={() => setExpandedId((prev) => (prev === issue.id ? null : issue.id))}
                onSaved={(updated) => setIssues((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))}
                onDeleted={(id) => setIssues((prev) => prev.filter((item) => item.id !== id))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function IssueEditor({ issue, expanded, onToggle, onSaved, onDeleted }) {
  const [form, setForm] = useState(issue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [uploadingTeaser, setUploadingTeaser] = useState(false)
  const [uploadingBodyImage, setUploadingBodyImage] = useState(false)
  const bodyRef = useRef(null)

  useEffect(() => {
    setForm(issue)
  }, [issue])

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }))
  const updateAiNews = (index, patch) =>
    setForm((prev) => ({
      ...prev,
      aiNews: prev.aiNews.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }))

  const handleTeaserImageChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingTeaser(true)
    setError('')
    try {
      const url = await uploadDigestImage(file)
      update({ teaserImage: url })
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingTeaser(false)
    }
  }

  // Inserts uploaded-image Markdown at the cursor position in the body
  // textarea — this is the manual fix for images Medium's import misses
  // (it can only catch images the reader service actually extracted).
  const handleBodyImageChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingBodyImage(true)
    setError('')
    try {
      const url = await uploadDigestImage(file)
      const textarea = bodyRef.current
      const current = form.body || ''
      const cursor = textarea ? textarea.selectionStart : current.length
      const markdown = `![](${url})`
      const next = `${current.slice(0, cursor)}\n\n${markdown}\n\n${current.slice(cursor)}`
      update({ body: next })
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingBodyImage(false)
    }
  }

  const handleSave = async (publishOverride) => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const updated = await updateDigestIssue(issue.id, {
        issueNumber: Number(form.issueNumber) || 1,
        date: form.date,
        headline: form.headline,
        teaser: form.teaser,
        teaserImage: form.teaserImage,
        body: form.body,
        aiNews: form.aiNews,
        buildSomething: form.buildSomething,
        resourceOfWeek: form.resourceOfWeek,
        communityUpdate: form.communityUpdate,
        published: publishOverride !== undefined ? publishOverride : form.published,
      })
      onSaved(updated)
      setMessage(publishOverride === true ? 'Published.' : publishOverride === false ? 'Unpublished.' : 'Saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this issue for good?')) return
    setSaving(true)
    setError('')
    try {
      await deleteDigestIssue(issue.id)
      onDeleted(issue.id)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink truncate">{form.headline || 'Untitled issue'}</p>
          <p className="text-[12px] text-ink-soft">
            Issue {form.issueNumber} · {form.date}
          </p>
        </div>
        <span
          className={`shrink-0 text-[11px] font-semibold rounded-full px-2.5 py-1 ${
            form.published ? 'text-accent-teal bg-accent-teal/10' : 'text-ink-soft bg-black/[0.05]'
          }`}
        >
          {form.published ? 'Published' : 'Draft'}
        </span>
      </button>

      {expanded && (
        <div className="px-6 pb-6 pt-2 border-t border-black/[0.06] space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-ink">
              Issue number
              <input
                type="number"
                min="1"
                value={form.issueNumber}
                onChange={(e) => update({ issueNumber: e.target.value })}
                className={`${inputClass} mt-1.5`}
              />
            </label>
            <label className="block text-sm font-medium text-ink">
              Date
              <input type="date" value={form.date} onChange={(e) => update({ date: e.target.value })} className={`${inputClass} mt-1.5`} />
            </label>
          </div>

          <label className="block text-sm font-medium text-ink">
            Headline
            <input value={form.headline} onChange={(e) => update({ headline: e.target.value })} className={`${inputClass} mt-1.5`} />
          </label>

          <label className="block text-sm font-medium text-ink">
            Teaser
            <textarea
              rows={2}
              value={form.teaser}
              onChange={(e) => update({ teaser: e.target.value })}
              className={`${inputClass} mt-1.5 resize-none`}
            />
          </label>

          <div>
            <p className="text-sm font-medium text-ink mb-2">Teaser image</p>
            <p className="text-[12px] text-ink-soft/70 mb-2">
              Shown on cards instead of the text teaser above when set.
            </p>
            {form.teaserImage ? (
              <div className="relative inline-block">
                <img src={form.teaserImage} alt="" className="rounded-xl max-h-40 w-auto" />
                <button
                  type="button"
                  onClick={() => update({ teaserImage: '' })}
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-ink text-white text-[13px] font-semibold flex items-center justify-center"
                  aria-label="Remove teaser image"
                >
                  &times;
                </button>
              </div>
            ) : (
              <label className="inline-flex items-center gap-2 text-[13px] font-medium text-ink cursor-pointer rounded-xl bg-black/[0.05] hover:bg-black/[0.08] transition-colors px-4 py-2.5">
                {uploadingTeaser ? 'Uploading…' : 'Upload image'}
                <input type="file" accept="image/*" onChange={handleTeaserImageChange} disabled={uploadingTeaser} className="hidden" />
              </label>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <label htmlFor={`body-${issue.id}`} className="text-sm font-medium text-ink">
                Full article body (Markdown)
              </label>
              <label className="shrink-0 inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent-blue cursor-pointer">
                {uploadingBodyImage ? 'Uploading…' : '+ Insert image'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBodyImageChange}
                  disabled={uploadingBodyImage}
                  className="hidden"
                />
              </label>
            </div>
            <textarea
              id={`body-${issue.id}`}
              ref={bodyRef}
              rows={16}
              value={form.body || ''}
              onChange={(e) => update({ body: e.target.value })}
              placeholder="Paste or write the full article here. When this is filled in, it's what actually renders on the public page — the sections below are only used when this is left empty. Missing an image from the Medium import? Click your cursor where you want it and use 'Insert image' above."
              className={`${inputClass} font-mono text-[13px] resize-y`}
            />
          </div>
          {form.sourceUrl && (
            <p className="text-[12px] text-ink-soft/70">
              Imported from{' '}
              <a href={form.sourceUrl} className="text-accent-blue font-medium break-all">
                {form.sourceUrl}
              </a>
            </p>
          )}

          <details className="rounded-xl bg-black/[0.02] p-3">
            <summary className="text-sm font-medium text-ink cursor-pointer">
              Optional structured sections (only used if the body above is empty)
            </summary>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-ink mb-2">This week in AI</p>
            <div className="space-y-3">
              {form.aiNews.map((item, i) => (
                <div key={i} className="rounded-xl bg-black/[0.02] p-3 space-y-2">
                  <input
                    placeholder={`Item ${i + 1} title`}
                    value={item.title}
                    onChange={(e) => updateAiNews(i, { title: e.target.value })}
                    className={inputClass}
                  />
                  <textarea
                    rows={2}
                    placeholder="Two sentences"
                    value={item.body}
                    onChange={(e) => updateAiNews(i, { body: e.target.value })}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink mb-2">Something to build</p>
            <div className="rounded-xl bg-black/[0.02] p-3 space-y-2">
              <input
                placeholder="Title"
                value={form.buildSomething.title || ''}
                onChange={(e) => update({ buildSomething: { ...form.buildSomething, title: e.target.value } })}
                className={inputClass}
              />
              <textarea
                rows={2}
                placeholder="Description"
                value={form.buildSomething.description || ''}
                onChange={(e) => update({ buildSomething: { ...form.buildSomething, description: e.target.value } })}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink mb-2">Resource of the week</p>
            <div className="rounded-xl bg-black/[0.02] p-3 space-y-2">
              <input
                placeholder="Title"
                value={form.resourceOfWeek.title || ''}
                onChange={(e) => update({ resourceOfWeek: { ...form.resourceOfWeek, title: e.target.value } })}
                className={inputClass}
              />
              <textarea
                rows={2}
                placeholder="Description"
                value={form.resourceOfWeek.description || ''}
                onChange={(e) => update({ resourceOfWeek: { ...form.resourceOfWeek, description: e.target.value } })}
                className={`${inputClass} resize-none`}
              />
              <input
                placeholder="URL"
                value={form.resourceOfWeek.url || ''}
                onChange={(e) => update({ resourceOfWeek: { ...form.resourceOfWeek, url: e.target.value } })}
                className={inputClass}
              />
            </div>
          </div>

              <label className="block text-sm font-medium text-ink">
                Community update
                <textarea
                  rows={2}
                  value={form.communityUpdate}
                  onChange={(e) => update({ communityUpdate: e.target.value })}
                  className={`${inputClass} mt-1.5 resize-none`}
                />
              </label>
            </div>
          </details>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {message && <p role="status" className="text-sm text-accent-teal">{message}</p>}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave()}
              className="rounded-xl px-5 py-2.5 text-[14px] font-semibold text-ink bg-black/[0.05] hover:bg-black/[0.08] transition-colors disabled:opacity-60"
            >
              Save
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(!form.published)}
              className="solid-btn rounded-xl px-5 py-2.5 text-[14px] font-semibold text-white disabled:opacity-60"
            >
              {form.published ? 'Unpublish' : 'Save & publish'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleDelete}
              className="rounded-xl px-5 py-2.5 text-[14px] font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60 ml-auto"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
