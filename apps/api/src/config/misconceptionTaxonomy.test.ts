import { describe, expect, it } from 'vitest'
import { MisconceptionCategory } from '@dsa-tutor/types'
import { MISCONCEPTION_CATEGORIES, RATING_LABELS } from './misconceptionTaxonomy'

describe('rating taxonomy', () => {
  it('mirrors the shared MisconceptionCategory exactly', () => {
    expect([...MISCONCEPTION_CATEGORIES].sort()).toEqual(Object.values(MisconceptionCategory).sort())
  })

  it('adds NONE for "no misconception applies"', () => {
    expect(RATING_LABELS).toContain('NONE')
  })
})
