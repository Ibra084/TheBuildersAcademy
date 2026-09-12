import { requireAdmin } from './auth'
const keys = { sessions: 'builders_sessions', resources: 'builders_resources', digests: 'builders_digests', projects: 'builders_projects' }
function read(kind) {
  try { const value = JSON.parse(localStorage.getItem(keys[kind])); return Array.isArray(value) ? value : [] } catch { return [] }
}
function save(kind, items) { localStorage.setItem(keys[kind], JSON.stringify(items)); return items }
export function getSessions() { return read('sessions') }
export function getDigests() { return read('digests').sort((a,b) => b.date.localeCompare(a.date)) }
export function getResources() {
  return Object.groupBy(read('resources'), item => item.category)
}
export function getProjects() {
  const projects = read('projects')
  return projects.filter(p => !(p.id === 'p1' && p.name === 'StudyBuddy AI' && p.builder === 'Amelia Chen') && !(p.id === 'p2' && p.name === 'Campus Navigator' && p.builder === 'Sam Okafor'))
}
export function addProject(project) { return save('projects', [{ ...project, id: crypto.randomUUID() }, ...getProjects()]) }
export function publishContent(kind, content) {
  requireAdmin()
  if (!['sessions', 'resources', 'digests'].includes(kind)) throw new Error('Unknown content type.')
  return save(kind, [{ ...content, id: crypto.randomUUID() }, ...read(kind)])
}
export function removeContent(kind, id) {
  requireAdmin()
  const items = read(kind)
  localStorage.setItem('builders_content_backup', JSON.stringify({ kind, items }))
  return save(kind, items.filter(item => item.id !== id))
}
