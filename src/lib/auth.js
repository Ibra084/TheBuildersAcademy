import { supabase } from './supabase'
import { buildersApi } from './buildersApi'
import { getCachedAccount, setCachedAccount, clearCachedAccount } from './accountCache'
import { parseIdentifier, passwordProblem, SCHOOL_EMAIL } from './identity'
let currentUser = null
let members = []
export function getCurrentUser() { return currentUser }
export function getAllUsers() { return members }
export function clearAuthCache() { currentUser = null; members = []; clearCachedAccount() }
const profileShape = p => ({ ...p, whatBuilding: p.what_building || '' })

/** A form failure: `error` for the banner, `fieldErrors` for messages under specific fields. */
export class FormError extends Error {
  constructor({ error = '', fieldErrors = {} }) { super(error || Object.values(fieldErrors)[0] || 'Check the form.'); this.error = error; this.fieldErrors = fieldErrors }
}

/** Student-friendly copy for Supabase Auth errors. Never echoes raw server text. */
export function friendlyAuthError(error) {
  switch (error?.code) {
    case 'invalid_credentials': return "That email, alias or password doesn't match. Check them and try again."
    case 'email_not_confirmed': return 'Please verify your email first. We sent you a link when you signed up.'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit': return 'Too many attempts. Please wait a few minutes and try again.'
    case 'weak_password': return 'That password is too easy to guess. Try a longer one.'
    case 'same_password': return 'Your new password must be different from your current one.'
    case 'email_address_invalid': return "That email address doesn't look right."
    case 'signup_disabled': return "New accounts can't be created right now."
    case 'user_banned': return 'This account has been paused. Please speak to your teacher.'
    case 'session_not_found':
    case 'session_expired':
    case 'refresh_token_not_found': return 'Your session has expired. Please sign in again.'
  }
  if (/personal email|school email/i.test(error?.message ?? '')) return "School email addresses can't be used. Please sign up with a personal email, or ask your teacher for a student alias."
  if (error?.status === 429) return 'Too many attempts. Please wait a few minutes and try again.'
  if (/sending .*email/i.test(error?.message ?? '')) return "We couldn't send your email just now. Please try again in a few minutes."
  return 'Something went wrong on our side. Please try again.'
}

export async function loadAccount(authUser) {
  if (!authUser) { clearAuthCache(); return null }

  const cached = getCachedAccount()
  if (cached && cached.currentUser?.id === authUser.id) {
    currentUser = cached.currentUser
    members = cached.members
    return currentUser
  }

  const profile = await supabase.rpc('ba_my_account').single()
  if (profile.error) throw new Error(profile.error.message)
  // Aliases still on a temporary password can't read portal data yet (the database denies it).
  if (profile.data.account_status !== 'active') {
    clearCachedAccount()
    currentUser = { ...profileShape(profile.data), email: null, isAdmin: false }
    return currentUser
  }
  const [role, directory] = await Promise.all([
    supabase.rpc('ba_is_admin'),
    supabase.from('ba_profiles').select('id,name,year,what_building,photo,created_at,updated_at,display_name').order('created_at'),
  ])
  for (const result of [role, directory]) if (result.error) throw new Error(result.error.message)
  members = directory.data.map(profileShape)
  currentUser = { ...profileShape(profile.data), email: profile.data.auth_type === 'alias' ? null : authUser.email, isAdmin: role.data === true }
  setCachedAccount({ currentUser, members })
  return currentUser
}

/** Personal-email accounts only. Resolves to { session } when email confirmation is off, otherwise to {}. */
export async function signUp({ email, password, privacyAccepted }) {
  const fieldErrors = {}
  const address = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) fieldErrors.email = 'Enter a valid email address.'
  else if (SCHOOL_EMAIL.test(address)) fieldErrors.email = "School email addresses can't be used. Please sign up with a personal email, or ask your teacher for a student alias."
  const problem = passwordProblem(password)
  if (problem) fieldErrors.password = problem
  if (!privacyAccepted) fieldErrors.privacyAccepted = 'Please agree to continue.'
  if (Object.keys(fieldErrors).length) throw new FormError({ fieldErrors })
  const { data, error } = await supabase.auth.signUp({
    email: address, password,
    options: { data: { privacy_notice_version: '1.0' }, emailRedirectTo: window.location.origin + '/portal' },
  })
  if (error) throw new FormError({ error: friendlyAuthError(error) })
  return data
}

