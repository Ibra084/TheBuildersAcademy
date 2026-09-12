import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminRoute({ children }) {
  const { user } = useAuth()
  return user?.isAdmin ? children : <Navigate to="/portal" replace />
}
