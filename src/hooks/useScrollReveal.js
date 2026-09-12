import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'

/**
 * Fades + lifts the children of the returned ref up into place as the
 * section enters the viewport. Pass a selector to stagger specific
 * children (e.g. cards) instead of animating the container as one block.
 */
export function useScrollReveal({ selector = null, stagger = 0.12, y = 40 } = {}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const targets = selector ? el.querySelectorAll(selector) : el
    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out',
          stagger: selector ? stagger : 0,
          scrollTrigger: {
            trigger: el,
            start: 'top 80%',
            once: true,
          },
        },
      )
    }, el)

    return () => ctx.revert()
  }, [selector, stagger, y])

  return ref
}


