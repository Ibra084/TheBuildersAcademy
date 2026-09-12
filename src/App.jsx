import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import PortalLayout from './pages/portal/PortalLayout'
import Dashboard from './pages/portal/Dashboard'
import Sessions from './pages/portal/Sessions'
import Projects from './pages/portal/Projects'
import Resources from './pages/portal/Resources'
import Digest from './pages/portal/Digest'
import Members from './pages/portal/Members'
import Profile from './pages/portal/Profile'
import Admin from './pages/portal/Admin'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
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
