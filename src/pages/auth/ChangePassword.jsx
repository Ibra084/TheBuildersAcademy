import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { AuthCard } from '../../components/auth/AuthCard'
import { Checkbox, ErrorBanner, PasswordField, SubmitButton } from '../../components/auth/fields'
import { useAuthForm } from '../../hooks/useAuthForm'
import { useAuth } from '../../context/AuthContext'
import { PASSWORD_MIN_LENGTH } from '../../lib/identity'

/** Alias first sign-in (or after a reset): replace the temporary password before using the portal. */
export default function ChangePassword() {
  const { user, loading, changeTemporaryPassword, logout } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [saved, setSaved] = useState(false)
  const { pending, error, fieldErrors, submit } = useAuthForm()

  if (loading) return <AuthCard><div aria-hidden="true" className="h-64 animate-pulse rounded-2xl bg-gray-100/80" /></AuthCard>
  if (saved) return <Navigate to="/portal?notice=welcome" replace />
  if (!user) return <Navigate to="/sign-in" replace />
  if (user.auth_type !== 'alias' || user.account_status !== 'pending') return <Navigate to="/portal" replace />

  const onSubmit = e => {
    e.preventDefault()
    void submit(async () => {
      await changeTemporaryPassword({ password, confirm, privacyAccepted: accepted }, () => setSaved(true))
    })
  }

  return (
    <AuthCard>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <ShieldCheck className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-gray-900">Choose your own password</h1>
      <p className="text-[15px] leading-relaxed text-gray-500">
        Signed in as <span className="font-semibold text-gray-800">{user.alias}</span>. Replace the temporary password from your teacher with one only you know.
      </p>
      <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-3.5">
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <PasswordField label="New password" name="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} error={fieldErrors.password} hint={`At least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number.`} autoFocus required />
        <PasswordField label="Type it again" name="confirmPassword" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} error={fieldErrors.confirmPassword} required />
        <Checkbox checked={accepted} onChange={setAccepted} error={fieldErrors.privacyAccepted}>
          I&apos;ve read the <Link to="/privacy" target="_blank" className="text-gray-600 underline hover:text-gray-900">Privacy Notice</Link>.
        </Checkbox>
        <SubmitButton pending={pending} pendingLabel="Saving…">Save password and continue</SubmitButton>
      </form>
      <div className="mt-4 text-center">
        <button type="button" onClick={() => logout(() => navigate('/sign-in', { replace: true }))} className="text-sm text-gray-400 transition-colors duration-150 hover:text-gray-700">
          Not you? Sign out
        </button>
      </div>
    </AuthCard>
  )
}
