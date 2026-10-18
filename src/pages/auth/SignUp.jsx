import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthCard, AuthFootnote, AuthHeading, AuthTabs, TextLink } from '../../components/auth/AuthCard'
import { Checkbox, ErrorBanner, PasswordField, SubmitButton, TextField } from '../../components/auth/fields'
import { useAuthForm } from '../../hooks/useAuthForm'
import SignedInRedirect from '../../components/auth/SignedInRedirect'
import { useAuth } from '../../context/AuthContext'
import { passwordProblem, PASSWORD_MIN_LENGTH } from '../../lib/identity'

export default function SignUp() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [touched, setTouched] = useState(false)
  const { pending, error, fieldErrors, submit } = useAuthForm()
  // Live hint once the student has typed something; the server re-checks.
  const livePasswordProblem = touched && password ? passwordProblem(password) : null

  const onSubmit = e => {
    e.preventDefault()
    void submit(async () => {
      const result = await signup({ email, password, privacyAccepted: accepted })
      // Supabase returns success for an already-registered email too (no account enumeration).
      navigate(result.session ? '/portal' : '/check-email', { replace: true })
    })
  }

  return (
    <SignedInRedirect>
      <AuthCard>
        <AuthTabs active="sign-up" />
        <AuthHeading title="Join The Builders" subtitle="Sessions, projects and people who like making things." />
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5">
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <TextField
            label="Personal email"
            name="email"
            type="email"
            icon="mail"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            error={fieldErrors.email}
            hint="Not your school email. We'll send a link to verify it."
            autoFocus
            required
          />
          <PasswordField
            label="Create a password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onBlur={() => setTouched(true)}
            error={fieldErrors.password ?? livePasswordProblem ?? undefined}
            hint={`At least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number.`}
            required
          />
          <Checkbox checked={accepted} onChange={setAccepted} error={fieldErrors.privacyAccepted}>
            I agree to the{' '}
            <Link to="/privacy" target="_blank" className="text-gray-600 underline hover:text-gray-900">Privacy Notice</Link>
            . If I&apos;m under 18, a parent or guardian knows I&apos;m using The Builders.
          </Checkbox>
          <SubmitButton pending={pending} pendingLabel="Creating account…">Create account</SubmitButton>
        </form>
        <AuthFootnote>
          Your school gave you an alias? <TextLink to="/alias">Use it here</TextLink>
        </AuthFootnote>
      </AuthCard>
    </SignedInRedirect>
  )
}
