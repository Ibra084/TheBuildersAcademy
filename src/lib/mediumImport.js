// Fetches a Medium (or any public) article's readable content client-side.
//
// Medium blocks direct cross-origin fetches from a browser (CORS), so this
// can't hit medium.com directly. Instead it goes through r.jina.ai — a free,
// no-signup "reader" service that fetches the target URL server-side and
// returns clean extracted text with permissive CORS headers, which is
// exactly what a client-side import needs. If that service is ever down or
// blocked, this is the one place to swap in a different fetch strategy
// (e.g. a Supabase Edge Function that fetches the URL server-side instead).
export async function fetchArticleContent(url) {
  const trimmed = url.trim()
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error('Enter a full article URL, starting with https://')
  }

  let response
  try {
    response = await fetch(`https://r.jina.ai/${trimmed}`)
  } catch {
    throw new Error('Could not reach the import service. Check your connection and try again.')
  }
  if (!response.ok) {
    throw new Error('Could not fetch that article. Double-check the URL and try again.')
  }

  const text = await response.text()

  const titleMatch = text.match(/^Title:\s*(.+)$/m)
  const headline = titleMatch ? titleMatch[1].trim() : trimmed

  const markerIndex = text.indexOf('Markdown Content:')
  const body = (markerIndex >= 0 ? text.slice(markerIndex + 'Markdown Content:'.length) : text).trim()

  if (!body) {
    throw new Error('That article came back empty. It may be paywalled or private.')
  }

  const firstParagraph =
    body
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .find((p) => p.length > 40 && !p.startsWith('#') && !p.startsWith('!['))
    || ''
  const teaser = firstParagraph.length > 220 ? `${firstParagraph.slice(0, 217)}...` : firstParagraph

  return { headline, teaser, body, sourceUrl: trimmed }
}
