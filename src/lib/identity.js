/**
 * Pure identity rules shared by the browser and the account server (no Supabase
 * or Node imports). Two kinds of account exist:
 * - personal: a student's own (non-school) email address.
 * - alias: an administrator-issued handle (e.g. `maths7b-01`) for students
 *   without a personal email.
 */
export const ALIAS_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30})[a-z0-9]$/
export const PASSWORD_MIN_LENGTH = 8
/** bcrypt (used by Supabase Auth) ignores bytes past 72. */
export const PASSWORD_MAX_LENGTH = 72
export const SCHOOL_EMAIL = /(?:\.sch\.|\.edu(?:\.|$)|\.ac\.|\.invalid$)/i

export function normalizeAlias(alias) { return String(alias || '').trim().toLowerCase() }
export function isValidAlias(alias) { return ALIAS_PATTERN.test(alias) && !/[._-]{2}/.test(alias) }

/** Interprets the single "email or student alias" sign-in field. Anything with an `@` is an email. */
export function parseIdentifier(raw) {
  const value = String(raw || '').trim()
  if (!value) return null
  if (value.includes('@')) {
    const email = value.toLowerCase()
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? { kind: 'email', email } : null
  }
  const alias = normalizeAlias(value)
  return isValidAlias(alias) ? { kind: 'alias', alias } : null
}

/** Returns a student-friendly problem with a new password, or null if acceptable. */
export function passwordProblem(password) {
  if (password.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`
  if (password.length > PASSWORD_MAX_LENGTH) return `Use at most ${PASSWORD_MAX_LENGTH} characters.`
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return 'Include at least one letter and one number.'
  return null
}

/** Only same-origin, absolute-path redirects are honoured so a crafted `?next=` can't bounce a student off-site. */
export function safeNextPath(next, fallback = '/portal') {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback
  return next
}
