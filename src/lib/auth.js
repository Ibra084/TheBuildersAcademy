import { supabase } from './supabase'
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
  if (cached && cached.currentUser?.email?.toLowerCase() === authUser.email?.toLowerCase()) {
    currentUser = cached.currentUser
    members = cached.members
    return currentUser
  }

  const [profile, role, directory] = await Promise.all([
    supabase.from('ba_profiles').select('*').eq('id', authUser.id).single(),
    supabase.rpc('ba_is_admin'),
    supabase.from('ba_profiles').select('*').order('created_at'),
  ])
  for (const result of [profile, role, directory]) if (result.error) throw new Error(result.error.message)
  members = directory.data.map(profileShape)
  currentUser = { ...profileShape(profile.data), email: authUser.email, isAdmin: role.data === true }
  setCachedAccount({ currentUser, members })
  return currentUser
}
export async function signUp({ name, year, email, password, whatBuilding = '' }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(), password,
    options: { data: { name: name.trim(), year, whatBuilding }, emailRedirectTo: window.location.origin + '/portal' },
  })
  if (error) throw error
  return data
}
export async function logIn({ email, password }) {
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
