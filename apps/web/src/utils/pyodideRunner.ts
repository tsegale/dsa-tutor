import type { PyodideInterface } from 'pyodide'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import {
  buildTrackedArrayHarness,
  traceEventsToSnapshots,
  type RawPythonTraceEvent,
} from './trackedPythonScript'
import type {
  PyodideWorkerRequest,
  PyodideWorkerResponse,
  RawTrackedArrayWorkerResult,
} from '../workers/pyodide.worker'

// Pinned to the exact installed `pyodide` npm package version so the JS
// loader and the WASM/stdlib assets it fetches can never mismatch (a test
// checks this). Served from jsdelivr's npm mirror (a direct copy of the
// published package) rather than committing ~13MB of binary WASM/zip
// assets to this repo.
export const PYODIDE_INDEX_URL = 'https://cdn.jsdelivr.net/npm/pyodide@314.0.7/'

export const DEFAULT_PYTHON_TIMEOUT_MS = 2000

export type PyodideStatus = 'idle' | 'loading' | 'ready' | 'failed'

let pyodidePromise: Promise<PyodideInterface> | null = null
let status: PyodideStatus = 'idle'

// Browser Web Worker state (isolated from the main UI thread).
let activeWorker: Worker | null = null
let workerPreloadPromise: Promise<void> | null = null
let nextRequestId = 1
let customWorkerFactory: (() => Worker) | null = null

function shouldUseWorker(): boolean {
  if (customWorkerFactory !== null) return true
  return typeof Worker !== 'undefined' && !import.meta.env.VITEST
}

/** Test seam: inject a stub Worker to verify timeout termination in unit tests. */
export function setWorkerFactoryForTests(factory: (() => Worker) | null): void {
  customWorkerFactory = factory
}

function getOrCreateWorker(): Worker {
  if (!activeWorker) {
    activeWorker = customWorkerFactory
      ? customWorkerFactory()
      : new Worker(new URL('../workers/pyodide.worker.ts', import.meta.url), { type: 'module' })
  }
  return activeWorker
}

function terminateAndResetWorker(): void {
  if (activeWorker) {
    try {
      activeWorker.terminate()
    } catch {
      // Ignore termination errors on disposed workers.
    }
    activeWorker = null
  }
  workerPreloadPromise = null
  status = 'idle'
}

function ensureWorkerReady(): Promise<void> {
  if (workerPreloadPromise) return workerPreloadPromise
  status = 'loading'
  const worker = getOrCreateWorker()
  const reqId = nextRequestId++

  workerPreloadPromise = new Promise<void>((resolve, reject) => {
    const onMessage = (event: MessageEvent<PyodideWorkerResponse>) => {
      if (event.data?.id !== reqId || event.data.type !== 'preload') return
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
      if (event.data.ok) {
        status = 'ready'
        resolve()
      } else {
        status = 'failed'
        workerPreloadPromise = null
        reject(new Error(event.data.error ?? 'Failed to load Pyodide worker'))
      }
    }
    const onError = (err: ErrorEvent) => {
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
      status = 'failed'
      workerPreloadPromise = null
      reject(new Error(err.message || 'Pyodide worker crashed during load'))
    }
    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)
    const msg: PyodideWorkerRequest = { id: reqId, type: 'preload', indexURL: PYODIDE_INDEX_URL }
    worker.postMessage(msg)
  })

  return workerPreloadPromise
}

/** Where the Python runtime is: the button label says "loading" until ready. */
export function pyodideStatus(): PyodideStatus {
  return status
}

function getPyodide(): Promise<PyodideInterface> {
  if (!pyodidePromise) {
    status = 'loading'
    pyodidePromise = import('pyodide')
      .then(({ loadPyodide }) => loadPyodide({ indexURL: PYODIDE_INDEX_URL }))
      .then((pyodide) => {
        status = 'ready'
        return pyodide
      })
      .catch((error: unknown) => {
        status = 'failed'
        pyodidePromise = null
        throw error
      })
  }
  return pyodidePromise
}

/**
 * Starts downloading the runtime (~13MB) in the background, so it is ready
 * by the first code question instead of making the student wait on "Run my code".
 */
export function preloadPyodide(): void {
  if (shouldUseWorker()) {
    ensureWorkerReady().catch(() => {
      // Surfaced by the next run, which retries the load.
    })
    return
  }
  getPyodide().catch(() => {
    // Surfaced by the next run, which retries the load.
  })
}

/** Test seam: forget the loaded runtime. */
export function resetPyodideForTests(): void {
  pyodidePromise = null
  customWorkerFactory = null
  terminateAndResetWorker()
  status = 'idle'
}

