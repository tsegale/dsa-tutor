import { describe, it, expect } from 'vitest'
import { ALGORITHM_REGISTRY } from './registry'

// Research-validity guard: a snapshot that requires a prediction must never
// narrate the outcome of that prediction in its own description - a student
// reading the right panel would see the answer beside the question, which
// invalidates every prediction, mastery score and misconception record
// collected from that step. This regex is deliberately broad; if a future
// engine trips it, that is very likely a genuine leak, not a false
// positive - narrow the regex only after confirming the specific match is
// safe (e.g. it appears in the question itself, not as a stated outcome).
const OUTCOME_LEAK_PATTERN =
  /\bsince\b|\bso a swap\b|is needed|will be made|must be updated|\bis smaller\b|\bis larger\b|\bis greater\b|\btherefore\b|\bbecause\b/i

describe('answer leak guard', () => {
  for (const entry of ALGORITHM_REGISTRY) {
    it(`${entry.algorithmName}: no prediction-required snapshot reveals its own answer`, () => {
      const snapshots = entry.engineFunction(entry.defaultInput)
      const leaks = snapshots.filter(
        (snapshot) => snapshot.isPredictionRequired && OUTCOME_LEAK_PATTERN.test(snapshot.description),
      )
      expect(leaks.map((s) => s.description)).toEqual([])
    })
  }
})
