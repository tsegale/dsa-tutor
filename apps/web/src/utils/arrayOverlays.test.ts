import { describe, expect, it } from 'vitest'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import {
  CELL_BYTES,
  MEMORY_BASE,
  extractMemoryView,
  extractSearchRange,
  extractShiftView,
  hex,
} from './arrayOverlays'

const SORTED = [1, 3, 5, 7, 9, 11, 13]

function run(slug: string, input: number[]) {
  return getAlgorithmRegistryEntry(slug)!.engineFunction(input)
}

describe('extractSearchRange', () => {
  it('is null for state that carries no range', () => {
    expect(extractSearchRange(null, 5)).toBeNull()
    expect(extractSearchRange([1, 2, 3], 3)).toBeNull()
    expect(extractSearchRange({ target: 7 }, 5)).toBeNull()
  })

  it('is null for an empty array, so nothing is drawn over nothing', () => {
    expect(extractSearchRange({ low: 0, high: 0 }, 0)).toBeNull()
  })

  it('reads binary search low and high', () => {
    const range = extractSearchRange({ low: 2, high: 5, mid: 3, target: 7 }, 7)
    expect(range).toEqual({ low: 2, high: 5, probe: 3, target: 7 })
  })

  it("reads jump search's block as the range", () => {
    // Different field names, same meaning: the part still in play.
    const range = extractSearchRange({ blockStart: 2, blockEnd: 3, target: 11 }, 7)
    expect(range).toMatchObject({ low: 2, high: 3 })
  })

  it('is null once the range has crossed, rather than shading a ruled-out span', () => {
    // low > high is the not-found case. Clamping it would draw a band over
    // exactly the cells the search just eliminated.
    expect(extractSearchRange({ low: 4, high: 3 }, 7)).toBeNull()
  })

  it('clamps a bound that runs past the array', () => {
    const range = extractSearchRange({ low: -2, high: 99 }, 7)
    expect(range).toEqual({ low: 0, high: 6, probe: null, target: null })
  })

  it('drops a probe index outside the array', () => {
    expect(extractSearchRange({ low: 0, high: 6, mid: 42 }, 7)?.probe).toBeNull()
  })

  it.each(['binary-search', 'jump-search', 'interpolation-search', 'exponential-search'])(
    'reads a range from most steps of %s',
    (slug) => {
      const snaps = run(slug, SORTED)
      const withRange = snaps.filter((s) => extractSearchRange(s.dataStructureState, SORTED.length) !== null)
      expect(withRange.length).toBeGreaterThan(0)
    },
  )

  it('never widens the range as a search proceeds', () => {
    // The band must only ever shrink; a step that widened it would mean
    // the overlay was reading the wrong fields.
    const snaps = run('binary-search', SORTED)
    let previous: number | null = null
    for (const snapshot of snaps) {
      const range = extractSearchRange(snapshot.dataStructureState, SORTED.length)
      if (!range) continue
      const span = range.high - range.low + 1
      if (previous !== null) expect(span).toBeLessThanOrEqual(previous)
      previous = span
    }
  })
})

describe('extractMemoryView', () => {
  it('is null for anything that is not an access', () => {
    expect(extractMemoryView({ operation: 'insert', targetIndex: 2 }, 5)).toBeNull()
    expect(extractMemoryView(null, 5)).toBeNull()
  })

  it('computes the address as base plus index times cell size', () => {
    const view = extractMemoryView({ operation: 'access', targetIndex: 2 }, 5)
    expect(view).toEqual({ index: 2, base: MEMORY_BASE, cellBytes: CELL_BYTES, address: MEMORY_BASE + 2 * CELL_BYTES })
  })

  it('is null when the index is outside the array', () => {
    expect(extractMemoryView({ operation: 'access', targetIndex: 9 }, 5)).toBeNull()
    expect(extractMemoryView({ operation: 'access', targetIndex: -1 }, 5)).toBeNull()
  })

  it('reads the real array-access engine', () => {
    const input = [10, 20, 30, 40, 50]
    const snaps = run('array-access', input)
    const views = snaps.map((s) => extractMemoryView(s.dataStructureState, input.length)).filter(Boolean)
    expect(views.length).toBeGreaterThan(0)
  })

  it('agrees with the Theory tab schematic for this topic', () => {
    // config/theory.ts sketches base 0x40 with 4-byte cells and
    // arr[2] -> 0x48. The canvas must tell the same story.
    expect(hex(MEMORY_BASE)).toBe('0x40')
    expect(hex(extractMemoryView({ operation: 'access', targetIndex: 2 }, 5)!.address)).toBe('0x48')
  })
})

describe('extractShiftView', () => {
  it('is null for an access, which shifts nothing', () => {
    expect(extractShiftView({ operation: 'access', targetIndex: 1 }, 5)).toBeNull()
  })

  it('is null before a direction and range are known', () => {
    expect(extractShiftView({ operation: 'insert', shiftDirection: null, affectedRange: null }, 5)).toBeNull()
  })

  it('reads an insert shifting right', () => {
    const view = extractShiftView(
      { operation: 'insert', shiftDirection: 'right', affectedRange: [1, 3], targetIndex: 1 },
      5,
    )
    expect(view).toEqual({ operation: 'insert', direction: 'right', from: 1, to: 3, targetIndex: 1 })
  })

  it('normalises a range given the other way round', () => {
    const view = extractShiftView(
      { operation: 'delete', shiftDirection: 'left', affectedRange: [4, 2], targetIndex: 2 },
      5,
    )
    expect(view).toMatchObject({ from: 2, to: 4 })
  })

  it('clamps a range that runs past the array', () => {
    const view = extractShiftView(
      { operation: 'insert', shiftDirection: 'right', affectedRange: [2, 99], targetIndex: 2 },
      5,
    )
    expect(view).toMatchObject({ from: 2, to: 4 })
  })

  it.each(['array-insert', 'array-delete'])('reads a shift from %s', (slug) => {
    const input = [10, 20, 30, 40, 50]
    const snaps = run(slug, input)
    const shifts = snaps.map((s) => extractShiftView(s.dataStructureState, input.length)).filter(Boolean)
    expect(shifts.length).toBeGreaterThan(0)
    for (const shift of shifts) {
      expect(shift!.from).toBeLessThanOrEqual(shift!.to)
      expect(shift!.to).toBeLessThan(input.length)
    }
  })
})

describe('hex', () => {
  it('formats an address the way the theory schematic does', () => {
    expect(hex(0x40)).toBe('0x40')
    expect(hex(0x4c)).toBe('0x4C')
  })
})
