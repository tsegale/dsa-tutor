import { describe, expect, it } from 'vitest'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, PredictionType } from '@dsa-tutor/types'
import { MAX_SENT_TURNS, askStateFrom, sendableHistory, type Exchange } from './askPayload'

function answered(question: string, answer: string): Exchange {
  return { question, answer }
}

describe('sendableHistory', () => {
  it('is empty before the first question', () => {
    expect(sendableHistory([])).toEqual([])
  })

  it('keeps answered turns oldest first', () => {
    const history = sendableHistory([answered('first', 'a1'), answered('second', 'a2')])
    expect(history).toEqual([
      { question: 'first', answer: 'a1' },
      { question: 'second', answer: 'a2' },
    ])
  })

  it('drops a turn still waiting on its answer', () => {
    // Sending this would put a null answer in the transcript.
    const history = sendableHistory([answered('done', 'a1'), { question: 'in flight', answer: null }])
    expect(history).toEqual([{ question: 'done', answer: 'a1' }])
  })

  it('drops a turn that failed', () => {
    // The error text is the client's own message, not something the tutor
    // said; sending it would teach the model it had given that reply.
    const failed: Exchange = { question: 'broke', answer: null, error: 'That did not get through.' }
    expect(sendableHistory([answered('done', 'a1'), failed])).toEqual([{ question: 'done', answer: 'a1' }])
  })

  it('keeps only the most recent turns', () => {
    const many = Array.from({ length: MAX_SENT_TURNS + 3 }, (_unused, index) =>
      answered(`q${index}`, `a${index}`),
    )
    const history = sendableHistory(many)
    expect(history).toHaveLength(MAX_SENT_TURNS)
    expect(history[0].question).toBe(`q${3}`)
    expect(history[history.length - 1].question).toBe(`q${MAX_SENT_TURNS + 2}`)
  })

  it('counts only sendable turns toward the window', () => {
    const exchanges: Exchange[] = [
      answered('keep-1', 'a'),
      { question: 'dropped', answer: null },
      answered('keep-2', 'a'),
    ]
    expect(sendableHistory(exchanges).map((turn) => turn.question)).toEqual(['keep-1', 'keep-2'])
  })
})

describe('askStateFrom', () => {
  const snapshot: AlgorithmSnapshot = {
    stepIndex: 4,
    description: 'Comparing 5 and 3',
    pseudocodeLine: 2,
    isPredictionRequired: true,
    predictionType: PredictionType.TILE_GRID,
    dataStructureState: [5, 3, 1],
    activeIndices: [0, 1],
    highlightIndices: [],
    comparedIndices: [0, 1],
    swappedIndices: [],
    isFinalStep: false,
    criticalJunctionType: CriticalJunctionType.SWAP_DECISION,
    junctionDifficulty: null,
  }

  it('carries the array, the highlighted positions and the on-screen description', () => {
    expect(askStateFrom(snapshot)).toEqual({
      dataStructureState: [5, 3, 1],
      activeIndices: [0, 1],
      description: 'Comparing 5 and 3',
      criticalJunctionType: CriticalJunctionType.SWAP_DECISION,
    })
  })

  it('is undefined with no snapshot, so the service is told it cannot see the canvas', () => {
    // A half-filled object here would let the model answer confidently
    // about a step that is not on screen.
    expect(askStateFrom(null)).toBeUndefined()
    expect(askStateFrom(undefined)).toBeUndefined()
  })

  it('sends no junction type on a plain step', () => {
    const plain = { ...snapshot, isPredictionRequired: false, criticalJunctionType: null }
    expect(askStateFrom(plain)?.criticalJunctionType).toBeNull()
  })

  it('does not leak the prediction flag or the pseudocode line', () => {
    // Demo mode never assesses. Telling the service a prediction is due
    // would invite it to quiz the student, which is the whole thing this
    // assistant exists to avoid.
    const state = askStateFrom(snapshot)!
    expect(state).not.toHaveProperty('isPredictionRequired')
    expect(state).not.toHaveProperty('predictionType')
  })
})
