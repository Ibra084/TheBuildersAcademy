import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import { useAuth } from '../context/AuthContext'

const inputClass =
  'w-full rounded-xl bg-white border border-black/[0.1] px-4 py-3 text-[15px] text-ink placeholder:text-ink-soft/50 outline-none focus:ring-2 focus:ring-accent-blue/40 transition-shadow'

export default function Login() {
  const navigate = useNavigate()
  const { login, user, loading } = useAuth()
  const [method, setMethod] = useState('email')
  const [form, setForm] = useState({ email: '', builders_id: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login({ ...form, method })
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
      <fieldset className="mb-5"><legend className="text-sm font-semibold mb-2">How do you sign in?</legend><div className="grid grid-cols-2 gap-2">{[['email','Personal Email'],['builders_id','Builders ID']].map(([value,label])=><button key={value} type="button" aria-pressed={method===value} onClick={()=>{setMethod(value);setError('')}} className={`rounded-xl p-3 text-sm border ${method===value?'bg-ink text-white':'bg-white border-black/10'}`}>{label}</button>)}</div></fieldset>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink mb-2">
            {method === 'email' ? 'Personal email' : 'Builders ID'}
          </label>
          <input
            id="email"
            type={method === 'email' ? 'email' : 'text'}
            required
            value={method === 'email' ? form.email : form.builders_id}
            onChange={handleChange(method === 'email' ? 'email' : 'builders_id')}
            placeholder={method === 'email' ? 'you@example.com' : 'BLD-7K2F9'}
            autoComplete="username"
            className={inputClass}
          />
        </div>

        {method === 'builders_id' && <p className="text-xs text-ink-soft">Your Builders ID looks like BLD-7K2F9.</p>}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="block text-sm font-medium text-ink">
              Password
            </label>
            <Link to={`/forgot-password?method=${method}`} className="text-[13px] font-medium text-accent-blue hover:text-accent-blue-dark">
              {method === 'builders_id' ? 'Forgot your Builders ID password?' : 'Forgot password?'}
            </Link>
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
      {method === 'builders_id' && <Link className="block mt-5 text-sm underline" to="/account/setup?method=builders_id">First time? Set up / recover account</Link>}
    </AuthLayout>
  )
}
