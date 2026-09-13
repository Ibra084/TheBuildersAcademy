import { useCallback, useEffect, useState } from 'react'
import { getPublishedDigestIssues } from '../lib/publicDigests'
import { getCached, setCached } from '../lib/digestCache'

const CACHE_KEY = 'issues'

export function usePublicDigests() {
  const cached = getCached(CACHE_KEY)
  const [issues, setIssues] = useState(cached || [])
  // Only show a loading state when there's nothing cached to show yet —
  // otherwise the cached list renders immediately and refreshes silently.
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
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
    void refresh()
  }, [refresh])

  return { issues, loading, error, refresh }
}
