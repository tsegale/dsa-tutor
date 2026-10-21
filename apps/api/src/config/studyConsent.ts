import type { RequiredConsentField, StudyConsentDetails } from '@dsa-tutor/types'
import consent from '@dsa-tutor/types/studyConsent.json'
import required from '@dsa-tutor/types/studyConsentRequired.json'

/** The consent page's details (packages/types/studyConsent.json). */
export const STUDY_CONSENT: StudyConsentDetails = consent

/**
 * True once every required consent detail is filled in: no placeholder
 * left on the page, and nobody enrolled against one.
 *
 * The web and the api each run this check, and which fields it covers is
 * shared data rather than a list in each - an ethics gate is the last
 * thing that should be able to disagree with itself, and the api cannot
 * import a function from the types package (it is unbuilt TypeScript, so
 * a value import crashes the compiled api at startup).
 *
 * A list, not "every field in the object": that rule made any field
 * added later a condition of enrolling by accident, which is exactly
 * what happened when the optional approval date was added.
 */
export function consentDetailsComplete(details: StudyConsentDetails = STUDY_CONSENT): boolean {
  return (required as RequiredConsentField[]).every((field) => {
    const value = details[field]
    return typeof value === 'string' && value.trim().length > 0
  })
}
