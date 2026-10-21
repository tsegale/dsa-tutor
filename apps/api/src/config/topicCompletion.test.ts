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
      ethicsApprovalGrantedBy: 'Department of Computer Science',
      ethicsApprovalDate: '2026-10-14',
    }
    expect(consentDetailsComplete(full)).toBe(true)
    expect(consentDetailsComplete({ ...full, ethicsApproval: null })).toBe(false)
    // Approval text saying "pending" is not enough to open real enrolment:
    // it has to be attributed to whoever granted it, since UNAM issues no
    // reference number this could key on instead.
    expect(consentDetailsComplete({ ...full, ethicsApprovalGrantedBy: null })).toBe(false)
    // The date is optional: a supervisor's sign-off may have no recorded
    // date, and requiring one would only invite a made-up one onto a
    // consent form.
    expect(consentDetailsComplete({ ...full, ethicsApprovalDate: null })).toBe(true)
    expect(consentDetailsComplete({ ...full, researcherEmail: '  ' })).toBe(false)
  })

  it('never point participants at the old non-functional address', () => {
    expect(JSON.stringify(STUDY_CONSENT)).not.toContain('dsatutor.com')
  })
})
