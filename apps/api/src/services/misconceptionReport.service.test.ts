import { describe, it, expect } from 'vitest'
import { computeMisconceptionReport, misconceptionReportToMarkdown } from './misconceptionReport.service'

describe('computeMisconceptionReport', () => {
  it('excludes abandoned events from the resolution denominator', () => {
    const rows = computeMisconceptionReport([
      { category: 'COMPARISON_DIRECTION', status: 'RESOLVED', junctionsSinceDetection: 4, probes: [] },
      { category: 'COMPARISON_DIRECTION', status: 'ABANDONED', junctionsSinceDetection: 30, probes: [] },
    ])
    expect(rows[0].detectionCount).toBe(2)
    expect(rows[0].abandonedCount).toBe(1)
    expect(rows[0].resolutionDenominator).toBe(1)
    expect(rows[0].resolutionRate).toBe(1)
  })

  it('computes the median junctions to resolution from resolved events only', () => {
    const rows = computeMisconceptionReport([
      { category: 'STABILITY_CONFUSION', status: 'RESOLVED', junctionsSinceDetection: 2, probes: [] },
      { category: 'STABILITY_CONFUSION', status: 'RESOLVED', junctionsSinceDetection: 4, probes: [] },
      { category: 'STABILITY_CONFUSION', status: 'PERSISTENT', junctionsSinceDetection: 20, probes: [] },
    ])
    expect(rows[0].medianJunctionsToResolution).toBe(3)
  })

  it('returns null median when no event in the category has resolved', () => {
    const rows = computeMisconceptionReport([
      { category: 'PREMATURE_TERMINATION', status: 'PERSISTENT', junctionsSinceDetection: 10, probes: [] },
    ])
    expect(rows[0].medianJunctionsToResolution).toBeNull()
  })

  it('computes the aggregate guess probability across all probes in the category', () => {
    const rows = computeMisconceptionReport([
      {
        category: 'COMPARISON_DIRECTION',
        status: 'RESOLVED',
        junctionsSinceDetection: 2,
        probes: [{ optionCount: 2 }, { optionCount: 4 }],
      },
    ])
    // (1/2 + 1/4) / 2 = 0.375
    expect(rows[0].aggregateGuessProbability).toBeCloseTo(0.375, 5)
  })

  it('reports a zero resolution rate rather than dividing by zero when every event was abandoned', () => {
    const rows = computeMisconceptionReport([
      { category: 'BOUNDARY_CONDITION', status: 'ABANDONED', junctionsSinceDetection: 30, probes: [] },
    ])
    expect(rows[0].resolutionDenominator).toBe(0)
    expect(rows[0].resolutionRate).toBe(0)
    expect(rows[0].persistenceRate).toBe(0)
    expect(rows[0].abandonmentRate).toBe(1)
  })

  it('sorts rows alphabetically by category', () => {
    const rows = computeMisconceptionReport([
      { category: 'STABILITY_CONFUSION', status: 'RESOLVED', junctionsSinceDetection: 2, probes: [] },
      { category: 'COMPARISON_DIRECTION', status: 'RESOLVED', junctionsSinceDetection: 2, probes: [] },
    ])
    expect(rows.map((r) => r.category)).toEqual(['COMPARISON_DIRECTION', 'STABILITY_CONFUSION'])
  })
})

describe('misconceptionReportToMarkdown', () => {
  it('renders a header, divider, and one row per category', () => {
    const rows = computeMisconceptionReport([
      { category: 'COMPARISON_DIRECTION', status: 'RESOLVED', junctionsSinceDetection: 3, probes: [{ optionCount: 2 }] },
    ])
    const table = misconceptionReportToMarkdown(rows)
    expect(table).toContain('| Category |')
    expect(table).toContain('COMPARISON_DIRECTION')
    expect(table.split('\n')).toHaveLength(3)
  })
})
