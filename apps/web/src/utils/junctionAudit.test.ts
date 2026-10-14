import { describe, expect, it } from 'vitest'
import { CriticalJunctionType, type AlgorithmSnapshot } from '@dsa-tutor/types'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import { sllInsertBackEngine } from '@/engine/singlyLinkedList'
import { dllInsertBackEngine, dllInsertFrontEngine } from '@/engine/doublyLinkedList'
import { getTilesForSnapshot } from './tileBuilder'
import { getPromptForSnapshot } from './junctionPrompt'

// The three failures from the Phase 7A.2 junction audit, held fixed.

const asked = (snapshots: AlgorithmSnapshot[], type: CriticalJunctionType) =>
  snapshots.filter((s) => s.isPredictionRequired && s.criticalJunctionType === type)

describe('linked-list insert questions offer options that answer them', () => {
  it('SLL append asks what the tail points to, and offers nodes, not A-and-B steps', () => {
    const [step] = asked(sllInsertBackEngine([3, 7, 1]), CriticalJunctionType.INSERT_BETWEEN)
    expect(getPromptForSnapshot(step, 'Singly Linked List')).toMatch(/tail's \.next pointer become/)
    const labels = getTilesForSnapshot(step, 'Singly Linked List').map((t) => t.label)
    expect(labels).toContain('The new node (8)')
    expect(labels.join(' ')).not.toMatch(/\bA\.next|\bB\.next/)
  })

  it.each([
    ['append', dllInsertBackEngine([3, 7, 1]), '1.next = 8 and 8.prev = 1'],
    ['front', dllInsertFrontEngine([3, 7, 1]), '8.next = 3 and 3.prev = 8'],
  ])('DLL %s asks which two pointers change and marks exactly those two', (_case, snapshots, right) => {
    const [step] = asked(snapshots, CriticalJunctionType.INSERT_BETWEEN)
    expect(getPromptForSnapshot(step, 'Doubly Linked List')).toMatch(/which TWO pointers change/)
    const tiles = getTilesForSnapshot(step, 'Doubly Linked List')
    expect(tiles.find((t) => t.id === 'correct')?.label).toBe(right)
    expect(new Set(tiles.map((t) => t.label)).size).toBe(tiles.length)
  })
})

describe('hash chaining collision', () => {
  it('offers no second valid chaining strategy as a wrong answer', () => {
    const entry = getAlgorithmRegistryEntry('hash-table-chaining')!
    const [step] = asked(entry.engineFunction(entry.defaultInput), CriticalJunctionType.COLLISION_RESOLVE)
    const labels = getTilesForSnapshot(step, entry.displayName).map((t) => t.label)
    expect(labels).not.toContain('At the front of the chain')
    expect(labels).toContain('At the back of the chain')
  })
})

describe('graph traversal next node', () => {
  it.each(['bfs', 'dfs'])('%s gives every option the same form, so the right one does not stand out', (slug) => {
    const entry = getAlgorithmRegistryEntry(slug)!
    for (const step of asked(entry.engineFunction(entry.defaultInput), CriticalJunctionType.NEXT_NODE_SELECTION)) {
      for (const tile of getTilesForSnapshot(step, entry.displayName)) expect(tile.label).toBe(tile.id)
    }
  })
})
