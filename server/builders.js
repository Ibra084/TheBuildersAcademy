import { createClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { Fault, normalizeId, generateCode, codeHash, secretPassword, validateStudent, validatePassword, personalEmail, cleanName, uniqueId, csvCell, escapeHtml } from './identity.js'
import { parseStudents } from './imports.js'

const unwrap = result => { if (result.error) throw new Fault(503, 'The account service could not complete this request. Please retry.'); return result.data }
const uuid = value => { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '')) throw new Fault(400, 'Invalid account or import reference.'); return value }
const safeSession = session => ({ access_token: session.access_token, refresh_token: session.refresh_token })
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
    if (p.account_status === 'disabled') throw new Fault(403, 'This account is disabled.')
    if (admin && !unwrap(await s.caller(token).rpc('ba_is_admin'))) throw new Fault(403, 'Administrator access required.')
    return { user, p }
  }
  async function limit(key, n, seconds) {
    if (!await rpc('ba_limit', { p_key: codeHash(key, s.pepper), p_limit: n, p_seconds: seconds })) throw new Fault(429, 'Too many attempts. Please try again later.')
  }
  async function audit(admin, action, affected = null, metadata = {}) { unwrap(await s.db.from('ba_admin_audit').insert({ admin_id: admin, action, affected_user_id: affected, metadata })) }
  async function findId(value) {
    const id = normalizeId(value)
    const p = unwrap(await s.db.from('ba_profiles').select('*').eq('builders_id', id).maybeSingle())
    return { id, p }
  }
  function receipt(p, code) {
    const card = { user_id: p.id, name: p.display_name || p.name, builders_id: p.builders_id, code, expires: Date.now() + 86400000 }
    return { ...card, proof: createHmac('sha256', s.pepper).update(JSON.stringify(card)).digest('hex') }
  }
  async function reserve(students, admin) {
    const batch = unwrap(await s.db.from('ba_imports').insert({ admin_id: admin }).select().single())
    const rows = []
    try {
      for (const student of students) {
        let reserved
        await uniqueId(async builders_id => {
          const exists = unwrap(await s.db.from('ba_profiles').select('id').eq('builders_id', builders_id).maybeSingle())
          if (exists) return false
          const result = await s.db.from('ba_import_items').insert({ batch_id: batch.id, builders_id, student }).select().single()
          if (result.error?.code === '23505') return false
          reserved = unwrap(result); return true
        })
        rows.push(reserved)
      }
      return { batch_id: batch.id, rows }
    } catch (error) { unwrap(await s.db.from('ba_imports').delete().eq('id', batch.id)); throw error }
  }
  async function processItem(itemId, admin) {
    const claimed = await rpc('ba_claim_import', { p_item: uuid(itemId), p_admin: admin })
    if (!claimed.length) throw new Fault(409, 'This row is completed, in progress, or expired. Refresh the import status before retrying.')
    const item = claimed[0]
    try {
      let userId = item.user_id
      if (!userId) {
        // The profile trigger records the user UUID against the import row atomically.
        const result = await s.db.auth.admin.createUser({ email: `${item.id}@builders.invalid`, password: secretPassword(), email_confirm: true,
          app_metadata: { auth_type: 'builders_id', builders_id: item.builders_id, import_item_id: item.id }, user_metadata: { ...item.student, name: item.student.display_name } })
        if (result.error) throw new Fault(503, 'Account creation could not finish. Refresh the batch and retry this row.')
        userId = result.data.user.id
      }
      const code = generateCode()
      await rpc('ba_issue_code', { p_user: userId, p_hash: codeHash(code, s.pepper), p_purpose: 'setup', p_admin: admin, p_item: item.id })
      return receipt({ id: userId, builders_id: item.builders_id, name: item.student.display_name }, code)
    } catch (error) {
      // Read the durable trigger result on retry: never duplicate an Auth user.
      await s.db.from('ba_import_items').update({ state: 'failed', lease_until: null, error: 'Creation interrupted. Retry this row.' }).eq('id', item.id).neq('state', 'created')
      throw error
    }
  }
  return async function dispatch(body, token, ip) {
    const action = body.action
    if (typeof action !== 'string') throw new Fault(400, 'Choose an action.')
    await limit(`ip:${ip}`, 100, 60)
    if (action === 'login' || action === 'setup') {
      await limit(`${action}:ip:${ip}`, 20, 900)
      const id = normalizeId(body.builders_id)
      await limit(`${action}:id:${id}`, 8, 900)
      if (action === 'login') {
        if (typeof body.password !== 'string' || body.password.length > 128) throw new Fault(401, 'Unable to sign in. Check your ID and password.')
        const { p } = await findId(id)
        if (!p || p.account_status !== 'active') throw new Fault(401, 'Unable to sign in. Check your ID and password, or ask an administrator.')
        const authUser = unwrap(await s.db.auth.admin.getUserById(p.id)).user
        const login = await s.auth().auth.signInWithPassword({ email: authUser.email, password: body.password })
        if (login.error) throw new Fault(401, 'Unable to sign in. Check your ID and password.')
        // Recheck after the network call in case an admin disabled the account concurrently.
        if ((await profile(p.id)).account_status !== 'active') throw new Fault(403, 'This account is unavailable.')
        return { session: safeSession(login.data.session) }
      }
      validatePassword(body.password)
      if (body.privacy_notice_version !== '1.0') throw new Fault(400, 'Read and accept the Privacy Notice.')
      if (typeof body.code !== 'string' || body.code.length > 80) throw new Fault(400, 'Invalid or expired code.')
      const uid = await rpc('ba_consume_code', { p_id: id, p_hash: codeHash(body.code, s.pepper) })
      if (!uid) throw new Fault(400, 'Invalid, expired, or already used code. Ask an administrator for a new code.')
      // Consuming first prevents parallel reuse. Failure safely leaves pending access;
      // an admin can issue a fresh code, never silently restore a used code.
      const updated = await s.db.auth.admin.updateUserById(uid, { password: body.password })
      if (updated.error) throw new Fault(503, 'Password setup did not finish. Ask an administrator for a new code.')
      await rpc('ba_finish_setup', { p_user: uid })
      return { message: 'Password saved. You can now sign in with your Builders ID.' }
    }
    const { user, p } = await userFrom(token, !['data-request', 'email-finish'].includes(action))
    await limit(`actor:${user.id}:${action}`, action.startsWith('import') ? 240 : 60, 3600)
    if (action === 'data-request') {
      if (!['correction','deletion','question'].includes(body.kind) || typeof body.message !== 'string' || !body.message.trim() || body.message.length > 1000) throw new Fault(400, 'Choose a request type and enter up to 1,000 characters.')
      await limit(`privacy:${user.id}`, 5, 86400)
      unwrap(await s.db.from('ba_data_requests').insert({ user_id: user.id, kind: body.kind, message: body.message.trim() }))
      return { message: 'Your request was sent to the community administrators.' }
    }
    if (action === 'email-finish') {
      if (p.auth_type !== 'email' || !user.email_confirmed_at || body.privacy_notice_version !== '1.0') throw new Fault(403, 'Verify your email and accept the Privacy Notice.')
      validatePassword(body.password)
      unwrap(await s.db.auth.admin.updateUserById(user.id, { password: body.password }))
      unwrap(await s.db.from('ba_profiles').update({ account_status: 'active', setup_completed_at: new Date().toISOString(), privacy_notice_version: '1.0', privacy_notice_accepted_at: new Date().toISOString() }).eq('id', user.id).neq('account_status', 'disabled'))
      return { message: 'Password saved. Sign in to continue.' }
    }
    if (action === 'list') {
      const students = unwrap(await s.db.from('ba_profiles').select('id,first_name,last_name,display_name,name,auth_type,builders_id,account_status,created_at,setup_completed_at,privacy_notice_version,privacy_notice_accepted_at').order('created_at', { ascending: false }).range(0, 9999))
      const batches = unwrap(await s.db.from('ba_imports').select('id,created_at,expires_at,confirmed_at,ba_import_items(id,builders_id,student,user_id,state,error,lease_until)').eq('admin_id', user.id).order('created_at', { ascending: false }).limit(20))
      const auditLog = unwrap(await s.db.from('ba_admin_audit').select('*').order('created_at', { ascending: false }).limit(100))
      const requests = unwrap(await s.db.from('ba_data_requests').select('*').is('resolved_at', null).order('created_at').limit(100))
      return { students, batches, audit: auditLog, requests }
    }
    if (action === 'resolve-request') {
      unwrap(await s.db.from('ba_data_requests').update({ resolved_at: new Date().toISOString() }).eq('id', uuid(body.id)))
      await audit(user.id, 'privacy.request_resolved', null, { request_id: body.id }); return { ok: true }
    }
    if (action === 'create') {
      const student = validateStudent(body.student || {})
      if (body.auth_type === 'email') {
        const email = personalEmail(body.personal_email)
        const invite = await s.db.auth.admin.inviteUserByEmail(email, { data: { ...student, name: student.display_name }, redirectTo: s.site + '/account/setup' })
        if (invite.error) throw new Fault(400, 'Could not invite this address. Check whether the account already exists.')
        await audit(user.id, 'student.created', invite.data.user.id, { auth_type: 'email' })
        return { message: 'An invitation was sent to the personal email address.' }
      }
      if (body.auth_type !== 'builders_id') throw new Fault(400, 'Choose a login method.')
      const batch = await reserve([student], user.id)
      unwrap(await s.db.from('ba_imports').update({ confirmed_at: new Date().toISOString() }).eq('id', batch.batch_id))
      return { card: await processItem(batch.rows[0].id, user.id) }
    }
    if (action === 'import-preview') {
      await limit(`imports:${user.id}`, 10, 3600)
      if (typeof body.file !== 'string' || body.file.length > 2800000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(body.file)) throw new Fault(400, 'File is too large or invalid.')
      const rows = await parseStudents(String(body.filename || ''), Buffer.from(body.file, 'base64'))
      if (rows.some(row => row.error)) return { rows, invalid: true }
      const batch = await reserve(rows.map(row => row.student), user.id)
      return { ...batch, invalid: false }
    }
    if (action === 'import-confirm') {
      if (body.confirmed !== true) throw new Fault(400, 'Confirm the number of accounts before creating them.')
      const batch = unwrap(await s.db.from('ba_imports').update({ confirmed_at: new Date().toISOString() }).eq('id', uuid(body.batch_id)).eq('admin_id', user.id).gt('expires_at', new Date().toISOString()).select().maybeSingle())
      if (!batch) throw new Fault(409, 'Import expired or unavailable. Upload again.')
      await audit(user.id, 'student.bulk_confirmed', null, { batch_id: batch.id }); return { ok: true }
    }
    if (action === 'import-next') return { card: await processItem(body.item_id, user.id) }
    if (['disable','enable','rename','issue-code'].includes(action)) {
      const target = await profile(uuid(body.user_id))
      if (target.id === user.id) throw new Fault(400, 'You cannot change your own administrator account here.')
      if (action === 'issue-code') {
        if (target.auth_type !== 'builders_id' || target.account_status === 'disabled') throw new Fault(400, 'Enable a Builders ID account before issuing a code.')
        const purpose = target.setup_completed_at ? 'recovery' : 'setup', code = generateCode()
        await rpc('ba_issue_code', { p_user: target.id, p_hash: codeHash(code, s.pepper), p_purpose: purpose, p_admin: user.id })
        return { card: receipt(target, code) }
      }
      // Deny in PostgreSQL first, then ban at the Auth provider; retries are safe.
      if (action === 'disable') {
        await rpc('ba_manage_student', { p_user: target.id, p_admin: user.id, p_action: action })
        unwrap(await s.db.auth.admin.updateUserById(target.id, { ban_duration: '876000h' }))
      } else {
        if (action === 'enable') unwrap(await s.db.auth.admin.updateUserById(target.id, { ban_duration: 'none' }))
        await rpc('ba_manage_student', { p_user: target.id, p_admin: user.id, p_action: action, p_name: action === 'rename' ? cleanName(body.name, 'Display name') : null })
      }
      return { ok: true }
    }
    if (action === 'export') {
      if (body.confirmed !== true || !Array.isArray(body.cards) || !body.cards.length || body.cards.length > 200) throw new Fault(400, 'Confirm the temporary credentials warning.')
      for (const card of body.cards) {
        const { proof, ...payload } = card
        const expected = createHmac('sha256', s.pepper).update(JSON.stringify(payload)).digest('hex')
        if (typeof proof !== 'string' || proof.length !== expected.length || !timingSafeEqual(Buffer.from(proof), Buffer.from(expected)) || card.expires < Date.now()) throw new Fault(400, 'These credentials are no longer exportable. Generate new codes.')
      }
      await audit(user.id, 'student.credentials_exported', null, { count: body.cards.length, format: body.format === 'cards' ? 'cards' : 'csv' })
      if (body.format === 'cards') return { html: `<!doctype html><html><head><meta charset="utf-8"><title>The Builders account cards</title><style>body{font:15px Arial;color:#17212d;margin:24px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}article{border:1px dashed #8490a0;padding:24px;break-inside:avoid}h2{font-size:24px}strong{font-size:20px}small{color:#536071}@media print{button{display:none}article{box-shadow:none}}</style></head><body><button onclick="window.print()">Print account cards</button><div class="grid">${body.cards.map(c => `<article><small>THE BUILDERS</small><h2>Welcome, ${escapeHtml(c.name)}</h2><p>Your Builders ID<br><strong>${escapeHtml(c.builders_id)}</strong></p><p>Setup / recovery code<br><strong>${escapeHtml(c.code)}</strong></p><p>Go to ${escapeHtml(s.site)}/login<br>Choose Builders ID → Set up / recover account.</p><p>Choose your own password. Code expires in 24 hours.</p></article>`).join('')}</div></body></html>` }
      return { csv: ['Name,Builders ID,Setup Code', ...body.cards.map(c => [c.name,c.builders_id,c.code].map(csvCell).join(','))].join('\r\n') }
    }
    throw new Fault(400, 'Unknown action.')
  }
}

