import { describe, it, expect } from 'vitest'
import { computeAgreement, agreementToMarkdownTable } from './research.service'

describe('computeAgreement', () => {
  it('computes 100% agreement when every label matches the rule label', () => {
    const rows = computeAgreement([
      { raterCode: 'R1', label: 'SWAP_CONFUSION', ruleLabel: 'SWAP_CONFUSION' },
      { raterCode: 'R1', label: 'OFF_BY_ONE', ruleLabel: 'OFF_BY_ONE' },
    ])
    expect(rows).toEqual([{ raterCode: 'R1', ratingCount: 2, agreementCount: 2, agreementPercent: 100 }])
  })

  it('computes 0% agreement when no label matches', () => {
    const rows = computeAgreement([{ raterCode: 'R1', label: 'A', ruleLabel: 'B' }])
    expect(rows).toEqual([{ raterCode: 'R1', ratingCount: 1, agreementCount: 0, agreementPercent: 0 }])
  })

  it('treats a null rule label as disagreement rather than a match', () => {
    const rows = computeAgreement([{ raterCode: 'R1', label: 'A', ruleLabel: null }])
    expect(rows[0]).toEqual({ raterCode: 'R1', ratingCount: 1, agreementCount: 0, agreementPercent: 0 })
  })

  it('rounds a partial agreement percentage to one decimal place', () => {
    const rows = computeAgreement([
      { raterCode: 'R1', label: 'A', ruleLabel: 'A' },
      { raterCode: 'R1', label: 'B', ruleLabel: 'C' },
      { raterCode: 'R1', label: 'D', ruleLabel: 'D' },
    ])
    expect(rows[0].agreementPercent).toBeCloseTo(66.7, 1)
  })

  it('keeps separate raters independent and sorts by rater code', () => {
    const rows = computeAgreement([
      { raterCode: 'R2', label: 'A', ruleLabel: 'B' },
      { raterCode: 'R1', label: 'A', ruleLabel: 'A' },
    ])
    expect(rows.map((r) => r.raterCode)).toEqual(['R1', 'R2'])
    expect(rows[0].agreementPercent).toBe(100)
    expect(rows[1].agreementPercent).toBe(0)
  })

  it('returns an empty array for no ratings', () => {
    expect(computeAgreement([])).toEqual([])
  })
})

describe('agreementToMarkdownTable', () => {
  it('renders a header, divider, and one row per rater', () => {
    const table = agreementToMarkdownTable([
      { raterCode: 'R1', ratingCount: 10, agreementCount: 8, agreementPercent: 80 },
    ])
    expect(table).toBe(
      '| Rater | Ratings | Agreed with rule label | Agreement |\n' +
        '| --- | --- | --- | --- |\n' +
        '| R1 | 10 | 8 | 80% |',
    )
  })
})
