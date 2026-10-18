import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthCard, AuthHeading } from '../../components/auth/AuthCard'
import { ErrorBanner, PasswordField, SubmitButton } from '../../components/auth/fields'
import { useAuthForm } from '../../hooks/useAuthForm'
import { setNewPassword } from '../../lib/auth'
import { PASSWORD_MIN_LENGTH } from '../../lib/identity'

/** Reached from the recovery email: Supabase signs the student in from the link first. */
export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const { pending, error, fieldErrors, submit } = useAuthForm()
  const onSubmit = e => {
    e.preventDefault()
    void submit(async () => { await setNewPassword(password); navigate('/portal?notice=password-updated', { replace: true }) })
  }
  return (
    <AuthCard>
      <AuthHeading title="Choose a new password" subtitle="You'll use this next time you sign in." />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5">
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <PasswordField label="New password" name="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} error={fieldErrors.password} hint={`At least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number.`} autoFocus required />
        <SubmitButton pending={pending} pendingLabel="Saving…">Save new password</SubmitButton>
      </form>
    </AuthCard>
  )
}
