import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// On a client-rendered SPA, the browser's native "scroll to #hash on load"
// behaviour races against React actually rendering the target element and
// usually loses — so a link like "/#how-it-works" clicked from a different
// page lands at the top of the page instead of scrolling down. This waits
// for the section to exist, then scrolls to it manually.
export function useScrollToHash() {
  const { hash } = useLocation()

  useEffect(() => {
    if (!hash) return
    const id = hash.slice(1)
    // By the time this effect runs, React has already committed the DOM,
    // so the target element exists — no need to wait a frame for it.
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])
}
