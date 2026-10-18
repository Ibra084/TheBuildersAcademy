import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Mail, UserRound } from 'lucide-react'
import { AuthCard, AuthFootnote, AuthHeading, TextLink } from '../../components/auth/AuthCard'
import { ErrorBanner, NoticeBanner, SubmitButton, TextField } from '../../components/auth/fields'
import { useAuthForm } from '../../hooks/useAuthForm'
import { requestPasswordReset } from '../../lib/auth'

export default function ForgotPassword() {
  const [params] = useSearchParams()
  const [account, setAccount] = useState(params.get('account') === 'alias' ? 'alias' : 'personal')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const { pending, error, fieldErrors, submit } = useAuthForm()
  const linkExpired = params.get('error') === 'link_invalid'

  const option = (value, label, Icon) => (
    <button
      type="button"
      role="radio"
      aria-checked={account === value}
      onClick={() => setAccount(value)}
      className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-[13px] font-semibold transition-all duration-200 active:scale-[0.98] ${
        account === value ? 'text-gray-900 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_10px_-4px_rgba(15,23,42,0.12)]' : 'text-gray-500 hover:bg-black/[0.03] hover:text-gray-700'
      }`}
      style={account === value ? { background: 'rgba(255,255,255,0.92)' } : undefined}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
      {label}
    </button>
  )

  return (
    <AuthCard>
      <AuthHeading title="Forgot your password?" subtitle="No problem. Let's get you back in." />
      <div className="flex flex-col gap-3.5">
        <div role="radiogroup" aria-label="Which kind of account do you have?" className="flex items-center gap-1 rounded-full border border-black/[0.04] p-1" style={{ background: 'rgba(15,23,42,0.04)' }}>
          {option('personal', 'Personal email', Mail)}
          {option('alias', 'Student alias', UserRound)}
        </div>

        {account === 'personal' ? (
          message ? <NoticeBanner>{message}</NoticeBanner> : (
            <form onSubmit={e => { e.preventDefault(); void submit(async () => setMessage(await requestPasswordReset(email))) }} noValidate className="flex flex-col gap-3.5">
              {error ? <ErrorBanner>{error}</ErrorBanner> : linkExpired ? <ErrorBanner>That reset link has expired or was already used. Request a new one below.</ErrorBanner> : null}
              <TextField label="Personal email" name="email" type="email" icon="mail" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} error={fieldErrors.email} autoFocus required />
              <SubmitButton pending={pending} pendingLabel="Sending link…">Send reset link</SubmitButton>
            </form>
          )
        ) : (
          <div className="rounded-2xl border border-black/[0.06] bg-white/60 px-4 py-4 text-[14px] leading-relaxed text-gray-600">
            <p className="font-semibold text-gray-900">Ask your teacher or administrator</p>
            <p className="mt-1">
              Student alias accounts don&apos;t have an email address, so we can&apos;t send a reset link. Your teacher or school administrator can give you a new temporary password. You&apos;ll choose your own password the next time you sign in.
            </p>
          </div>
        )}
      </div>
      <AuthFootnote>
        Remembered it? <TextLink to="/sign-in">Back to sign in</TextLink>
      </AuthFootnote>
    </AuthCard>
  )
}
