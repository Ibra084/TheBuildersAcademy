import { useCallback, useEffect, useState } from 'react'
import { getPublishedDigestIssues } from '../lib/publicDigests'
import { getCached, setCached } from '../lib/digestCache'

const CACHE_KEY = 'issues'

export function usePublicDigests() {
  const cached = getCached(CACHE_KEY)
  const [issues, setIssues] = useState(cached || [])
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPublishedDigestIssues()
      setIssues(data)
      setCached(CACHE_KEY, data)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // A valid (non-expired) cache means no Supabase call at all — not just
    // a hidden loading spinner while quietly re-fetching in the background.
    if (getCached(CACHE_KEY)) return
    void refresh()
  }, [refresh])

  return { issues, loading, error, refresh }
}
