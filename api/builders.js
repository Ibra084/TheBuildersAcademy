import { createServices, createController } from '../server/builders.js'
import { Fault } from '../server/identity.js'
export const config = { maxDuration: 60 }
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  try {
    if (req.method !== 'POST') throw new Fault(405, 'Use POST.')
    if (!String(req.headers['content-type']).startsWith('application/json')) throw new Fault(415, 'Use JSON.')
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    if (!body || Buffer.byteLength(JSON.stringify(body)) > 3000000) throw new Fault(413, 'Request is too large.')
    const s = createServices()
    const origin = req.headers.origin
    if (origin && origin !== new URL(s.site).origin) throw new Fault(403, 'Request origin is not allowed.')
    const ip = process.env.VERCEL ? req.headers['x-vercel-forwarded-for'] || req.headers['x-real-ip'] || 'unknown' : req.socket?.remoteAddress || 'local'
    const result = await createController(s)(body, String(req.headers.authorization || '').replace(/^Bearer /, ''), ip)
    res.status(200).json(result)
  } catch (error) {
    res.status(error.status || 500).json({ error: error.status ? error.message : 'The request could not be completed. Please try again.' })
  }
}
