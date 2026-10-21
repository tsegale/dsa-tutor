import { describe, expect, it } from 'vitest'
import { greedyEngine } from './greedy'
import { theoryFor } from '@/config/theory'

/**
 * The topic rests on one claim: sorting by finish time beats sorting by
 * start time ON THIS INPUT. If the default activities change and that
 * stops being true, the lesson quietly becomes "two rules, same answer",
 * and the theory briefing beside the canvas starts describing a run that
 * is not happening.
 *
 * The briefing's sketch was written against the curated set and then the
 * registry's defaultInput overrode it with activities generated from
 * numbers, so the canvas showed C 0-2, A 1-5, E 3-5 while the sketch
 * showed A 1-4, B 3-5, D 5-7. Two places describing one run, disagreeing.
 */
describe('the greedy default activities', () => {
  const run = greedyEngine([])
  const final = run[run.length - 1].description

  it('makes the finish-time rule strictly better than the start-time rule', () => {
    const [byFinish, byStart] = [...final.matchAll(/(\d+)(?: activities fit| ?:)/g)].map((m) => Number(m[1]))
    expect(final).toMatch(/3 activities fit/)
    expect(final).toMatch(/would have taken 2/)
    expect(byFinish ?? 3).toBeGreaterThan(byStart ?? 2)
  })

  it('names in the briefing the same activities the run takes', () => {
    const sketch = theoryFor('greedy')!.schematic
    for (const name of ['A 1-4', 'D 5-7', 'G 8-11']) {
      expect(sketch, `the sketch should name ${name}`).toContain(name)
    }
    expect(final).toMatch(/A, D, G/)
    // And the rule that loses, with its actual result.
    expect(sketch).toContain('C 0-6')
    expect(final).toMatch(/C, F/)
  })
})
