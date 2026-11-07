import type { PyodideInterface } from 'pyodide'
import type { PythonExecutionResult, PythonStepSpec } from './pyodideRunner'
import type { RawTrackedArrayWorkerResult } from '../workers/pyodide.worker'

/**
 * Runs learner code against a Pyodide interpreter, each run in a brand new
 * namespace.
 *
 * The worker keeps one interpreter alive across runs (loading Pyodide takes
 * seconds), and runs used to share its module globals: cleanup deleted only
 * the names the challenge passed in and the one it read back, so anything
 * the learner defined themselves - `temp`, `seen`, `def helper()` - was
 * still there for the next run, on the next junction or the next topic. A
 * later answer could pass by leaning on a variable an earlier one left
 * behind. A fresh dict per run means a run sees exactly the names its
 * challenge gives it.
 *
 * Kept free of worker globals so it can be tested against the real
 * interpreter in Node.
 */

interface PyDict {
  set(key: string, value: unknown): void
  get(key: string): unknown
  destroy(): void
}

type RunOptions = NonNullable<Parameters<PyodideInterface['runPythonAsync']>[1]>

function freshNamespace(pyodide: PyodideInterface): PyDict {
  const makeDict = pyodide.globals.get('dict') as (() => PyDict) & { destroy?: () => void }
  const ns = makeDict()
  makeDict.destroy?.()
  return ns
}

function runIn(pyodide: PyodideInterface, code: string, ns: PyDict): Promise<unknown> {
  return pyodide.runPythonAsync(code, { globals: ns } as unknown as RunOptions)
}

export function shapeComplaint(value: unknown, expect: PythonStepSpec['expect'], name: string): string | null {
  const isNumber = (x: unknown) => typeof x === 'number' && Number.isFinite(x)
  switch (expect) {
    case 'number[]':
      return Array.isArray(value) && value.every(isNumber) ? null : `'${name}' is no longer a list of numbers.`
    case 'number[][]':
      return Array.isArray(value) && value.every((row) => Array.isArray(row) && row.every(isNumber))
        ? null
        : `'${name}' is no longer a list of lists of numbers.`
    case 'number':
      return isNumber(value) ? null : `'${name}' is no longer a number.`
    case 'boolean':
      return typeof value === 'boolean' ? null : `'${name}' is no longer True or False.`
    case 'string':
      return typeof value === 'string' ? null : `'${name}' is no longer a string.`
    case 'json':
      return value === undefined ? `'${name}' was not set.` : null
  }
}

export function toJsDeep(value: unknown): unknown {
  if (value && typeof value === 'object' && 'toJs' in value) {
    const proxy = value as { toJs: (opts?: unknown) => unknown; destroy?: () => void }
    const converted = proxy.toJs({ dict_converter: Object.fromEntries })
    proxy.destroy?.()
    return converted
  }
  return value
}

export async function runStepInFreshNamespace(
  pyodide: PyodideInterface,
  code: string,
  spec: PythonStepSpec,
): Promise<PythonExecutionResult> {
  const outLines: string[] = []
  const errLines: string[] = []
  if (typeof pyodide.setStdout === 'function') {
    pyodide.setStdout({ batched: (msg: string) => outLines.push(msg) })
  }
  if (typeof pyodide.setStderr === 'function') {
    pyodide.setStderr({ batched: (msg: string) => errLines.push(msg) })
  }

  const ns = freshNamespace(pyodide)
  try {
    for (const [name, value] of Object.entries(spec.globals)) {
      ns.set(name, pyodide.toPy(value))
    }
    await runIn(pyodide, code, ns)
    const raw = toJsDeep(ns.get(spec.readBack))
    const stdout = outLines.join('\n')
    const stderr = errLines.join('\n')
    const complaint = shapeComplaint(raw, spec.expect, spec.readBack)
    if (complaint) {
      return { hasSyntaxError: true, resultingState: null, errorMessage: complaint, stdout, stderr }
    }
    return { hasSyntaxError: false, resultingState: raw, errorMessage: null, stdout, stderr }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      hasSyntaxError: true,
      resultingState: null,
      errorMessage: message,
      stdout: outLines.join('\n'),
      stderr: errLines.length > 0 ? errLines.join('\n') : message,
    }
  } finally {
    ns.destroy()
  }
}

export async function runTrackedArrayInFreshNamespace(
  pyodide: PyodideInterface,
  harness: string,
  initialArray: number[],
): Promise<RawTrackedArrayWorkerResult> {
  const ns = freshNamespace(pyodide)
  try {
    ns.set('_initial_arr', pyodide.toPy(initialArray))
    await runIn(pyodide, harness, ns)
    return toJsDeep(ns.get('_trace_result')) as RawTrackedArrayWorkerResult
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { events: [], finalArray: [...initialArray], truncated: false, stdout: '', stderr: msg, error: msg }
  } finally {
    ns.destroy()
  }
}
