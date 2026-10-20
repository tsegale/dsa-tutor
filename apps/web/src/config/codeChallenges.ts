import { CriticalJunctionType } from '@dsa-tutor/types'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import type { PythonStepSpec } from '@/utils/pyodideRunner'

/**
 * What a student writes in Code Mode, per topic.
 *
 * Code Mode existed on Bubble Sort alone, because the runner hardcoded one
 * shape (`arr` and `j` in, `arr` out) and the grading contract was
 * `number[]` end to end. A challenge now declares its own inputs and its
 * own read-back, so a tree, a graph, a counter or a string works the same
 * way as an array.
 *
 * Three rules the content follows, all from the brief:
 *
 * The challenge is the CORE LOGIC, never boilerplate. Nobody learns
 * anything writing a for-loop header; the thing worth writing is the
 * comparison, the pointer move, the recurrence, the relaxation test. So
 * the starter code hands over the scaffolding and leaves the decision.
 *
 * It is ONE STEP of the live run, not the whole algorithm. The student is
 * standing at a specific junction with specific values on the canvas, and
 * what they write is graded against what the engine says happens there.
 *
 * The expected answer is COMPUTED FROM THE RUN, never authored. Every
 * `expectedFor` below reads it out of a snapshot the engine produced - the
 * same snapshots driving the canvas the student is looking at. That is why
 * there is no answer key in this file that could drift out of step with
 * the visualisation, and it is the property engine/codeMode.test.ts holds.
 */

/** The live run, and where in it the student is standing. */
export interface ChallengeContext {
  /** Every snapshot of the current run. */
  run: AlgorithmSnapshot[]
  /** The index of the junction being asked. */
  index: number
  /** Shorthand for `run[index]`. */
  snapshot: AlgorithmSnapshot
  /** Shorthand for `run[index + 1] ?? null`. */
  next: AlgorithmSnapshot | null
}

export interface CodeChallenge {
  /** What the student is asked to write. One sentence, imperative. */
  prompt: string
  /**
   * The junctions this challenge grades. Only these become a code
   * question; every other junction in the run stays a tile prediction.
   *
   * This is what decides which steps Code Mode touches, and it lives with
   * the challenge rather than in the engine. Bubble Sort's engine used to
   * take a `codeEditorMode` flag and set the CODE_EDITOR prediction type
   * itself, which is the whole reason Code Mode existed on one topic: no
   * other engine had the flag. Nothing reads a flag now (see
   * engine/codeMode.ts).
   */
  junctionTypes: CriticalJunctionType[]
  /** Scaffolding, with the decision left out. Python runs; Java is read. */
  starter: { python: string; java: string }
  /**
   * The globals handed to the sandbox, by name. Keep these few, and name
   * them as the topic's own pseudocode names them.
   */
  globalsFor: (context: ChallengeContext) => Record<string, unknown>
  /** The global read back out, and the shape it must keep. */
  readBack: string
  expect: PythonStepSpec['expect']
  /**
   * True when the read-back value IS the data structure on the canvas, so
   * the canvas can be re-seeded from what the student's code produced: it
   * shows their own array carrying on, and shows a buggy one as the
   * mistake path.
   *
   * False for a challenge answering a question ABOUT the structure - an
   * address, a count, a hash bucket, True or False. The canvas handler
   * used to assume the former unconditionally and assign the result
   * straight to dataStructureState, which for a scalar answer would draw
   * a one-cell array under a prompt about memory addresses.
   */
  seedsNextRun: boolean
  /**
   * The correct answer, read out of the run. Null when this junction
   * cannot be graded, which makes it fall back to a tile prediction rather
   * than grade a student against nothing.
   */
  expectedFor: (context: ChallengeContext) => unknown
}

// ----------------------------------------------------------------- state
// Engines store either a bare array or an object with an `array` field
// plus whatever that topic tracks, so these two helpers are how a
// challenge reads either without caring which.

export function arrayOf(snapshot: AlgorithmSnapshot | null | undefined): number[] {
  const state = snapshot?.dataStructureState
  if (Array.isArray(state)) return state as number[]
  if (state && typeof state === 'object' && Array.isArray((state as { array?: unknown }).array)) {
    return (state as { array: number[] }).array
  }
  return []
}

export function field<T>(snapshot: AlgorithmSnapshot | null | undefined, name: string, fallback: T): T {
  const state = snapshot?.dataStructureState
  if (!state || typeof state !== 'object' || Array.isArray(state)) return fallback
  const value = (state as Record<string, unknown>)[name]
  return (value === undefined || value === null ? fallback : value) as T
}

