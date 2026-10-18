import { randomInt } from 'node:crypto'
// Alias rules shared with the browser live in src/lib/identity.js (pure, no Node APIs).
import { isValidAlias, normalizeAlias, passwordProblem } from '../src/lib/identity.js'
export { isValidAlias, normalizeAlias, passwordProblem }

export const PRIVACY_VERSION = '1.0'
/** Supabase Auth needs an email per user; aliases live under a reserved, undeliverable domain. */
export const ALIAS_EMAIL_DOMAIN = 'alias.builders.invalid'
/** Most aliases created in one go - a few classes' worth, without tying the server up. */
export const MAX_BULK_ALIASES = 200

export class Fault extends Error { constructor(status, message) { super(message); this.status = status } }

/** Easy to read aloud or copy from a slip of paper: no 0/O/1/l/I. Leading capital keeps strict password policies happy. */
export function temporaryPassword() {
  const pick = (set, n) => Array.from({ length: n }, () => set[randomInt(set.length)]).join('')
  return `${pick('ABCDEFGHJKMNPQRSTUVWXYZ', 1)}${pick('abcdefghjkmnpqrstuvwxyz', 3)}-${pick('23456789', 4)}-${pick('abcdefghjkmnpqrstuvwxyz', 4)}`
}

export function parseAlias(raw) {
  const alias = normalizeAlias(raw)
  if (!isValidAlias(alias)) throw new Fault(400, 'Aliases are 3–32 characters: lowercase letters, numbers, and single . _ - between them.')
  return alias
}

/** A numbered set of aliases, e.g. ("Maths7B", 30) -> maths7b-01 … maths7b-30, zero-padded so they sort in order. */
export function aliasSeries(rawPrefix, count, start = 1) {
  const prefix = normalizeAlias(rawPrefix).replace(/[._-]+$/, '')
  if (!Number.isInteger(count) || count < 1 || count > MAX_BULK_ALIASES) throw new Fault(400, `Choose between 1 and ${MAX_BULK_ALIASES} accounts.`)
  if (!Number.isInteger(start) || start < 0 || start > 99999) throw new Fault(400, 'Start from a number between 0 and 99999.')
  const width = Math.max(2, String(start + count - 1).length)
  const aliases = Array.from({ length: count }, (_, i) => `${prefix}-${String(start + i).padStart(width, '0')}`)
  if (!prefix || !aliases.every(isValidAlias)) throw new Fault(400, 'Use a short prefix of letters and numbers, e.g. maths7b.')
  return aliases
}

/** Reads a pasted list (one per line, or separated by commas/spaces): normalised, de-duplicated, invalid ones reported. */
export function parseAliasList(text) {
  const seen = new Set(), aliases = [], invalid = []
  for (const raw of String(text || '').split(/[\s,;]+/)) {
    if (!raw) continue
    const alias = normalizeAlias(raw)
    if (!isValidAlias(alias)) invalid.push(raw)
    else if (!seen.has(alias)) { seen.add(alias); aliases.push(alias) }
  }
  return { aliases, invalid }
}

export function validatePassword(value) {
  const problem = typeof value === 'string' ? passwordProblem(value) : 'Enter a password.'
  if (problem) throw new Fault(400, problem)
}
