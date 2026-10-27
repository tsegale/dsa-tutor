import { describe, expect, it } from 'vitest'
import { shouldAskSessionSurvey } from './sessionSurvey'

describe('shouldAskSessionSurvey', () => {
  it('asks an active participant leaving a study topic', () => {
    expect(shouldAskSessionSurvey({ hasSession: true, activeParticipant: true, topicSlug: 'bubble-sort' })).toBe(true)
    expect(shouldAskSessionSurvey({ hasSession: true, activeParticipant: true, topicSlug: 'bst' })).toBe(true)
  })

  it('does not ask a non-participant, whose answers no export reads', () => {
    expect(shouldAskSessionSurvey({ hasSession: true, activeParticipant: false, topicSlug: 'bubble-sort' })).toBe(false)
  })

  it('does not ask on a topic outside the study', () => {
    expect(shouldAskSessionSurvey({ hasSession: true, activeParticipant: true, topicSlug: 'array-access' })).toBe(false)
  })

  it('does not ask without a logged session', () => {
    expect(shouldAskSessionSurvey({ hasSession: false, activeParticipant: true, topicSlug: 'bubble-sort' })).toBe(false)
    expect(shouldAskSessionSurvey({ hasSession: true, activeParticipant: true, topicSlug: undefined })).toBe(false)
  })
})
