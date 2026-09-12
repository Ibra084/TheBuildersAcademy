import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import { useAuth } from '../context/AuthContext'

const inputClass =
  'w-full rounded-xl bg-white border border-black/[0.1] px-3 py-2.5 text-[14px] text-ink placeholder:text-ink-soft/50 outline-none focus:ring-2 focus:ring-accent-blue/40 transition-shadow'

const YEAR_GROUPS = ['Y7', 'Y8', 'Y9', 'Y10', 'Y11', 'Y12', 'Y13']

export default function Signup() {
  const navigate = useNavigate()
  const { signup } = useAuth()
  const [form, setForm] = useState({ name: '', year: '', email: '', password: '', whatBuilding: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      const result = await signup(form)
      if (result.session) navigate('/portal')
      else { setMessage('Check your email to confirm your account, then log in.'); setSubmitting(false) }
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout compact className="auth-typography"
      title="Create your account"
      subtitle="Takes less than a minute, no commitment yet."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-accent-blue">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-ink mb-1">
            Full name
          </label>
          <input
            id="name"
            type="text"
            required
            value={form.name}
            onChange={handleChange('name')}
            placeholder="Jane Doe"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="year" className="block text-sm font-medium text-ink mb-1">
            Year group
          </label>
          <select
            id="year"
            required
            value={form.year}
            onChange={handleChange('year')}
            className={`${inputClass} appearance-none`}
          >
            <option value="" disabled>
              Select your year
            </option>
            {YEAR_GROUPS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="email" className="block text-sm font-medium text-ink mb-1">
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

        <div className="sm:col-span-2">
          <label htmlFor="whatBuilding" className="block text-sm font-medium text-ink mb-1">
            What do you want to build or learn?
          </label>
          <textarea
            id="whatBuilding"
            rows={1}
            value={form.whatBuilding}
            onChange={handleChange('whatBuilding')}
            placeholder="Optional — share an idea"
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="password" className="block text-sm font-medium text-ink mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            minLength={8}
            required
            value={form.password}
            onChange={handleChange('password')}
            placeholder="••••••••"
            className={inputClass}
          />
        </div>

        {message && <p role="status" className="sm:col-span-2 text-sm text-accent-teal">{message}</p>}
        {error && <p className="sm:col-span-2 text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="solid-btn sm:col-span-2 w-full rounded-xl py-3 text-[15px] font-semibold text-white disabled:opacity-70"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  )
}




