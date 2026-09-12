import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { signUp, logIn, logOut, updateProfile, loadAccount, clearAuthCache } from '../lib/auth'
import { supabase } from '../lib/supabase'
const AuthContext = createContext(null)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const generation = useRef(0)
  useEffect(() => {
    let active = true
    const sync = async session => {
      const request = ++generation.current
      setLoading(true)
      try {
        const account = await loadAccount(session?.user)
        if (active && request === generation.current) { setUser(account); setAuthError('') }
      } catch (error) {
        if (active && request === generation.current) { setUser(null); setAuthError(error.message) }
      } finally { if (active && request === generation.current) setLoading(false) }
    }
    // Do database work outside the auth callback to avoid holding its session lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => { if (active) void sync(session) }, 0)
    })
    return () => { active = false; generation.current++; subscription.unsubscribe() }
  }, [])
  const value = {
    user, loading, authError,
    signup: async data => { const result = await signUp(data); if (result.session) setLoading(true); return result },
    login: async data => { const result = await logIn(data); setLoading(true); return result },
    logout: async () => { await logOut(); clearAuthCache(); setUser(null) },
    updateProfile: async updates => { const updated = await updateProfile(user.email, updates); setUser(updated) },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
