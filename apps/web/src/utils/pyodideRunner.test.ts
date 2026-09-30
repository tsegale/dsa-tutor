import { beforeEach, describe, expect, it, vi } from 'vitest'
import pyodidePackage from 'pyodide/package.json?raw'

const { loadPyodide } = vi.hoisted(() => ({ loadPyodide: vi.fn() }))
vi.mock('pyodide', () => ({ loadPyodide }))

import { PYODIDE_INDEX_URL, preloadPyodide, pyodideStatus, resetPyodideForTests, runSwapDecisionPython } from './pyodideRunner'

/** A stand-in runtime: runs nothing, returns `arr` as it was set. */
function fakeRuntime() {
  const globals = new Map<string, unknown>()
  return {
    globals: {
      set: (key: string, value: unknown) => globals.set(key, value),
      get: (key: string) => ({ toJs: () => globals.get(key) }),
    },
    toPy: (value: unknown) => value,
    runPythonAsync: vi.fn(async () => undefined),
  }
}

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
    await runSwapDecisionPython('pass', [2, 1], 0)
    expect(pyodideStatus()).toBe('ready')
    expect(loadPyodide).toHaveBeenCalledTimes(1)
  })

  it('treats a failed load as unavailable, not as the student\'s syntax error, and retries next time', async () => {
    loadPyodide.mockRejectedValueOnce(new Error('Failed to fetch')).mockResolvedValueOnce(fakeRuntime())

    const failed = await runSwapDecisionPython('pass', [2, 1], 0)
    expect(failed).toMatchObject({ runtimeUnavailable: true, hasSyntaxError: false, resultingState: null })
    expect(pyodideStatus()).toBe('failed')

    const retried = await runSwapDecisionPython('pass', [2, 1], 0)
    expect(retried).toMatchObject({ hasSyntaxError: false, resultingState: [2, 1] })
    expect(retried.runtimeUnavailable).toBeUndefined()
    expect(loadPyodide).toHaveBeenCalledTimes(2)
  })
})
