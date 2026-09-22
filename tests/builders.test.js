import test from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { generateId, normalizeId, uniqueId, generateCode, codeHash, csvCell } from '../server/identity.js'
import { parseStudents } from '../server/imports.js'
import { createController } from '../server/builders.js'
import { database } from './harness.js'

test('Identifiers: cryptographic format, normalisation and collision retries',async()=>{
  const ids=new Set(Array.from({length:1000},generateId));assert.ok(ids.size>990)
  for(const id of ids)assert.match(id,/^BLD-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/)
  assert.equal(normalizeId(' 7k2f9 '),'BLD-7K2F9');assert.equal(normalizeId('bld-m8wx4'),'BLD-M8WX4');assert.throws(()=>normalizeId('BLD-O01II'))
  let attempts=0;assert.equal(await uniqueId(async()=>++attempts===3,()=> 'BLD-AAAAA'),'BLD-AAAAA');assert.equal(attempts,3)
  await assert.rejects(uniqueId(async()=>false),/reserve/)
  assert.equal(generateCode().replaceAll('-','').length,16);assert.equal(codeHash('abcd-efgh','pepper'),codeHash('ABCDEFGH','pepper'));assert.match(csvCell('=HYPERLINK("evil")'),/^"'/)
})
test('CSV: valid international names, blank/malformed/duplicate rows, unsupported columns and size',async()=>{
  const parse=text=>parseStudents('students.csv',Buffer.from(text))
  assert.equal((await parse('first_name,last_name,display_name\nعلي,حسن,علي\n'))[0].student.display_name,'علي')
  assert.equal((await parse('first_name,last_name\nAlex,Smith\nAlex,Smith'))[1].error.includes('Duplicate'),true)
  assert.ok((await parse('first_name,last_name\n,Smith'))[0].error)
  assert.ok((await parse('first_name,last_name\nAlex,Smith\n,\nMaya,Khan'))[1].error)
  await assert.rejects(parse('first_name,last_name,school_email\nA,B,x'),/Only|only/)
  await assert.rejects(parse('first_name,last_name\n"unfinished'),/Malformed/)
  await assert.rejects(parseStudents('students.exe',Buffer.from('a')),/Only/)
  await assert.rejects(parseStudents('students.csv',Buffer.alloc(2097153)),/2 MB/)
})
test('XLSX: reads plain text, rejects formulas, multiple sheets, corrupt files',async()=>{
  const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Students');sheet.addRow(['first_name','last_name']);sheet.addRow(['Maya','Khan'])
  assert.equal((await parseStudents('students.xlsx',Buffer.from(await book.xlsx.writeBuffer())))[0].student.first_name,'Maya')
  sheet.getCell('A2').value={formula:'1+1',result:2};await assert.rejects(parseStudents('students.xlsx',Buffer.from(await book.xlsx.writeBuffer())),/plain text/)
  sheet.getCell('A2').value='Maya';book.addWorksheet('Other');await assert.rejects(parseStudents('students.xlsx',Buffer.from(await book.xlsx.writeBuffer())),/one worksheet/)
  await assert.rejects(parseStudents('students.xlsx',Buffer.from('not zip')),/Invalid/)
})
test('Database and API lifecycle, permissions, recovery and partial imports',async t=>{
  const h=await database(),run=createController(h.s)
  let card, batch
  const admin=(action,body={})=>run({action,...body},h.ownerToken,'test-admin')
  const publicCall=(action,body={})=>run({action,...body},null,'test-public')
  try{
    await t.test('Existing email account migration and login remain intact',async()=>{const p=(await h.pg.query('select * from ba_profiles where id=$1',[h.student])).rows[0];assert.equal(p.auth_type,'email');assert.equal(p.builders_id,null);assert.equal(p.privacy_notice_version,null);assert.equal(p.name,'Existing Student');assert.ok((await h.s.auth().auth.signInWithPassword({email:'student@example.com',password:'existing-student-password'})).data.session)})
    await t.test('All admin APIs deny unauthenticated users and ordinary students',async()=>{for(const action of ['list','create','import-preview','import-confirm','import-next','issue-code','disable','enable','rename','export','resolve-request']){await assert.rejects(run({action},null,'anon'),e=>e.status===401);await assert.rejects(run({action},h.studentToken,'member'),e=>e.status===403)}})
    await t.test('Creates Builders ID account, never stores code plaintext',async()=>{card=(await admin('create',{student:{first_name:'Alex',last_name:'Smith'},auth_type:'builders_id'})).card;assert.match(card.builders_id,/^BLD-/);const p=(await h.pg.query('select * from ba_profiles where id=$1',[card.user_id])).rows[0];assert.equal(p.personal_email,null);assert.equal(p.account_status,'pending');const c=(await h.pg.query('select * from ba_account_codes where user_id=$1',[card.user_id])).rows[0];assert.notEqual(c.code_hash,card.code);assert.equal(c.code_hash,codeHash(card.code,h.s.pepper));await assert.rejects(publicCall('login',{builders_id:card.builders_id,password:'wrong-password'}),e=>e.status===401)})
    await t.test('Expired setup code rejected and regenerated',async()=>{await h.pg.query("update ba_account_codes set expires_at=now()-interval '1 hour' where user_id=$1",[card.user_id]);await assert.rejects(publicCall('setup',{builders_id:card.builders_id,code:card.code,password:'new-student-password',privacy_notice_version:'1.0'}),/expired/);card=(await admin('issue-code',{user_id:card.user_id})).card})
    await t.test('Setup sets password and acceptance, rejects reuse, allows ID without prefix',async()=>{await publicCall('setup',{builders_id:card.builders_id,code:card.code,password:'new-student-password',privacy_notice_version:'1.0'});await assert.rejects(publicCall('setup',{builders_id:card.builders_id,code:card.code,password:'new-student-password',privacy_notice_version:'1.0'}),/already used/);assert.ok((await publicCall('login',{builders_id:card.builders_id.slice(4).toLowerCase(),password:'new-student-password'})).session.access_token);await assert.rejects(publicCall('login',{builders_id:card.builders_id,password:'incorrect'}),e=>e.status===401);const p=(await h.pg.query('select * from ba_profiles where id=$1',[card.user_id])).rows[0];assert.equal(p.account_status,'active');assert.ok(p.setup_completed_at);assert.equal(p.privacy_notice_version,'1.0')})
    await t.test('Recovery changes password, revokes old sessions, code cannot be reused',async()=>{card=(await admin('issue-code',{user_id:card.user_id})).card;await publicCall('setup',{builders_id:card.builders_id,code:card.code,password:'recovered-password',privacy_notice_version:'1.0'});assert.equal((await h.pg.query('select * from auth.sessions where user_id=$1',[card.user_id])).rows.length,0);await assert.rejects(publicCall('login',{builders_id:card.builders_id,password:'new-student-password'}));assert.ok((await publicCall('login',{builders_id:card.builders_id,password:'recovered-password'})).session);await assert.rejects(publicCall('setup',{builders_id:card.builders_id,code:card.code,password:'another-password',privacy_notice_version:'1.0'}))})
    await t.test('Disable blocks login and invalidates tokens; enable restores access',async()=>{await admin('disable',{user_id:card.user_id});await assert.rejects(publicCall('login',{builders_id:card.builders_id,password:'recovered-password'}));assert.equal((await h.pg.query('select * from auth.sessions where user_id=$1',[card.user_id])).rows.length,0);await admin('enable',{user_id:card.user_id});assert.ok((await publicCall('login',{builders_id:card.builders_id,password:'recovered-password'})).session)})
    await t.test('Preview reserves stable IDs, explicit confirmation, partial failure resumes',async()=>{batch=await admin('import-preview',{filename:'students.csv',file:Buffer.from('first_name,last_name\nMaya,Khan\nSam,Patel').toString('base64')});await assert.rejects(admin('import-next',{item_id:batch.rows[0].id}),e=>e.status===409);await admin('import-confirm',{batch_id:batch.batch_id,confirmed:true});const first=(await admin('import-next',{item_id:batch.rows[0].id})).card;assert.equal(first.builders_id,batch.rows[0].builders_id);h.failNextCreate();await assert.rejects(admin('import-next',{item_id:batch.rows[1].id}));const status=(await h.pg.query('select state from ba_import_items where id=$1',[batch.rows[1].id])).rows[0];assert.equal(status.state,'failed');const second=(await admin('import-next',{item_id:batch.rows[1].id})).card;assert.equal(second.builders_id,batch.rows[1].builders_id);await assert.rejects(admin('import-next',{item_id:batch.rows[0].id}));assert.equal((await h.pg.query('select * from ba_profiles where builders_id=$1',[first.builders_id])).rows.length,1)})
    await t.test('Database denies sensitive RPCs, private columns and writes for students',async()=>{await h.pg.exec('set role authenticated');try{await assert.rejects(h.pg.query('select public.ba_consume_code($1,$2)',['BLD-AAAAA','hash']),/permission denied/);await assert.rejects(h.pg.query('select personal_email from public.ba_profiles'),/permission denied/);await assert.rejects(h.pg.query('select * from public.ba_account_codes'),/permission denied/);await assert.rejects(h.pg.query("update public.ba_profiles set account_status='active'"),/permission denied/)}finally{await h.pg.exec('reset role')}})
    await t.test('Exports require confirmation and signed ephemeral credentials; audit excludes secrets',async()=>{await assert.rejects(admin('export',{cards:[card],confirmed:false}));await assert.rejects(admin('export',{cards:[{...card,code:'forged'}],confirmed:true}));const output=await admin('export',{cards:[card],confirmed:true,format:'csv'});assert.ok(output.csv.includes(card.builders_id));const audit=JSON.stringify((await h.pg.query('select * from ba_admin_audit')).rows);assert.ok(!audit.includes(card.code));assert.ok(!audit.includes('password'))})
    await t.test('Expired recovery codes and password-provider failures fail closed',async()=>{
      card=(await admin('issue-code',{user_id:card.user_id})).card
      await h.pg.query("update ba_account_codes set expires_at=now()-interval '1 hour' where user_id=$1",[card.user_id])
      await assert.rejects(publicCall('setup',{builders_id:card.builders_id,code:card.code,password:'long-enough-password',privacy_notice_version:'1.0'}),/expired/)
      card=(await admin('issue-code',{user_id:card.user_id})).card;h.failNextPassword()
      await assert.rejects(publicCall('setup',{builders_id:card.builders_id,code:card.code,password:'long-enough-password',privacy_notice_version:'1.0'}),/did not finish/)
      assert.equal((await h.pg.query('select account_status from ba_profiles where id=$1',[card.user_id])).rows[0].account_status,'pending')
      const redeemed=await h.s.db.rpc('ba_consume_code',{p_id:card.builders_id,p_hash:codeHash(card.code,h.s.pepper)});assert.equal(redeemed.data,null)
    })
    await t.test('XLSX endpoint reserves exactly the preview ID; names remain text',async()=>{
      const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('Students');sheet.addRow(['first_name','last_name','display_name']);sheet.addRow(['Renée','O’Brien','Renée'])
      const preview=await admin('import-preview',{filename:'students.xlsx',file:Buffer.from(await workbook.xlsx.writeBuffer()).toString('base64')});assert.equal(preview.rows.length,1);assert.match(preview.rows[0].builders_id,/^BLD-/)
      await h.pg.query('insert into ba_profiles(id,name,builders_id) values(gen_random_uuid(),$1,$2)',['Collision',card.builders_id]).then(()=>assert.fail('Expected constraint violation'),e=>assert.ok(e.code==='23505'||e.code==='23503'))
    })
    await t.test('Disabled JWT cannot use existing portal policies',async()=>{
      const session=(await h.s.auth().auth.signInWithPassword({email:'student@example.com',password:'existing-student-password'})).data.session
      await h.s.caller(session.access_token).rpc('ba_is_admin')
      await admin('disable',{user_id:h.student})
      await h.s.caller(session.access_token).rpc('ba_is_admin')
      await h.pg.exec('set role authenticated')
      try{assert.equal((await h.pg.query('select id from public.ba_profiles')).rows.length,0);await assert.rejects(h.pg.query("insert into public.ba_projects(payload) values('{}')"))}finally{await h.pg.exec('reset role')}
    })
    await t.test('Rate limits fail closed',async()=>{await h.pg.query("update ba_rate_limits set count=1000");await assert.rejects(publicCall('login',{builders_id:card.builders_id,password:'recovered-password'}),e=>e.status===429)})
  }finally{await h.close()}
})
