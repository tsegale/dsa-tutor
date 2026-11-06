import { beforeEach, describe, expect, it, vi } from 'vitest'
import pyodidePackage from 'pyodide/package.json?raw'

const { loadPyodide } = vi.hoisted(() => ({ loadPyodide: vi.fn() }))
vi.mock('pyodide', () => ({ loadPyodide }))

import {
  PYODIDE_INDEX_URL,
  preloadPyodide,
  pyodideStatus,
  resetPyodideForTests,
  runPythonStep,
  setWorkerFactoryForTests,
} from './pyodideRunner'
import { traceEventsToSnapshots } from './trackedPythonScript'

/** A stand-in runtime: runs nothing, hands back the globals as they were
 * set, and remembers what was deleted so the cleanup can be asserted. */
function fakeRuntime() {
  const globals = new Map<string, unknown>()
  const deleted: string[] = []
  return {
    globals: {
      set: (key: string, value: unknown) => globals.set(key, value),
      get: (key: string) => globals.get(key),
      delete: (key: string) => {
        deleted.push(key)
        globals.delete(key)
      },
    },
    toPy: (value: unknown) => value,
    runPythonAsync: vi.fn(async () => undefined),
    deleted,
    remaining: globals,
  }
}

const arrStep = { globals: { arr: [2, 1], j: 0 }, readBack: 'arr', expect: 'number[]' } as const

beforeEach(() => {
  loadPyodide.mockReset()
  resetPyodideForTests()
})

describe('Pyodide asset URL', () => {
  it('points at the installed package version, at the package root where its runtime files live', () => {
    const { version } = JSON.parse(pyodidePackage) as { version: string }
    // The npm mirror has no /full/ directory; that path 404ed every run.
    expect(PYODIDE_INDEX_URL).toBe(`https://cdn.jsdelivr.net/npm/pyodide@${version}/`)
  })
})

describe('Pyodide loading', () => {
  it('preloads once in the background and reports when it is ready', async () => {
    loadPyodide.mockResolvedValue(fakeRuntime())
    expect(pyodideStatus()).toBe('idle')
    preloadPyodide()
    expect(pyodideStatus()).toBe('loading')
    preloadPyodide()
    await runPythonStep('pass', arrStep)
    expect(pyodideStatus()).toBe('ready')
    expect(loadPyodide).toHaveBeenCalledTimes(1)
  })

  it('treats a failed load as unavailable, not as the student\'s syntax error, and retries next time', async () => {
    loadPyodide.mockRejectedValueOnce(new Error('Failed to fetch')).mockResolvedValueOnce(fakeRuntime())

    const failed = await runPythonStep('pass', arrStep)
    expect(failed).toMatchObject({ runtimeUnavailable: true, hasSyntaxError: false, resultingState: null })
    expect(pyodideStatus()).toBe('failed')

    const retried = await runPythonStep('pass', arrStep)
    expect(retried).toMatchObject({ hasSyntaxError: false, resultingState: [2, 1] })
    expect(retried.runtimeUnavailable).toBeUndefined()
    expect(loadPyodide).toHaveBeenCalledTimes(2)
  })
})

// ---------------------------------------------------------------------------
// The runner takes a spec rather than an array.
//
// It used to be runSwapDecisionPython(code, arr, j): Bubble Sort's shape,
// hardcoded, which is why Code Mode existed on exactly one topic. A
// challenge now declares its own globals and its own read-back.

describe('a challenge-declared step', () => {
  it('hands over whatever globals the challenge named, and reads back the one it asked for', async () => {
    const runtime = fakeRuntime()
    loadPyodide.mockResolvedValue(runtime)

    const result = await runPythonStep('pass', {
      globals: { base: 64, size: 4, i: 2 },
      readBack: 'base',
      expect: 'number',
    })

    expect(result).toMatchObject({ hasSyntaxError: false, resultingState: 64, errorMessage: null })
  })

  it('clears every global it set, so a name cannot leak into the next challenge', async () => {
    // One sandbox is reused for the whole session. A leftover `arr` from
    // the previous topic would let code that never assigns `arr` read the
    // old value and be graded as if it had produced it.
    const runtime = fakeRuntime()
    loadPyodide.mockResolvedValue(runtime)

    await runPythonStep('pass', arrStep)

    expect(runtime.deleted).toEqual(expect.arrayContaining(['arr', 'j']))
    expect(runtime.remaining.size).toBe(0)
  })

  it('clears the globals even when the student code raises', async () => {
    const runtime = fakeRuntime()
    runtime.runPythonAsync = vi.fn(async () => {
      throw new Error('NameError: name "x" is not defined')
    })
    loadPyodide.mockResolvedValue(runtime)

    const result = await runPythonStep('x + 1', arrStep)

    expect(result.hasSyntaxError).toBe(true)
    expect(result.errorMessage).toContain('NameError')
    expect(runtime.remaining.size).toBe(0)
  })
})

