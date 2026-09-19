import { describe, expect, it } from 'vitest'
import { CriticalJunctionType, MisconceptionCategory } from '@dsa-tutor/types'
import { shouldForceJunction, topMisconceptionOf } from './junctionTargeting'

describe('topMisconceptionOf', () => {
  it('returns null for an empty history', () => {
    expect(topMisconceptionOf([])).toBeNull()
  })

  it('returns the single category when there is only one', () => {
    expect(topMisconceptionOf(['OFF_BY_ONE'])).toBe('OFF_BY_ONE')
  })

  it('returns the most frequent category across a mixed history', () => {
    const recent = ['OFF_BY_ONE', 'STRUCTURAL_PROPERTY_VIOLATION', 'STRUCTURAL_PROPERTY_VIOLATION', 'OFF_BY_ONE', 'STRUCTURAL_PROPERTY_VIOLATION']
    expect(topMisconceptionOf(recent)).toBe('STRUCTURAL_PROPERTY_VIOLATION')
  })
})

describe('shouldForceJunction', () => {
  it('returns false when there is no top misconception yet', () => {
    expect(shouldForceJunction(null, CriticalJunctionType.SWAP_DECISION)).toBe(false)
  })

  it('forces the mapped junction type for the learner\'s top misconception', () => {
    expect(
      shouldForceJunction(MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION, CriticalJunctionType.SWAP_DECISION),
    ).toBe(true)
  })

  it('does not force an unrelated junction type', () => {
    expect(
      shouldForceJunction(MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION, CriticalJunctionType.BASE_CASE),
    ).toBe(false)
  })

  it('returns false for a category with no configured mapping', () => {
    expect(shouldForceJunction(MisconceptionCategory.STABILITY_CONFUSION, CriticalJunctionType.SWAP_DECISION)).toBe(false)
  })

  it('handles an unrecognised string safely instead of throwing', () => {
    expect(shouldForceJunction('NOT_A_REAL_CATEGORY', CriticalJunctionType.SWAP_DECISION)).toBe(false)
  })
})
