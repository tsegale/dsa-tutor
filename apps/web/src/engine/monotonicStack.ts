import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty } from '@dsa-tutor/types'
import { emptyDPState, filledCells, makeDPSnapshot, type DPTableState } from './dpTable'

/**
 * Next greater element, with a monotonic stack: the pattern that turns an
 * obvious O(n squared) into one pass.
 *
 * The thing to see is the accounting. At every step the question looks
 * like a loop inside a loop - "keep popping while the top is smaller" -
 * and the step count still comes out linear, because each index is pushed
 * once and popped once. That is an amortised argument, and watching it is
 * the only way most people believe it; so the run keeps a running count of
 * pushes and pops on the state, where the variable watcher shows them.
 *
 * The stack holds INDICES, not values. That is the detail every first
 * attempt gets wrong, and it is why the answer can be written into the
 * right cell when an index is finally discharged.
 */

// for i in 0..n-1:
//   while stack and arr[stack[-1]] < arr[i]: result[stack.pop()] = arr[i]
//   stack.push(i)
// anything left on the stack has no greater element: result[j] = -1
const LINE = { INIT: 0, LOOP: 1, WHILE: 2, ASSIGN: 3, PUSH: 4, LEFTOVER: 5 } as const

export function monotonicStackEngine(input: number[]): AlgorithmSnapshot[] {
  const array = input.length > 0 ? [...input] : [2, 1, 2, 4, 3]
  const n = array.length
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  const result: (number | null)[] = Array.from({ length: n }, () => null)
  const stack: number[] = []
  let pushes = 0
  let pops = 0

  const state = (overrides: Partial<DPTableState> = {}): DPTableState =>
    emptyDPState({
      input: array,
      rowLabels: ['next greater'],
      colLabels: array.map((_unused, i) => String(i)),
      table: [[...result]],
      filled: filledCells([result]),
      marked: [...stack],
      markerLabel: 'on the stack, still waiting for an answer',
      // On the state so the variable watcher shows them: the complexity
      // claim this topic makes is precisely about these two numbers.
      pushes,
      pops,
      ...overrides,
    })

  snapshots.push(
    makeDPSnapshot({
      stepIndex: stepIndex++,
      description: `For each element, find the first element to its right that is larger. The obvious way looks right from every element and costs O(n squared); this costs one pass.`,
      pseudocodeLine: LINE.INIT,
      isPredictionRequired: false,
      state: state(),
    }),
  )

  for (let i = 0; i < n; i += 1) {
    snapshots.push(
      makeDPSnapshot({
        stepIndex: stepIndex++,
        description: `Reading arr[${i}] = ${array[i]}.${
          stack.length > 0
            ? ` The stack is waiting on index ${stack.join(', ')}; does ${array[i]} answer the top one (arr[${stack[stack.length - 1]}] = ${array[stack[stack.length - 1]]})?`
            : ' The stack is empty, so nothing is waiting on an answer.'
        }`,
        pseudocodeLine: LINE.LOOP,
        isPredictionRequired: stack.length > 0,
        state: state({
          current: [0, i],
          working: `i = ${i}, arr[i] = ${array[i]}`,
          watch: {
            i,
            element: array[i],
            topIndex: stack.length > 0 ? stack[stack.length - 1] : null,
            topValue: stack.length > 0 ? array[stack[stack.length - 1]] : null,
            waiting: stack.length,
          },
        }),
        criticalJunctionType: stack.length > 0 ? CriticalJunctionType.STACK_DISCHARGE : null,
        junctionDifficulty: stack.length > 0 ? JunctionDifficulty.PROCEDURAL : null,
      }),
    )

    while (stack.length > 0 && array[stack[stack.length - 1]] < array[i]) {
      const settled = stack.pop() as number
      pops += 1
      result[settled] = array[i]
      snapshots.push(
        makeDPSnapshot({
          stepIndex: stepIndex++,
          description: `arr[${i}] = ${array[i]} is greater than arr[${settled}] = ${array[settled]}, so index ${settled} has its answer and comes off the stack. It will never be looked at again.`,
          pseudocodeLine: LINE.ASSIGN,
          isPredictionRequired: false,
          state: state({
            current: [0, settled],
            dependsOn: [],
            working: `result[${settled}] = ${array[i]}  (pop ${pops})`,
          }),
        }),
      )
    }

    stack.push(i)
    pushes += 1
    snapshots.push(
      makeDPSnapshot({
        stepIndex: stepIndex++,
        description: `Index ${i} goes on the stack to wait for its own answer. Every index is pushed once and popped at most once, which is why the whole thing is O(n) despite the inner loop.`,
        pseudocodeLine: LINE.PUSH,
        isPredictionRequired: false,
        state: state({ working: `push ${i}  (pushes ${pushes}, pops ${pops})` }),
      }),
    )
  }

  const leftover = [...stack]
  for (const index of leftover) {
    result[index] = -1
  }

  snapshots.push(
    makeDPSnapshot({
      stepIndex: stepIndex++,
      description:
        leftover.length > 0
          ? `Index ${leftover.join(', ')} ${leftover.length === 1 ? 'is' : 'are'} still on the stack, so nothing to the right was ever larger: the answer is -1. Total ${pushes} pushes and ${pops} pops for ${n} elements.`
          : `The stack emptied: every element found a greater one. Total ${pushes} pushes and ${pops} pops for ${n} elements.`,
      pseudocodeLine: LINE.LEFTOVER,
      isPredictionRequired: false,
      state: state({ marked: [], markerLabel: null, table: [[...result]], filled: filledCells([result]) }),
      isFinalStep: true,
    }),
  )

  return snapshots
}