describe('the read-back shape', () => {
  async function readingBack(value: unknown, expectShape: 'number[]' | 'number' | 'boolean' | 'number[][]') {
    // A fresh runtime per call: the loaded one is cached for the session,
    // so without this the second call in a test would read the first
    // runtime's globals - which the runner has by then correctly cleared.
    resetPyodideForTests()
    const runtime = fakeRuntime()
    loadPyodide.mockResolvedValue(runtime)
    runtime.runPythonAsync = vi.fn(async () => {
      runtime.globals.set('out', value)
    })
    return runPythonStep('pass', { globals: {}, readBack: 'out', expect: expectShape })
  }

  it('accepts the declared shape', async () => {
    await expect(readingBack([1, 2, 3], 'number[]')).resolves.toMatchObject({ resultingState: [1, 2, 3] })
    await expect(readingBack(72, 'number')).resolves.toMatchObject({ resultingState: 72 })
    await expect(readingBack(true, 'boolean')).resolves.toMatchObject({ resultingState: true })
    await expect(readingBack([[1], [2]], 'number[][]')).resolves.toMatchObject({ resultingState: [[1], [2]] })
  })

  it('says what went wrong when the student replaced the value with another type', async () => {
    // Reassigning `arr` to a string is not a solution to the step, and
    // saying so here is more use than letting the mismatch surface later
    // as a confusing grading result.
    const result = await readingBack('sorted!', 'number[]')
    expect(result.hasSyntaxError).toBe(true)
    expect(result.errorMessage).toContain("'out' is no longer a list of numbers")
    expect(result.resultingState).toBeNull()
  })

  it('rejects NaN and Infinity as numbers', async () => {
    // A division by zero or an unset accumulator reaching the grader as a
    // number would be compared against the expected answer and reported
    // as a wrong answer rather than as broken code.
    await expect(readingBack(Number.NaN, 'number')).resolves.toMatchObject({ hasSyntaxError: true })
    await expect(readingBack(Number.POSITIVE_INFINITY, 'number')).resolves.toMatchObject({ hasSyntaxError: true })
  })

  it('does not accept a number where a boolean was asked for', async () => {
    const result = await readingBack(1, 'boolean')
    expect(result.hasSyntaxError).toBe(true)
    expect(result.errorMessage).toContain('True or False')
  })
})

describe('Web Worker watchdog, console capture, and tracked canvas snapshots', () => {
  it('captures stdout and stderr when runtime hooks are available', async () => {
    let stdoutHandler: ((msg: string) => void) | null = null
    const runtime = {
      ...fakeRuntime(),
      setStdout: ({ batched }: { batched: (msg: string) => void }) => {
        stdoutHandler = batched
      },
      runPythonAsync: vi.fn(async () => {
        stdoutHandler?.('inspect j=0')
      }),
    }
    loadPyodide.mockResolvedValue(runtime)

    const result = await runPythonStep('print("inspect j=0")', arrStep)
    expect(result.hasSyntaxError).toBe(false)
    expect(result.stdout).toBe('inspect j=0')
  })

  it('terminates a hung Web Worker on infinite-loop timeout and respawns cleanly next run', async () => {
    let spawnedCount = 0
    const terminateFns: Array<ReturnType<typeof vi.fn>> = []

    setWorkerFactoryForTests(() => {
      spawnedCount += 1
      const currentSpawn = spawnedCount
      const listeners = new Map<string, Set<(e: MessageEvent) => void>>()
      const terminate = vi.fn()
      terminateFns.push(terminate)

      const fakeWorker = {
        addEventListener: (type: string, cb: (e: MessageEvent) => void) => {
          if (!listeners.has(type)) listeners.set(type, new Set())
          listeners.get(type)!.add(cb)
        },
        removeEventListener: (type: string, cb: (e: MessageEvent) => void) => {
          listeners.get(type)?.delete(cb)
        },
        postMessage: (msg: { id: number; type: string }) => {
          if (msg.type === 'preload') {
            queueMicrotask(() => {
              listeners.get('message')?.forEach((cb) =>
                cb({ data: { id: msg.id, type: 'preload', ok: true } } as MessageEvent),
              )
            })
            return
          }
          // First worker hangs forever on runStep (`while True: pass`); second worker responds cleanly.
          if (msg.type === 'runStep' && currentSpawn >= 2) {
            queueMicrotask(() => {
              listeners.get('message')?.forEach((cb) =>
                cb({
                  data: {
                    id: msg.id,
                    type: 'runStep',
                    result: {
                      hasSyntaxError: false,
                      resultingState: [1, 2],
                      errorMessage: null,
                      stdout: 'recovered',
                      stderr: '',
                    },
                  },
                } as MessageEvent),
              )
            })
          }
        },
        terminate,
      }
      return fakeWorker as unknown as Worker
    })

    const timedOutResult = await runPythonStep('while True: pass', arrStep, 30)
    expect(timedOutResult.timedOut).toBe(true)
    expect(timedOutResult.hasSyntaxError).toBe(true)
    expect(timedOutResult.errorMessage).toContain('timed out')
    expect(terminateFns[0]).toHaveBeenCalledTimes(1)

    const nextResult = await runPythonStep('arr[0], arr[1] = arr[1], arr[0]', arrStep, 200)
    expect(spawnedCount).toBe(2)
    expect(nextResult.hasSyntaxError).toBe(false)
    expect(nextResult.resultingState).toEqual([1, 2])
    expect(nextResult.stdout).toBe('recovered')
  })

  it('converts recorded Python compare and swap trace events into valid AlgorithmSnapshots', () => {
    const snapshots = traceEventsToSnapshots(
      [5, 2],
      [
        { kind: 'compare', indices: [0, 1], array: [5, 2], description: 'Compared arr[0] (5) > arr[1] (2)' },
        { kind: 'swap', indices: [0, 1], array: [2, 5], description: 'Swapped arr[0] and arr[1] -> [2, 5].' },
      ],
      [2, 5],
      false,
    )
    expect(snapshots).toHaveLength(4)
    expect(snapshots[1].comparedIndices).toEqual([0, 1])
    expect(snapshots[2].swappedIndices).toEqual([0, 1])
    expect(snapshots[3].isFinalStep).toBe(true)
    expect(snapshots[3].highlightIndices).toEqual([0, 1])
  })
})
