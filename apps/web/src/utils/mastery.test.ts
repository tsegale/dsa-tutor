import { describe, expect, it } from 'vitest'
import { bubbleSortEngine } from '@/engine/bubbleSort'
import { binarySearchEngine } from '@/engine/binarySearch'
import { inputHashOf } from './mastery'

describe('inputHashOf', () => {
  it('is the same for the same input and differs for a different one', () => {
    const a = inputHashOf(bubbleSortEngine([5, 3, 1, 4, 2]))
    expect(a).toMatch(/^[0-9a-f]{8}$/)
    expect(inputHashOf(bubbleSortEngine([5, 3, 1, 4, 2]))).toBe(a)
    expect(inputHashOf(bubbleSortEngine([5, 3, 1, 2, 4]))).not.toBe(a)
  })

  it('tells a search target apart, since the target is part of the input', () => {
    const array = [1, 3, 5, 7, 9]
    expect(inputHashOf(binarySearchEngine(array, 7))).not.toBe(inputHashOf(binarySearchEngine(array, 3)))
  })

  it('is null for an empty run', () => {
    expect(inputHashOf([])).toBeNull()
  })
})
