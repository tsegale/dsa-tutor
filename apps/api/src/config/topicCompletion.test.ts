import { describe, expect, it } from 'vitest'
import { isTopicComplete } from './topicCompletion'
import { consentDetailsComplete, STUDY_CONSENT } from './studyConsent'

describe('topic-completion rule', () => {
  it('tutor: needs the final step AND at least one conceptual junction answered', () => {
    expect(isTopicComplete({ reachedFinalStep: true, conceptualJunctionsAnswered: 1 }, 'TUTOR')).toBe(true)
    expect(isTopicComplete({ reachedFinalStep: true, conceptualJunctionsAnswered: 0 }, 'TUTOR')).toBe(false)
    expect(isTopicComplete({ reachedFinalStep: false, conceptualJunctionsAnswered: 3 }, 'TUTOR')).toBe(false)
  })

  it('classic: the final step alone (it has no junctions) - the documented asymmetry', () => {
    expect(isTopicComplete({ reachedFinalStep: true, conceptualJunctionsAnswered: 0 }, 'CLASSIC')).toBe(true)
    expect(isTopicComplete({ reachedFinalStep: false, conceptualJunctionsAnswered: 0 }, 'CLASSIC')).toBe(false)
  })
})

describe('consent details', () => {
  it('are complete only when no detail is left as a placeholder', () => {
    const full = {
      ...STUDY_CONSENT,
      researcherName: 'A',
      researcherEmail: 'a@unam.na',
      dataRetention: 'x',
      ethicsApproval: 'y',
      ethicsApprovalReference: 'REF-1',
    }
    expect(consentDetailsComplete(full)).toBe(true)
    expect(consentDetailsComplete({ ...full, ethicsApproval: null })).toBe(false)
    // Approval text saying "pending" is not enough to open real enrolment.
    expect(consentDetailsComplete({ ...full, ethicsApprovalReference: null })).toBe(false)
    expect(consentDetailsComplete({ ...full, researcherEmail: '  ' })).toBe(false)
  })

  it('never point participants at the old non-functional address', () => {
    expect(JSON.stringify(STUDY_CONSENT)).not.toContain('dsatutor.com')
  })
})
