import { supabase } from './supabase'
export async function buildersApi(action, body = {}) {
  const { data } = await supabase.auth.getSession()
  const response = await fetch('/api/builders', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}) }, body: JSON.stringify({ action, ...body }), cache: 'no-store' })
  let result
  try { result = await response.json() } catch { throw new Error('The account service is unavailable. Please try again later.') }
  if (!response.ok) throw new Error(result.error || 'Unable to complete this request.')
  return result
}
