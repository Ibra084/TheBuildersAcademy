import { supabase } from './supabase'
import { buildersApi } from './buildersApi'
import { getCachedAccount, setCachedAccount, clearCachedAccount } from './accountCache'
let currentUser = null
let members = []
export function getCurrentUser() { return currentUser }
export function getAllUsers() { return members }
export function clearAuthCache() { currentUser = null; members = []; clearCachedAccount() }
const profileShape = p => ({ ...p, whatBuilding: p.what_building || '' })
export async function loadAccount(authUser) {
  if (!authUser) { clearAuthCache(); return null }

  const cached = getCachedAccount()
  if (cached && cached.currentUser?.id === authUser.id) {
    currentUser = cached.currentUser
    members = cached.members
    return currentUser
  }

  const [profile, role, directory] = await Promise.all([
    supabase.rpc('ba_my_account').single(),
    supabase.rpc('ba_is_admin'),
    supabase.from('ba_profiles').select('id,name,year,what_building,photo,created_at,updated_at,display_name').order('created_at'),
  ])
  for (const result of [profile, role, directory]) if (result.error) throw new Error(result.error.message)
  members = directory.data.map(profileShape)
  currentUser = { ...profileShape(profile.data), email: profile.data.auth_type === 'builders_id' ? null : authUser.email, isAdmin: role.data === true }
  // Don't cache a pending/disabled account — those routes redirect based on
  // fresh status, and a stale "pending" cached across a real activation
  // would incorrectly bounce an already-active user back to account setup.
  if (currentUser.account_status === 'active') setCachedAccount({ currentUser, members })
  else clearCachedAccount()
  return currentUser
}
export async function signUp({ name, year, email, password, whatBuilding = '', privacyAccepted = false }) {
  if (!privacyAccepted) throw new Error('Read and accept the Privacy Notice.')
  if (/(?:\.sch\.|\.edu(?:\.|$)|\.ac\.|\.invalid$)/i.test(email)) throw new Error('Use a personal email address, or ask an administrator for a Builders ID.')
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(), password,
    options: { data: { name: name.trim(), year, whatBuilding, privacy_notice_version: '1.0' }, emailRedirectTo: window.location.origin + '/portal' },
  })
  if (error) throw error
  return data
}
export async function logIn({ email, password, builders_id, method = 'email' }) {
  if (method === 'builders_id') {
    const result = await buildersApi('login', { builders_id, password })
    const { data, error } = await supabase.auth.setSession(result.session)
    if (error) throw error
    return data
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
  return data
}
export async function updateProfile(_email, { whatBuilding, photo }) {
  if (!currentUser) throw new Error('Please log in again.')
  const { error } = await supabase.from('ba_profiles').update({ what_building: whatBuilding, photo }).eq('id', currentUser.id)
  if (error) throw error
  // Invalidate the cache so this reload actually fetches the update instead
  // of just returning what was cached before the edit.
  clearCachedAccount()
  return loadAccount({ id: currentUser.id, email: currentUser.email })
}
export function requireAdmin() {
  if (!currentUser?.isAdmin) throw new Error('Only the community owner can do this.')
}
export async function logOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  clearAuthCache()
}
export function getInitials(name = '') { return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') }
