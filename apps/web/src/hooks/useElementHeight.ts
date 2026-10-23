import { useEffect, useState, type RefObject } from 'react'

/**
 * The measured height of an element, kept current as it changes.
 *
 * The canvases each had a header above the drawing and a number somewhere
 * else saying how much room that header took - a padding class, a
 * constant, a magic 34. Two places that had to agree, and they drifted
 * every time a line was added to a header: a wrapped second line of
 * explanation put the circular queue's ring under its own caption, and a
 * banner added to the stack pushed its floor out of the box.
 *
 * Measuring removes the second place. The fallback is only what the first
 * paint uses, before the observer has run, and in a test environment with
 * no ResizeObserver.
 */
export function useElementHeight(ref: RefObject<HTMLElement | null>, fallback = 0): number {
  const [height, setHeight] = useState(fallback)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setHeight(el.getBoundingClientRect().height)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  return height
}
