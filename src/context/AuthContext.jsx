import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { signUp, logIn, logOut, updateProfile, loadAccount, clearAuthCache } from '../lib/auth'
import { getCachedAccount } from '../lib/accountCache'
import { supabase } from '../lib/supabase'
const AuthContext = createContext(null)
export function AuthProvider({ children }) {
  // A cached account renders immediately (no "Loading your account…" flash)
  // — loadAccount() below still verifies it against the real session once
  // that resolves, and only refetches for real if it doesn't match or the
  // cache has expired.
  const initialCached = getCachedAccount()
  const [user, setUser] = useState(initialCached?.currentUser || null)
  const [loading, setLoading] = useState(!initialCached)
  const [authError, setAuthError] = useState('')
  const generation = useRef(0)
  useEffect(() => {
    let active = true
    const sync = async session => {
      const request = ++generation.current
      const cached = getCachedAccount()
      const cacheMatchesSession = cached && session?.user?.email && cached.currentUser?.email?.toLowerCase() === session.user.email.toLowerCase()
      if (!cacheMatchesSession) setLoading(true)
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
