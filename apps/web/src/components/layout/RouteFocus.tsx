import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

// A client-side route change keeps focus where it was (on a link that is now
// gone, so on <body>): a keyboard user starts again from the top of the page
// and a screen reader hears nothing about the new page. After each
// navigation this moves focus to the new page's heading, so its title is
// announced and the next Tab continues from the content. The first load is
// left alone. Pages render lazily, so it waits a few frames for the heading;
// pages without the shell's <main id="main"> (the workspace) are skipped.

const MAX_FRAMES = 30

export function RouteFocus() {
  const { pathname } = useLocation()
  const previous = useRef<string | null>(null)

  useEffect(() => {
    if (previous.current === null || previous.current === pathname) {
      previous.current = pathname
      return
    }
    previous.current = pathname

    let frame = 0
    let handle = 0
    const attempt = () => {
      const main = document.getElementById('main')
      const target = main?.querySelector<HTMLElement>('h1') ?? null
      if (target) {
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
        target.focus({ preventScroll: true })
        window.scrollTo({ top: 0 })
        return
      }
      if (++frame < MAX_FRAMES) handle = requestAnimationFrame(attempt)
    }
    handle = requestAnimationFrame(attempt)
    return () => cancelAnimationFrame(handle)
  }, [pathname])

  return null
}
