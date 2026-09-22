import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import { supabase } from '../lib/supabase'
export default function ForgotPassword() {
  const [params]=useSearchParams(), builders=params.get('method')==='builders_id'
  const [email,setEmail]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
  async function submit(e){e.preventDefault();setBusy(true);try{if(/\.invalid$/i.test(email))throw new Error('Use Builders ID recovery instead.');const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+'/account/setup'});if(error)throw error;setMessage('If this address has an account, check your email for a recovery link.')}catch(err){setMessage(err.message)}finally{setBusy(false)}}
  return <AuthLayout className="auth-typography" title={builders?'Forgot your Builders ID password?':'Reset your password'} footer={<Link to="/login" className="underline">Back to sign in</Link>}>
    {builders?<div className="space-y-4"><p>Ask a Builders administrator to issue you a temporary recovery code.</p><Link className="inline-block underline" to="/account/setup?method=builders_id">I have a recovery code</Link></div>:<form onSubmit={submit} className="space-y-4"><label className="block text-sm">Personal email<input required type="email" className="mt-2 w-full rounded-xl p-3 border border-black/10" value={email} onChange={e=>setEmail(e.target.value)}/></label><button disabled={busy} className="solid-btn text-white px-5 py-3 rounded-xl">Send recovery link</button><p role="status">{message}</p></form>}
  </AuthLayout>
}
