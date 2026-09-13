// Public Weekly Digest data — backed by Supabase (`ba_digest_issues`), not
// hardcoded content. This is separate from the member portal's own digest
// data in `store.js` on purpose; editing one never touches the other.
//
// Run the `ba_digest_issues` block in supabase/setup.sql before using this
// (it's additive/safe to re-run). Only the owner/admin can create, edit,
// publish, or delete issues — enforced by Postgres RLS, not just the UI.
import { supabase } from './supabase'

function shape(row) {
  return {
    id: row.id,
    issueNumber: row.issue_number,
    date: row.date,
    headline: row.headline,
    teaser: row.teaser,
    aiNews: row.ai_news || [],
    buildSomething: row.build_something || {},
    resourceOfWeek: row.resource_of_week || {},
    communityUpdate: row.community_update || '',
    sourceUrl: row.source_url,
    rawImport: row.raw_import,
    body: row.body || '',
    published: row.published,
  }
}

function toRow(fields) {
  const row = {}
  if ('issueNumber' in fields) row.issue_number = fields.issueNumber
  if ('date' in fields) row.date = fields.date
  if ('headline' in fields) row.headline = fields.headline
  if ('teaser' in fields) row.teaser = fields.teaser
  if ('aiNews' in fields) row.ai_news = fields.aiNews
  if ('buildSomething' in fields) row.build_something = fields.buildSomething
  if ('resourceOfWeek' in fields) row.resource_of_week = fields.resourceOfWeek
  if ('communityUpdate' in fields) row.community_update = fields.communityUpdate
  if ('sourceUrl' in fields) row.source_url = fields.sourceUrl
  if ('rawImport' in fields) row.raw_import = fields.rawImport
  if ('body' in fields) row.body = fields.body
  if ('published' in fields) row.published = fields.published
  return row
}

// Public reads — anyone, logged in or not, sees only published issues
// (RLS enforces this even if this filter were removed here).
export async function getPublishedDigestIssues() {
  const { data, error } = await supabase
    .from('ba_digest_issues')
    .select('*')
    .eq('published', true)
    .order('date', { ascending: false })
  if (error) throw error
  return data.map(shape)
}

export async function getPublishedDigestIssue(id) {
  const { data, error } = await supabase
    .from('ba_digest_issues')
    .select('*')
    .eq('id', id)
    .eq('published', true)
    .maybeSingle()
  if (error) throw error
  return data ? shape(data) : null
}

// Admin-only below — RLS rejects these for anyone else regardless of what
// the UI does, but callers should still gate the UI on `user.isAdmin`.
export async function getAllDigestIssuesForAdmin() {
  const { data, error } = await supabase.from('ba_digest_issues').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data.map(shape)
}

export async function createDigestIssue(fields) {
  const { data, error } = await supabase.from('ba_digest_issues').insert(toRow(fields)).select('*').single()
  if (error) throw error
  return shape(data)
}

export async function updateDigestIssue(id, fields) {
  const { data, error } = await supabase.from('ba_digest_issues').update(toRow(fields)).eq('id', id).select('*').single()
  if (error) throw error
  return shape(data)
}

export async function deleteDigestIssue(id) {
  const { error } = await supabase.from('ba_digest_issues').delete().eq('id', id)
  if (error) throw error
}
