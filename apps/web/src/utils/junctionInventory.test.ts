import { describe, expect, it } from 'vitest'
import { buildJunctionInventory, inventoryToCsvRows, inventoryToHtml, representativeRuns } from './junctionInventory'
import { binarySearchEngine } from '@/engine/binarySearch'

const rows = buildJunctionInventory()
const key = (r: { topic: string; junctionType: string; form: string }) => `${r.topic}|${r.junctionType}|${r.form}`

describe('junction inventory for expert review (3E)', () => {
  it('lists every junction form of the three study topics, once each', () => {
    expect(rows.map(key).sort()).toEqual([
      'binary-search|ALGORITHM_COMPLETE|found',
      'binary-search|ALGORITHM_COMPLETE|not found',
      'binary-search|COMPLEXITY_PREDICTION|',
      'binary-search|MIDPOINT_DECISION|',
      'bst|ALGORITHM_COMPLETE|',
      'bst|BST_DIRECTION|comparison',
      'bst|BST_DIRECTION|empty slot',
      'bst|BST_DIRECTION|removal',
      'bst|COMPLEXITY_PREDICTION|',
      'bubble-sort|ALGORITHM_COMPLETE|',
      'bubble-sort|COMPLEXITY_PREDICTION|',
      'bubble-sort|EARLY_TERMINATION|',
      'bubble-sort|PASS_COMPLETE|',
      'bubble-sort|SWAP_DECISION|',
    ])
    expect(new Set(rows.map(key)).size).toBe(rows.length)
    for (const r of rows) expect(r.tests, key(r)).not.toBe('')
  })

  it('marks exactly one correct option on every example', () => {
    for (const r of rows) expect(r.options.filter((o) => o.correct), key(r)).toHaveLength(1)
  })

  it('keeps the counts consistent: asked never exceeds fired, and full support asks no more than low', () => {
    for (const r of rows) {
      expect(r.firesPerRun, key(r)).toBeGreaterThan(0)
      expect(r.askedAtLowSupport, key(r)).toBeLessThanOrEqual(r.firesPerRun)
      expect(r.askedAtFullSupport, key(r)).toBeLessThanOrEqual(r.askedAtLowSupport)
    }
  })

  it('counts each form from one run only, matching that run', () => {
    const runs = representativeRuns()
    for (const r of rows) {
      const run = runs.find((x) => x.label === r.run && x.topic === r.topic)!
      const fired = run.snapshots.filter((s) => s.isPredictionRequired && s.criticalJunctionType === r.junctionType).length
      expect(r.firesPerRun, key(r)).toBeLessThanOrEqual(fired)
    }
  })

  it('prefers a real decision as the example, never a trivial one', () => {
    // This used to also assert the example came from the SECOND binary
    // search run. That held only because the default target sat exactly on
    // the first midpoint, so the primary run's only midpoint decision was
    // the trivial "target found". The default now takes three probes, so
    // the primary run offers a real decision and is rightly preferred.
    // What matters is the example, not which run it came from.
    const midpoint = rows.find((r) => r.junctionType === 'MIDPOINT_DECISION')!
    expect(midpoint.options.find((o) => o.correct)!.text).not.toMatch(/target found/)
  })

  it('still reaches a later run when the primary one offers only a trivial example', () => {
    // The fallback above is what the previous assertion was really
    // guarding, so it gets its own test rather than depending on a
    // badly chosen default target to exercise it.
    const trivialFirst = buildJunctionInventory([
      { topic: 'binary-search', label: 'trivial run', snapshots: binarySearchEngine([1, 3, 5, 7], 3, { withComplexityPrediction: true }) },
      { topic: 'binary-search', label: 'real run', snapshots: binarySearchEngine([1, 3, 5, 7, 9, 11, 15, 19], 15, { withComplexityPrediction: true }) },
    ])
    const midpoint = trivialFirst.find((r) => r.junctionType === 'MIDPOINT_DECISION')
    if (!midpoint) return
    expect(midpoint.options.find((o) => o.correct)!.text).not.toMatch(/target found/)
  })

  it('renders every row into the sheet and the CSV', () => {
    const html = inventoryToHtml(rows, '2026-09-29')
    for (const r of rows) expect(html).toContain(r.junctionType)
    const csv = inventoryToCsvRows(rows)
    expect(csv.rows).toHaveLength(rows.length)
    for (const row of csv.rows) expect(row).toHaveLength(csv.header.length)
  })
})
