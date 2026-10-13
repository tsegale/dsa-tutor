import { useEffect, useRef, useState } from 'react'

/** The rendered width of an element, kept current with a ResizeObserver. */
export function useElementWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setWidth(Math.max(0, Math.round(element.getBoundingClientRect().width)))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, width }
}
