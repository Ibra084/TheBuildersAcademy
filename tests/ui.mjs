import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
import { database } from './harness.js'
import { createController } from '../server/builders.js'

// Isolated provider fixture + real PostgreSQL migration/API controller. No real
// students, credentials, email messages or production writes are made by tests.
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5180','--strictPort'],{cwd:new URL('..',import.meta.url),stdio:['ignore','pipe','pipe']})
let browser,h
try{
  await new Promise((resolve,reject)=>{server.stdout.on('data',data=>{if(data.toString().includes('ready'))resolve()});server.on('exit',code=>reject(Error(`Preview exited: ${code}`)));setTimeout(()=>reject(Error('Preview startup timeout')),15000).unref()})
  h=await database();const controller=createController(h.s)
  browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||(process.platform==='win32'?'msedge':undefined)})
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
  page.on('pageerror',err=>errors.push(err.message))
  let issued=[]
  await page.route('**/api/builders',async route=>{try{const body=route.request().postDataJSON(),token=(route.request().headers().authorization||'').replace('Bearer ','');const data=await controller(body,token,'ui-test');if(data.password)issued.push(data);if(data.results)issued.push(...data.results.filter(r=>r.password));await route.fulfill({contentType:'application/json',body:JSON.stringify(data)})}catch(err){await route.fulfill({status:err.status||500,contentType:'application/json',body:JSON.stringify({error:err.message})})}})
  await page.route('https://*.supabase.co/**',async route=>{
    const request=route.request(),url=new URL(request.url()),token=(request.headers().authorization||'').replace('Bearer ','');let data=[],status=200
    if(url.pathname.endsWith('/token')){const result=await h.s.auth().auth.signInWithPassword(request.postDataJSON());if(result.error){status=400;data={msg:'Invalid login credentials'}}else{const user=(await h.s.db.auth.getUser(result.data.session.access_token)).data.user;data={...result.data.session,token_type:'bearer',expires_in:3600,user}}}
    else if(url.pathname.endsWith('/user'))data=(await h.s.db.auth.getUser(token)).data.user
    else if(url.pathname.endsWith('/rpc/ba_is_admin'))data=(await h.s.caller(token).rpc('ba_is_admin')).data
    else if(url.pathname.endsWith('/rpc/ba_my_account')){const user=(await h.s.db.auth.getUser(token)).data.user;data=(await h.pg.query('select * from ba_profiles where id=$1',[user.id])).rows[0]}
    else if(url.pathname.endsWith('/ba_profiles'))data=(await h.pg.query('select id,name,year,what_building,photo,created_at,updated_at,display_name from ba_profiles')).rows
    else if(url.pathname.endsWith('/logout'))data={}
    await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)})
  })
  const base='http://127.0.0.1:5180'
  // Owner signs in with a personal email through the Sketch-style form.
  await page.goto(base+'/login');await page.waitForURL('**/sign-in')
  await page.getByLabel('Personal email or student alias',{exact:true}).fill('14irahman@jess.sch.ae');await page.getByLabel('Password',{exact:true}).fill('existing-owner-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/portal')
  // Admin: create one alias, see the one-time card.
  await page.goto(base+'/portal/admin');await page.getByRole('heading',{name:'Student aliases',exact:true,level:2}).waitFor()
  await page.getByLabel('New alias').fill('a--b');await page.getByText('Use 3–32 lowercase letters').waitFor();assert.ok(await page.getByRole('button',{name:'Create alias'}).isDisabled())
  await page.getByLabel('New alias').fill('Maths7B-01');await page.getByRole('button',{name:'Create alias'}).click();await page.getByText('Alias created. Give these to the student:').waitFor()
  const first=issued.at(-1);assert.equal(first.alias,'maths7b-01');await page.getByText(first.password,{exact:true}).waitFor()
  // Numbered set, with the existing alias skipped.
  await page.getByLabel('Prefix').fill('maths7b');await page.getByLabel('How many').fill('3');await page.getByRole('button',{name:'Create accounts',exact:true}).click();await page.getByText('Created 2 accounts').waitFor();await page.getByText('Skipped: maths7b-01 (already taken)').waitFor()
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download CSV'}).click();assert.match((await downloadPromise).suggestedFilename(),/^student-aliases-.*\.csv$/)
  // Reset and delete go through a confirm dialog.
  const row=alias=>page.locator('li').filter({hasText:alias})
  await row('maths7b-02').getByRole('button',{name:'Reset password'}).click();await page.getByRole('alertdialog').getByText("Reset maths7b-02's password?").waitFor();await page.keyboard.press('Escape');assert.equal(await page.getByRole('alertdialog').count(),0)
  await row('maths7b-03').getByRole('button',{name:'Delete maths7b-03'}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Delete',exact:true}).click();await page.getByRole('alertdialog').waitFor({state:'detached'});await row('maths7b-03').waitFor({state:'detached'})
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.setViewportSize({width:1440,height:1000})
  await page.getByRole('button',{name:'Log out',exact:true}).filter({visible:true}).click();await page.waitForURL('**/sign-in?notice=signed-out');await page.getByText("You've signed out.").waitFor()
  // Student: alias sign-in, forced password change, then the portal.
  await page.getByRole('link',{name:'Sign in with a student alias'}).click();await page.waitForURL('**/alias')
  await page.getByLabel('Student alias',{exact:true}).fill('MATHS7B-01');await page.getByLabel('Password (temporary on first sign-in)').fill('wrong-password-1');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('alert').filter({hasText:"doesn't match"}).waitFor()
  await page.getByLabel('Password (temporary on first sign-in)').fill(first.password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/change-password')
  await page.getByText('Signed in as maths7b-01').waitFor()
  await page.goto(base+'/portal');await page.waitForURL('**/change-password')
  await page.getByLabel('New password',{exact:true}).fill('short');await page.getByLabel('Type it again').fill('short');await page.getByRole('button',{name:'Save password and continue'}).click();await page.getByText('Use at least 8 characters.').waitFor()
  await page.getByLabel('New password',{exact:true}).fill('my-own-password-1');await page.getByLabel('Type it again').fill('my-own-password-1');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Save password and continue'}).click()
  await page.waitForURL('**/portal?notice=welcome');await page.getByText("You're all set. Your new password is saved.").waitFor();await page.getByRole('heading',{name:'Welcome back, maths7b-01.'}).waitFor()
  assert.ok(!(await page.locator('body').innerText()).includes('.invalid'))
  // Non-admins are sent away from /portal/admin; signed-in students skip the auth pages.
  await page.goto(base+'/portal/admin');await page.waitForURL(/\/portal$/)
  await page.goto(base+'/sign-in');await page.waitForURL(/\/portal$/)
  // Sign-up and forgot-password pages, signed out.
  await page.getByRole('button',{name:'Log out',exact:true}).filter({visible:true}).click();await page.waitForURL('**/sign-in?notice=signed-out')
  await page.getByRole('tab',{name:'Create account'}).click();await page.waitForURL('**/sign-up');await page.getByLabel('Personal email',{exact:true}).fill('kid@school.sch.uk');await page.getByLabel('Create a password').fill('password1');await page.getByRole('button',{name:'Create account',exact:true}).click();await page.getByText("School email addresses can't be used").waitFor();await page.getByText('Please agree to continue.').waitFor()
  await page.goto(base+'/forgot-password?account=alias');await page.getByText('Ask your teacher or administrator').waitFor()
  await page.goto(base+'/privacy');await page.getByRole('heading',{name:'Privacy Notice',exact:true}).waitFor()
  assert.deepEqual(errors,[])
  console.log('PASS: email sign-in, alias create/validate/bulk/CSV/reset dialog/delete, mobile layout, sign-out notice, alias sign-in, forced password change, welcome notice, non-admin redirect, signed-in redirect, sign-up validation, alias forgot-password, privacy page')
}finally{await browser?.close();await h?.close();server.kill()}