/**
 * The next snapshot that carries the decision this junction asks about.
 *
 * A junction is often followed by narration ("Comparing 5 and 3...")
 * before the step that actually moves the state, so grading against
 * `run[index + 1]` alone would compare the student's answer with a
 * snapshot where nothing has happened yet - and code that does nothing at
 * all would be marked correct.
 */
export function nextWhere(
  context: ChallengeContext,
  changed: (snapshot: AlgorithmSnapshot) => boolean,
): AlgorithmSnapshot | null {
  for (let i = context.index + 1; i < context.run.length; i += 1) {
    const snapshot = context.run[i]
    if (changed(snapshot)) return snapshot
    // Stop at the next junction of any kind: past it, the state belongs to
    // a different decision than the one being asked here.
    if (snapshot.isPredictionRequired) return null
  }
  return null
}

// ---------------------------------------------------------------- shared
//
// Most array topics ask the same question in different words: given the
// array and the positions in play, produce the array as it should be after
// this step. Sharing the shape keeps these challenges honest with each
// other and with the engine.

interface ArrayStepOptions {
  prompt: string
  junctionTypes: CriticalJunctionType[]
  python: string
  java: string
  /** Extra globals beyond `arr`, read from the junction's own state. */
  extras?: (context: ChallengeContext) => Record<string, unknown>
  /** Where `arr` comes from. Defaults to the junction's own array; a
   * junction that already holds the finished result passes `first`, so the
   * student starts from the array before the operation. */
  source?: 'junction' | 'first'
  /** Where the answer comes from. Defaults to the next snapshot whose
   * array differs from the junction's; a junction that is the last step of
   * its run passes `junction`. */
  answer?: 'next' | 'junction'
}

function arrayStepChallenge(options: ArrayStepOptions): CodeChallenge {
  const { source = 'junction', answer = 'next' } = options
  return {
    prompt: options.prompt,
    junctionTypes: options.junctionTypes,
    starter: { python: options.python, java: options.java },
    globalsFor: (context) => ({
      arr: [...arrayOf(source === 'first' ? context.run[0] : context.snapshot)],
      ...(options.extras?.(context) ?? {}),
    }),
    readBack: 'arr',
    expect: 'number[]',
    seedsNextRun: true,
    expectedFor: (context) => {
      if (answer === 'junction') return [...arrayOf(context.snapshot)]
      const here = arrayOf(context.snapshot)
      const settled = nextWhere(context, (s) => {
        const there = arrayOf(s)
        return there.length !== here.length || there.some((value, i) => value !== here[i])
      })
      return settled ? [...arrayOf(settled)] : null
    },
  }
}

