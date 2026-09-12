import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useSessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    const refresh = async () => {
      const { data, error: failure } = await supabase.from('ba_content').select('id,payload').eq('kind', 'sessions').eq('archived', false)
      if (!active) return
      if (failure) setError(failure.message)
      else { setSessions(data.map(row => ({ ...row.payload, id: row.id })).sort((a,b) => new Date(a.date) - new Date(b.date))); setError('') }
      setLoading(false)
    }
    void refresh()
    window.addEventListener('sessions-changed', refresh)
    const interval = setInterval(refresh, 15000)
    return () => { active = false; clearInterval(interval); window.removeEventListener('sessions-changed', refresh) }
  }, [])
  return { sessions, loading, error }
}
export async function createSession({ title, date, location, description }) {
  if (!title.trim() || !location.trim() || !Number.isFinite(new Date(date).getTime())) throw new Error('Enter a title, date/time, and location.')
  const payload = { title: title.trim(), date: new Date(date).toISOString(), location: location.trim(), description: description.trim(), resources: [] }
  const { data, error } = await supabase.from('ba_content').insert({ kind: 'sessions', payload }).select('id,payload').single()
  if (error) throw error
  window.dispatchEvent(new Event('sessions-changed'))
  return { ...data.payload, id: data.id }
}
