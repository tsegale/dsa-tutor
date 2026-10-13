import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { ALGORITHM_REGISTRY } from '@/engine/registry'
import { bubbleSortEngine } from '@/engine/bubbleSort'
import { binarySearchEngine } from '@/engine/binarySearch'
import { bstInsertEngine } from '@/engine/bst'

/**
 * The junction manifest: every junction type each algorithm can ask, read
 * from real runs. apps/ai/tests/test_registry_coverage.py reads it and fails
 * for any pair without specific CRITICAL_JUNCTION_GUIDANCE, so no junction
 * reaches the model with an empty "what this junction is testing" line.
 * Regenerate after adding a junction (from apps/web):
 *   npx tsx --tsconfig tsconfig.app.json scripts/export-junction-manifest.ts
 */

/** Small deterministic inputs that reach the rarer branches (early stop, duplicates, two elements). */
function inputsFor(defaultInput: number[]): number[][] {
  const sorted = [...defaultInput].sort((a, b) => a - b)
  return [defaultInput, sorted, [...sorted].reverse(), [3, 1, 3, 2, 1], [2, 1], [4, 9, 2, 7, 5, 1, 8]]
}

// Study runs add junctions the registry's plain engine call leaves out.
const STUDY_RUNS: Record<string, (input: number[]) => AlgorithmSnapshot[]> = {
  'bubble-sort': (input) => bubbleSortEngine(input, { withComplexityPrediction: true }),
  'binary-search': (input) => binarySearchEngine([...input].sort((a, b) => a - b), input[1] ?? 0, { withComplexityPrediction: true }),
  bst: (input) => bstInsertEngine(input, { withCompletionCheck: true, withComplexityPrediction: true }),
}

export function buildJunctionManifest(): Record<string, string[]> {
  const manifest: Record<string, string[]> = {}
  for (const entry of ALGORITHM_REGISTRY) {
    const types = new Set<string>()
    const study = STUDY_RUNS[entry.algorithmName]
    for (const input of inputsFor(entry.defaultInput)) {
      for (const snapshots of study ? [entry.engineFunction(input), study(input)] : [entry.engineFunction(input)]) {
        for (const snapshot of snapshots) {
          if (snapshot.isPredictionRequired && snapshot.criticalJunctionType) types.add(snapshot.criticalJunctionType)
        }
      }
    }
    if (types.size > 0) manifest[entry.algorithmName] = [...types].sort()
  }
  return manifest
}
