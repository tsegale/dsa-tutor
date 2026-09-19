import { describe, it, expect } from 'vitest'
import { toCsv, parseCsv } from './csv'

describe('toCsv', () => {
  it('quotes a field containing a comma', () => {
    expect(toCsv(['a', 'b'], [['1, 2', 'x']])).toBe('a,b\r\n"1, 2",x')
  })

  it('escapes an internal quote by doubling it', () => {
    expect(toCsv(['a'], [['he said "hi"']])).toBe('a\r\n"he said ""hi"""')
  })

  it('quotes a field containing a newline', () => {
    expect(toCsv(['a'], [['line1\nline2']])).toBe('a\r\n"line1\nline2"')
  })

  it('leaves a plain field unquoted', () => {
    expect(toCsv(['a'], [['plain']])).toBe('a\r\nplain')
  })
})

describe('parseCsv', () => {
  it('round-trips a simple table', () => {
    const csv = toCsv(['interactionId', 'raterCode', 'label'], [['i1', 'r1', 'SWAP_CONFUSION']])
    expect(parseCsv(csv)).toEqual([{ interactionId: 'i1', raterCode: 'r1', label: 'SWAP_CONFUSION' }])
  })

  it('round-trips a field containing a comma and a quote', () => {
    const csv = toCsv(['id', 'note'], [['i1', 'has, a comma and a "quote"']])
    expect(parseCsv(csv)).toEqual([{ id: 'i1', note: 'has, a comma and a "quote"' }])
  })

  it('returns an empty array for a header-only CSV', () => {
    expect(parseCsv('a,b,c')).toEqual([])
  })

  it('returns an empty array for empty input', () => {
    expect(parseCsv('')).toEqual([])
  })

  it('parses multiple rows', () => {
    const csv = 'interactionId,raterCode,label\r\ni1,r1,A\r\ni2,r1,B'
    expect(parseCsv(csv)).toEqual([
      { interactionId: 'i1', raterCode: 'r1', label: 'A' },
      { interactionId: 'i2', raterCode: 'r1', label: 'B' },
    ])
  })
})
