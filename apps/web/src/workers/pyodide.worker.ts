import type { PyodideInterface } from 'pyodide'
import type { PythonExecutionResult, PythonStepSpec } from '../utils/pyodideRunner'
import { buildTrackedArrayHarness, type RawPythonTraceEvent } from '../utils/trackedPythonScript'

export type PyodideWorkerRequest =
  | { id: number; type: 'preload'; indexURL: string }
  | { id: number; type: 'runStep'; indexURL: string; code: string; spec: PythonStepSpec }
  | { id: number; type: 'runTrackedArray'; indexURL: string; code: string; initialArray: number[] }

export interface RawTrackedArrayWorkerResult {
  events: RawPythonTraceEvent[]
  finalArray: number[]
  truncated: boolean
  stdout: string
  stderr: string
  error: string | null
  runtimeUnavailable?: boolean
}

export type PyodideWorkerResponse =
  | { id: number; type: 'preload'; ok: boolean; error?: string }
  | { id: number; type: 'runStep'; result: PythonExecutionResult }
  | { id: number; type: 'runTrackedArray'; result: RawTrackedArrayWorkerResult }

let pyodidePromise: Promise<PyodideInterface> | null = null

function ensurePyodide(indexURL: string): Promise<PyodideInterface> {
  if (!pyodidePromise) {
    pyodidePromise = import('pyodide')
      .then(({ loadPyodide }) => loadPyodide({ indexURL }))
      .catch((error: unknown) => {
        pyodidePromise = null
        throw error
      })
  }
  return pyodidePromise
}

function shapeComplaint(value: unknown, expect: PythonStepSpec['expect'], name: string): string | null {
  const isNumber = (x: unknown) => typeof x === 'number' && Number.isFinite(x)
  switch (expect) {
    case 'number[]':
      return Array.isArray(value) && value.every(isNumber)
        ? null
        : `'${name}' is no longer a list of numbers.`
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

function toJsDeep(value: unknown): unknown {
  if (value && typeof value === 'object' && 'toJs' in value) {
    const proxy = value as { toJs: (opts?: unknown) => unknown; destroy?: () => void }
    const converted = proxy.toJs({ dict_converter: Object.fromEntries })
    proxy.destroy?.()
    return converted
  }
  return value
}

async function handleRunStep(
  indexURL: string,
  code: string,
  spec: PythonStepSpec,
): Promise<PythonExecutionResult> {
  let pyodide: PyodideInterface
  try {
    pyodide = await ensurePyodide(indexURL)
  } catch (error) {
    return {
      hasSyntaxError: false,
      resultingState: null,
      errorMessage: error instanceof Error ? error.message : String(error),
      runtimeUnavailable: true,
      stdout: '',
      stderr: '',
    }
  }

  const outLines: string[] = []
  const errLines: string[] = []
  if (typeof pyodide.setStdout === 'function') {
    pyodide.setStdout({ batched: (msg: string) => outLines.push(msg) })
  }
  if (typeof pyodide.setStderr === 'function') {
    pyodide.setStderr({ batched: (msg: string) => errLines.push(msg) })
  }

  const names = Object.keys(spec.globals)
  try {
    for (const [name, value] of Object.entries(spec.globals)) {
      pyodide.globals.set(name, pyodide.toPy(value))
    }
    await pyodide.runPythonAsync(code)
    const raw = toJsDeep(pyodide.globals.get(spec.readBack))
    const stdout = outLines.join('\n')
    const stderr = errLines.join('\n')
    const complaint = shapeComplaint(raw, spec.expect, spec.readBack)
    if (complaint) {
      return {
        hasSyntaxError: true,
        resultingState: null,
        errorMessage: complaint,
        stdout,
        stderr,
      }
    }
    return {
      hasSyntaxError: false,
      resultingState: raw,
      errorMessage: null,
      stdout,
      stderr,
    }
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
    for (const name of [...names, spec.readBack]) {
      try {
        pyodide.globals.delete(name)
      } catch {
        // Already absent.
      }
    }
  }
}

async function handleRunTrackedArray(
  indexURL: string,
  code: string,
  initialArray: number[],
): Promise<RawTrackedArrayWorkerResult> {
  let pyodide: PyodideInterface
  try {
    pyodide = await ensurePyodide(indexURL)
  } catch (error) {
    return {
      events: [],
      finalArray: [...initialArray],
      truncated: false,
      stdout: '',
      stderr: '',
      error: error instanceof Error ? error.message : String(error),
      runtimeUnavailable: true,
    }
  }

  try {
    pyodide.globals.set('_initial_arr', pyodide.toPy(initialArray))
    await pyodide.runPythonAsync(buildTrackedArrayHarness(code))
    const raw = toJsDeep(pyodide.globals.get('_trace_result')) as RawTrackedArrayWorkerResult
    return raw
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      events: [],
      finalArray: [...initialArray],
      truncated: false,
      stdout: '',
      stderr: msg,
      error: msg,
    }
  } finally {
    for (const name of ['_initial_arr', '_trace_result', 'arr']) {
      try {
        pyodide.globals.delete(name)
      } catch {
        // Already absent.
      }
    }
  }
}

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<PyodideWorkerRequest>) => void) | null
  postMessage: (message: PyodideWorkerResponse) => void
}

workerScope.onmessage = (event: MessageEvent<PyodideWorkerRequest>) => {
  const msg = event.data
  if (msg.type === 'preload') {
    ensurePyodide(msg.indexURL)
      .then(() => {
        workerScope.postMessage({ id: msg.id, type: 'preload', ok: true })
      })
      .catch((err: unknown) => {
        workerScope.postMessage({
          id: msg.id,
          type: 'preload',
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        })
      })
    return
  }

  if (msg.type === 'runStep') {
    void handleRunStep(msg.indexURL, msg.code, msg.spec).then((result) => {
      workerScope.postMessage({ id: msg.id, type: 'runStep', result })
    })
    return
  }

  if (msg.type === 'runTrackedArray') {
    void handleRunTrackedArray(msg.indexURL, msg.code, msg.initialArray).then((result) => {
      workerScope.postMessage({ id: msg.id, type: 'runTrackedArray', result })
    })
  }
}
