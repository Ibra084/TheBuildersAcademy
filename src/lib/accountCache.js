// Caches the loaded account (profile + admin flag + member directory) so
// re-mounting the app (leaving and coming back, reopening the tab) doesn't
// have to re-fetch it from Supabase and show "Loading your account…"
// every time — same TTL-cache principle as the digest data.
const KEY = 'builders_account_cache'
const TTL_MS = 5 * 60 * 1000 // 5 minutes

export function getCachedAccount() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const { data, savedAt } = JSON.parse(raw)
    if (Date.now() - savedAt > TTL_MS) return null
    return data
  } catch {
    return null
  }
}

export function setCachedAccount(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ data, savedAt: Date.now() }))
  } catch {
    // Caching is a nice-to-have — ignore quota/availability issues.
  }
}

export function clearCachedAccount() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Ignore.
  }
}
