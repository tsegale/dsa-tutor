import { describe, expect, it } from 'vitest'
import { COMPLEXITY, feynmanChallenge, scoreOutOfTen } from './complexity'
import { MODULES } from './curriculum'

describe('feynmanChallenge', () => {
  it('names the specific claims to defend, from the shared complexity facts', () => {
    expect(feynmanChallenge('quick-sort')).toBe(
      'Explain why Quick Sort degrades to O(n²), how a randomised or median-of-three pivot prevents it, and what space the recursion costs.',
    )
    expect(feynmanChallenge('dijkstra')).toBe('Explain why Dijkstra with a binary heap is O((V + E) log V), and what changes if you use an array instead.')
  })

  it('is null for a topic with no claims written yet', () => {
    expect(feynmanChallenge('maze-prim')).toBeNull()
    expect(feynmanChallenge(undefined)).toBeNull()
  })
})

describe('complexity facts', () => {
  it('cover every topic in the curriculum', () => {
    // Was a hardcoded 66, which is the same count written in a second
    // place: adding a topic to a module made this test fail for the wrong
    // reason and said nothing about which topic was missing. Asserting
    // against the curriculum itself is both stronger and self-maintaining.
    const slugs = MODULES.flatMap((module) => module.topics)
    const missing = slugs.filter((slug) => !COMPLEXITY[slug])
    expect(missing).toEqual([])
  })

  it('give every topic with a challenge its worst-case trigger, auxiliary space and contrast', () => {
    for (const [slug, facts] of Object.entries(COMPLEXITY)) {
      if (!facts.defend) continue
      expect(facts.worstCaseTrigger, slug).toBeTruthy()
      expect(facts.auxiliarySpace, slug).toBeTruthy()
      expect(facts.contrast?.algorithm, slug).toBeTruthy()
    }
  })
})

describe('scoreOutOfTen', () => {
  it('shows the stored 0-100 score as n of 10', () => {
    expect([0, 38, 75, 100].map(scoreOutOfTen)).toEqual([0, 4, 8, 10])
  })
})
