import { afterEach, describe, expect, it } from 'vitest'
import { AlgorithmMode, type StudyStatusDto } from '@dsa-tutor/types'
import { complexityJunctionEnabled, conditionFeatures, initialMode, isClassicTopic, tourTopicFor } from './studyCondition'
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
  isDemo: false,
  participantCode: 'P01',
  consentAt: '2026-10-01T09:00:00.000Z',
  susSubmitted: false,
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
  })
})

describe('initialMode outside Classic', () => {
  it('always opens a topic in Demo', () => {
    // Demo is step one of the pipeline and the only mode where the Theory
    // briefing is the opening tab. This used to depend on whether the
    // learner had worked the topic before, and always started a study
    // participant in Practice regardless (remediation doc 9.8) - both
    // rules are gone. Every topic opens in Demo, every time, for everyone.
    expect(initialMode(null, false)).toBe(AlgorithmMode.DEMO)
  })

  it('lets an explicit mode in the URL win', () => {
    expect(initialMode('PRACTICE', false)).toBe(AlgorithmMode.PRACTICE)
    expect(initialMode('HANDS_ON', false)).toBe(AlgorithmMode.HANDS_ON)
  })

  it.each(['DEMO', 'PRACTICE', 'HANDS_ON'])('names %s in the URL', (mode) => {
    // Every mode must be reachable by link. The old rule was "DEMO, else
    // PRACTICE", so ?mode=PRACTICE worked by falling through rather than
    // by being recognised, and silently stopped working the moment DEMO
    // became the fallback.
    expect(initialMode(mode, false)).toBe(mode)
  })

  it('ignores a mode it does not recognise rather than failing open', () => {
    expect(initialMode('nonsense', false)).toBe(AlgorithmMode.DEMO)
    expect(initialMode('demo', false)).toBe(AlgorithmMode.DEMO)
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
  it('runs on a tutor topic, never on the participant Classic topic', () => {
    expect(tourTopicFor('bubble-sort')).toBe('binary-search')
    expect(tourTopicFor('binary-search')).toBe('bubble-sort')
    expect(tourTopicFor(null)).toBe('bubble-sort')
  })
})
