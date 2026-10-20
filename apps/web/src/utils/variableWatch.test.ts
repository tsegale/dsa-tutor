import { describe, expect, it } from 'vitest'
import { MODULES } from '@/config/curriculum'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import { MAX_WATCHED, formatValue, labelFor, watchedVariables } from './variableWatch'

const SLUGS = MODULES.flatMap((module) => module.topics)
const INPUT = [9, 2, 7, 4, 5]

describe('labelFor', () => {
  it('reads a camelCase field as words', () => {
    expect(labelFor('sortedUpTo')).toBe('sorted up to')
    expect(labelFor('leftPointerIndex')).toBe('left pointer index')
    expect(labelFor('windowStart')).toBe('window start')
  })

  it('leaves a mathematical one or two letter name alone', () => {
    // Floyd-Warshall's i, j and k are the names in every textbook; spelling
    // them out would make them harder to match to the pseudocode.
    expect(labelFor('k')).toBe('k')
    expect(labelFor('i')).toBe('i')
  })

  it('expands the abbreviations that would otherwise read as noise', () => {
    expect(labelFor('mstCost')).toBe('MST cost')
    expect(labelFor('currentIdx')).toBe('current index')
  })
})

describe('formatValue', () => {
  it('shows a missing value as a dash rather than null', () => {
    expect(formatValue(null)).toBe('-')
    expect(formatValue(undefined)).toBe('-')
  })

  it('keeps integers exact and rounds anything else', () => {
    expect(formatValue(0)).toBe('0')
    expect(formatValue(-3)).toBe('-3')
    expect(formatValue(1.23456)).toBe('1.23')
  })

  it('truncates a long string so one value cannot crowd out the rest', () => {
    expect(formatValue('a'.repeat(40))).toHaveLength(20)
  })
})

describe('watchedVariables', () => {
  it('is empty with no snapshot', () => {
    expect(watchedVariables(null, null)).toEqual([])
  })

  it('reads the named variables an engine carries', () => {
    const snaps = getAlgorithmRegistryEntry('binary-search')!.engineFunction(INPUT)
    const names = watchedVariables(snaps[2], snaps[1]).map((row) => row.name)
    expect(names).toContain('low')
    expect(names).toContain('high')
    expect(names).toContain('target')
  })

  it('marks what the step changed, and nothing else', () => {
    const snaps = getAlgorithmRegistryEntry('binary-search')!.engineFunction([1, 3, 5, 7, 9, 11, 13])
    // Find a step that actually moved a bound, rather than assuming one.
    const moved = snaps
      .map((snapshot, index) => watchedVariables(snapshot, snaps[index - 1] ?? null))
      .find((rows) => rows.some((row) => row.changed))
    expect(moved).toBeDefined()
    expect(moved!.filter((row) => row.changed).length).toBeLessThan(moved!.length)
  })

  it('marks nothing as changed on the first step', () => {
    const snaps = getAlgorithmRegistryEntry('binary-search')!.engineFunction(INPUT)
    expect(watchedVariables(snaps[0], null).every((row) => !row.changed)).toBe(true)
  })

  it('puts the changed variables first', () => {
    const snaps = getAlgorithmRegistryEntry('quick-sort')!.engineFunction([5, 3, 8, 1, 9, 2])
    for (const [index, snapshot] of snaps.entries()) {
      const rows = watchedVariables(snapshot, snaps[index - 1] ?? null)
      const lastChanged = rows.map((row) => row.changed).lastIndexOf(true)
      const firstSteady = rows.map((row) => row.changed).indexOf(false)
      if (lastChanged !== -1 && firstSteady !== -1) expect(lastChanged).toBeLessThan(firstSteady)
    }
  })

  it('hides opaque internal identifiers', () => {
    // currentNodeId = "trie-p-17" means nothing to a student and is the
    // longest value in the state, so it would crowd out the rest.
    const snaps = getAlgorithmRegistryEntry('trie-insert')!.engineFunction(INPUT)
    for (const [index, snapshot] of snaps.entries()) {
      const names = watchedVariables(snapshot, snaps[index - 1] ?? null).map((row) => row.name)
      expect(names.filter((name) => /Id$/.test(name))).toEqual([])
    }
  })

  it('hides fixed facts about the run that never vary', () => {
    const snaps = getAlgorithmRegistryEntry('grid-bfs')!.engineFunction(INPUT)
    const names = watchedVariables(snaps[5], snaps[4]).map((row) => row.name)
    expect(names).not.toContain('rows')
    expect(names).not.toContain('cols')
  })

  it('falls back to the marked indices when the state is a bare array', () => {
    // Bubble Sort is the only engine of that shape.
    const snaps = getAlgorithmRegistryEntry('bubble-sort')!.engineFunction([5, 3, 1, 4, 2])
    const withRows = snaps
      .map((snapshot, index) => watchedVariables(snapshot, snaps[index - 1] ?? null))
      .find((rows) => rows.length > 0)
    expect(withRows).toBeDefined()
    expect(withRows!.map((row) => row.name)).toContain('comparing')
  })
})

describe('across every topic', () => {
  it.each(SLUGS)('%s produces a watcher that fits the panel', (slug) => {
    const snaps = getAlgorithmRegistryEntry(slug)!.engineFunction(INPUT)
    for (const [index, snapshot] of snaps.entries()) {
      const rows = watchedVariables(snapshot, snaps[index - 1] ?? null)
      expect(rows.length).toBeLessThanOrEqual(MAX_WATCHED)
      for (const row of rows) {
        expect(row.label.length).toBeGreaterThan(0)
        // A value wider than this wraps in a 200px panel.
        expect(row.value.length).toBeLessThanOrEqual(20)
      }
    }
  })

  it('shows at least one variable on most topics', () => {
    // Not all: a step before a run starts may carry nothing yet. But a
    // watcher that is empty everywhere would mean the reader is broken.
    const withAny = SLUGS.filter((slug) => {
      const snaps = getAlgorithmRegistryEntry(slug)!.engineFunction(INPUT)
      return snaps.some((snapshot, index) => watchedVariables(snapshot, snaps[index - 1] ?? null).length > 0)
    })
    expect(withAny.length).toBe(SLUGS.length)
  })
})
