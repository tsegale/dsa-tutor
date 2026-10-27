import { describe, expect, it } from 'vitest'
import { indexHint, indexRange, randomArrayOperation, validateArrayOperation } from './arrayOperationInput'

describe('validateArrayOperation', () => {
  it('accepts an in-range access', () => {
    expect(validateArrayOperation('access', '10,20,30', '1', '')).toEqual({ ok: true, values: [10, 20, 30], index: 1, value: null })
  })

  it('lets access go out of bounds, since the engine teaches that case', () => {
    expect(validateArrayOperation('access', '10,20,30', '7', '')).toMatchObject({ ok: true, index: 7 })
    expect(validateArrayOperation('access', '10,20,30', '-1', '')).toMatchObject({ ok: true, index: -1 })
  })

  it('accepts insert anywhere from 0 to n, n being an append', () => {
    expect(validateArrayOperation('insert', '10,20,30', '0', '5')).toMatchObject({ ok: true, index: 0, value: 5 })
    expect(validateArrayOperation('insert', '10,20,30', '3', '5')).toMatchObject({ ok: true, index: 3, value: 5 })
  })

  it('refuses an insert index the engine would silently clamp', () => {
    const result = validateArrayOperation('insert', '10,20,30', '4', '5')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('0 to 3')
    expect(validateArrayOperation('insert', '10,20,30', '-1', '5').ok).toBe(false)
  })

  it('requires a numeric value for insert', () => {
    expect(validateArrayOperation('insert', '10,20,30', '1', '').ok).toBe(false)
    expect(validateArrayOperation('insert', '10,20,30', '1', 'abc').ok).toBe(false)
  })

  it('accepts delete from 0 to n-1 and refuses n', () => {
    expect(validateArrayOperation('delete', '10,20,30', '2', '')).toMatchObject({ ok: true, index: 2 })
    expect(validateArrayOperation('delete', '10,20,30', '3', '').ok).toBe(false)
  })

  it('refuses a fractional or missing index', () => {
    expect(validateArrayOperation('access', '10,20,30', '1.5', '').ok).toBe(false)
    expect(validateArrayOperation('delete', '10,20,30', '  ', '').ok).toBe(false)
  })

  it('refuses an array that does not parse', () => {
    expect(validateArrayOperation('access', '', '0', '').ok).toBe(false)
    expect(validateArrayOperation('access', '1,x,3', '0', '').ok).toBe(false)
  })
})

describe('indexRange and indexHint', () => {
  it('describes the same range validateArrayOperation enforces', () => {
    expect(indexRange('insert', 5)).toEqual([0, 5])
    expect(indexRange('delete', 5)).toEqual([0, 4])
    expect(indexHint('insert', 5)).toContain('0 to 5')
    expect(indexHint('delete', 5)).toContain('0 to 4')
    expect(indexHint('access', 5)).toContain('0 to 4')
  })

  it('has no range for deleting from an empty array', () => {
    expect(indexRange('delete', 0)).toBeNull()
  })
})

describe('randomArrayOperation', () => {
  it('always produces arguments the validator accepts', () => {
    let seed = 1
    const rand = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }
    for (const operation of ['access', 'insert', 'delete'] as const) {
      for (let i = 0; i < 200; i++) {
        const { values, index, value } = randomArrayOperation(operation, rand)
        const result = validateArrayOperation(operation, values.join(','), String(index), value === null ? '' : String(value))
        expect(result.ok).toBe(true)
        if (operation === 'access') expect(index).toBeLessThan(values.length)
      }
    }
  })
})