/** The single "personal email or student alias" field. Resolves to { mustChangePassword }. */
export async function logIn({ identifier, password }) {
  const parsed = parseIdentifier(identifier)
  const fieldErrors = {}
  if (!parsed) fieldErrors.identifier = 'Enter your personal email or your student alias.'
  if (!password) fieldErrors.password = 'Enter your password.'
  if (Object.keys(fieldErrors).length) throw new FormError({ fieldErrors })
  if (parsed.kind === 'alias') {
    let result
    try { result = await buildersApi('login', { alias: parsed.alias, password }) } catch (err) { throw new FormError({ error: err.message }) }
    const { error } = await supabase.auth.setSession(result.session)
    if (error) throw new FormError({ error: friendlyAuthError(error) })
    return { mustChangePassword: result.mustChangePassword }
  }
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.email, password })
  if (error) throw new FormError({ error: friendlyAuthError(error) })
  return { mustChangePassword: false }
}

/** Alias first sign-in (or after a reset): replace the temporary password. */
export async function changeTemporaryPassword({ password, confirm, privacyAccepted }) {
  const fieldErrors = {}
  const problem = passwordProblem(password)
  if (problem) fieldErrors.password = problem
  else if (password !== confirm) fieldErrors.confirmPassword = "The passwords don't match."
  if (!privacyAccepted) fieldErrors.privacyAccepted = 'Please agree to continue.'
  if (Object.keys(fieldErrors).length) throw new FormError({ fieldErrors })
  try { await buildersApi('change-password', { password, privacy_notice_version: '1.0' }) } catch (err) { throw new FormError({ error: err.message }) }
  clearAuthCache()
}

export async function requestPasswordReset(raw) {
  const value = raw.trim()
  if (value && !value.includes('@')) throw new FormError({ fieldErrors: { email: 'That looks like a student alias. Alias passwords are reset by your teacher or administrator.' } })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new FormError({ fieldErrors: { email: 'Enter the personal email you signed up with.' } })
  const { error } = await supabase.auth.resetPasswordForEmail(value.toLowerCase(), { redirectTo: window.location.origin + '/reset-password' })
  if (error?.status === 429) throw new FormError({ error: friendlyAuthError(error) })
  // Same response whether or not the account exists.
  return 'If an account uses that email, a reset link is on its way. It expires in one hour.'
}

/** Sets a new password from the recovery link's session. */
export async function setNewPassword(password) {
  const problem = passwordProblem(password)
  if (problem) throw new FormError({ fieldErrors: { password: problem } })
  const { data } = await supabase.auth.getSession()
  if (!data.session) throw new FormError({ error: 'Your reset link has expired. Please request a new one.' })
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new FormError({ error: friendlyAuthError(error) })
}

export async function resendVerification(raw) {
  const email = raw.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new FormError({ fieldErrors: { email: 'Enter a valid email address.' } })
  const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: window.location.origin + '/portal' } })
  if (error?.status === 429) throw new FormError({ error: friendlyAuthError(error) })
  return "If that address has an account waiting to be verified, we've sent a new link."
}

export async function updateProfile(_email, { name, year, whatBuilding, photo }) {
  if (!currentUser) throw new Error('Please log in again.')
  const { error } = await supabase.from('ba_profiles').update({ name: name.trim().slice(0, 80), year, what_building: whatBuilding, photo }).eq('id', currentUser.id)
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
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) throw error
  clearAuthCache()
}
export function getInitials(name = '') { return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') }
