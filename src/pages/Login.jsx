import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import { useAuth } from '../context/AuthContext'

const inputClass =
  'w-full rounded-xl bg-white border border-black/[0.1] px-4 py-3 text-[15px] text-ink placeholder:text-ink-soft/50 outline-none focus:ring-2 focus:ring-accent-blue/40 transition-shadow'

export default function Login() {
  const navigate = useNavigate()
  const { login, user, loading } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login({ email: form.email, password: form.password })
      navigate('/portal')
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (loading) return <div className="app-surface min-h-screen grid place-items-center" role="status">Checking your account…</div>
  if (user) return <Navigate to="/portal" replace />

  return (
    <AuthLayout className="auth-typography"
      title="Log in to your account"
      subtitle="Sign in with your verified community account."
      footer={
        <>
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-accent-blue">
            Sign up
          </Link>
        </>
      }
    >
      <p className="mb-4 text-xs text-ink-soft">Previously signed up on this device? Create your account once more to enable secure sign-in across devices.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink mb-2">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange('email')}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="block text-sm font-medium text-ink">
              Password
            </label>
            <a href="#" className="text-[13px] font-medium text-accent-blue hover:text-accent-blue-dark">
              Forgot password?
            </a>
          </div>
          <input
            id="password"
            type="password"
            required
            value={form.password}
            onChange={handleChange('password')}
            placeholder="••••••••"
            className={inputClass}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="solid-btn w-full rounded-xl py-3 text-[15px] font-semibold text-white disabled:opacity-70"
        >
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  )
}





