import { apiFetch } from './client'
import type { AlgorithmTrack } from '@dsa-tutor/types'

/** The fields of the api's SessionDto that Home reads. */
export interface LatestSession {
  id: string
  mode: string
  startTime: string
  completed: boolean
  topic: { name: string; displayName: string; track: AlgorithmTrack }
}

/** The most recently started session that was not completed, or null. */
export function fetchLatestIncompleteSession() {
  return apiFetch<LatestSession | null>('/api/v1/sessions?latest=true&completed=false')
}
