import type { LearnerAnalyticsDto, LearningPreferences } from '@dsa-tutor/types'
import { apiFetch } from './client'

/** Every figure on the profile page, in one request (Phase 6C). */
export function fetchLearnerAnalytics() {
  return apiFetch<LearnerAnalyticsDto>('/api/v1/profile/analytics')
}

/** Save the learner's preferences; refused for an active participant (Phase 6D). */
export function savePreferences(preferences: LearningPreferences) {
  return apiFetch<LearningPreferences>('/api/v1/profile/preferences', { method: 'PUT', body: JSON.stringify(preferences) })
}
