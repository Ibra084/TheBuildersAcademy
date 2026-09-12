import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
const shape = row => ({ id: row.id, sessionId: row.session_id, sessionTitle: row.session_title, startedAt: row.started_at, endedAt: row.ended_at })
export function useCheckIns() {
  const [data, setData] = useState({ active: null, responses: {}, history: [] })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision(n => n + 1), [])
  useEffect(() => {
    let active = true
    let running = false
    async function load() {
      if (running) return
      running = true
      try {
        const [checkins, responses] = await Promise.all([
          supabase.from('ba_checkins').select('*').order('started_at', { ascending: false }),
          supabase.from('ba_responses').select('*'),
        ])
        if (checkins.error) throw checkins.error
        if (responses.error) throw responses.error
        const byCheckin = {}
        for (const row of responses.data) {
          byCheckin[row.checkin_id] ||= {}
          byCheckin[row.checkin_id][row.user_id] = { status: row.status, respondedAt: row.responded_at }
        }
        const current = checkins.data.find(row => !row.ended_at)
        if (active) { setData({ active: current ? shape(current) : null, responses: current ? byCheckin[current.id] || {} : {}, history: checkins.data.filter(row => row.ended_at).map(row => ({ ...shape(row), responses: byCheckin[row.id] || {} })) }); setError('') }
      } catch (err) { if (active) setError(err.message) }
      finally { running = false; if (active) setLoading(false) }
    }
    void load()
    const interval = setInterval(load, 5000)
    return () => { active = false; clearInterval(interval) }
  }, [revision])
  return { ...data, error, loading, refresh }
}
export async function startCheckIn({ id, title }) {
  const { error } = await supabase.from('ba_checkins').insert({ session_id: id, session_title: title })
  if (error) throw new Error(error.code === '23505' ? 'A check-in is already open. Refresh to see it.' : error.message)
}
export async function endCheckIn(id) {
  const { error } = await supabase.from('ba_checkins').update({ ended_at: new Date().toISOString() }).eq('id', id).is('ended_at', null)
  if (error) throw error
}
export async function submitResponse(checkinId, userId, status) {
  const { error } = await supabase.from('ba_responses').upsert({ checkin_id: checkinId, user_id: userId, status, responded_at: new Date().toISOString() }, { onConflict: 'checkin_id,user_id' })
  if (error) throw error
}
