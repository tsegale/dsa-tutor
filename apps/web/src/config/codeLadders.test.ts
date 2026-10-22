import { execFileSync } from 'child_process'
import { describe, expect, it } from 'vitest'
import { CODE_LADDERS, buildBst, codeLadderFor, hasCodeLadder, plainTree, type CodeRung } from '@/config/codeLadders'
import { LADDER_SOLUTIONS } from '@/config/codeLadders.solutions'
import { runFor } from '@/engine/runFor'

/**
 * The rungs are checked against a real Python interpreter, not asserted by
 * hand.
 *
 * Code Mode grades by running the learner's Python in Pyodide and comparing
 * one read-back global against expectedFor. Those are two separate pieces
 * of authoring - the challenge and its answer - and nothing stops them
 * disagreeing. A rung whose expected value does not match the code it asks
 * for is a rung no correct answer can pass, and the first person to find it
 * would be a student.
 *
 * So each rung's model answer runs here, against that rung's own sandbox
 * globals, and its read-back must equal what expectedFor derived from the
 * engine run. Several input arrays, because a rung that only works on one
 * array is not finished.
 */

const ARRAYS = [
  [5, 3, 8, 1],
  [2, 6, 1, 15, 18, 9, 17, 16],
  [50, 30, 70, 20, 40, 60, 80],
  [4, 4, 2, 9],
]

function python3(): string | null {
  try {
    execFileSync('python3', ['--version'], { stdio: 'ignore' })
    return 'python3'
  } catch {
    return null
  }
}

const PY = python3()

/** Runs one rung's solution the way the sandbox does: set the globals, run
 *  the code, read one global back. */
function runRung(rung: CodeRung, solution: string, globals: Record<string, unknown>): unknown {
  const program = [
    'import json, sys',
    `_g = json.loads(${JSON.stringify(JSON.stringify(globals))})`,
    'globals().update(_g)',
    solution,
    `print(json.dumps(${rung.readBack}))`,
  ].join('\n')
  const out = execFileSync(PY!, ['-I', '-c', program], { encoding: 'utf8', timeout: 20_000 })
  return JSON.parse(out.trim())
}

describe('every rung of every ladder', () => {
  it('is checked against a real Python interpreter', () => {
    expect(PY, 'python3 is needed to check the ladder content').not.toBeNull()
  })

  for (const [slug, rungs] of Object.entries(CODE_LADDERS)) {
    describe(slug, () => {
      it('has a model answer for each rung', () => {
        expect(LADDER_SOLUTIONS[slug]?.length).toBe(rungs.length)
      })

      it('builds from one expression to the whole algorithm', () => {
        expect(rungs.length).toBeGreaterThanOrEqual(4)
        // The last rung is the one that asks for all of it, which is what
        // makes finishing the ladder mean something.
        expect(rungs[rungs.length - 1].title.toLowerCase()).toMatch(/whole/)
      })

      it('tells the learner what is in scope, in the starter', () => {
        for (const rung of rungs) {
          expect(rung.starter.python, rung.title).toMatch(/^#/)
          expect(rung.starter.java.trim(), rung.title).not.toBe('')
          expect(rung.prompt.trim().length, rung.title).toBeGreaterThan(20)
        }
      })

      for (const [index, rung] of rungs.entries()) {
        it(`rung ${index + 1} (${rung.title}): the model answer produces the expected value`, () => {
          if (!PY) return
          for (const input of ARRAYS) {
            const run = runFor(slug, input)
            const expected = rung.expectedFor(run)
            if (expected === null || expected === undefined) continue
            const globals = rung.globalsFor(run)
            const actual = runRung(rung, LADDER_SOLUTIONS[slug][index], globals)
            expect(actual, `${slug} rung ${index + 1} on [${input}] - globals ${JSON.stringify(globals)}`).toEqual(expected)
          }
        })
      }

      it('hands the sandbox every name its starter mentions', () => {
        for (const rung of rungs) {
          const run = runFor(slug, ARRAYS[1])
          const names = Object.keys(rung.globalsFor(run))
          // The comment's first line names what is given: "# arr and j are given."
          const given = rung.starter.python.split('\n')[0]
          for (const name of names) {
            expect(given, `${rung.title} does not say ${name} is given`).toContain(name)
          }
        }
      })
    })
  }
})

describe('topics without a ladder', () => {
  it('report one, so the caller falls back to their single challenge', () => {
    expect(hasCodeLadder('insertion-sort')).toBe(false)
    expect(codeLadderFor('insertion-sort')).toBeNull()
    expect(codeLadderFor(undefined)).toBeNull()
  })

  it('covers the study topics and Module 1', () => {
    for (const slug of [
      'bubble-sort',
      'binary-search',
      'bst',
      'array-access',
      'array-insert',
      'array-delete',
      'stack',
      'queue',
      'singly-linked-list',
    ]) {
      expect(hasCodeLadder(slug), slug).toBe(true)
    }
  })
})

describe('plainTree', () => {
  it('strips the render-only node ids a student cannot produce', () => {
    const engineNode = { value: 5, id: 'node-5-0', left: null, right: { value: 8, id: 'node-8-1', left: null, right: null } }
    expect(plainTree(engineNode)).toEqual({ value: 5, left: null, right: { value: 8, left: null, right: null } })
  })

  it('is null for an empty tree', () => {
    expect(plainTree(null)).toBeNull()
    expect(plainTree(undefined)).toBeNull()
  })
})

describe('buildBst', () => {
  it('inserts by the same left/right rule the rungs teach', () => {
    expect(buildBst([5, 3, 8])).toEqual({
      value: 5,
      left: { value: 3, left: null, right: null },
      right: { value: 8, left: null, right: null },
    })
  })

  it('is empty for no values', () => {
    expect(buildBst([])).toBeNull()
  })
})
