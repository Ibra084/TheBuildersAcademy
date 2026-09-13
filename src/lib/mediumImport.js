// Medium sometimes shows a sign-in/subscribe overlay on top of the article
// (non-deterministically — timing-based, not present on every load), and
// Jina's extraction can grab whatever text is on the page at that moment,
// interleaving these lines straight into the middle of real paragraphs.
// Scoping to the <article> element (below) usually avoids this, but isn't
// reliable, so this strips the known exact strings as a backstop.
const MEDIUM_CHROME_PATTERNS = [
  /^#{1,3}\s*Get .+?['’]s stories in your inbox\s*$/gim,
  /^Join Medium for free to get updates from this.*$/gim,
  /^Remember me for faster sign in\s*$/gim,
  /^Press enter or click to view image in full size\s*$/gim,
]

function stripMediumChrome(body) {
  let cleaned = body
  for (const pattern of MEDIUM_CHROME_PATTERNS) {
    cleaned = cleaned.replace(pattern, '')
  }
  return cleaned.replace(/\n{3,}/g, '\n\n').trim()
}

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
    response = await fetch(`https://r.jina.ai/${trimmed}`, {
      headers: {
        // Medium is a JS-heavy app that renders progressively — r.jina.ai
        // uses a headless browser under the hood, and without these it can
        // grab an incomplete snapshot or serve a stale cached copy.
        'X-No-Cache': 'true',
        'X-Timeout': '25',
        // Critical: without this, Jina's extraction includes whatever else
        // is on the page at render time — Medium shows a sign-in/subscribe
        // modal over the article, and its text ("Remember me for faster
        // sign in", "Join Medium for free...") was getting interleaved
        // straight into the middle of the extracted paragraphs. Scoping to
        // the actual <article> element excludes that overlay entirely.
        'X-Target-Selector': 'article',
      },
    })
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
  let body = (markerIndex >= 0 ? text.slice(markerIndex + 'Markdown Content:'.length) : text).trim()
  body = stripMediumChrome(body)

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
