import { execFileSync } from 'child_process'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { CriticalJunctionType, PredictionType, type AlgorithmSnapshot } from '@dsa-tutor/types'
import { MODULES } from '@/config/curriculum'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import { runFor } from '@/engine/runFor'
import { findPython3 } from '@/test/findPython3'
import { correctTileIdFor } from './correctTile'
import { getTilesForSnapshot } from './tileBuilder'

function snap(junction: CriticalJunctionType, dataStructureState: unknown, activeIndices: number[] = []): AlgorithmSnapshot {
  return { criticalJunctionType: junction, dataStructureState, activeIndices } as unknown as AlgorithmSnapshot
}

describe('correctTileIdFor', () => {
  it('bubble swap: swap only when the left value is larger', () => {
    expect(correctTileIdFor(snap(CriticalJunctionType.SWAP_DECISION, [5, 3], [0, 1]))).toBe('swap')
    expect(correctTileIdFor(snap(CriticalJunctionType.SWAP_DECISION, [3, 3], [0, 1]))).toBe('no-swap')
  })

  it('insertion swap: shift only while the key is smaller', () => {
    const state = { array: [4, 7, 2], compareIndex: 1, currentKey: 2 }
    expect(correctTileIdFor(snap(CriticalJunctionType.SWAP_DECISION, state))).toBe('shift')
    expect(correctTileIdFor(snap(CriticalJunctionType.SWAP_DECISION, { ...state, currentKey: 9 }))).toBe('stop')
  })

  it('binary search midpoint: found, left or right', () => {
    const s = { array: [2, 4, 6], mid: 1 }
    expect(correctTileIdFor(snap(CriticalJunctionType.MIDPOINT_DECISION, { ...s, target: 4 }))).toBe('found')
    expect(correctTileIdFor(snap(CriticalJunctionType.MIDPOINT_DECISION, { ...s, target: 2 }))).toBe('search-left')
    expect(correctTileIdFor(snap(CriticalJunctionType.MIDPOINT_DECISION, { ...s, target: 6 }))).toBe('search-right')
  })

  it('BST: equal goes right, empty slots attach by the same rule, deletes use the removal tiles', () => {
    const at = (value: number, target: number) => snap(CriticalJunctionType.BST_DIRECTION, { currentNode: { value }, targetValue: target })
    expect(correctTileIdFor(at(8, 4))).toBe('go-left')
    expect(correctTileIdFor(at(8, 8))).toBe('go-right')
    const slot = (parent: number | null, target: number) =>
      snap(CriticalJunctionType.BST_DIRECTION, { currentNode: null, targetValue: target, insertionParentValue: parent })
    expect(correctTileIdFor(slot(null, 5))).toBe('becomes-root')
    expect(correctTileIdFor(slot(8, 8))).toBe('attach-right')
    expect(correctTileIdFor(snap(CriticalJunctionType.BST_DIRECTION, { currentNode: { value: 4 }, targetValue: 4, deleteCase: 'leaf' }))).toBe('correct')
  })

  it("conceptual junctions are always 'correct'; malformed state returns null", () => {
    expect(correctTileIdFor(snap(CriticalJunctionType.PASS_COMPLETE, [1, 2]))).toBe('correct')
    expect(correctTileIdFor(snap(CriticalJunctionType.COMPLEXITY_PREDICTION, [1, 2]))).toBe('correct')
    expect(correctTileIdFor(snap(CriticalJunctionType.TARGET_CHECK, {}))).toBeNull()
  })

  it('agrees 3-way across tileBuilder, correctTileIdFor, and Python predictions.py across all 73 curriculum topics', () => {
    const slugs = MODULES.flatMap((m) => m.topics)
    const fixtures: Array<{
      slug: string
      junction: string
      stepIndex: number
      snapshot: AlgorithmSnapshot
      correctId: string
      wrongId: string
    }> = []

    const seen = new Set<string>()
    for (const slug of slugs) {
      const entry = getAlgorithmRegistryEntry(slug)
      const run = runFor(slug, entry?.defaultInput)
      for (const snapshot of run) {
        if (!snapshot.isPredictionRequired || snapshot.predictionType !== PredictionType.TILE_GRID) continue
        const key = `${slug}:${snapshot.criticalJunctionType}`
        if (seen.has(key)) continue
        seen.add(key)

        const correctId = correctTileIdFor(snapshot)
        expect(correctId, `${slug} / ${snapshot.criticalJunctionType} returned null from correctTileIdFor`).not.toBeNull()

        const tiles = getTilesForSnapshot(snapshot, entry?.displayName ?? slug)
        const tileIds = tiles.map((t) => t.id)
        expect(tileIds, `${slug} / ${snapshot.criticalJunctionType} tiles do not include ${correctId}`).toContain(correctId!)

        const markedNull = tiles.filter((t) => t.misconception === null)
        if (markedNull.length === 1) {
          expect(markedNull[0].id, `${slug} / ${snapshot.criticalJunctionType} disagreed with tileBuilder`).toBe(correctId)
        }

        const wrongTile = tiles.find((t) => t.id !== correctId)!
        fixtures.push({
          slug,
          junction: snapshot.criticalJunctionType ?? 'NONE',
          stepIndex: snapshot.stepIndex,
          snapshot,
          correctId: correctId!,
          wrongId: wrongTile.id,
        })
      }
    }

    expect(fixtures.length).toBeGreaterThan(60)

    const py = findPython3()
    expect(py, 'Python 3 interpreter required for TS <-> Python grading contract check').not.toBeNull()
    const aiDir = path.resolve(__dirname, '../../../ai')
    const script = [
      'import json, sys',
      `sys.path.insert(0, ${JSON.stringify(aiDir)})`,
      'from models.request_models import PredictionRequest, ScaffoldingLevel',
      'from routers.predictions import evaluate_answer',
      'cases = json.loads(sys.stdin.read())',
      'failures = []',
      'for c in cases:',
      '    req_ok = PredictionRequest(algorithm_name=c["slug"], step_index=c["stepIndex"], current_state=c["snapshot"], student_answer=c["correctId"], error_history=[], scaffolding_level=ScaffoldingLevel.HIGH, session_id="s1")',
      '    if not evaluate_answer(req_ok):',
      '        failures.append(f"{c[\'slug\']}/{c[\'junction\']} rejected correct id {c[\'correctId\']}")',
      'print(json.dumps(failures))',
    ].join('\n')

    const out = execFileSync(py!, ['-B', '-c', script], {
      input: JSON.stringify(fixtures),
      encoding: 'utf8',
      timeout: 30_000,
    })
    expect(JSON.parse(out.trim())).toEqual([])
  }, 30_000)
})
