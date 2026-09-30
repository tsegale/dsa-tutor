import type { PyodideInterface } from 'pyodide'

// Pinned to the exact installed `pyodide` npm package version so the JS
// loader and the WASM/stdlib assets it fetches can never mismatch (a test
// checks this). Served from jsdelivr's npm mirror (a direct copy of the
// published package) rather than committing ~13MB of binary WASM/zip
// assets to this repo. The npm package keeps its files at the package
// root; the /full/ directory exists only on Pyodide's own CDN, and pointing
// here at /full/ made every Code Mode run fail until 2026-09-30.
export const PYODIDE_INDEX_URL = 'https://cdn.jsdelivr.net/npm/pyodide@314.0.7/'

let pyodidePromise: Promise<PyodideInterface> | null = null

function getPyodide(): Promise<PyodideInterface> {
  if (!pyodidePromise) {
    pyodidePromise = import('pyodide').then(({ loadPyodide }) => loadPyodide({ indexURL: PYODIDE_INDEX_URL }))
  }
  return pyodidePromise
}

export interface PythonExecutionResult {
  hasSyntaxError: boolean
  /** The array after running the student's code, or null if it raised. */
  resultingState: number[] | null
  /** Raw Python error message (syntax or runtime), or null on success. */
  errorMessage: string | null
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
  try {
    const pyodide = await getPyodide()
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
