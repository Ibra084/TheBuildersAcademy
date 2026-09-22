import { Link } from 'react-router-dom'
export default function Footer() {
  return (
    <footer className="py-12 px-6 text-center border-t border-ink/5">
      <p className="text-sm text-ink-soft">The Builders · A community for secondary students</p>
      <Link to="/privacy" className="inline-block mt-3 text-xs underline text-ink-soft">Privacy Notice</Link>
    </footer>
  )
}
