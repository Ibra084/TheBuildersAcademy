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
  let latestCard
  await page.route('**/api/builders',async route=>{try{const body=route.request().postDataJSON(),token=(route.request().headers().authorization||'').replace('Bearer ','');const data=await controller(body,token,'ui-test');if(data.card)latestCard=data.card;await route.fulfill({contentType:'application/json',body:JSON.stringify(data)})}catch(err){await route.fulfill({status:err.status||500,contentType:'application/json',body:JSON.stringify({error:err.message})})}})
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
  await page.goto('http://127.0.0.1:5180/login')
  await page.getByLabel('Personal email',{exact:true}).fill('14irahman@jess.sch.ae');await page.getByLabel('Password',{exact:true}).fill('existing-owner-password');await page.getByRole('button',{name:'Log in',exact:true}).click();await page.waitForURL('**/portal')
  await page.goto('http://127.0.0.1:5180/portal/admin');await page.getByRole('heading',{name:'Student Accounts',exact:true}).waitFor()
  await page.getByRole('button',{name:'Create student account',exact:true}).click();await page.getByLabel('First name',{exact:true}).fill('Alex');await page.getByLabel('Last name',{exact:true}).fill('Smith');await page.locator('form').getByRole('button',{name:'Create student account',exact:true}).click();await page.getByRole('heading',{name:/Temporary account details/}).waitFor();const card=latestCard;assert.ok(card.code)
  await page.getByRole('button',{name:'Import students',exact:true}).click();await page.getByLabel('Student spreadsheet').setInputFiles({name:'students.csv',mimeType:'text/csv',buffer:Buffer.from('first_name,last_name\nMaya,Khan\nSam,Patel')});await page.getByRole('button',{name:'Create 2 student accounts',exact:true}).click();await page.getByText('All accounts in this import were created successfully.').waitFor()
  await page.getByRole('checkbox').filter({visible:true}).first().check();const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download Credentials Sheet',exact:true}).click();assert.match((await downloadPromise).suggestedFilename(),/credentials.csv$/)
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  await page.getByRole('button',{name:'Log out',exact:true}).filter({visible:true}).click();await page.goto('http://127.0.0.1:5180/account/setup?method=builders_id')
  await page.getByLabel('Builders ID',{exact:true}).fill(card.builders_id);await page.getByLabel('Setup or recovery code').fill(card.code);await page.getByLabel('New password',{exact:true}).fill('a-student-password-2026');await page.getByLabel('Confirm password',{exact:true}).fill('a-student-password-2026');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Save my password'}).click();await page.getByRole('status').filter({hasText:'Password saved'}).waitFor()
  await page.goto('http://127.0.0.1:5180/login');await page.getByRole('button',{name:'Builders ID',exact:true}).click();await page.getByLabel('Builders ID',{exact:true}).fill(card.builders_id.slice(4).toLowerCase());await page.getByLabel('Password',{exact:true}).fill('a-student-password-2026');await page.getByRole('button',{name:'Log in',exact:true}).click();await page.getByRole('heading',{name:'Welcome back, Alex.'}).waitFor();assert.ok(!(await page.locator('body').innerText()).includes('@builders.invalid'))
  await page.goto('http://127.0.0.1:5180/portal/admin');await page.waitForURL('**/portal');await page.goto('http://127.0.0.1:5180/privacy');await page.getByRole('heading',{name:'Privacy Notice',exact:true}).waitFor()
  assert.deepEqual(errors,[])
  console.log('PASS: email login, admin creation, CSV preview/confirm/export, mobile layout, Builders ID setup/login, non-admin redirect, private address hidden, privacy page')
}finally{await browser?.close();await h?.close();server.kill()}
