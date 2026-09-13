import { useEffect, useState } from 'react'
import { getPublishedDigestIssue } from '../lib/publicDigests'
import { getCached, setCached } from '../lib/digestCache'

export function useDigestIssue(id) {
  const cacheKey = `issue-${id}`
  const cached = getCached(cacheKey)
  const [issue, setIssue] = useState(cached || null)
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const key = `issue-${id}`
    const cachedForId = getCached(key)
    setIssue(cachedForId || null)
    setLoading(!cachedForId)
    setError('')

    getPublishedDigestIssue(id)
      .then((data) => {
        if (!active) return
        setIssue(data)
        if (data) setCached(key, data)
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  return { issue, loading, error }
}
