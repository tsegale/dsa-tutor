import type { StudyConsentDetails } from '@dsa-tutor/types'
import consent from '@dsa-tutor/types/studyConsent.json'

/** The consent page's details (packages/types/studyConsent.json, shared with the api). */
export const STUDY_CONSENT: StudyConsentDetails = consent

/** True once every consent detail is confirmed: no placeholder left on the page. */
export function consentDetailsComplete(details: StudyConsentDetails = STUDY_CONSENT): boolean {
  return Object.values(details).every((value) => typeof value === 'string' && value.trim().length > 0)
}
