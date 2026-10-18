import test from 'node:test'
import assert from 'node:assert/strict'
import { temporaryPassword, aliasSeries, parseAliasList, parseAlias } from '../server/identity.js'
import { parseIdentifier, passwordProblem, safeNextPath } from '../src/lib/identity.js'
import { createController } from '../server/builders.js'
import { database } from './harness.js'

test('Aliases: validation, numbered sets and pasted lists', () => {
  assert.equal(parseAlias(' Maths7B-01 '), 'maths7b-01')
  for (const bad of ['ab', 'a--b', '-abc', 'abc-', 'has space', 'x'.repeat(33)]) assert.throws(() => parseAlias(bad), e => e.status === 400)
  assert.deepEqual(aliasSeries('Maths7B', 3), ['maths7b-01', 'maths7b-02', 'maths7b-03'])
  assert.deepEqual(aliasSeries('y9-', 2, 99), ['y9-099', 'y9-100'])
  assert.throws(() => aliasSeries('maths', 201), e => e.status === 400)
  assert.throws(() => aliasSeries('', 3), e => e.status === 400)
  assert.deepEqual(parseAliasList('maths-01\nMATHS-01, maths-02;; bad--one x'), { aliases: ['maths-01', 'maths-02'], invalid: ['bad--one', 'x'] })
  const password = temporaryPassword()
  assert.match(password, /^[A-HJ-NP-Z][a-hj-km-np-z]{3}-[2-9]{4}-[a-hj-km-np-z]{4}$/)
  assert.equal(passwordProblem(password), null)
})

test('Identity: sign-in field, passwords and redirects', () => {
  assert.deepEqual(parseIdentifier(' Maths7B-01 '), { kind: 'alias', alias: 'maths7b-01' })
  assert.deepEqual(parseIdentifier('Me@Example.com'), { kind: 'email', email: 'me@example.com' })
  assert.equal(parseIdentifier('not an alias'), null)
  assert.equal(passwordProblem('short1'), 'Use at least 8 characters.')
  assert.equal(passwordProblem('longenough'), 'Include at least one letter and one number.')
  assert.equal(passwordProblem('longenough1'), null)
  assert.equal(safeNextPath('//evil.example'), '/portal')
  assert.equal(safeNextPath('/portal/sessions'), '/portal/sessions')
})