export const CODE_CHALLENGES: Record<string, CodeChallenge> = {
  // -------------------------------------------------------------- Module 1
  'array-access': {
    // The junction asks what value is stored at the index, so this asks
    // for the same thing in code. The lesson is in how you get it: one
    // index expression and no loop, which is what makes the O(1) on the
    // complexity tab true.
    prompt: 'Read the element at index i. One index expression, no loop: that is what makes this O(1).',
    junctionTypes: [CriticalJunctionType.INDEX_ACCESS],
    starter: {
      python: '# arr and i are given.\nvalue = ',
      java: 'int value = arr[i];',
    },
    globalsFor: (context) => ({
      arr: [...arrayOf(context.snapshot)],
      i: field<number>(context.snapshot, 'targetIndex', 0),
    }),
    readBack: 'value',
    expect: 'number',
    seedsNextRun: false,
    expectedFor: (context) => arrayOf(context.snapshot)[field<number>(context.snapshot, 'targetIndex', 0)] ?? null,
  },

  'array-insert': arrayStepChallenge({
    prompt: 'Shift every element from the end down to pos one place right, then write value at pos.',
    junctionTypes: [CriticalJunctionType.INSERT_POSITION],
    // This junction is the last step of the run and already holds the
    // finished array, so `arr` comes from the start of the run and the
    // answer from the junction itself.
    source: 'first',
    answer: 'junction',
    python: '# arr, pos and value are given.\narr.append(0)\nfor k in range(len(arr) - 1, pos, -1):\n    arr[k] = ',
    java: 'for (int k = arr.length - 1; k > pos; k--) {\n    arr[k] = arr[k - 1];\n}\narr[pos] = value;',
    extras: (context) => ({
      pos: field<number>(context.snapshot, 'targetIndex', 0),
      value: field<number>(context.snapshot, 'operationValue', 0),
    }),
  }),

  'array-delete': arrayStepChallenge({
    prompt: 'Close the gap at pos by shifting every later element one place left, then drop the spare slot.',
    junctionTypes: [CriticalJunctionType.DELETE_SHIFT],
    source: 'first',
    answer: 'junction',
    python: '# arr and pos are given.\nfor k in range(pos, len(arr) - 1):\n    arr[k] = \narr.pop()',
    java: 'for (int k = pos; k < arr.length - 1; k++) {\n    arr[k] = arr[k + 1];\n}',
    extras: (context) => ({ pos: field<number>(context.snapshot, 'targetIndex', 0) }),
  }),

  // -------------------------------------------------------------- Module 3
  'bubble-sort': arrayStepChallenge({
    prompt: 'Swap arr[j] and arr[j+1] if they are out of order, and leave them alone if they are not.',
    junctionTypes: [CriticalJunctionType.SWAP_DECISION],
    python: '# arr and j are given.\n# Swap only when this pair is out of order.\nif ',
    java: 'if (arr[j] > arr[j + 1]) {\n    int tmp = arr[j];\n    arr[j] = arr[j + 1];\n    arr[j + 1] = tmp;\n}',
    extras: (context) => ({ j: context.snapshot.comparedIndices[0] ?? context.snapshot.activeIndices[0] ?? 0 }),
  }),

  'insertion-sort': arrayStepChallenge({
    prompt: 'Shift the sorted prefix right while it is still bigger than the key, then drop the key in.',
    junctionTypes: [CriticalJunctionType.SWAP_DECISION],
    python: '# arr, key and k are given.\nwhile k >= 0 and ',
    java: 'while (k >= 0 && arr[k] > key) {\n    arr[k + 1] = arr[k];\n    k--;\n}\narr[k + 1] = key;',
    extras: (context) => ({
      key: field<number>(context.snapshot, 'currentKey', 0),
      k: field<number>(context.snapshot, 'compareIndex', 0),
    }),
  }),

  'selection-sort': {
    // The array does not move at a NEW_MINIMUM junction: what changes is
    // which index the pass believes holds the smallest value. Grading the
    // array here would mark code that does nothing as correct, because
    // doing nothing is what the array does.
    prompt: 'Keep min_index pointing at the smallest value seen so far: update it only when arr[scan] is smaller.',
    junctionTypes: [CriticalJunctionType.NEW_MINIMUM],
    starter: {
      python: '# arr, min_index and scan are given.\nif ',
      java: 'if (arr[scan] < arr[minIndex]) {\n    minIndex = scan;\n}',
    },
    globalsFor: (context) => ({
      arr: [...arrayOf(context.snapshot)],
      min_index: field<number>(context.snapshot, 'currentMin', 0),
      scan: field<number>(context.snapshot, 'scanIndex', 0),
    }),
    readBack: 'min_index',
    expect: 'number',
    seedsNextRun: false,
    expectedFor: (context) => {
      const here = field<number>(context.snapshot, 'currentMin', -1)
      const resolved = nextWhere(context, (s) => field<number>(s, 'currentMin', here) !== here)
      // No later snapshot moved it, so the answer is "leave it alone".
      return resolved ? field<number>(resolved, 'currentMin', here) : here
    },
  },
}

/** Topics that offer a code challenge. */
export function codeChallengeFor(slug: string | undefined): CodeChallenge | null {
  return (slug && CODE_CHALLENGES[slug]) || null
}

export function hasCodeChallenge(slug: string | undefined): boolean {
  return !!slug && slug in CODE_CHALLENGES
}

/**
 * Everything one code question needs, assembled from the live run: what to
 * hand the sandbox, what to read back, and the answer to grade against.
 *
 * Null when this junction is not one the topic's challenge grades, or when
 * the expected answer cannot be computed - the caller then leaves the
 * junction as an ordinary tile prediction rather than grading against
 * nothing.
 */
export interface CodeStep {
  challenge: CodeChallenge
  spec: PythonStepSpec
  expected: unknown
}

export function codeStepFor(slug: string | undefined, run: AlgorithmSnapshot[], index: number): CodeStep | null {
  const challenge = codeChallengeFor(slug)
  const snapshot = run[index]
  if (!challenge || !snapshot) return null
  const junction = snapshot.criticalJunctionType
  if (!junction || !challenge.junctionTypes.includes(junction)) return null
  const context: ChallengeContext = { run, index, snapshot, next: run[index + 1] ?? null }
  const expected = challenge.expectedFor(context)
  if (expected === null || expected === undefined) return null
  return {
    challenge,
    spec: {
      globals: challenge.globalsFor(context),
      readBack: challenge.readBack,
      expect: challenge.expect,
    },
    expected,
  }
}
