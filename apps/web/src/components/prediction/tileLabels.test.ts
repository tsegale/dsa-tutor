import { describe, it, expect } from 'vitest'
import { ALGORITHM_REGISTRY } from '@/engine/registry'
import { getTilesForSnapshot } from '@/utils/tileBuilder'
import { CriticalJunctionType } from '@dsa-tutor/types'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'

// MST_EDGE_SELECT and GRID_NEXT_CELL deliberately mark every tied-optimal
// tile correct (remediation doc Phase 5: "accept all tied-optimal answers
// in junction grading") - a real tie there is not this bug, so those two
// junction types are held to "at least one correct", everything else to
// "exactly one".
const TIE_ELIGIBLE_JUNCTIONS: Set<CriticalJunctionType> = new Set([
  CriticalJunctionType.MST_EDGE_SELECT,
  CriticalJunctionType.GRID_NEXT_CELL,
])

// The actual reported bug (remediation doc Phase 12A.1): a tile label
// built from a value that turned out to be undefined at runtime, producing
// a sentence like "8 is less than undefined - go left" with no correct
// option. That exact shape - a comparison verb next to a broken value - is
// what this checks for.
//
// A blanket "label may never contain the word undefined/null" check would
// fail on content that is deliberately, correctly worded that way:
// QUEUE_FRONT's dequeue-empty distractor is literally labelled "undefined",
// and NULL_CHECK/POINTER_FOLLOW have several tiles whose whole point is
// naming "null" as a pointer value ("When next is null", plain "null" as a
// full answer). Those are correct content, not bugs, so this only flags
// the comparison-sentence shape, plus NaN and [object Object] anywhere -
// no tile anywhere has a legitimate reason to contain either of those.
const BROKEN_COMPARISON_PATTERN = /is\s+(less than|greater than|equal to)(\s+or\s+equal\s+to)?\s+(undefined|null|nan)\b/i

function findBrokenLabel(label: string): string | null {
  if (label.includes('[object Object]')) return '[object Object]'
  if (/\bNaN\b/.test(label)) return 'NaN'
  if (BROKEN_COMPARISON_PATTERN.test(label)) return 'broken comparison (undefined/null/NaN used as a value)'
  return null
}

describe('tileLabels: every registered engine produces safe, gradeable tiles', () => {
  for (const entry of ALGORITHM_REGISTRY) {
    it(`${entry.algorithmName}: no snapshot produces a broken tile label`, () => {
      const snapshots: AlgorithmSnapshot[] = entry.engineFunction(entry.defaultInput)
      const predictionSnapshots = snapshots.filter((s) => s.isPredictionRequired)

      for (const snapshot of predictionSnapshots) {
        const tiles = getTilesForSnapshot(snapshot, entry.displayName)
        for (const tile of tiles) {
          const broken = findBrokenLabel(tile.label)
          expect(broken, `${entry.algorithmName} step ${snapshot.stepIndex}, tile "${tile.id}": "${tile.label}"`).toBeNull()
        }
      }
    })

    // Only checkable where the authoring convention itself marks the
    // correct tile (misconception: null - see TileGrid.tsx's own comment
    // on that field). Junctions where every tile carries a misconception
    // (e.g. SWAP_DECISION, BST_DIRECTION's node-to-node comparisons) grade
    // correctness server-side from runtime state, which this client-side
    // tile data has no way to reproduce - those are covered instead by
    // apps/ai/tests/test_grading_ties.py's evaluator-level tests.
    it(`${entry.algorithmName}: wherever a tile is marked correct, exactly one is`, () => {
      const snapshots: AlgorithmSnapshot[] = entry.engineFunction(entry.defaultInput)
      const predictionSnapshots = snapshots.filter((s) => s.isPredictionRequired)

      for (const snapshot of predictionSnapshots) {
        const tiles = getTilesForSnapshot(snapshot, entry.displayName)
        if (tiles.length === 0) continue
        const correctCount = tiles.filter((t) => t.misconception === null).length
        if (correctCount === 0) continue // state-dependent junction - not checkable here

        const junctionType = snapshot.criticalJunctionType
        if (junctionType && TIE_ELIGIBLE_JUNCTIONS.has(junctionType)) {
          expect(correctCount, `${entry.algorithmName} step ${snapshot.stepIndex} has no tile marked correct`).toBeGreaterThanOrEqual(1)
        } else {
          expect(correctCount, `${entry.algorithmName} step ${snapshot.stepIndex} has ${correctCount} tiles marked correct`).toBe(1)
        }
      }
    })
  }
})
