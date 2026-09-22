import { randomInt, randomBytes, createHmac } from 'node:crypto'
export const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const PRIVACY_VERSION = '1.0'
export const MAX_ROWS = 200
export const MAX_FILE_BYTES = 2 * 1024 * 1024
export class Fault extends Error { constructor(status, message) { super(message); this.status = status } }
export function normalizeId(value) {
  const id = String(value || '').trim().toUpperCase().replace(/^BLD-/, '')
  if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(id)) throw new Fault(400, 'Enter a valid Builders ID.')
  return `BLD-${id}`
}
export function generateId() { return 'BLD-' + Array.from({ length: 5 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('') }
export function generateCode() { return Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')).join('-') }
export function codeHash(code, pepper) { return createHmac('sha256', pepper).update(String(code || '').toUpperCase().replace(/[\s-]/g, '')).digest('hex') }
export function secretPassword() { return randomBytes(48).toString('base64url') }
export function cleanName(value, field, optional = false) {
  if (typeof value !== 'string') throw new Fault(400, `${field} must be text.`)
  const text = value.normalize('NFC').trim().replace(/\s+/gu, ' ')
  if ((!optional && !text) || text.length > 80 || /[\p{Cc}\p{Cf}]/u.test(text)) throw new Fault(400, `${field} is required and must be at most 80 characters without control characters.`)
  return text
}
export function validateStudent(row) {
  const allowed = ['first_name', 'last_name', 'display_name']
  for (const key of Object.keys(row)) if (!allowed.includes(key)) throw new Fault(400, `Unsupported column: ${key}. Only names are accepted.`)
  const first_name = cleanName(row.first_name, 'First name'), last_name = cleanName(row.last_name, 'Last name')
  return { first_name, last_name, display_name: cleanName(row.display_name ?? '', 'Display name', true) || `${first_name} ${last_name}` }
}
export function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) throw new Fault(400, 'Use a password between 12 and 128 characters.')
}
export function personalEmail(value) {
  const email = String(value || '').trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /(?:\.sch\.|\.edu(?:\.|$)|\.ac\.|\.invalid$)/i.test(email)) throw new Fault(400, 'Use a personal email address, or choose Builders ID. School email is not required.')
  return email
}
export function csvCell(value) { const text = String(value ?? ''); return '"' + (/^[\s]*[=+\-@\t\r\n]/.test(text) ? "'" + text : text).replaceAll('"', '""') + '"' }
export function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]) }
export async function uniqueId(reserve, generate = generateId) {
  for (let attempt = 0; attempt < 32; attempt++) { const id = generate(); if (await reserve(id)) return id }
  throw new Fault(503, 'Could not reserve an identifier. Try again.')
}
