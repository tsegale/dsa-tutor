import type { ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'
import { selectReducedMotionForced, usePreferencesStore } from '@/store/usePreferencesStore'

/**
 * "Always reduce motion" from the profile (Phase 6D) for every Framer Motion
 * animation inside; otherwise Framer follows the system setting. Mounted in
 * the app shell and the workspace rather than the app root, so the sign-in
 * page's first load stays free of Framer Motion.
 */
export function MotionPreference({ children }: { children: ReactNode }) {
  const forced = usePreferencesStore(selectReducedMotionForced)
  return <MotionConfig reducedMotion={forced ? 'always' : 'user'}>{children}</MotionConfig>
}
