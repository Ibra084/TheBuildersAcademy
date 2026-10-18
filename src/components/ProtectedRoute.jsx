import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
export default function ProtectedRoute({ children }) {
  const { user, loading, authError } = useAuth()
  const location = useLocation()
  if (loading) return <div className="app-surface min-h-screen grid place-items-center" role="status">Loading your account…</div>
  if (authError) return <div className="app-surface min-h-screen grid place-items-center p-6"><div role="alert"><h1 className="text-xl font-semibold">Your account could not load</h1><p className="mt-3">{authError}</p><button className="solid-btn text-white rounded-xl p-3 mt-4" onClick={() => window.location.reload()}>Try again</button></div></div>
  if (!user) return <Navigate to={`/sign-in?next=${encodeURIComponent(location.pathname)}`} replace />
  // Aliases replace their temporary password before using the portal.
  if (user.auth_type === 'alias' && user.account_status === 'pending') return <Navigate to="/change-password" replace />
  if (user.account_status === 'disabled') return <div className="p-10 text-center">This account has been paused. Please speak to your teacher.</div>
  if (user.account_status !== 'active') return <div className="p-10 text-center">Your account isn't ready yet. Please ask a Builders administrator.</div>
  return children
}
