import type { PyodideInterface } from 'pyodide'

// Pinned to the exact installed `pyodide` npm package version so the JS
// loader and the WASM/stdlib assets it fetches can never mismatch (a test
// checks this). Served from jsdelivr's npm mirror (a direct copy of the
// published package) rather than committing ~13MB of binary WASM/zip
// assets to this repo. The npm package keeps its files at the package
// root; the /full/ directory exists only on Pyodide's own CDN, and pointing
// here at /full/ made every Code Mode run fail until 2026-09-30.
export const PYODIDE_INDEX_URL = 'https://cdn.jsdelivr.net/npm/pyodide@314.0.7/'

export type PyodideStatus = 'idle' | 'loading' | 'ready' | 'failed'

let pyodidePromise: Promise<PyodideInterface> | null = null
let status: PyodideStatus = 'idle'

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
        // Not cached: the next run tries again instead of failing forever.
        status = 'failed'
        pyodidePromise = null
        throw error
      })
  }
  return pyodidePromise
}

/**
 * Starts downloading the runtime (~13MB) in the background, so it is ready
 * by the first code question instead of making the student wait ~40s on a
 * slow connection at "Run my code". Called when Code Mode is switched on.
 */
export function preloadPyodide(): void {
  getPyodide().catch(() => {
    // Surfaced by the next run, which retries the load.
  })
}

/** Test seam: forget the loaded runtime. */
export function resetPyodideForTests(): void {
  pyodidePromise = null
  status = 'idle'
}

/** What a challenge hands the sandbox, and what it reads back out. */
export interface PythonStepSpec {
  /** Globals set before the student's code runs, by name. */
  globals: Record<string, unknown>
  /** The global read back afterwards; usually the one they mutate. */
  readBack: string
  /**
   * The shape the read-back value must still have. A student who
   * reassigns `arr` to a string has not solved the step, and saying so
   * precisely is more useful than letting a shape mismatch surface later
   * as a confusing grading result.
   */
  expect: 'number[]' | 'number[][]' | 'number' | 'boolean' | 'string' | 'json'
}

export interface PythonExecutionResult {
  hasSyntaxError: boolean
  /** The read-back value after running the student's code, or null if it
   * raised. Shape depends on the challenge's `expect`. */
  resultingState: unknown
  /** Raw Python error message (syntax or runtime), or null on success. */
  errorMessage: string | null
  /** The Python runtime itself could not load (network, CDN). Nothing ran,
   * so this is not the student's error and must not be graded as one. */
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

/**
 * Runs student code for one step of any topic's code challenge.
 *
 * This replaced runSwapDecisionPython, which hardcoded Bubble Sort's
 * shape (`arr` and `j` in, `arr` out) and so was the reason Code Mode
 * existed on exactly one topic. A challenge now declares what goes in and
 * what comes back, so a tree, a graph or a counter works the same way.
 *
 * Execution is real, in Pyodide's WASM sandbox, which has no filesystem
 * or network access. The model is never asked to "mentally execute" code
 * and report a result as fact; it only ever explains a result computed
 * here.
 */
export async function runPythonStep(code: string, spec: PythonStepSpec): Promise<PythonExecutionResult> {
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

  const names = Object.keys(spec.globals)
  try {
    for (const [name, value] of Object.entries(spec.globals)) {
      pyodide.globals.set(name, pyodide.toPy(value))
    }
    await pyodide.runPythonAsync(code)
    const raw = toJsDeep(pyodide.globals.get(spec.readBack))
    const complaint = shapeComplaint(raw, spec.expect, spec.readBack)
    if (complaint) return { hasSyntaxError: true, resultingState: null, errorMessage: complaint }
    return { hasSyntaxError: false, resultingState: raw, errorMessage: null }
  } catch (error) {
    return {
      hasSyntaxError: true,
      resultingState: null,
      errorMessage: error instanceof Error ? error.message : String(error),
    }
  } finally {
    // One sandbox is reused across every run, so a name left behind would
    // leak into the next challenge and could make wrong code appear to
    // work. Clear what this run set.
    for (const name of [...names, spec.readBack]) {
      try {
        pyodide.globals.delete(name)
      } catch {
        // Already gone, which is the state we wanted.
      }
    }
  }
}
