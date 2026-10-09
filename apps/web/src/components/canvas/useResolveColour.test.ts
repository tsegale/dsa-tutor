import { describe, expect, it } from 'vitest'
import { resolveColour } from './useResolveColour'

const styles = (vars: Record<string, string>) => ({
  getPropertyValue: (name: string) => vars[name] ?? '',
})

const light = styles({ '--state-current': ' #0b84d8', '--surface': '#ffffff', '--state-compare': '#d98a00' })

describe('resolveColour', () => {
  it('resolves a token to its literal value', () => {
    expect(resolveColour('var(--state-compare)', light)).toBe('#d98a00')
  })

  it('resolves a tint over transparent to rgba', () => {
    expect(resolveColour('color-mix(in srgb, var(--state-current) 60%, transparent)', light)).toBe('rgba(11, 132, 216, 0.6)')
  })

  it('resolves a tint over another token to a mixed hex', () => {
    expect(resolveColour('color-mix(in srgb, var(--state-compare) 20%, var(--surface))', light)).toBe('#f7e8cc')
  })

  it('passes literals and unknown tokens through unchanged', () => {
    expect(resolveColour('#2d3748', light)).toBe('#2d3748')
    expect(resolveColour('var(--missing)', light)).toBe('var(--missing)')
    expect(resolveColour('color-mix(in srgb, var(--missing) 20%, var(--surface))', light)).toBe(
      'color-mix(in srgb, var(--missing) 20%, var(--surface))',
    )
  })
})
