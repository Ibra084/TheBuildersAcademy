import { useState } from 'react'
import { MailCheck } from 'lucide-react'
import { AuthCard, AuthDivider, AuthFootnote, TextLink } from '../../components/auth/AuthCard'
import { ErrorBanner, NoticeBanner, SubmitButton, TextField } from '../../components/auth/fields'
import { useAuthForm } from '../../hooks/useAuthForm'
import { resendVerification } from '../../lib/auth'

export default function CheckEmail() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const { pending, error, fieldErrors, submit } = useAuthForm()

  return (
    <AuthCard>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <MailCheck className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-gray-900">Check your email</h1>
      <p className="text-[15px] leading-relaxed text-gray-500">
        We&apos;ve sent a verification link to the address you used. Open it on this device to finish creating your account. It can take a minute or two, so check your spam folder too.
      </p>

      <AuthDivider>Still waiting?</AuthDivider>
      {message ? <NoticeBanner>{message}</NoticeBanner> : (
        <form onSubmit={e => { e.preventDefault(); void submit(async () => setMessage(await resendVerification(email))) }} noValidate className="flex flex-col gap-3">
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <TextField label="Didn't get it? Resend to" name="email" type="email" icon="mail" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} error={fieldErrors.email} required />
          <SubmitButton pending={pending} pendingLabel="Sending…">Resend verification email</SubmitButton>
        </form>
      )}

      <AuthFootnote>
        Already verified? <TextLink to="/sign-in">Sign in</TextLink>
      </AuthFootnote>
    </AuthCard>
  )
}
