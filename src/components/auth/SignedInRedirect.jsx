import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/** Auth pages are for signed-out visitors: signed-in students go to the portal (or to finish their password). */
export default function SignedInRedirect({ children }) {
  const { user } = useAuth()
  if (user?.auth_type === 'alias' && user.account_status === 'pending') return <Navigate to="/change-password" replace />
  if (user?.account_status === 'active') return <Navigate to="/portal" replace />
  return children
}
