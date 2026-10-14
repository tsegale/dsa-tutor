import { describe, expect, it } from 'vitest'
import { CriticalJunctionType, type AlgorithmSnapshot } from '@dsa-tutor/types'
import { jumpSearchEngine } from '@/engine/jumpSearch'
import { interpolationSearchEngine } from '@/engine/interpolationSearch'
import { exponentialSearchEngine } from '@/engine/exponentialSearch'
import { getPromptForSnapshot } from './junctionPrompt'
import { getTilesForSnapshot } from './tileBuilder'
import { correctTileIdFor } from './correctTile'

describe('search completion questions', () => {
  // These three ended with "What proves the array is fully sorted?" and the
  // sorting tiles until Phase 7A: a search question, asked as a sort. The
  // registry picks a random target, so each engine runs here with a target
  // that is present and one that is absent.
  const array = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
  const runs: Array<[string, string, (target: number) => AlgorithmSnapshot[]]> = [
    ['jump-search', 'Jump Search', (target) => jumpSearchEngine(array, target)],
    ['interpolation-search', 'Interpolation Search', (target) => interpolationSearchEngine(array, target)],
    ['exponential-search', 'Exponential Search', (target) => exponentialSearchEngine(array, target)],
  ]
  it.each(runs)('%s asks how the search ended, not whether it sorted', (_slug, displayName, run) => {
    for (const target of [13, 8]) {
      const completion = run(target).find((s) => s.criticalJunctionType === CriticalJunctionType.ALGORITHM_COMPLETE)
      expect(completion, `target ${target}`).toBeDefined()
      expect(getPromptForSnapshot(completion!, displayName)).not.toMatch(/sorted/)
      const tiles = getTilesForSnapshot(completion!, displayName)
      expect(tiles.map((t) => t.label).join(' ')).not.toMatch(/adjacent pair|swaps/)
      expect(tiles.some((t) => t.id === correctTileIdFor(completion!))).toBe(true)
    }
  })
})
