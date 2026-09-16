import { describe, it, expect } from 'vitest'
import { maxHeapInsertEngine, maxHeapDeleteEngine, minHeapInsertEngine, minHeapDeleteEngine, buildHeapArray, type HeapState } from './heap'

function lastState(snapshots: ReturnType<typeof maxHeapInsertEngine>): HeapState {
  return snapshots[snapshots.length - 1].dataStructureState as HeapState
}

function isMaxHeap(array: number[]): boolean {
  for (let i = 0; i < array.length; i++) {
    const l = 2 * i + 1
    const r = 2 * i + 2
    if (l < array.length && array[l] > array[i]) return false
    if (r < array.length && array[r] > array[i]) return false
  }
  return true
}

function isMinHeap(array: number[]): boolean {
  for (let i = 0; i < array.length; i++) {
    const l = 2 * i + 1
    const r = 2 * i + 2
    if (l < array.length && array[l] < array[i]) return false
    if (r < array.length && array[r] < array[i]) return false
  }
  return true
}

describe('maxHeapInsertEngine', () => {
  it('builds a valid max-heap from an unordered sequence', () => {
    const input = [5, 3, 8, 1, 9, 2, 7, 4, 6]
    const snapshots = maxHeapInsertEngine(input)
    const state = lastState(snapshots)
    expect(isMaxHeap(state.array)).toBe(true)
    expect(state.array.slice().sort((a, b) => a - b)).toEqual([...input].sort((a, b) => a - b))
  })

  it('maintains the max-heap property after every completed insertion', () => {
    const input = [5, 3, 8, 1, 9, 2, 7]
    const snapshots = maxHeapInsertEngine(input)
    const completions = snapshots.filter((s) => !s.isPredictionRequired && s.description.includes('inserted. The'))
    expect(completions.length).toBe(input.length)
    completions.forEach((s) => expect(isMaxHeap((s.dataStructureState as HeapState).array)).toBe(true))
  })

  it('handles an empty input', () => {
    const snapshots = maxHeapInsertEngine([])
    expect(lastState(snapshots).array).toEqual([])
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = maxHeapInsertEngine([5, 3, 8, 1, 9])
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})

describe('minHeapInsertEngine', () => {
  it('builds a valid min-heap from an unordered sequence', () => {
    const input = [5, 3, 8, 1, 9, 2, 7, 4, 6]
    const snapshots = minHeapInsertEngine(input)
    const state = lastState(snapshots)
    expect(isMinHeap(state.array)).toBe(true)
    expect(state.array.slice().sort((a, b) => a - b)).toEqual([...input].sort((a, b) => a - b))
  })
})

describe('maxHeapDeleteEngine', () => {
  it('removes the maximum value (the root) and re-heapifies', () => {
    const array = buildHeapArray('max', [5, 3, 8, 1, 9, 2, 7])
    const max = Math.max(...array)
    const snapshots = maxHeapDeleteEngine(array)
    const state = lastState(snapshots)
    expect(state.array.length).toBe(array.length - 1)
    expect(state.array).not.toContain(max)
    expect(isMaxHeap(state.array)).toBe(true)
  })

  it('handles deleting down to a single element and then an empty heap', () => {
    let array = buildHeapArray('max', [5, 3])
    array = lastState(maxHeapDeleteEngine(array)).array
    expect(array.length).toBe(1)
    array = lastState(maxHeapDeleteEngine(array)).array
    expect(array.length).toBe(0)
    const snapshots = maxHeapDeleteEngine(array)
    expect(lastState(snapshots).array).toEqual([])
  })

  it('maintains the max-heap property across deleting every element one at a time', () => {
    let array = buildHeapArray('max', [15, 3, 17, 10, 84, 19, 6, 22, 9])
    while (array.length > 0) {
      const snapshots = maxHeapDeleteEngine(array)
      array = lastState(snapshots).array
      expect(isMaxHeap(array)).toBe(true)
    }
  })

  it('has sequential stepIndex values with no gaps', () => {
    const array = buildHeapArray('max', [5, 3, 8, 1, 9])
    const snapshots = maxHeapDeleteEngine(array)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})

describe('minHeapDeleteEngine', () => {
  it('removes the minimum value (the root) and re-heapifies', () => {
    const array = buildHeapArray('min', [5, 3, 8, 1, 9, 2, 7])
    const min = Math.min(...array)
    const snapshots = minHeapDeleteEngine(array)
    const state = lastState(snapshots)
    expect(state.array.length).toBe(array.length - 1)
    expect(state.array).not.toContain(min)
    expect(isMinHeap(state.array)).toBe(true)
  })

  it('maintains the min-heap property across deleting every element one at a time', () => {
    let array = buildHeapArray('min', [15, 3, 17, 10, 84, 19, 6, 22, 9])
    while (array.length > 0) {
      const snapshots = minHeapDeleteEngine(array)
      array = lastState(snapshots).array
      expect(isMinHeap(array)).toBe(true)
    }
  })
})
