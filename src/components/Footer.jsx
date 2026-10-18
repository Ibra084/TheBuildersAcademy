import { Link } from 'react-router-dom'
export default function Footer() {
  return (
    <footer className="py-12 px-6 text-center bg-white border-t border-border-subtle">
      <p className="text-sm text-ink-muted">The Builders</p>
      <Link to="/privacy" className="inline-block mt-3 text-xs underline text-ink-soft">Privacy Notice</Link>
    </footer>
  )
}
