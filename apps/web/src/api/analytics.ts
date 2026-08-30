import { apiFetch } from './client'
import type { EducatorAnalyticsDto } from '@dsa-tutor/types'

export async function getAnalytics(): Promise<EducatorAnalyticsDto> {
  return apiFetch<EducatorAnalyticsDto>('/api/v1/analytics')
}
