import { lazy, Suspense, useEffect, useState } from 'react'
import type { CodeEvalResponse } from '@dsa-tutor/types'
import { evaluateCode } from '@/api/codeEval'
import { preloadPyodide, pyodideStatus, runPythonStep } from '@/utils/pyodideRunner'
import type { CodeTask } from '@/config/codeLadders'
import { cn } from '@/lib/utils'

// CodeMirror is most of the workspace's weight and only Code Mode uses it,
// so it loads when this input first renders, not with every topic.
const CodeMirrorEditor = lazy(() => import('./CodeMirrorEditor'))

interface CodeEditorInputProps {
  stepDescription: string
  /**
   * This question, its sandbox inputs and the expected answer, all
   * assembled from the live run - so nothing can disagree with the canvas.
   * Either one rung of the topic's ladder or its single challenge; this
   * component does not care which.
   */
  task: CodeTask
  activeIndices: number[]
  algorithmName: string
  onSubmit: (result: CodeEvalResponse, submittedCode: string) => void
  onLoadingChange: (loading: boolean) => void
  /** This step's challenge is solved and the run is waiting on the learner.
   * False where the correct answer re-seeded the run, which moves it on by
   * itself. */
  solved: boolean
  /** Move the run on from a solved step. */
  onContinue: () => void
}

// Only Python is executed. Pyodide (see utils/pyodideRunner.ts) runs it in
// a real WASM sandbox; grading Java or pseudocode would mean going back to
// asking an LLM to "mentally execute" untrusted code and trusting its
// answer as fact, which is exactly the defect this sandbox replaces.
//
// The Java tab is therefore read-only, and says so rather than offering a
// Run button that would quietly grade nothing. The brief asks for both
// languages, and reading the same decision written in a second syntax is
// worth having next to the one that runs.
type Language = 'python' | 'java'

