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

export interface PythonExecutionResult {
  hasSyntaxError: boolean
  /** The array after running the student's code, or null if it raised. */
  resultingState: number[] | null
  /** Raw Python error message (syntax or runtime), or null on success. */
  errorMessage: string | null
  /** The Python runtime itself could not load (network, CDN). Nothing ran,
   * so this is not the student's error and must not be graded as one. */
  runtimeUnavailable?: boolean
}

/**
 * Runs student code for a single adjacent-swap decision (the only shape
 * Code Editor Mode currently offers - see bubbleSortEngine's codeEditorMode
 * comment): `arr` is the current array, `j` is the left of the two
 * compared indices. Real execution in Pyodide's WASM sandbox replaces the
 * old approach of asking an LLM to "mentally execute" the code and report
 * a result as fact - this is deterministic, and Pyodide's WASM sandbox
 * has no filesystem or network access, unlike an LLM given the code as
 * ordinary prompt text.
 */
export async function runSwapDecisionPython(code: string, arr: number[], j: number): Promise<PythonExecutionResult> {
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
  try {
    pyodide.globals.set('arr', pyodide.toPy([...arr]))
    pyodide.globals.set('j', j)
    await pyodide.runPythonAsync(code)
    const resultProxy = pyodide.globals.get('arr')
    const result = resultProxy.toJs() as number[]
    resultProxy.destroy?.()
    if (!Array.isArray(result) || result.length !== arr.length || !result.every((x) => typeof x === 'number')) {
      return {
        hasSyntaxError: true,
        resultingState: null,
        errorMessage: "'arr' was reassigned to something that is no longer a list of the same length.",
      }
    }
    return { hasSyntaxError: false, resultingState: Array.from(result), errorMessage: null }
  } catch (error) {
    return {
      hasSyntaxError: true,
      resultingState: null,
      errorMessage: error instanceof Error ? error.message : String(error),
    }
  }
}
