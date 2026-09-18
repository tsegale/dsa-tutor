import { useEffect, useState } from 'react'

const TOO_SMALL_QUERY = '(max-width: 767px)'
const COMPACT_QUERY = '(max-width: 1023px)'

export interface LayoutBreakpoint {
  /** Below 768px: neither the desktop 3-column layout nor the compact
   * tabbed layout has room for the canvas, controls, and AI tutor panel. */
  isTooSmall: boolean
  /** Below 1024px (includes isTooSmall): not enough width for the docked
   * side panels, so the algorithm page switches to a single-pane tabbed
   * layout instead of silently clipping them. */
  isCompact: boolean
}

export function useLayoutBreakpoint(): LayoutBreakpoint {
  const [isTooSmall, setIsTooSmall] = useState(() => window.matchMedia(TOO_SMALL_QUERY).matches)
  const [isCompact, setIsCompact] = useState(() => window.matchMedia(COMPACT_QUERY).matches)

  useEffect(() => {
    const tooSmallQuery = window.matchMedia(TOO_SMALL_QUERY)
    const compactQuery = window.matchMedia(COMPACT_QUERY)
    const handleTooSmallChange = () => setIsTooSmall(tooSmallQuery.matches)
    const handleCompactChange = () => setIsCompact(compactQuery.matches)
    tooSmallQuery.addEventListener('change', handleTooSmallChange)
    compactQuery.addEventListener('change', handleCompactChange)
    return () => {
      tooSmallQuery.removeEventListener('change', handleTooSmallChange)
      compactQuery.removeEventListener('change', handleCompactChange)
    }
  }, [])

  return { isTooSmall, isCompact }
}
