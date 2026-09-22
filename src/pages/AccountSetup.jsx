import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import PrivacyNotice from '../components/auth/PrivacyNotice'
import { buildersApi } from '../lib/buildersApi'
import { supabase } from '../lib/supabase'
export default function AccountSetup() {
  const [params] = useSearchParams(), builders = params.get('method') === 'builders_id'
  const [id,setId]=useState(''),[code,setCode]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false)
  async function submit(e) { e.preventDefault(); setError(''); if(password!==confirm){setError('Passwords do not match.');return} setBusy(true); try { await buildersApi(builders?'setup':'email-finish',{builders_id:id,code,password,privacy_notice_version:'1.0'}); setPassword('');setConfirm('');setCode('');if(!builders) await supabase.auth.signOut();setDone(true) } catch(err){setError(err.message)} finally{setBusy(false)} }
  const input='block w-full mt-1 rounded-xl border border-black/10 bg-white px-3 py-2.5'
  return <AuthLayout className="auth-typography" title={builders?'Set up or recover your account':'Choose your password'} subtitle={builders?'Use the temporary code from your administrator.':'Finish your email invitation or password recovery.'} footer={<Link to="/login" className="underline">Back to sign in</Link>}>
    {done?<p role="status">Password saved. You can now sign in.</p>:<form onSubmit={submit} className="space-y-3 text-sm">
      {builders&&<><label className="block">Builders ID<input className={input} required value={id} onChange={e=>setId(e.target.value)} autoComplete="username" placeholder="BLD-7K2F9" maxLength={20}/></label><label className="block">Setup or recovery code<input className={input} required value={code} onChange={e=>setCode(e.target.value)} autoComplete="one-time-code" maxLength={80}/></label></>}
      <label className="block">New password<input className={input} type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><label className="block">Confirm password<input className={input} type="password" required minLength={12} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
      <PrivacyNotice/><label className="flex gap-2 items-start"><input type="checkbox" required/><span>I have read the <Link to="/privacy" target="_blank" className="underline">Privacy Notice</Link>.</span></label>
      {error&&<p role="alert" className="text-red-600">{error}</p>}<button disabled={busy} className="solid-btn rounded-xl w-full text-white py-3">{busy?'Saving…':'Save my password'}</button>
    </form>}
  </AuthLayout>
}