/** What a challenge hands the sandbox, and what it reads back out. */
export interface PythonStepSpec {
  /** Globals set before the student's code runs, by name. */
  globals: Record<string, unknown>
  /** The global read back afterwards; usually the one they mutate. */
  readBack: string
  /** The shape the read-back value must still have. */
  expect: 'number[]' | 'number[][]' | 'number' | 'boolean' | 'string' | 'json'
}

export interface PythonExecutionResult {
  hasSyntaxError: boolean
  /** The read-back value after running the student's code, or null if it raised. */
  resultingState: unknown
  /** Raw Python error message (syntax or runtime), or null on success. */
  errorMessage: string | null
  /** The Python runtime itself could not load (network, CDN). */
  runtimeUnavailable?: boolean
  /** Captured print(...) output from sys.stdout. */
  stdout?: string
  /** Captured error/warning text from sys.stderr. */
  stderr?: string
  /** True when execution exceeded the watchdog timeout and the worker was terminated. */
  timedOut?: boolean
}

export interface TrackedArrayExecutionResult {
  snapshots: AlgorithmSnapshot[]
  stdout: string
  stderr: string
  errorMessage: string | null
  timedOut?: boolean
  runtimeUnavailable?: boolean
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

/** Pyodide hands back PyProxy objects for lists and dicts; convert and free. */
function toJsDeep(value: unknown): unknown {
  if (value && typeof value === 'object' && 'toJs' in value) {
    const proxy = value as { toJs: (opts?: unknown) => unknown; destroy?: () => void }
    const converted = proxy.toJs({ dict_converter: Object.fromEntries })
    proxy.destroy?.()
    return converted
  }
  return value
}

async function runPythonStepInWorker(
  code: string,
  spec: PythonStepSpec,
  timeoutMs: number,
): Promise<PythonExecutionResult> {
  try {
    await ensureWorkerReady()
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

  const worker = getOrCreateWorker()
  const reqId = nextRequestId++

  return new Promise<PythonExecutionResult>((resolve) => {
    const timer = setTimeout(() => {
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
      terminateAndResetWorker()
      const seconds = (timeoutMs / 1000).toFixed(1)
      resolve({
        hasSyntaxError: true,
        resultingState: null,
        timedOut: true,
        errorMessage: `Execution timed out after ${seconds}s (possible infinite loop). The Python sandbox was safely reset.`,
        stdout: '',
        stderr: `TimeoutError: Execution exceeded ${seconds}s limit.`,
      })
    }, timeoutMs)

    const onMessage = (event: MessageEvent<PyodideWorkerResponse>) => {
      if (event.data?.id !== reqId || event.data.type !== 'runStep') return
      clearTimeout(timer)
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
      resolve(event.data.result)
    }

    const onError = (err: ErrorEvent) => {
      clearTimeout(timer)
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
      terminateAndResetWorker()
      resolve({
        hasSyntaxError: true,
        resultingState: null,
        errorMessage: err.message || 'Python worker terminated unexpectedly.',
        stdout: '',
        stderr: err.message || '',
      })
    }

    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)
    const msg: PyodideWorkerRequest = {
      id: reqId,
      type: 'runStep',
      indexURL: PYODIDE_INDEX_URL,
      code,
      spec,
    }
    worker.postMessage(msg)
  })
}

/**
 * Runs student code for one step of any topic's code challenge.
 * In browser environments, executes inside a dedicated Web Worker with an
 * infinite-loop watchdog timeout so `while True:` never freezes the UI.
 */
export async function runPythonStep(
  code: string,
  spec: PythonStepSpec,
  timeoutMs: number = DEFAULT_PYTHON_TIMEOUT_MS,
): Promise<PythonExecutionResult> {
  if (shouldUseWorker()) {
    return runPythonStepInWorker(code, spec, timeoutMs)
  }

  let pyodide: PyodideInterface
  try {
    pyodide = await getPyodide()
  } catch (error) {
    return {
      hasSyntaxError: false,
      resultingState: null,
      errorMessage: error instanceof Error ? error.message : String(error),
      runtimeUnavailable: true,
    }
  }

  const outLines: string[] = []
  const errLines: string[] = []
  const maybeStd = pyodide as Partial<PyodideInterface>
  if (typeof maybeStd.setStdout === 'function') {
    maybeStd.setStdout({ batched: (msg: string) => outLines.push(msg) })
  }
  if (typeof maybeStd.setStderr === 'function') {
    maybeStd.setStderr({ batched: (msg: string) => errLines.push(msg) })
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
    for (const name of [...names, spec.readBack]) {
      try {
        pyodide.globals.delete(name)
      } catch {
        // Already gone, which is the state we wanted.
      }
    }
  }
}

/**
 * Runs arbitrary learner Python against a tracked list `arr` and converts
 * every element comparison, write, and swap into live `AlgorithmSnapshot[]`
 * so the learner can watch their own code drive the main canvas.
 */
export async function runTrackedArrayPython(
  code: string,
  initialArray: number[],
  timeoutMs = 2500,
): Promise<TrackedArrayExecutionResult> {
  if (shouldUseWorker()) {
    try {
      await ensureWorkerReady()
    } catch (error) {
      return {
        snapshots: [],
        stdout: '',
        stderr: '',
        errorMessage: error instanceof Error ? error.message : String(error),
        runtimeUnavailable: true,
      }
    }

    const worker = getOrCreateWorker()
    const reqId = nextRequestId++

    const rawResult = await new Promise<RawTrackedArrayWorkerResult & { timedOut?: boolean }>((resolve) => {
      const timer = setTimeout(() => {
        worker.removeEventListener('message', onMessage)
        worker.removeEventListener('error', onError)
        terminateAndResetWorker()
        const seconds = (timeoutMs / 1000).toFixed(1)
        resolve({
          events: [],
          finalArray: [...initialArray],
          truncated: false,
          stdout: '',
          stderr: `TimeoutError: Execution exceeded ${seconds}s limit.`,
          error: `Execution timed out after ${seconds}s (possible infinite loop). The Python sandbox was safely reset.`,
          timedOut: true,
        })
      }, timeoutMs)

      const onMessage = (event: MessageEvent<PyodideWorkerResponse>) => {
        if (event.data?.id !== reqId || event.data.type !== 'runTrackedArray') return
        clearTimeout(timer)
        worker.removeEventListener('message', onMessage)
        worker.removeEventListener('error', onError)
        resolve(event.data.result)
      }

      const onError = (err: ErrorEvent) => {
        clearTimeout(timer)
        worker.removeEventListener('message', onMessage)
        worker.removeEventListener('error', onError)
        terminateAndResetWorker()
        resolve({
          events: [],
          finalArray: [...initialArray],
          truncated: false,
          stdout: '',
          stderr: err.message || '',
          error: err.message || 'Python worker terminated unexpectedly.',
        })
      }

      worker.addEventListener('message', onMessage)
      worker.addEventListener('error', onError)
      const msg: PyodideWorkerRequest = {
        id: reqId,
        type: 'runTrackedArray',
        indexURL: PYODIDE_INDEX_URL,
        code,
        initialArray,
      }
      worker.postMessage(msg)
    })

    if (rawResult.runtimeUnavailable) {
      return {
        snapshots: [],
        stdout: '',
        stderr: '',
        errorMessage: rawResult.error,
        runtimeUnavailable: true,
      }
    }

    if (rawResult.error) {
      return {
        snapshots: [],
        stdout: rawResult.stdout,
        stderr: rawResult.stderr,
        errorMessage: rawResult.error,
        timedOut: rawResult.timedOut,
      }
    }

    return {
      snapshots: traceEventsToSnapshots(
        initialArray,
        rawResult.events,
        rawResult.finalArray,
        rawResult.truncated,
      ),
      stdout: rawResult.stdout,
      stderr: rawResult.stderr,
      errorMessage: null,
    }
  }

  let pyodide: PyodideInterface
  try {
    pyodide = await getPyodide()
  } catch (error) {
    return {
      snapshots: [],
      stdout: '',
      stderr: '',
      errorMessage: error instanceof Error ? error.message : String(error),
      runtimeUnavailable: true,
    }
  }

  try {
    pyodide.globals.set('_initial_arr', pyodide.toPy(initialArray))
    await pyodide.runPythonAsync(buildTrackedArrayHarness(code))
    const raw = toJsDeep(pyodide.globals.get('_trace_result')) as {
      events: RawPythonTraceEvent[]
      finalArray: number[]
      truncated: boolean
      stdout: string
      stderr: string
      error: string | null
    }
    if (raw.error) {
      return {
        snapshots: [],
        stdout: raw.stdout ?? '',
        stderr: raw.stderr ?? '',
        errorMessage: raw.error,
      }
    }
    return {
      snapshots: traceEventsToSnapshots(initialArray, raw.events, raw.finalArray, raw.truncated),
      stdout: raw.stdout ?? '',
      stderr: raw.stderr ?? '',
      errorMessage: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      snapshots: [],
      stdout: '',
      stderr: message,
      errorMessage: message,
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
