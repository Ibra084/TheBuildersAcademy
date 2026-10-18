import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { safeNextPath } from '../../lib/identity'
import { ErrorBanner, NoticeBanner, PasswordField, SubmitButton, TextField } from './fields'
import { useAuthForm } from '../../hooks/useAuthForm'

const NOTICES = {
  'signed-out': "You've signed out.",
  'account-deleted': 'Your account has been deleted.',
}

export default function SignInForm({ variant = 'default' }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const { pending, error, fieldErrors, submit } = useAuthForm()
  const notice = NOTICES[params.get('notice') ?? '']
  const isAlias = variant === 'alias'

  const onSubmit = e => {
    e.preventDefault()
    void submit(async () => {
      const { mustChangePassword } = await login({ identifier, password })
      navigate(mustChangePassword ? '/change-password' : safeNextPath(params.get('next')), { replace: true })
    })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5">
      {error && <ErrorBanner>{error}</ErrorBanner>}
      {notice && !error && <NoticeBanner>{notice}</NoticeBanner>}
      <TextField
        label={isAlias ? 'Student alias' : 'Personal email or student alias'}
        name="identifier"
        icon={isAlias ? 'user' : 'mail'}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        inputMode={isAlias ? 'text' : 'email'}
        placeholder={isAlias ? 'e.g. maths7b-01' : 'you@example.com or your alias'}
        value={identifier}
        onChange={e => setIdentifier(e.target.value)}
        error={fieldErrors.identifier}
        hint={isAlias ? 'The alias your teacher or administrator gave you.' : undefined}
        autoFocus
        required
      />
      <PasswordField
        label={isAlias ? 'Password (temporary on first sign-in)' : 'Password'}
        name="password"
        autoComplete="current-password"
        placeholder={isAlias ? 'Your temporary or own password' : 'Your password'}
        value={password}
        onChange={e => setPassword(e.target.value)}
        error={fieldErrors.password}
        labelAside={
          <Link to={isAlias ? '/forgot-password?account=alias' : '/forgot-password'} className="text-xs text-gray-400 transition-colors duration-150 hover:text-blue-600">
            Forgot password?
          </Link>
        }
        required
      />
      <SubmitButton pending={pending} pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  )
}
