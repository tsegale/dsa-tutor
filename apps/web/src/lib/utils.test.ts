import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('keeps a type-scale size next to a text colour', () => {
    expect(cn('text-micro', 'text-ink-2')).toBe('text-micro text-ink-2')
    expect(cn('text-h3 font-bold', 'text-ink')).toBe('text-h3 font-bold text-ink')
    expect(cn('text-mono-sm', 'text-ink-3')).toBe('text-mono-sm text-ink-3')
  })

  it('still lets a later size replace an earlier one', () => {
    expect(cn('text-small', 'text-h3')).toBe('text-h3')
    expect(cn('text-sm', 'text-mono-sm')).toBe('text-mono-sm')
  })

  it('still lets a later colour replace an earlier one', () => {
    expect(cn('text-ink-2', 'text-ink')).toBe('text-ink')
  })
})
