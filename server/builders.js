import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'node:crypto'
import { Fault, ALIAS_EMAIL_DOMAIN, MAX_BULK_ALIASES, temporaryPassword, parseAlias, aliasSeries, parseAliasList, validatePassword, normalizeAlias, isValidAlias } from './identity.js'

const unwrap = result => { if (result.error) throw new Fault(503, 'The account service could not complete this request. Please retry.'); return result.data }
const uuid = value => { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '')) throw new Fault(400, 'Invalid reference.'); return value }
const safeSession = session => ({ access_token: session.access_token, refresh_token: session.refresh_token })
const keyHash = (key, pepper) => createHmac('sha256', pepper).update(key).digest('hex')
export function createServices(env = process.env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key || !env.SUPABASE_SERVICE_ROLE_KEY || !env.BUILDERS_CODE_PEPPER || env.BUILDERS_CODE_PEPPER.length < 32) throw new Fault(503, 'Account administration is not configured yet.')
  if (env.VERCEL && !env.APP_URL) throw new Fault(503, 'The application URL is not configured.')
  const options = { auth: { persistSession: false, autoRefreshToken: false } }
  return { db: createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, options), auth: () => createClient(url, key, options), caller: token => createClient(url, key, { ...options, global: { headers: { Authorization: "Bearer " + token } } }), pepper: env.BUILDERS_CODE_PEPPER, site: env.APP_URL || 'http://localhost:5173' }
}
export function createController(s) {
  async function rpc(name, args) { return unwrap(await s.db.rpc(name, args)) }
  async function profile(id) { return unwrap(await s.db.from('ba_profiles').select('*').eq('id', id).single()) }
  async function userFrom(token, admin = false) {
    if (!token) throw new Fault(401, 'Please sign in.')
    const result = await s.db.auth.getUser(token)
    if (result.error || !result.data.user) throw new Fault(401, 'Please sign in again.')
    const user = result.data.user, p = await profile(user.id)
    if (p.account_status === 'disabled') throw new Fault(403, 'This account has been paused. Please speak to your teacher.')
    if (admin && !unwrap(await s.caller(token).rpc('ba_is_admin'))) throw new Fault(403, 'Administrator access required.')
    return { user, p }
  }
  async function limit(key, n, seconds) {
    if (!await rpc('ba_limit', { p_key: keyHash(key, s.pepper), p_limit: n, p_seconds: seconds })) throw new Fault(429, 'Too many attempts. Please wait a few minutes and try again.')
  }
  async function audit(admin, action, affected = null, metadata = {}) { unwrap(await s.db.from('ba_admin_audit').insert({ admin_id: admin, action, affected_user_id: affected, metadata })) }
  async function findAlias(alias) {
    const p = unwrap(await s.db.from('ba_profiles').select('*').eq('alias', parseAlias(alias)).maybeSingle())
    if (!p) throw new Fault(404, `No student alias "${normalizeAlias(alias)}".`)
    return p
  }
  /** Creates one alias account and returns its one-time temporary password. */
  async function createAlias(alias, admin) {
    const password = temporaryPassword()
    const result = await s.db.auth.admin.createUser({ email: `${alias}@${ALIAS_EMAIL_DOMAIN}`, password, email_confirm: true, app_metadata: { auth_type: 'alias', alias } })
    if (result.error) {
      // Admin-only action: the provider's reason (e.g. a password policy) is safe and useful to show.
      console.error('alias createUser failed:', result.error.status, result.error.message)
      return { alias, error: /already|exists|duplicate|unique/i.test(result.error.message) ? 'Already taken' : result.error.message }
    }
    await audit(admin, 'alias.created', result.data.user.id, { alias })
    return { alias, password }
  }
  return async function dispatch(body, token, ip) {
    const action = body.action
    if (typeof action !== 'string') throw new Fault(400, 'Choose an action.')
    await limit(`ip:${ip}`, 100, 60)
    if (action === 'login') {
      // Alias sign-in: the alias maps to its account here, so the auth email never reaches the browser.
      await limit(`login:ip:${ip}`, 20, 900)
      const alias = normalizeAlias(body.alias)
      if (!isValidAlias(alias)) throw new Fault(400, 'Enter your student alias.')
      await limit(`login:alias:${alias}`, 8, 900)
      const invalid = new Fault(401, "That alias or password doesn't match. Check them and try again.")
      if (typeof body.password !== 'string' || !body.password || body.password.length > 128) throw invalid
      const p = unwrap(await s.db.from('ba_profiles').select('*').eq('alias', alias).maybeSingle())
      if (!p) throw invalid
      if (p.account_status === 'disabled') throw new Fault(403, 'This account has been paused. Please speak to your teacher.')
      const authUser = unwrap(await s.db.auth.admin.getUserById(p.id)).user
      const login = await s.auth().auth.signInWithPassword({ email: authUser.email, password: body.password })
      if (login.error) throw invalid
      return { session: safeSession(login.data.session), mustChangePassword: p.account_status === 'pending' }
    }
    const { user, p } = await userFrom(token, !['data-request', 'change-password'].includes(action))
    await limit(`actor:${user.id}:${action}`, 120, 3600)
    if (action === 'change-password') {
      if (p.auth_type !== 'alias' || p.account_status !== 'pending') throw new Fault(400, 'Your password is already set.')
      if (body.privacy_notice_version !== '1.0') throw new Fault(400, 'Read and accept the Privacy Notice.')
      validatePassword(body.password)
      const updated = await s.db.auth.admin.updateUserById(user.id, { password: body.password })
      if (updated.error) throw new Fault(400, /same/i.test(updated.error.message) ? 'Your new password must be different from your temporary one.' : 'That password could not be saved. Try a longer one.')
      await rpc('ba_finish_alias', { p_user: user.id })
      return { ok: true }
    }
    if (action === 'data-request') {
      if (!['correction','deletion','question'].includes(body.kind) || typeof body.message !== 'string' || !body.message.trim() || body.message.length > 1000) throw new Fault(400, 'Choose a request type and enter up to 1,000 characters.')
      await limit(`privacy:${user.id}`, 5, 86400)
      unwrap(await s.db.from('ba_data_requests').insert({ user_id: user.id, kind: body.kind, message: body.message.trim() }))
      return { message: 'Your request was sent to the administrators.' }
    }
    if (action === 'list') {
      const aliases = unwrap(await s.db.rpc('ba_list_aliases')) || []
      const requests = unwrap(await s.db.from('ba_data_requests').select('*').is('resolved_at', null).order('created_at').limit(100))
      const names = unwrap(await s.db.from('ba_profiles').select('id,name').range(0, 9999))
      return { aliases: aliases.map(a => ({ alias: a.alias, userId: a.user_id, createdAt: a.created_at, lastSignInAt: a.last_sign_in_at, pendingPasswordChange: a.account_status === 'pending', disabled: a.account_status === 'disabled' })), requests: requests.map(r => ({ ...r, name: names.find(n => n.id === r.user_id)?.name || 'A member' })) }
    }
    if (action === 'resolve-request') {
      unwrap(await s.db.from('ba_data_requests').update({ resolved_at: new Date().toISOString() }).eq('id', uuid(body.id)))
      await audit(user.id, 'privacy.request_resolved', null, { request_id: body.id }); return { ok: true }
    }
    if (action === 'alias-create') {
      const alias = parseAlias(body.alias)
      if (unwrap(await s.db.from('ba_profiles').select('id').eq('alias', alias).maybeSingle())) throw new Fault(409, `"${alias}" is already taken. Choose another alias, or reset its password.`)
      const result = await createAlias(alias, user.id)
      if (result.error) throw new Fault(409, result.error === 'Already taken' ? `"${alias}" is already taken. Choose another alias, or reset its password.` : `Account creation could not finish: ${result.error}`)
      return { ok: true, ...result }
    }
    if (action === 'alias-bulk') {
      const { aliases, invalid } = body.mode === 'series' ? { aliases: aliasSeries(body.prefix, body.count, body.start), invalid: [] } : parseAliasList(body.text)
      if (!aliases.length) throw new Fault(400, invalid.length ? 'None of those are valid aliases.' : 'Add at least one alias.')
      if (aliases.length > MAX_BULK_ALIASES) throw new Fault(400, `At most ${MAX_BULK_ALIASES} accounts at a time.`)
      // Existing aliases are read once; taken ones are skipped, not changed.
      const taken = new Set(unwrap(await s.db.from('ba_profiles').select('alias').eq('auth_type', 'alias').range(0, 9999)).map(r => r.alias))
      const results = []
      for (const alias of aliases) {
        if (taken.has(alias)) { results.push({ alias, error: 'Already taken' }); continue }
        const result = await createAlias(alias, user.id)
        if (!result.error) taken.add(alias)
        results.push(result)
      }
      return { ok: true, results, invalid }
    }
    if (action === 'alias-reset' || action === 'alias-delete') {
      const target = await findAlias(body.alias)
      if (target.id === user.id) throw new Fault(400, 'You cannot change your own account here.')
      if (action === 'alias-reset') {
        const password = temporaryPassword()
        const updated = await s.db.auth.admin.updateUserById(target.id, { password })
        if (updated.error) throw new Fault(503, `The password could not be reset: ${updated.error.message}`)
        await rpc('ba_reset_alias', { p_user: target.id, p_admin: user.id })
        return { ok: true, alias: target.alias, password }
      }
      // The profile and everything owned by it go with the account (ON DELETE CASCADE).
      unwrap(await s.db.auth.admin.deleteUser(target.id))
      await audit(user.id, 'alias.deleted', null, { alias: target.alias })
      return { ok: true, alias: target.alias }
    }
    throw new Fault(400, 'Unknown action.')
  }
}
