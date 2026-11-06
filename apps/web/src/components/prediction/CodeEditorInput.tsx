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
   * False where the correct answer re-seeds the run, which moves it on by
   * itself. */
  solved: boolean
  /** Move the run on from a solved step. */
  onContinue: () => void
}

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
  const [consoleStdout, setConsoleStdout] = useState('')
  const [consoleStderr, setConsoleStderr] = useState('')
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingRuntime, setLoadingRuntime] = useState(false)
  const [editedSinceSolved, setEditedSinceSolved] = useState(false)

  useEffect(() => {
    if (solved) setEditedSinceSolved(false)
  }, [solved])

  const showContinue = solved && !editedSinceSolved

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
      const out = execution.stdout?.trim() ?? ''
      const err = execution.stderr?.trim() ?? ''
      setConsoleStdout(out)
      setConsoleStderr(err)
      if (out.length > 0 || err.length > 0) {
        setConsoleOpen(true)
      }

      if (execution.runtimeUnavailable) {
        setSyntaxError('Python could not load, so your code was not run. Check your connection and press Run again.')
        return
      }

      if (execution.timedOut) {
        const timeoutMsg =
          execution.errorMessage ??
          'Execution timed out after 2.0s (possible infinite loop). The Python sandbox was safely reset.'
        setSyntaxError(timeoutMsg)
        onSubmit(
          {
            isLogicallyCorrect: false,
            hasSyntaxError: true,
            resultingState: null,
            errorExplanation: timeoutMsg,
            bugType: 'syntax',
            correctiveHint: 'Check your loop termination condition so the loop makes progress toward stopping.',
            codeReview: null,
            executeVisually: false,
          },
          code,
        )
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

  const available = Object.keys(spec.globals)
  const hasConsoleOutput = consoleStdout.length > 0 || consoleStderr.length > 0

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="shrink-0">
        {task.rungCount > 1 && (
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

      <div className="flex shrink-0 items-center justify-between border-b border-border pb-1.5">
        <div className="flex items-center gap-4" role="tablist" aria-label="Language">
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
        {hasConsoleOutput && language === 'python' && (
          <button
            type="button"
            onClick={() => setConsoleOpen((prev) => !prev)}
            aria-expanded={consoleOpen}
            className="rounded border border-border bg-surface-sunk px-2 py-0.5 font-mono text-[11px] font-medium text-text-secondary hover:text-text-primary dark:border-dark-border dark:text-dark-text-secondary"
          >
            {consoleOpen ? 'Hide console' : 'Show console'}
          </button>
        )}
      </div>

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

      {hasConsoleOutput && consoleOpen && language === 'python' && (
        <div
          className="max-h-28 shrink-0 overflow-y-auto rounded-sm border border-border bg-surface-sunk px-2.5 py-1.5 font-mono text-[11px] dark:border-dark-border"
          role="log"
          aria-label="Python console output"
        >
          {consoleStdout.length > 0 && (
            <pre className="whitespace-pre-wrap text-text-primary dark:text-dark-text-primary">{consoleStdout}</pre>
          )}
          {consoleStderr.length > 0 && (
            <pre className="whitespace-pre-wrap text-error">{consoleStderr}</pre>
          )}
        </div>
      )}

      {syntaxError && language === 'python' && <p className="shrink-0 text-[12px] text-error">{syntaxError}</p>}

      <p className="shrink-0 text-[12px] text-text-muted dark:text-dark-text-secondary">
        {language === 'python' ? (
          available.length > 0 ? (
            <>
              Already defined for you: <span className="font-mono">{available.join(', ')}</span>. You can also use{' '}
              <span className="font-mono">print(...)</span> to inspect values.
            </>
          ) : (
            'Write the code for this step. Use print(...) to inspect values.'
          )
        ) : (
          'Java is here to read. Only the Python tab runs, in a sandbox in your browser.'
        )}
      </p>

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
