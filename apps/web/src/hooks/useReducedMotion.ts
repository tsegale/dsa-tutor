import { useEffect, useState } from 'react'
import { selectReducedMotionForced, usePreferencesStore } from '@/store/usePreferencesStore'

const QUERY = '(prefers-reduced-motion: reduce)'

/** Reduced motion: the system setting, or always when the profile says so (Phase 6D). */
export function useReducedMotion(): boolean {
  const forced = usePreferencesStore(selectReducedMotionForced)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia(QUERY).matches,
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia(QUERY)
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return forced || prefersReducedMotion
}
