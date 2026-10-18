import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Landing from './pages/Landing'
import Privacy from './pages/Privacy'
import SignIn from './pages/auth/SignIn'
import AliasSignIn from './pages/auth/AliasSignIn'
import SignUp from './pages/auth/SignUp'
import CheckEmail from './pages/auth/CheckEmail'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import ChangePassword from './pages/auth/ChangePassword'
import DigestArchive from './pages/DigestArchive'
import DigestIssue from './pages/DigestIssue'
import PortalLayout from './pages/portal/PortalLayout'
import Dashboard from './pages/portal/Dashboard'
import Sessions from './pages/portal/Sessions'
import Projects from './pages/portal/Projects'
import Resources from './pages/portal/Resources'
import Digest from './pages/portal/Digest'
import PortalDigestIssue from './pages/portal/DigestIssue'
import Members from './pages/portal/Members'
import Profile from './pages/portal/Profile'
import Admin from './pages/portal/Admin'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/alias" element={<AliasSignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/check-email" element={<CheckEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/login" element={<Navigate to="/sign-in" replace />} />
          <Route path="/signup" element={<Navigate to="/sign-up" replace />} />
          <Route path="/account/setup" element={<Navigate to="/alias" replace />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/digest" element={<DigestArchive />} />
          <Route path="/digest/:id" element={<DigestIssue />} />
          <Route
            path="/portal"
            element={
              <ProtectedRoute>
                <PortalLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="projects" element={<Projects />} />
            <Route path="resources" element={<Resources />} />
            <Route path="digest" element={<Digest />} />
            <Route path="digest/:id" element={<PortalDigestIssue />} />
            <Route path="members" element={<Members />} />
            <Route path="profile" element={<Profile />} />
            <Route
              path="admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
