import { useCallback, useEffect, useState } from 'react'
import { getPublishedDigestIssues } from '../lib/publicDigests'

export function usePublicDigests() {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const data = await getPublishedDigestIssues()
      setIssues(data)
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
