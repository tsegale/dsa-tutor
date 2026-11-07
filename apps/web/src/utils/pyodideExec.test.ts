// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { loadPyodide, type PyodideInterface } from 'pyodide'
import { runStepInFreshNamespace, runTrackedArrayInFreshNamespace } from './pyodideExec'
import { buildTrackedArrayHarness } from './trackedPythonScript'

/**
 * Against the real interpreter (the npm package ships it), since the bug
 * this guards was in how runs share Python state, which no mock reproduces.
 */
let pyodide: PyodideInterface

beforeAll(async () => {
  pyodide = await loadPyodide()
}, 60_000)

describe('runStepInFreshNamespace', () => {
  it('reads back the answer a challenge asks for', async () => {
    const result = await runStepInFreshNamespace(pyodide, 'arr[0], arr[1] = arr[1], arr[0]', {
      globals: { arr: [5, 3, 8] },
      readBack: 'arr',
      expect: 'number[]',
    })
    expect(result.errorMessage).toBeNull()
    expect(result.resultingState).toEqual([3, 5, 8])
  })

  it('leaves nothing the learner defined behind for the next run', async () => {
    await runStepInFreshNamespace(pyodide, 'temp = 41\ndef helper(x):\n    return x + 1\nresult = helper(temp)', {
      globals: { arr: [1, 2] },
      readBack: 'result',
      expect: 'number',
    })
    const next = await runStepInFreshNamespace(pyodide, 'found = [n for n in ("temp", "helper", "arr") if n in globals()]', {
      globals: {},
      readBack: 'found',
      expect: 'json',
    })
    expect(next.resultingState).toEqual([])
  })

  it('still lets a run define and call its own functions, recursion included', async () => {
    const result = await runStepInFreshNamespace(
      pyodide,
      'def fact(k):\n    return 1 if k <= 1 else k * fact(k - 1)\nanswer = fact(n)',
      { globals: { n: 5 }, readBack: 'answer', expect: 'number' },
    )
    expect(result.resultingState).toBe(120)
  })

  it('reports a Python error as a failed run with the message', async () => {
    const result = await runStepInFreshNamespace(pyodide, 'answer = undefined_name + 1', {
      globals: {},
      readBack: 'answer',
      expect: 'number',
    })
    expect(result.hasSyntaxError).toBe(true)
    expect(result.errorMessage).toMatch(/undefined_name/)
  })

  it('captures print output', async () => {
    const result = await runStepInFreshNamespace(pyodide, 'print("hello")\nanswer = 1', {
      globals: {},
      readBack: 'answer',
      expect: 'number',
    })
    expect(result.stdout).toContain('hello')
  })
})

describe('runTrackedArrayInFreshNamespace', () => {
  it('traces the learner\'s own swaps and returns the final array', async () => {
    const result = await runTrackedArrayInFreshNamespace(pyodide, buildTrackedArrayHarness('arr[0], arr[1] = arr[1], arr[0]'), [9, 4, 7])
    // Python's None arrives as undefined; callers test it for truthiness.
    expect(result.error ?? null).toBeNull()
    expect(result.finalArray).toEqual([4, 9, 7])
    expect(result.events.length).toBeGreaterThan(0)
  })

  it('does not leave the harness or learner names in the interpreter', async () => {
    await runTrackedArrayInFreshNamespace(pyodide, buildTrackedArrayHarness('scratch = 1'), [1, 2])
    const check = await runStepInFreshNamespace(pyodide, 'found = [n for n in ("scratch", "arr", "_trace_result") if n in globals()]', {
      globals: {},
      readBack: 'found',
      expect: 'json',
    })
    expect(check.resultingState).toEqual([])
  })
})