export default function CodeEditorInput({
  stepDescription,
  task,
  activeIndices,
  algorithmName,
  onSubmit,
  onLoadingChange,
  solved,
  onContinue,
}: CodeEditorInputProps) {
  const { spec, expected } = task
  const [code, setCode] = useState(task.starter.python)
  const [language, setLanguage] = useState<Language>('python')
  const [syntaxError, setSyntaxError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingRuntime, setLoadingRuntime] = useState(false)
  // Editing after solving puts the Run button back, so a learner who wants
  // to try a second implementation is not stranded behind Continue.
  const [editedSinceSolved, setEditedSinceSolved] = useState(false)
  useEffect(() => {
    if (solved) setEditedSinceSolved(false)
  }, [solved])
  const showContinue = solved && !editedSinceSolved

  // Backstop for the Code Mode toggle's preload (a page opened with Code
  // Mode already on reaches here first).
  useEffect(() => {
    preloadPyodide()
  }, [])

  async function handleSubmit() {
    setIsSubmitting(true)
    setLoadingRuntime(pyodideStatus() !== 'ready')
    onLoadingChange(true)
    setSyntaxError(null)
    try {
      const execution = await runPythonStep(code, spec)
      setLoadingRuntime(false)
      if (execution.runtimeUnavailable) {
        // Nothing ran: not graded, not logged as an answer.
        setSyntaxError('Python could not load, so your code was not run. Check your connection and press Run again.')
        return
      }
      const result = await evaluateCode({
        algorithmName,
        currentState: spec.globals,
        activeIndices,
        expectedState: expected,
        studentCode: code,
        language: 'python',
        stepDescription,
        actualResultingState: execution.resultingState,
        hasSyntaxError: execution.hasSyntaxError,
        executionErrorMessage: execution.errorMessage,
      })
      if (result.hasSyntaxError) {
        setSyntaxError(result.errorExplanation ?? 'Your code could not be evaluated. Check for syntax errors.')
      }
      onSubmit(result, code)
    } finally {
      setIsSubmitting(false)
      setLoadingRuntime(false)
      onLoadingChange(false)
    }
  }

  // Named from the challenge's own globals, so the line can never promise
  // a variable the sandbox was not given. It used to read "you can use
  // index j = ..." on every topic, including the ones with no j.
  const available = Object.keys(spec.globals)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="shrink-0">
        {task.rungCount > 1 && (
          // The ladder's shape, stated: a learner who can see four rungs
          // knows this builds to the whole algorithm rather than stopping
          // at one expression.
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-micro font-bold tracking-wide text-ai uppercase">
              Step {task.rung} of {task.rungCount}
            </span>
            <span className="flex flex-1 gap-1" aria-hidden="true">
              {Array.from({ length: task.rungCount }, (_, index) => (
                <span
                  key={index}
                  className={`h-1 flex-1 rounded-full ${index < task.rung ? 'bg-ai' : 'bg-rule'}`}
                />
              ))}
            </span>
          </div>
        )}
        {task.title && <p className="text-small font-semibold text-ink">{task.title}</p>}
        <p className="font-sans text-[15px] text-text-primary dark:text-dark-text-primary">{task.prompt}</p>
      </div>

      <div className="flex shrink-0 items-center gap-4 border-b border-border pb-1.5" role="tablist" aria-label="Language">
        {(['python', 'java'] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={language === option}
            onClick={() => setLanguage(option)}
            className={cn(
              'border-b-2 pb-0.5 text-sm font-medium transition-colors duration-quick',
              language === option
                ? 'border-primary text-primary'
                : 'border-transparent text-ink-2 hover:text-ink',
            )}
          >
            {option === 'python' ? 'Python' : 'Java'}
          </button>
        ))}
      </div>

      {/* Five lines at the editor's 1.7 line height, plus padding. */}
      <div className="flex min-h-[9.5em] flex-1">
        {language === 'python' ? (
          <Suspense
            fallback={
              <div
                aria-busy="true"
                aria-label="Loading the code editor"
                className="flex-1 rounded-sm border border-rule bg-surface-sunk"
              />
            }
          >
            <CodeMirrorEditor
              value={code}
              onChange={(next) => {
                setCode(next)
                setEditedSinceSolved(true)
              }}
              invalid={syntaxError !== null}
              ariaLabel="Python code for this step"
            />
          </Suspense>
        ) : (
          <pre
            className="flex-1 overflow-auto rounded-sm border border-rule bg-surface-sunk p-2 font-mono text-[13px] text-ink-2"
            aria-label="The same step in Java, for reading"
          >
            {task.starter.java}
          </pre>
        )}
      </div>

      {syntaxError && language === 'python' && <p className="shrink-0 text-[12px] text-error">{syntaxError}</p>}

      <p className="shrink-0 text-[12px] text-text-muted dark:text-dark-text-secondary">
        {language === 'python' ? (
          available.length > 0 ? (
            <>
              Already defined for you: <span className="font-mono">{available.join(', ')}</span>.
            </>
          ) : (
            'Write the code for this step.'
          )
        ) : (
          'Java is here to read. Only the Python tab runs, in a sandbox in your browser.'
        )}
      </p>

      {/* One primary action, and after a correct answer it is the way out.
          It used to stay "Run my code" forever, so a solved step offered
          nothing but running the same code again. */}
      <button
        type="button"
        onClick={showContinue ? onContinue : () => void handleSubmit()}
        disabled={!showContinue && (isSubmitting || language === 'java' || code.trim().length === 0)}
        className="mt-auto flex w-full shrink-0 items-center justify-center rounded-md bg-primary py-2.5 text-sm font-medium text-paper disabled:cursor-not-allowed disabled:opacity-40"
      >
        {showContinue
          ? 'Continue'
          : language === 'java'
            ? 'Switch to Python to run'
            : isSubmitting
              ? loadingRuntime
                ? 'Loading Python (first time only)...'
                : 'Running...'
              : 'Run my code'}
      </button>
    </div>
  )
}
