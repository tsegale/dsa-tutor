import { describe, expect, it } from 'vitest'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import {
  extractLiveCircularStart,
  extractLiveHashKeys,
  extractLiveHeapItems,
  extractLiveLinearQueueItems,
  extractLiveLinkedListItems,
  extractLiveStackItems,
  extractLiveTreeValues,
  extractLiveTrieState,
} from './liveStructureState'
import { stackPushEngine } from '@/engine/stack'
import { queueEnqueueEngine, circularQueueEngine, dequeEngine } from '@/engine/queue'
import { sllInsertBackEngine } from '@/engine/singlyLinkedList'
import { dllInsertBackEngine } from '@/engine/doublyLinkedList'
import { cllInsertEngine, cllDeleteEngine } from '@/engine/circularLinkedList'
import { hashInsertChainingEngine, hashInsertLinearProbingEngine } from '@/engine/hashTable'
import { bstInsertEngine } from '@/engine/bst'
import { avlInsertEngine } from '@/engine/avlTree'
import { rbInsertEngine } from '@/engine/redBlackTree'
import { maxHeapInsertEngine } from '@/engine/heap'
import { trieInsertEngine } from '@/engine/trie'

// Each reader is checked against the state the real engine puts on the
// canvas. The controls continue from what these return, so a reader that
// misses part of the structure makes the next operation silently drop it.

const finalState = (snaps: AlgorithmSnapshot[]) => snaps[snaps.length - 1].dataStructureState
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b)

describe('live canvas state readers', () => {
  it('stack: every item, bottom to top', () => {
    expect(extractLiveStackItems(finalState(stackPushEngine([10, 20], [30], 6)))).toEqual([10, 20, 30])
  })

  it('queue and deque: every item, front to back', () => {
    expect(extractLiveLinearQueueItems(finalState(queueEnqueueEngine([1, 2], [3], 6)))).toEqual([1, 2, 3])
    expect(extractLiveLinearQueueItems(finalState(dequeEngine(5, [{ op: 'pushBack', value: 1 }, { op: 'pushFront', value: 0 }])))).toEqual([0, 1])
  })

  it('circular queue: slots, front and rear after wrapping', () => {
    const snaps = circularQueueEngine(5, [
      { op: 'enqueue', value: 1 }, { op: 'enqueue', value: 2 }, { op: 'enqueue', value: 3 },
      { op: 'dequeue' }, { op: 'dequeue' }, { op: 'enqueue', value: 4 }, { op: 'enqueue', value: 5 }, { op: 'enqueue', value: 6 },
    ])
    const start = extractLiveCircularStart(finalState(snaps))
    expect(start?.frontIndex).toBe(2)
    expect(start?.rearIndex).toBe(0)
    expect(sorted(start!.items.map((it) => it.value))).toEqual([3, 4, 5, 6])
  })

  it('singly linked list: every node, head to tail', () => {
    expect(extractLiveLinkedListItems(finalState(sllInsertBackEngine([4, 8, 15], 16)))).toEqual([4, 8, 15, 16])
  })

  it('doubly linked list: every node, head to tail', () => {
    expect(extractLiveLinkedListItems(finalState(dllInsertBackEngine([4, 8, 15], 16)))).toEqual([4, 8, 15, 16])
  })

  it('circular linked list: every node once, stopping where the tail links back to the head', () => {
    const values = extractLiveLinkedListItems(finalState(cllInsertEngine([3, 7, 11], 20)))
    expect(values).toHaveLength(4)
    expect(sorted(values!)).toEqual([3, 7, 11, 20])
    const afterDelete = extractLiveLinkedListItems(finalState(cllDeleteEngine([3, 7, 11, 20], 7)))
    expect(sorted(afterDelete!)).toEqual([3, 11, 20])
  })

  it('hash tables: every key, in insertion order', () => {
    expect(extractLiveHashKeys(finalState(hashInsertChainingEngine([12, 7, 22, 5])))).toEqual([12, 7, 22, 5])
    expect(sorted(extractLiveHashKeys(finalState(hashInsertLinearProbingEngine([12, 7, 22, 5])))!)).toEqual([5, 7, 12, 22])
  })

  it('trees: every value, in an order that rebuilds the same tree', () => {
    for (const [engine, name] of [[bstInsertEngine, 'bst'], [avlInsertEngine, 'avl'], [rbInsertEngine, 'red-black']] as const) {
      const values = extractLiveTreeValues(finalState(engine([50, 30, 70, 20, 40, 60, 80, 35])))
      expect(sorted(values ?? []), name).toEqual([20, 30, 35, 40, 50, 60, 70, 80])
    }
  })

  it('heap: the array as stored', () => {
    const items = extractLiveHeapItems(finalState(maxHeapInsertEngine([5, 9, 3, 12])))
    expect(sorted(items ?? [])).toEqual([3, 5, 9, 12])
    expect(items![0]).toBe(12)
  })

  it('trie: every stored word', () => {
    const live = extractLiveTrieState(finalState(trieInsertEngine(['car', 'cat', 'do'])))
    expect([...(live?.words ?? [])].sort()).toEqual(['car', 'cat', 'do'])
  })
})