test('Database and API: alias lifecycle, permissions and migration', async t => {
  const h = await database(), run = createController(h.s)
  const admin = (action, body = {}) => run({ action, ...body }, h.ownerToken, 'test-admin')
  const publicCall = (action, body = {}) => run({ action, ...body }, null, 'test-public')
  const profileOf = async alias => (await h.pg.query('select * from ba_profiles where alias=$1', [alias])).rows[0]
  let created
  try {
    await t.test('Existing email accounts are untouched', async () => {
      const p = (await h.pg.query('select * from ba_profiles where id=$1', [h.student])).rows[0]
      assert.equal(p.auth_type, 'email'); assert.equal(p.alias, null); assert.equal(p.name, 'Existing Student')
      assert.ok((await h.s.auth().auth.signInWithPassword({ email: 'student@example.com', password: 'existing-student-password' })).data.session)
    })
    await t.test('Builders ID accounts become aliases and keep their password', async () => {
      const p = (await h.pg.query('select * from ba_profiles where id=$1', [h.legacy])).rows[0]
      assert.equal(p.auth_type, 'alias'); assert.equal(p.alias, 'bld-7k2f9'); assert.equal(p.account_status, 'active')
      const result = await publicCall('login', { alias: 'BLD-7K2F9', password: 'legacy-password-1' })
      assert.ok(result.session.access_token); assert.equal(result.mustChangePassword, false)
    })
    await t.test('Admin APIs deny signed-out users and ordinary students', async () => {
      for (const action of ['list', 'alias-create', 'alias-bulk', 'alias-reset', 'alias-delete', 'resolve-request']) {
        await assert.rejects(run({ action }, null, 'anon'), e => e.status === 401)
        await assert.rejects(run({ action }, h.studentToken, 'member'), e => e.status === 403)
      }
    })
    await t.test('Creates an alias with a one-time temporary password', async () => {
      created = await admin('alias-create', { alias: 'Maths7B-01' })
      assert.equal(created.alias, 'maths7b-01'); assert.ok(created.password)
      const p = await profileOf('maths7b-01')
      assert.equal(p.account_status, 'pending'); assert.equal(p.name, 'maths7b-01'); assert.equal(p.personal_email, null)
      await assert.rejects(admin('alias-create', { alias: 'maths7b-01' }), e => e.status === 409 && /already taken/.test(e.message))
      await assert.rejects(admin('alias-create', { alias: 'a--b' }), e => e.status === 400)
      const { aliases } = await admin('list')
      assert.deepEqual(aliases.find(a => a.alias === 'maths7b-01').pendingPasswordChange, true)
      assert.equal(aliases.find(a => a.alias === 'maths7b-01').lastSignInAt, null)
    })
    await t.test('First sign-in forces a new password before portal access', async () => {
      const { session, mustChangePassword } = await publicCall('login', { alias: 'maths7b-01', password: created.password })
      assert.equal(mustChangePassword, true)
      const sid = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64url').toString()).session_id
      const userId = (await profileOf('maths7b-01')).id
      await h.pg.exec('set role authenticated')
      try {
        await h.pg.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)", [userId, JSON.stringify({ session_id: sid })])
        assert.equal((await h.pg.query('select id from public.ba_profiles')).rows.length, 0, 'pending aliases cannot read portal data')
      } finally { await h.pg.exec('reset role') }
      const call = body => run({ action: 'change-password', ...body }, session.access_token, 'student')
      await assert.rejects(call({ password: 'my-new-password-1' }), /Privacy Notice/)
      await assert.rejects(call({ password: 'short', privacy_notice_version: '1.0' }), /at least 8/)
      await call({ password: 'my-new-password-1', privacy_notice_version: '1.0' })
      const p = await profileOf('maths7b-01')
      assert.equal(p.account_status, 'active'); assert.equal(p.privacy_notice_version, '1.0')
      await assert.rejects(call({ password: 'another-password-2', privacy_notice_version: '1.0' }), /already set/)
      await assert.rejects(publicCall('login', { alias: 'maths7b-01', password: created.password }), e => e.status === 401)
      assert.equal((await publicCall('login', { alias: 'maths7b-01', password: 'my-new-password-1' })).mustChangePassword, false)
    })
    await t.test('Reset issues a new temporary password and signs the student out', async () => {
      const before = (await h.pg.query('select count(*)::int as n from auth.sessions where user_id=(select id from ba_profiles where alias=$1)', ['maths7b-01'])).rows[0].n
      assert.ok(before > 0)
      const reset = await admin('alias-reset', { alias: 'maths7b-01' })
      assert.ok(reset.password)
      assert.equal((await profileOf('maths7b-01')).account_status, 'pending')
      assert.equal((await h.pg.query('select count(*)::int as n from auth.sessions where user_id=(select id from ba_profiles where alias=$1)', ['maths7b-01'])).rows[0].n, 0)
      assert.equal((await publicCall('login', { alias: 'maths7b-01', password: reset.password })).mustChangePassword, true)
      await assert.rejects(admin('alias-reset', { alias: 'nobody-here' }), e => e.status === 404)
    })
    await t.test('Bulk creation: numbered sets and pasted lists skip taken aliases', async () => {
      const series = await admin('alias-bulk', { mode: 'series', prefix: 'maths7b', count: 3, start: 1 })
      assert.deepEqual(series.results.map(r => [r.alias, 'password' in r]), [['maths7b-01', false], ['maths7b-02', true], ['maths7b-03', true]])
      assert.equal(series.results[0].error, 'Already taken')
      const list = await admin('alias-bulk', { mode: 'list', text: 'y9-ada\ny9-ada\nbad--one\nmaths7b-02' })
      assert.deepEqual(list.invalid, ['bad--one'])
      assert.deepEqual(list.results.map(r => r.alias), ['y9-ada', 'maths7b-02'])
      await assert.rejects(admin('alias-bulk', { mode: 'list', text: 'bad--one' }), /None of those/)
      await assert.rejects(admin('alias-bulk', { mode: 'series', prefix: 'x', count: 500 }), e => e.status === 400)
    })
    await t.test('Delete removes the account; email accounts and admins cannot be targeted', async () => {
      await admin('alias-delete', { alias: 'y9-ada' })
      assert.equal(await profileOf('y9-ada'), undefined)
      assert.equal((await h.pg.query("select count(*)::int as n from auth.users where email like 'y9-ada@%'")).rows[0].n, 0)
      await assert.rejects(admin('alias-delete', { alias: 'student' }), e => e.status === 404)
      const audit = (await h.pg.query("select action, metadata from ba_admin_audit where action like 'alias.%' order by id")).rows
      assert.ok(audit.some(a => a.action === 'alias.deleted' && a.metadata.alias === 'y9-ada'))
      assert.ok(audit.every(a => !JSON.stringify(a).includes(created.password)), 'audit never stores passwords')
    })
    await t.test('Database keeps alias RPCs server-only and private columns hidden', async () => {
      await h.pg.exec('set role authenticated')
      try {
        await assert.rejects(h.pg.query('select * from public.ba_list_aliases()'), /permission denied/)
        await assert.rejects(h.pg.query('select public.ba_reset_alias($1,$1)', [h.student]), /permission denied/)
        await assert.rejects(h.pg.query('select alias from public.ba_profiles'), /permission denied/)
        await assert.rejects(h.pg.query("update public.ba_profiles set account_status='active'"), /permission denied/)
      } finally { await h.pg.exec('reset role') }
      await assert.rejects(h.pg.query("insert into auth.users(id,email,raw_user_meta_data) values(gen_random_uuid(),'kid@school.sch.uk','{\"privacy_notice_version\":\"1.0\"}')"), /personal email/)
    })
    await t.test('Wrong passwords and rate limits fail closed', async () => {
      await assert.rejects(publicCall('login', { alias: 'maths7b-02', password: 'wrong-password-1' }), e => e.status === 401)
      await assert.rejects(publicCall('login', { alias: 'no-such-alias', password: 'wrong-password-1' }), e => e.status === 401 && /doesn't match/.test(e.message))
      await h.pg.query('update ba_rate_limits set count=1000')
      await assert.rejects(publicCall('login', { alias: 'maths7b-02', password: 'whatever-1' }), e => e.status === 429)
    })
  } finally { await h.close() }
})
