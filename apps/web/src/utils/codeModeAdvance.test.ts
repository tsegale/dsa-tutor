import { describe, expect, it } from 'vitest'
import { CODE_CHALLENGES } from '@/config/codeChallenges'
import { codeModeAdvance, reseedsRun } from '@/utils/codeModeAdvance'

const SLUGS = Object.keys(CODE_CHALLENGES)

const correct = (over: Partial<Parameters<typeof codeModeAdvance>[0]> = {}) => ({
  isLogicallyCorrect: true,
  hasSyntaxError: false,
  executeVisually: true,
  resultingState: [3, 7],
  ...over,
})

describe('every code challenge', () => {
  it('covers the topics that offer Code Mode', () => {
    expect(SLUGS.length).toBeGreaterThan(20)
  })

  it('moves the run on when it is answered correctly', () => {
    // The defect this exists for: a correct answer printed "Your code is
    // correct!" and left the button reading "Run my code", so the learner
    // ran the same code over and over with nothing moving. It was true of
    // every topic but the one whose challenge re-seeds the run.
    for (const slug of SLUGS) {
      const advance = codeModeAdvance(correct(), CODE_CHALLENGES[slug])
      expect(advance, slug).not.toBe('stay')
    }
  })

  it('offers Continue wherever the challenge does not re-seed the run', () => {
    const continues = SLUGS.filter((slug) => codeModeAdvance(correct(), CODE_CHALLENGES[slug]) === 'continue')
    const reseeds = SLUGS.filter((slug) => codeModeAdvance(correct(), CODE_CHALLENGES[slug]) === 'reseed')
    expect(continues.length + reseeds.length).toBe(SLUGS.length)
    // Nearly all of them: only a challenge reading back the data structure
    // itself can restart the run from what the student's code produced.
    expect(continues.length).toBeGreaterThan(reseeds.length)
  })

  it('offers exactly one route out, never both and never neither', () => {
    for (const slug of SLUGS) {
      const result = correct()
      const challenge = CODE_CHALLENGES[slug]
      const reseed = reseedsRun(result, challenge)
      const advance = codeModeAdvance(result, challenge)
      expect(advance === 'reseed', slug).toBe(reseed)
      expect(advance === 'continue', slug).toBe(!reseed)
    }
  })
})

describe('a step that is not solved', () => {
  it('stays put on a wrong answer', () => {
    for (const slug of SLUGS) {
      expect(codeModeAdvance(correct({ isLogicallyCorrect: false }), CODE_CHALLENGES[slug]), slug).toBe('stay')
    }
  })

  it('stays put on code that would not run, even if it was graded correct', () => {
    expect(codeModeAdvance(correct({ hasSyntaxError: true }), CODE_CHALLENGES[Object.keys(CODE_CHALLENGES)[0]])).toBe('stay')
  })
})

describe('reseedsRun', () => {
  const seeding = { seedsNextRun: true }

  it('needs a real array to seed the next run from', () => {
    expect(reseedsRun({ executeVisually: true, resultingState: [1, 2] }, seeding)).toBe(true)
    // A scalar read-back (an address, a count, True/False) has nothing to
    // put on the canvas - this used to sort a one-element array.
    expect(reseedsRun({ executeVisually: true, resultingState: 7 }, seeding)).toBe(false)
    expect(reseedsRun({ executeVisually: true, resultingState: null }, seeding)).toBe(false)
  })

  it('never re-seeds a challenge that did not ask to', () => {
    expect(reseedsRun({ executeVisually: true, resultingState: [1, 2] }, { seedsNextRun: false })).toBe(false)
  })

  it('never re-seeds from a result that was not executed visually', () => {
    expect(reseedsRun({ executeVisually: false, resultingState: [1, 2] }, seeding)).toBe(false)
  })
})
