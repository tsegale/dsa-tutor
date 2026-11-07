import { describe, expect, it } from 'vitest'
import { buildPhases } from './StepHeatmap'
import { junctionLabel } from '@/utils/junctionLabel'

const cell = (stepIndex: number, junctionType: string | null, errorCount: number) => ({
  stepIndex,
  junctionType,
  errorCount,
  algorithmName: 'Bubble Sort',
})

describe('buildPhases', () => {
  it('groups errors by the question asked, in the order the run first asks it', () => {
    const phases = buildPhases([
      cell(14, 'PASS_COMPLETE', 2),
      cell(3, 'SWAP_DECISION', 4),
      cell(60, 'SWAP_DECISION', 3), // a custom input shifts step numbers; still a swap decision
      cell(51, 'COMPLEXITY_PREDICTION', 1),
    ])
    expect(phases.map((p) => [p.label, p.totalErrors])).toEqual([
      ['Swap decision', 7],
      ['End of a pass', 2],
      ['Predicting the cost', 1],
    ])
    expect(phases[0].sub).toBe('2 steps')
  })

  it('marks only the phase with the most errors as hot', () => {
    const phases = buildPhases([cell(3, 'SWAP_DECISION', 4), cell(14, 'PASS_COMPLETE', 9)])
    expect(phases.filter((p) => p.isHot).map((p) => p.label)).toEqual(['End of a pass'])
  })

  it('marks nothing hot when there are no errors', () => {
    expect(buildPhases([cell(3, 'SWAP_DECISION', 0)]).some((p) => p.isHot)).toBe(false)
    expect(buildPhases([])).toEqual([])
  })

  it('puts answers with no recorded question type last', () => {
    const phases = buildPhases([cell(0, null, 5), cell(9, 'SWAP_DECISION', 1)])
    expect(phases.map((p) => p.label)).toEqual(['Swap decision', 'Other steps'])
  })
})

describe('junctionLabel', () => {
  it('reads as plain words for any question type', () => {
    expect(junctionLabel('SWAP_DECISION')).toBe('Swap decision')
    expect(junctionLabel('GRID_NEXT_CELL')).toBe('Next cell to explore')
    expect(junctionLabel('SOME_NEW_TYPE')).toBe('Some new type')
    expect(junctionLabel(null)).toBe('Other steps')
  })
})
