import { describe, it, expect } from 'vitest'
import type { StudyStatusDto } from '@dsa-tutor/types'
import { studyPhase } from './studyPhase'

const participant: StudyStatusDto = {
  isParticipant: true,
  withdrawn: false,
  consentRequired: false,
  pretestRequired: false,
  posttestAvailable: false,
  posttestCompleted: false,
  topicsCompleted: [],
  posttestOverride: false,
  classicTopicSlug: 'binary-search',
  isDemo: false,
  participantCode: 'P01',
  consentAt: '2026-10-01T09:00:00.000Z',
  susSubmitted: false,
}

describe('studyPhase', () => {
  it('is absent for non-participants, withdrawn participants and an unloaded status', () => {
    expect(studyPhase({ ...participant, isParticipant: false })).toBeNull()
    expect(studyPhase({ ...participant, withdrawn: true })).toBeNull()
    expect(studyPhase(undefined)).toBeNull()
  })

  it('follows the protocol in order', () => {
    expect(studyPhase({ ...participant, consentRequired: true, pretestRequired: true })?.label).toBe('consent due')
    expect(studyPhase({ ...participant, pretestRequired: true })?.label).toBe('pre-test due')
    expect(studyPhase(participant)?.label).toBe('topic 1 of 3')
    expect(studyPhase({ ...participant, topicsCompleted: ['bubble-sort'] })?.label).toBe('topic 2 of 3')
    expect(studyPhase({ ...participant, topicsCompleted: ['bubble-sort', 'binary-search'] })?.label).toBe('topic 3 of 3')
    expect(studyPhase({ ...participant, topicsCompleted: ['bubble-sort', 'binary-search', 'bst'], posttestAvailable: true })?.label).toBe('post-test due')
    expect(studyPhase({ ...participant, posttestAvailable: true, posttestCompleted: true })?.label).toBe('questionnaire due')
    expect(studyPhase({ ...participant, posttestAvailable: true, posttestCompleted: true, susSubmitted: true })?.label).toBe('complete')
  })

  it('treats a researcher-opened post-test as post-test due', () => {
    expect(studyPhase({ ...participant, topicsCompleted: ['bubble-sort'], posttestAvailable: true, posttestOverride: true })?.label).toBe('post-test due')
  })
})
