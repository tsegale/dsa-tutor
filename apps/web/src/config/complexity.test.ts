import { describe, expect, it } from 'vitest'
import { COMPLEXITY, feynmanChallenge, scoreOutOfTen } from './complexity'

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
  it('cover every topic the Complexity tab showed before they moved', () => {
    expect(Object.keys(COMPLEXITY)).toHaveLength(66)
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
