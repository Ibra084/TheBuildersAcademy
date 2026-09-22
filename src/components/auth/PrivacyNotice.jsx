import { Link } from 'react-router-dom'
export default function PrivacyNotice() {
  return <details className="rounded-xl bg-black/[.025] p-3 text-xs leading-relaxed text-ink-soft">
    <summary className="cursor-pointer font-semibold text-ink">Your privacy</summary>
    <p className="mt-2">The Builders uses a small amount of personal information to create and manage your account and operate the community. We may collect your name, personal email address or Builders ID, and information associated with your account.</p>
    <p className="mt-2">We do not require your school email address and do not sell your personal information.</p>
    <p className="mt-2">By creating an account, you confirm that you have read our Privacy Notice and understand how your information is used.</p>
    <Link to="/privacy" target="_blank" rel="noreferrer" className="inline-block mt-2 underline">Read Privacy Notice</Link>
  </details>
}
