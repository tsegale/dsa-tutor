import { describe, expect, it } from 'vitest'
import { CriticalJunctionType } from '@dsa-tutor/types'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import { getPromptForSnapshot } from './junctionPrompt'
import { getTilesForSnapshot } from './tileBuilder'
import { correctTileIdFor } from './correctTile'

describe('search completion questions', () => {
  // These three ended with "What proves the array is fully sorted?" and the
  // sorting tiles until Phase 7A: a search question, asked as a sort.
  it.each(['jump-search', 'interpolation-search', 'exponential-search'])('%s asks how the search ended, not whether it sorted', (slug) => {
    const entry = getAlgorithmRegistryEntry(slug)!
    const completion = entry.engineFunction(entry.defaultInput).find((s) => s.criticalJunctionType === CriticalJunctionType.ALGORITHM_COMPLETE)
    expect(completion).toBeDefined()
    expect(getPromptForSnapshot(completion!, entry.displayName)).not.toMatch(/sorted/)
    const tiles = getTilesForSnapshot(completion!, entry.displayName)
    expect(tiles.map((t) => t.label).join(' ')).not.toMatch(/adjacent pair|swaps/)
    expect(tiles.some((t) => t.id === correctTileIdFor(completion!))).toBe(true)
  })
})
