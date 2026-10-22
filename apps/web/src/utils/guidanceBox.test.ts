import { describe, expect, it } from 'vitest'
import { CriticalJunctionType } from '@dsa-tutor/types'
import { GUIDANCE_HEADINGS, guidanceFor, type GuidanceKind } from '@/utils/guidanceBox'
import { getPromptForSnapshot } from '@/utils/junctionPrompt'
import { bubbleSortEngine } from '@/engine/bubbleSort'

const run = bubbleSortEngine([5, 3, 8, 1])
const junction = run.find((s) => s.isPredictionRequired)!
const plain = run.find((s) => !s.isPredictionRequired)!

const input = (over: Partial<Parameters<typeof guidanceFor>[0]> = {}) => ({
  snapshot: plain,
  algorithmName: 'Bubble Sort',
  isLiveJunction: false,
  predictionResolved: true,
  workedNarration: null,
  ...over,
})

describe('guidanceFor', () => {
  it('labels a pending junction question as Socratic guidance', () => {
    const guidance = guidanceFor(input({ snapshot: junction, isLiveJunction: true, predictionResolved: false }))
    expect(guidance.kind).toBe('question')
    expect(guidance.text).toBe(getPromptForSnapshot(junction, 'Bubble Sort'))
    expect(guidance.heading).toBe('Socratic guidance')
  })

  it('does not call the engine narration Socratic guidance', () => {
    // The regression this file exists for: the heading was fixed at
    // "Socratic guidance" over all four bodies, three of which are not it.
    const guidance = guidanceFor(input())
    expect(guidance.kind).toBe('narration')
    expect(guidance.text).toBe(plain.description)
    expect(guidance.heading).not.toBe('Socratic guidance')
  })

  it('shows the narration once the prediction is resolved, not the question', () => {
    const guidance = guidanceFor(input({ snapshot: junction, isLiveJunction: true, predictionResolved: true }))
    expect(guidance.kind).toBe('narration')
    expect(guidance.text).toBe(junction.description)
  })

  it('withholds the description while the question is still open', () => {
    // Several engines' descriptions state the junction's outcome, so
    // showing one early hands over the answer being asked for.
    const guidance = guidanceFor(input({ snapshot: junction, isLiveJunction: true, predictionResolved: false }))
    expect(guidance.text).not.toBe(junction.description)
  })

  it('lets a worked example win over the question, because it asks nothing', () => {
    const guidance = guidanceFor(
      input({
        snapshot: junction,
        isLiveJunction: true,
        predictionResolved: false,
        workedNarration: 'Watch: 5 is larger than 3, so they swap.',
      }),
    )
    expect(guidance.kind).toBe('worked')
    expect(guidance.text).toBe('Watch: 5 is larger than 3, so they swap.')
  })

  it('has an empty state that does not claim to be guidance', () => {
    const guidance = guidanceFor(input({ snapshot: null }))
    expect(guidance.kind).toBe('empty')
    expect(guidance.text).toBe('Load an algorithm to begin.')
  })

  it('gives every kind its own heading, so the label identifies the body', () => {
    const kinds: GuidanceKind[] = ['empty', 'worked', 'question', 'narration']
    const headings = kinds.map((kind) => GUIDANCE_HEADINGS[kind])
    expect(new Set(headings).size).toBe(kinds.length)
    for (const heading of headings) expect(heading.trim()).not.toBe('')
  })

  it('always pairs the heading with the kind it was chosen for', () => {
    const cases: Array<Parameters<typeof guidanceFor>[0]> = [
      input({ snapshot: null }),
      input(),
      input({ snapshot: junction, isLiveJunction: true, predictionResolved: false }),
      input({ workedNarration: 'Watch this.' }),
    ]
    for (const one of cases) {
      const guidance = guidanceFor(one)
      expect(guidance.heading).toBe(GUIDANCE_HEADINGS[guidance.kind])
    }
  })

  it('never returns an empty body for a real snapshot', () => {
    for (const snapshot of run) {
      for (const resolved of [true, false]) {
        const guidance = guidanceFor(
          input({ snapshot, isLiveJunction: snapshot.isPredictionRequired ?? false, predictionResolved: resolved }),
        )
        expect(guidance.text.trim(), `step ${snapshot.stepIndex} resolved=${resolved}`).not.toBe('')
      }
    }
  })
})

describe('the junction types this box has to label', () => {
  it('asks a real question at every junction a bubble sort run produces', () => {
    const asked = run.filter((s) => s.isPredictionRequired)
    expect(asked.length).toBeGreaterThan(0)
    for (const snapshot of asked) {
      const guidance = guidanceFor(input({ snapshot, isLiveJunction: true, predictionResolved: false }))
      expect(guidance.kind).toBe('question')
      expect(guidance.text).toMatch(/\?$/)
      expect(Object.values(CriticalJunctionType)).toContain(snapshot.criticalJunctionType)
    }
  })
})
