import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
export default function ProtectedRoute({ children }) {
  const { user, loading, authError } = useAuth()
  if (loading) return <div className="app-surface min-h-screen grid place-items-center" role="status">Loading your account…</div>
  if (authError) return <div className="app-surface min-h-screen grid place-items-center p-6"><div role="alert"><h1 className="text-xl font-semibold">Your account could not load</h1><p className="mt-3">{authError}</p><button className="solid-btn text-white rounded-xl p-3 mt-4" onClick={() => window.location.reload()}>Try again</button></div></div>
  if (user?.account_status === 'pending') return <Navigate to={user.auth_type === 'builders_id' ? '/account/setup?method=builders_id' : '/account/setup'} replace />
  if (user?.account_status === 'disabled') return <div className="p-10 text-center">Your account is disabled. Contact a Builders administrator.</div>
  return user ? children : <Navigate to="/login" replace />
}
