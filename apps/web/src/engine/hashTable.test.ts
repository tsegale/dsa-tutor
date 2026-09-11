import { describe, it, expect } from 'vitest'
import {
  hashInsertChainingEngine,
  hashSearchChainingEngine,
  hashDeleteChainingEngine,
  hashInsertLinearProbingEngine,
  hashSearchLinearProbingEngine,
  hashDeleteLinearProbingEngine,
  type HashTableState,
} from './hashTable'

function lastState(snapshots: { dataStructureState: unknown }[]): HashTableState {
  return snapshots[snapshots.length - 1].dataStructureState as HashTableState
}

function allKeys(state: HashTableState): (number | string)[] {
  return state.buckets.flatMap((b) => b.chain.map((e) => e.key)).sort((a, b) => Number(a) - Number(b))
}

describe('hashInsertChainingEngine', () => {
  it('inserts a set of keys with no collisions (capacity 7)', () => {
    const snapshots = hashInsertChainingEngine([1, 2, 3], 7)
    expect(allKeys(lastState(snapshots))).toEqual([1, 2, 3])
  })

  it('inserts keys that collide into the same bucket', () => {
    const snapshots = hashInsertChainingEngine([1, 8], 7) // 1 % 7 === 8 % 7
    const state = lastState(snapshots)
    const bucket = state.buckets.find((b) => b.index === 1)!
    expect(bucket.chain.length).toBe(2)
  })

  it('flags one HASH_BUCKET junction per key', () => {
    const snapshots = hashInsertChainingEngine([1, 2, 3], 7)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'HASH_BUCKET')
    expect(junctions.length).toBe(3)
  })

  it('flags COLLISION_RESOLVE only when a bucket is already occupied', () => {
    const snapshots = hashInsertChainingEngine([1, 8, 15], 7) // all hash to bucket 1
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'COLLISION_RESOLVE')
    expect(junctions.length).toBe(2)
  })

  it('uses the default capacity of 7 when none is given', () => {
    const snapshots = hashInsertChainingEngine([3])
    expect(lastState(snapshots).capacity).toBe(7)
  })

  it('handles inserting a single key', () => {
    const snapshots = hashInsertChainingEngine([5], 7)
    expect(allKeys(lastState(snapshots))).toEqual([5])
  })

  it('handles inserting no keys', () => {
    const snapshots = hashInsertChainingEngine([], 7)
    expect(lastState(snapshots).size).toBe(0)
  })

  it('has sequential stepIndex values', () => {
    const snapshots = hashInsertChainingEngine([1, 2, 3], 7)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = hashInsertChainingEngine([1, 2, 3], 7)
    snapshots.forEach((s, i) => expect(s.isFinalStep).toBe(i === snapshots.length - 1))
  })
})

describe('hashSearchChainingEngine', () => {
  it('finds a key that exists', () => {
    const snapshots = hashSearchChainingEngine([1, 8, 15], 8, 7)
    const state = lastState(snapshots)
    expect(state.activeBucket).toBe(1)
  })

  it('reports not found for a key that does not exist', () => {
    const snapshots = hashSearchChainingEngine([1, 2, 3], 99, 7)
    const last = snapshots[snapshots.length - 1]
    expect(last.description).toMatch(/not found/i)
  })

  it('searches an empty table without throwing', () => {
    const snapshots = hashSearchChainingEngine([], 5, 7)
    const last = snapshots[snapshots.length - 1]
    expect(last.description).toMatch(/not found/i)
  })

  it('finds the only key in a single-key table', () => {
    const snapshots = hashSearchChainingEngine([5], 5, 7)
    expect(snapshots[snapshots.length - 1].description).toMatch(/found/i)
  })

  it('flags exactly one HASH_BUCKET junction', () => {
    const snapshots = hashSearchChainingEngine([1, 2, 3], 2, 7)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'HASH_BUCKET')
    expect(junctions.length).toBe(1)
  })
})

