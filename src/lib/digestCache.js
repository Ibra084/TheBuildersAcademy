// Lightweight localStorage cache for public digest reads (stale-while-
// revalidate): a cached value renders instantly while a fresh Supabase
// fetch happens in the background, so navigating away and back doesn't
// show a loading spinner every time. Not used for admin reads — those
// should always be current while someone's actively editing.
const TTL_MS = 5 * 60 * 1000 // 5 minutes

function storageKey(key) {
  return `builders_digest_cache_${key}`
}

export function getCached(key) {
  try {
    const raw = localStorage.getItem(storageKey(key))
    if (!raw) return null
    const { data, savedAt } = JSON.parse(raw)
    if (Date.now() - savedAt > TTL_MS) return null
    return data
  } catch {
    return null
  }
}

export function setCached(key, data) {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify({ data, savedAt: Date.now() }))
  } catch {
    // Caching is a nice-to-have — ignore quota/availability issues.
  }
}
