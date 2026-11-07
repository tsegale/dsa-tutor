import type { PyodideInterface } from 'pyodide'
import type { PythonExecutionResult, PythonStepSpec } from '../utils/pyodideRunner'
import { buildTrackedArrayHarness, type RawPythonTraceEvent } from '../utils/trackedPythonScript'
import { runStepInFreshNamespace, runTrackedArrayInFreshNamespace } from '../utils/pyodideExec'

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

  return runStepInFreshNamespace(pyodide, code, spec)
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

  return runTrackedArrayInFreshNamespace(pyodide, buildTrackedArrayHarness(code), initialArray)
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
