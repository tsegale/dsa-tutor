import { useRef, useState } from 'react'
import type { CodeEvalResponse } from '@dsa-tutor/types'
import { evaluateCode } from '@/api/codeEval'
import { cn } from '@/lib/utils'

type CodeLanguage = 'pseudocode' | 'python' | 'java'

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

const LANGUAGES: { id: CodeLanguage; label: string }[] = [
  { id: 'pseudocode', label: 'Pseudocode' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
]

const STARTER_TEMPLATE: Record<CodeLanguage, string> = {
  pseudocode: 'if arr[j] > arr[j+1] then\n  swap arr[j] and arr[j+1]\nend if',
  python: 'if arr[j] > arr[j + 1]:\n    arr[j], arr[j + 1] = arr[j + 1], arr[j]',
  java: 'if (arr[j] > arr[j + 1]) {\n  int temp = arr[j];\n  arr[j] = arr[j + 1];\n  arr[j + 1] = temp;\n}',
}

const MIN_LINES = 5

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
  const [language, setLanguage] = useState<CodeLanguage>('pseudocode')
  const [code, setCode] = useState(STARTER_TEMPLATE.pseudocode)
  const [syntaxError, setSyntaxError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)

  function handleLanguageChange(next: CodeLanguage) {
    setLanguage(next)
    setCode(STARTER_TEMPLATE[next])
    setSyntaxError(null)
  }

  function handleScroll() {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  const lineCount = Math.max(code.split('\n').length, MIN_LINES)

  async function handleSubmit() {
    setIsSubmitting(true)
    onLoadingChange(true)
    setSyntaxError(null)
    try {
      const result = await evaluateCode({
        algorithmName,
        currentArrayState,
        activeIndices,
        expectedNextState,
        studentCode: code,
        language,
        stepDescription,
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

      <div className="flex shrink-0 gap-4 border-b border-border">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.id}
            type="button"
            onClick={() => handleLanguageChange(lang.id)}
            className={cn(
              'border-b-2 pb-1.5 text-sm font-medium transition-colors',
              language === lang.id
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary dark:text-dark-text-secondary',
            )}
          >
            {lang.label}
          </button>
        ))}
      </div>

      <div
        className={cn(
          'flex min-h-0 flex-1 overflow-hidden rounded-md border bg-[#1e293b]',
          syntaxError ? 'border-error' : 'border-border',
        )}
        style={{ minHeight: `${MIN_LINES * 1.7 + 1}em` }}
      >
        <div
          ref={lineNumbersRef}
          aria-hidden="true"
          className="select-none overflow-hidden py-2 pr-2 pl-3 text-right font-mono text-[14px] leading-[1.7] text-slate-500"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onScroll={handleScroll}
          spellCheck={false}
          rows={MIN_LINES}
          className="min-w-0 flex-1 resize-none bg-transparent py-2 pr-3 font-mono text-[14px] leading-[1.7] text-[#f8fafc] outline-none"
        />
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
