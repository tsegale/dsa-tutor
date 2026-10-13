import { describe, expect, it } from 'vitest'
import { formatDuration, misconceptionName, sessionModeLabel } from './learnerFormat'

describe('learnerFormat', () => {
  it('formats practice time as hours and minutes', () => {
    expect(formatDuration(15_120)).toBe('4h 12m')
    expect(formatDuration(720)).toBe('12m')
    expect(formatDuration(59)).toBe('0m')
    expect(formatDuration(-5)).toBe('0m')
  })

  it('never names the Classic condition', () => {
    expect(sessionModeLabel('CLASSIC')).toBe('Practice')
    expect(sessionModeLabel('PRACTICE')).toBe('Practice')
    expect(sessionModeLabel('HANDS_ON')).toBe('Hands-on')
  })

  it('names misconceptions in plain language, never as enum names', () => {
    expect(misconceptionName('OFF_BY_ONE')).toBe('Off-by-one indexing')
    expect(misconceptionName('SOMETHING_NEW')).toBe('Something new')
  })
})
