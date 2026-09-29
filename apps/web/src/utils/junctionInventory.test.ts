import { describe, expect, it } from 'vitest'
import { buildJunctionInventory, inventoryToCsvRows, inventoryToHtml, representativeRuns } from './junctionInventory'

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

  it('prefers a real decision as the example, even from a later run', () => {
    const midpoint = rows.find((r) => r.junctionType === 'MIDPOINT_DECISION')!
    expect(midpoint.options.find((o) => o.correct)!.text).not.toMatch(/target found/)
    expect(midpoint.exampleRun).not.toBe(midpoint.run)
  })

  it('renders every row into the sheet and the CSV', () => {
    const html = inventoryToHtml(rows, '2026-09-29')
    for (const r of rows) expect(html).toContain(r.junctionType)
    const csv = inventoryToCsvRows(rows)
    expect(csv.rows).toHaveLength(rows.length)
    for (const row of csv.rows) expect(row).toHaveLength(csv.header.length)
  })
})
