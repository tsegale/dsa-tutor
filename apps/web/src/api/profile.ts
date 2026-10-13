import type { LearnerAnalyticsDto } from '@dsa-tutor/types'
import { apiFetch } from './client'

/** Every figure on the profile page, in one request (Phase 6C). */
export function fetchLearnerAnalytics() {
  return apiFetch<LearnerAnalyticsDto>('/api/v1/profile/analytics')
}
