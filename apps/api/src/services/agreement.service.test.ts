import { describe, expect, it } from 'vitest'
import {
  cohensKappa,
  computeAgreementReport,
  confusionMatrix,
  precisionRecall,
  stratifiedSample,
  type RatedItem,
} from './agreement.service'

function repeat(pair: [string, string], times: number): Array<[string, string]> {
  return Array.from({ length: times }, () => pair)
}

describe("Cohen's kappa", () => {
  it('matches the textbook example: po 0.7, pe 0.5, kappa 0.4', () => {
    const pairs = [
      ...repeat(['YES', 'YES'], 20),
      ...repeat(['YES', 'NO'], 5),
      ...repeat(['NO', 'YES'], 10),
      ...repeat(['NO', 'NO'], 15),
    ]
    const result = cohensKappa(pairs)
    expect(result.n).toBe(50)
    expect(result.observedAgreement).toBeCloseTo(0.7)
    expect(result.expectedAgreement).toBeCloseTo(0.5)
    expect(result.kappa).toBeCloseTo(0.4)
  })

  it('is 1 for perfect agreement across more than one label', () => {
    expect(cohensKappa([['A', 'A'], ['B', 'B'], ['C', 'C'], ['A', 'A']]).kappa).toBe(1)
  })

  it('drops when a deliberate disagreement is introduced', () => {
    const agreed: Array<[string, string]> = [['A', 'A'], ['B', 'B'], ['C', 'C'], ['A', 'A'], ['B', 'B']]
    const withDisagreement: Array<[string, string]> = [...agreed.slice(0, 4), ['B', 'C']]
    expect(cohensKappa(withDisagreement).kappa!).toBeLessThan(cohensKappa(agreed).kappa!)
  })

  it('is undefined, not 1, when every label is the same single category', () => {
    expect(cohensKappa([['A', 'A'], ['A', 'A']]).kappa).toBeNull()
  })
})

describe('confusion matrix and precision/recall', () => {
  it('counts each pair of labels', () => {
    const m = confusionMatrix([['A', 'A'], ['A', 'B'], ['B', 'B'], ['B', 'B']])
    expect(m.labels).toEqual(['A', 'B'])
    expect(m.counts).toEqual([[1, 1], [0, 2]])
  })

  it('computes per-category precision and recall of the predictions against the reference, leaving NONE out', () => {
    // [reference, predicted]
    const rows = precisionRecall([['A', 'A'], ['A', 'B'], ['B', 'B'], ['NONE', 'A']])
    expect(rows.map((r) => r.category)).toEqual(['A', 'B'])
    const a = rows.find((r) => r.category === 'A')!
    expect(a.precision).toBeCloseTo(0.5) // predicted A twice, right once
    expect(a.recall).toBeCloseTo(0.5) // actual A twice, found once
    const b = rows.find((r) => r.category === 'B')!
    expect(b.precision).toBeCloseTo(0.5)
    expect(b.recall).toBe(1)
  })
})

describe('agreement report', () => {
  const items: RatedItem[] = [
    { interactionId: 'i1', ruleLabel: 'A', aiLabel: 'A', ratings: { R1: 'A', R2: 'A' } },
    { interactionId: 'i2', ruleLabel: 'B', aiLabel: null, ratings: { R1: 'B', R2: 'B' } },
    { interactionId: 'i3', ruleLabel: 'A', aiLabel: 'B', ratings: { R1: 'A', R2: 'B' } },
  ]

  it('compares the humans with each other, each with aiLabel, and each with ruleLabel', () => {
    const report = computeAgreementReport(items)
    expect(report.raters).toEqual(['R1', 'R2'])
    expect(report.comparisons.map((c) => c.name)).toEqual([
      'R1 vs R2',
      'R1 vs aiLabel',
      'R1 vs ruleLabel',
      'R2 vs aiLabel',
      'R2 vs ruleLabel',
    ])
    expect(report.comparisons[0].kappa.n).toBe(3)
  })

  it('treats a missing aiLabel as NONE, and scores aiLabel against each human and their consensus', () => {
    const report = computeAgreementReport(items)
    const r1VsAi = report.comparisons.find((c) => c.name === 'R1 vs aiLabel')!
    expect(r1VsAi.confusion.labels).toContain('NONE')
    expect(report.aiPrecisionRecall.map((p) => p.reference)).toEqual(['R1', 'R2', 'human consensus'])
    expect(report.aiPrecisionRecall[2].n).toBe(2) // i3 has no consensus
  })
})

describe('stratified sample for raters', () => {
  const rows = [
    ...Array.from({ length: 30 }, (_, i) => ({ id: `s${i}`, junctionType: 'SWAP_DECISION' })),
    ...Array.from({ length: 10 }, (_, i) => ({ id: `m${i}`, junctionType: 'MIDPOINT_DECISION' })),
    ...Array.from({ length: 2 }, (_, i) => ({ id: `b${i}`, junctionType: 'BST_DIRECTION' })),
  ]

  it('returns exactly N rows, every stratum represented, roughly in proportion', () => {
    const sample = stratifiedSample(rows, 20, 'junctionType', 3)
    expect(sample).toHaveLength(20)
    const count = (t: string) => sample.filter((r) => r.junctionType === t).length
    expect(count('BST_DIRECTION')).toBeGreaterThanOrEqual(1)
    expect(count('SWAP_DECISION')).toBeGreaterThan(count('MIDPOINT_DECISION'))
    expect(new Set(sample.map((r) => r.id)).size).toBe(20)
  })

  it('is deterministic for a seed, and different across seeds', () => {
    const ids = (seed: number) => stratifiedSample(rows, 20, 'junctionType', seed).map((r) => r.id)
    expect(ids(5)).toEqual(ids(5))
    expect(ids(5)).not.toEqual(ids(6))
  })

  it('stays exact when a stratum is smaller than its share', () => {
    expect(stratifiedSample(rows, 41, 'junctionType', 1)).toHaveLength(41)
  })
})
