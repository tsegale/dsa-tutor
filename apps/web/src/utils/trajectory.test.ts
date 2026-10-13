import { describe, expect, it } from 'vitest'
import { levelRuns } from './trajectory'

describe('levelRuns', () => {
  it('groups consecutive points at one support level', () => {
    const levels = ['HIGH', 'HIGH', 'MEDIUM', 'MEDIUM', 'MEDIUM', 'HIGH', 'LOW'].map((level) => ({ level }))
    expect(levelRuns(levels)).toEqual([
      { level: 'HIGH', start: 0, end: 2 },
      { level: 'MEDIUM', start: 2, end: 5 },
      { level: 'HIGH', start: 5, end: 6 },
      { level: 'LOW', start: 6, end: 7 },
    ])
    expect(levelRuns([])).toEqual([])
  })
})
