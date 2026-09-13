import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import DigestArticle from '../components/DigestArticle'
import { useDigestIssue } from '../hooks/useDigestIssue'

export default function DigestIssue() {
  const { id } = useParams()
  const { issue, loading, error } = useDigestIssue(id)

  if (loading) {
    return (
      <div className="app-surface relative min-h-screen">
        <Navbar />
        <main className="landing-hero px-6" aria-hidden="true">
          <div className="max-w-[680px] mx-auto space-y-4">
            <div className="glass-card rounded-2xl h-6 w-40 animate-pulse" />
            <div className="glass-card rounded-2xl h-12 animate-pulse" />
            <div className="glass-card rounded-2xl h-64 animate-pulse" />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !issue) {
    return (
      <div className="app-surface relative min-h-screen">
        <Navbar />
        <main className="landing-hero px-6 text-center">
          {error && <p role="alert" className="text-sm text-red-600 mb-4">{error}</p>}
          <p className="text-lg text-ink-soft mb-4">That issue doesn't exist.</p>
          <Link to="/digest" className="text-accent-blue font-semibold">
            &larr; Back to all issues
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="app-surface relative min-h-screen">
      <Navbar />
      <main className="landing-hero px-6">
        <DigestArticle issue={issue} backTo="/digest" showSubscribe />
      </main>
      <Footer />
    </div>
  )
}
