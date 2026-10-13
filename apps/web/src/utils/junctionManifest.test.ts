import { describe, expect, it } from 'vitest'
import committed from '../../../ai/tests/fixtures/junction_manifest.json'
import { buildJunctionManifest } from './junctionManifest'

// Built once at import: it runs every engine, too slow to repeat per test.
const manifest = buildJunctionManifest()

describe('junction manifest', () => {
  it('matches what the engines ask (regenerate with scripts/export-junction-manifest.ts)', () => {
    expect(committed).toEqual(manifest)
  })

  it('lists Quick Sort pivot selection as a graded junction', () => {
    expect(manifest['quick-sort']).toContain('PIVOT_SELECTION')
  })
})
