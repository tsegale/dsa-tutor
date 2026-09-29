import { useState } from 'react'
import type { CodeEvalResponse } from '@dsa-tutor/types'
import { evaluateCode } from '@/api/codeEval'
import { runSwapDecisionPython } from '@/utils/pyodideRunner'
import CodeMirrorEditor from './CodeMirrorEditor'

interface CodeEditorInputProps {
  prompt: string
  stepDescription: string
  currentArrayState: number[]
  activeIndices: number[]
  expectedNextState: number[]
  algorithmName: string
  onSubmit: (result: CodeEvalResponse, submittedCode: string) => void
  onLoadingChange: (loading: boolean) => void
}

// Pseudocode and Java were dropped: Pyodide (see utils/pyodideRunner.ts)
// only executes Python, and grading pseudocode or Java would mean going
// back to asking an LLM to "mentally execute" untrusted code and trust
// its answer as fact - exactly the defect this real sandbox replaces.
const STARTER_CODE = 'if arr[j] > arr[j + 1]:\n    arr[j], arr[j + 1] = arr[j + 1], arr[j]'

export default function CodeEditorInput({
  prompt,
  stepDescription,
  currentArrayState,
  activeIndices,
  expectedNextState,
  algorithmName,
  onSubmit,
  onLoadingChange,
}: CodeEditorInputProps) {
  const [code, setCode] = useState(STARTER_CODE)
  const [syntaxError, setSyntaxError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    setIsSubmitting(true)
    onLoadingChange(true)
    setSyntaxError(null)
    try {
      const execution = await runSwapDecisionPython(code, currentArrayState, activeIndices[0])
      const result = await evaluateCode({
        algorithmName,
        currentArrayState,
        activeIndices,
        expectedNextState,
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
      onLoadingChange(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="shrink-0 font-sans text-[15px] font-medium text-text-primary dark:text-dark-text-primary">
        {prompt}
      </p>

      <div className="flex shrink-0 items-center border-b border-border pb-1.5">
        <span className="border-b-2 border-primary text-sm font-medium text-primary">Python</span>
      </div>

      {/* Five lines at the editor's 1.7 line height, plus padding. */}
      <div className="flex min-h-[9.5em] flex-1">
        <CodeMirrorEditor value={code} onChange={setCode} invalid={syntaxError !== null} ariaLabel="Python code for this step" />
      </div>

      {syntaxError && <p className="shrink-0 text-[12px] text-error">{syntaxError}</p>}

      <p className="shrink-0 text-[12px] text-text-muted dark:text-dark-text-secondary">
        Write the code for this step. You can use index j = {activeIndices[0]}.
      </p>

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={isSubmitting || code.trim().length === 0}
        className="mt-auto flex w-full shrink-0 items-center justify-center rounded-md bg-primary py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isSubmitting ? 'Running...' : 'Run my code'}
      </button>
    </div>
  )
}
