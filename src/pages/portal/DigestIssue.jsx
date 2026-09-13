import { Link, useParams } from 'react-router-dom'
import DigestArticle from '../../components/DigestArticle'
import { useDigestIssue } from '../../hooks/useDigestIssue'

// Same article content as the public /digest/:id page, but rendered inside
// the portal layout — so reading a digest from the portal doesn't bounce
// members out to the public site.
export default function PortalDigestIssue() {
  const { id } = useParams()
  const { issue, loading, error } = useDigestIssue(id)

  if (loading) {
    return (
      <div className="max-w-[680px] mx-auto space-y-4" aria-hidden="true">
        <div className="glass-card rounded-2xl h-6 w-40 animate-pulse" />
        <div className="glass-card rounded-2xl h-12 animate-pulse" />
        <div className="glass-card rounded-2xl h-64 animate-pulse" />
      </div>
    )
  }

  if (error || !issue) {
    return (
      <div className="max-w-[680px] mx-auto text-center">
        {error && <p role="alert" className="text-sm text-red-600 mb-4">{error}</p>}
        <p className="text-lg text-ink-soft mb-4">That issue doesn't exist.</p>
        <Link to="/portal/digest" className="text-accent-blue font-semibold">
          &larr; Back to all issues
        </Link>
      </div>
    )
  }

  return <DigestArticle issue={issue} backTo="/portal/digest" showSubscribe={false} />
}
