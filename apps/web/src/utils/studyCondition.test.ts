import { afterEach, describe, expect, it } from 'vitest'
import { AlgorithmMode, type StudyStatusDto } from '@dsa-tutor/types'
import { complexityJunctionEnabled, conditionFeatures, initialMode, isClassicTopic } from './studyCondition'
import { useAlgorithmStore, selectIsLiveJunction, selectIsWorkedStep } from '@/store/useAlgorithmStore'
import { bubbleSortEngine } from '@/engine/bubbleSort'

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
}

afterEach(() => useAlgorithmStore.getState().setClassicMode(false))

describe('which topic is Classic', () => {
  it("is exactly the participant's assigned topic", () => {
    expect(isClassicTopic(participant, 'binary-search')).toBe(true)
    expect(isClassicTopic(participant, 'bubble-sort')).toBe(false)
    expect(isClassicTopic(participant, 'bst')).toBe(false)
  })

  it('never applies to non-participants, withdrawn or unconsented accounts', () => {
    expect(isClassicTopic({ ...participant, isParticipant: false }, 'binary-search')).toBe(false)
    expect(isClassicTopic({ ...participant, withdrawn: true }, 'binary-search')).toBe(false)
    expect(isClassicTopic({ ...participant, consentRequired: true }, 'binary-search')).toBe(false)
    expect(isClassicTopic(undefined, 'binary-search')).toBe(false)
  })
})

describe('Classic serves no tutor affordances', () => {
  const classic = conditionFeatures(true)

  it('removes the prediction zone, hints, AI Tutor tab and every other tutor feature', () => {
    for (const feature of [
      'modeToggle', 'scaffoldingPill', 'aiTutorTab', 'predictionZone', 'hints', 'workedSteps', 'selfExplanation',
      'complexityPrediction', 'measuredCounts', 'aiChallenge', 'feynman', 'codeMode', 'remediation',
    ] as const) {
      expect(classic[feature], feature).toBe(false)
    }
  })

  it('keeps everything a conventional visualiser has', () => {
    for (const feature of [
      'stepControls', 'autoPlay', 'playbackSpeed', 'customInput', 'pseudocodeTab', 'complexityTable', 'progressMeter', 'stepLog',
    ] as const) {
      expect(classic[feature], feature).toBe(true)
    }
  })

  it('leaves the tutor with every feature', () => {
    expect(Object.values(conditionFeatures(false)).every(Boolean)).toBe(true)
  })

  it('?mode=practice on a Classic topic still serves Classic', () => {
    expect(initialMode('practice', true)).toBe(AlgorithmMode.DEMO)
    expect(initialMode('PRACTICE', true)).toBe(AlgorithmMode.DEMO)
    expect(initialMode('HANDS_ON', true)).toBe(AlgorithmMode.DEMO)
    expect(initialMode(null, false)).toBe(AlgorithmMode.PRACTICE)
  })
})

describe('the store in Classic', () => {
  it('locks the mode: shortcuts and toggles cannot reach a tutor mode', () => {
    const store = useAlgorithmStore.getState()
    store.setClassicMode(true)
    store.setMode(AlgorithmMode.PRACTICE)
    store.setMode(AlgorithmMode.HANDS_ON)
    expect(useAlgorithmStore.getState().mode).toBe(AlgorithmMode.DEMO)
  })

  it('has no live junctions, no worked steps, and no count question in new runs', () => {
    const store = useAlgorithmStore.getState()
    store.setClassicMode(true)
    store.setFadingEnabled(true)
    store.setAlgorithm('bubble-sort', bubbleSortEngine([5, 3, 1, 4, 2]))
    const run = useAlgorithmStore.getState().snapshotArray
    for (let i = 0; i < run.length; i++) {
      useAlgorithmStore.setState({ stepIndex: i })
      expect(selectIsLiveJunction(useAlgorithmStore.getState())).toBe(false)
      expect(selectIsWorkedStep(useAlgorithmStore.getState())).toBe(false)
    }
    expect(useAlgorithmStore.getState().fadingEnabled).toBe(false)
    expect(complexityJunctionEnabled()).toBe(false)
  })

  it('unlocks when leaving Classic', () => {
    const store = useAlgorithmStore.getState()
    store.setClassicMode(true)
    store.setClassicMode(false)
    store.setMode(AlgorithmMode.PRACTICE)
    expect(useAlgorithmStore.getState().mode).toBe(AlgorithmMode.PRACTICE)
    expect(complexityJunctionEnabled()).toBe(true)
  })
})

describe('onboarding tour', () => {
  it('runs on a tutor topic, never on the participant Classic topic', async () => {
    const { tourTopicFor } = await import('@/components/onboarding/OnboardingController')
    expect(tourTopicFor('bubble-sort')).toBe('binary-search')
    expect(tourTopicFor('binary-search')).toBe('bubble-sort')
    expect(tourTopicFor(null)).toBe('bubble-sort')
  })
})