describe('hashInsertLinearProbingEngine', () => {
  it('inserts a set of keys with no collisions', () => {
    const snapshots = hashInsertLinearProbingEngine([1, 2, 3], 7)
    const state = lastState(snapshots)
    expect(state.size).toBe(3)
  })

  it('probes to the next slot on collision', () => {
    const snapshots = hashInsertLinearProbingEngine([1, 8], 7) // both hash to 1
    const state = lastState(snapshots)
    const occupiedIndices = state.buckets.filter((b) => b.chain.length > 0).map((b) => b.index)
    expect(occupiedIndices.sort()).toEqual([1, 2])
  })

  it('flags one PROBE_NEXT junction per occupied slot encountered', () => {
    const snapshots = hashInsertLinearProbingEngine([1, 8, 15], 7) // 1, then probe once, then probe twice
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'PROBE_NEXT')
    expect(junctions.length).toBe(3) // 8 probes past 1 (1 probe), 15 probes past 1 and 2 (2 probes)
  })

  it('wraps the probe sequence around the end of the table', () => {
    const snapshots = hashInsertLinearProbingEngine([5, 6, 12], 7) // 5, 6, 12%7=5 -> probes to 6 (taken) -> 0
    const state = lastState(snapshots)
    const bucket12 = state.buckets.find((b) => b.chain.some((e) => e.key === 12))!
    expect(bucket12.index).toBe(0)
  })

  it('stops inserting once the table is full', () => {
    const snapshots = hashInsertLinearProbingEngine([1, 2, 3, 4], 3)
    const state = lastState(snapshots)
    expect(state.size).toBe(3)
  })

  it('flags a LOAD_FACTOR junction once the load factor exceeds 0.7', () => {
    const snapshots = hashInsertLinearProbingEngine([1, 2, 3, 4, 5, 6], 7)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'LOAD_FACTOR')
    expect(junctions.length).toBe(1)
  })

  it('handles inserting a single key', () => {
    const snapshots = hashInsertLinearProbingEngine([5], 7)
    expect(lastState(snapshots).size).toBe(1)
  })

  it('never mutates the input keys array', () => {
    const input = [1, 2, 3]
    hashInsertLinearProbingEngine(input, 7)
    expect(input).toEqual([1, 2, 3])
  })

  it('has sequential stepIndex values', () => {
    const snapshots = hashInsertLinearProbingEngine([1, 8], 7)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})

describe('hashSearchLinearProbingEngine', () => {
  it('finds a key placed directly at its home slot', () => {
    const snapshots = hashSearchLinearProbingEngine([3], 3, 7)
    expect(snapshots[snapshots.length - 1].description).toMatch(/found/i)
  })

  it('finds a key that was probed to a different slot', () => {
    const snapshots = hashSearchLinearProbingEngine([1, 8], 8, 7)
    expect(snapshots[snapshots.length - 1].description).toMatch(/found/i)
  })

  it('reports not found when the target was never inserted', () => {
    const snapshots = hashSearchLinearProbingEngine([1, 2, 3], 99, 7)
    expect(snapshots[snapshots.length - 1].description).toMatch(/not found/i)
  })

  it('reports not found on an empty table', () => {
    const snapshots = hashSearchLinearProbingEngine([], 5, 7)
    expect(snapshots[snapshots.length - 1].description).toMatch(/not found/i)
  })

  it('flags exactly one HASH_BUCKET junction', () => {
    const snapshots = hashSearchLinearProbingEngine([1, 2, 3], 2, 7)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'HASH_BUCKET')
    expect(junctions.length).toBe(1)
  })
})

describe('hashDeleteChainingEngine', () => {
  it('removes a key that exists in the chain', () => {
    const snapshots = hashDeleteChainingEngine([3, 10, 17], 10, 7)
    const last = lastState(snapshots)
    expect(last.buckets.flatMap((b) => b.chain.map((e) => e.key))).not.toContain(10)
    expect(snapshots[snapshots.length - 1].description).toMatch(/removed/i)
  })

  it('leaves the rest of the chain intact', () => {
    const snapshots = hashDeleteChainingEngine([3, 10, 17], 10, 7)
    const last = lastState(snapshots)
    expect(last.buckets.flatMap((b) => b.chain.map((e) => e.key))).toEqual(expect.arrayContaining([3, 17]))
  })

  it('reports nothing to delete when the key was never inserted', () => {
    const snapshots = hashDeleteChainingEngine([1, 2, 3], 99, 7)
    expect(snapshots[snapshots.length - 1].description).toMatch(/nothing to delete/i)
  })

  it('flags exactly one HASH_BUCKET junction', () => {
    const snapshots = hashDeleteChainingEngine([1, 2, 3], 2, 7)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'HASH_BUCKET')
    expect(junctions.length).toBe(1)
  })
})

describe('hashDeleteLinearProbingEngine', () => {
  it('removes a key placed directly at its home slot', () => {
    const snapshots = hashDeleteLinearProbingEngine([3], 3, 7)
    const last = lastState(snapshots)
    expect(last.buckets.find((b) => b.index === 3)?.chain).toHaveLength(0)
    expect(snapshots[snapshots.length - 1].description).toMatch(/removed/i)
  })

  it('tombstones the deleted slot instead of leaving it plain-empty', () => {
    const snapshots = hashDeleteLinearProbingEngine([3], 3, 7)
    const last = lastState(snapshots)
    expect(last.deletedIndices).toContain(3)
  })

  it('removes a key that was probed to a different slot', () => {
    const snapshots = hashDeleteLinearProbingEngine([1, 8], 8, 7)
    const last = lastState(snapshots)
    expect(last.buckets.flatMap((b) => b.chain.map((e) => e.key))).not.toContain(8)
  })

  it('reports nothing to delete when the key was never inserted', () => {
    const snapshots = hashDeleteLinearProbingEngine([1, 2, 3], 99, 7)
    expect(snapshots[snapshots.length - 1].description).toMatch(/nothing to delete/i)
  })

  it('flags exactly one HASH_BUCKET junction', () => {
    const snapshots = hashDeleteLinearProbingEngine([1, 2, 3], 2, 7)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'HASH_BUCKET')
    expect(junctions.length).toBe(1)
  })
})
