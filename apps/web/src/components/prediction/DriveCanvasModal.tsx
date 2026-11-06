import { lazy, Suspense, useEffect, useState } from 'react'
import { AlgorithmMode } from '@dsa-tutor/types'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { preloadPyodide, pyodideStatus, runTrackedArrayPython } from '@/utils/pyodideRunner'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'

const CodeMirrorEditor = lazy(() => import('./CodeMirrorEditor'))

interface DriveCanvasModalProps {
  open: boolean
  onClose: () => void
  displayName: string
  initialArray: number[]
}

const TEMPLATES: ReadonlyArray<{ label: string; code: string }> = [
  {
    label: 'Bubble Sort',
    code: `# Mutate \`arr\` in place. Every comparison and write animates on the canvas!
n = len(arr)
for i in range(n):
    swapped = False
    for j in range(0, n - i - 1):
        if arr[j] > arr[j + 1]:
            arr[j], arr[j + 1] = arr[j + 1], arr[j]
            swapped = True
    if not swapped:
        break
print("Sorted:", list(arr))`,
  },
  {
    label: 'Insertion Sort',
    code: `# Classic Insertion Sort - watch elements shift right into place
for i in range(1, len(arr)):
    key = arr[i]
    j = i - 1
    while j >= 0 and arr[j] > key:
        arr[j + 1] = arr[j]
        j -= 1
    arr[j + 1] = key
print("Sorted:", list(arr))`,
  },
  {
    label: 'Selection Sort',
    code: `# Find minimum in unsorted suffix and swap to front
n = len(arr)
for i in range(n):
    min_idx = i
    for j in range(i + 1, n):
        if arr[j] < arr[min_idx]:
            min_idx = j
    if min_idx != i:
        arr[i], arr[min_idx] = arr[min_idx], arr[i]`,
  },
  {
    label: 'Two-Pointer Reverse',
    code: `# Reverse \`arr\` in-place from both ends
left, right = 0, len(arr) - 1
while left < right:
    arr[left], arr[right] = arr[right], arr[left]
    left += 1
    right -= 1`,
  },
]

export default function DriveCanvasModal({
  open,
  onClose,
  displayName,
  initialArray,
}: DriveCanvasModalProps) {
  const [code, setCode] = useState(TEMPLATES[0].code)
  const [isRunning, setIsRunning] = useState(false)
  const [loadingRuntime, setLoadingRuntime] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [stdout, setStdout] = useState('')
  const [stderr, setStderr] = useState('')

  useEffect(() => {
    if (open) preloadPyodide()
  }, [open])

  async function handleRunAndAnimate() {
    setIsRunning(true)
    setLoadingRuntime(pyodideStatus() !== 'ready')
    setErrorMessage(null)
    try {
      const result = await runTrackedArrayPython(code, initialArray)
      setLoadingRuntime(false)
      setStdout(result.stdout.trim())
      setStderr(result.stderr.trim())

      if (result.runtimeUnavailable) {
        setErrorMessage('Python runtime could not load. Check your connection and try again.')
        return
      }
      if (result.errorMessage || result.snapshots.length === 0) {
        setErrorMessage(result.errorMessage ?? 'No visual steps were recorded.')
        return
      }

      const store = useAlgorithmStore.getState()
      store.setMode(AlgorithmMode.DEMO)
      store.setAlgorithm(`${displayName} (Python Sandbox)`, result.snapshots, 'start')
      onClose()
      setTimeout(() => {
        useAlgorithmStore.getState().startPlayback()
      }, 80)
    } finally {
      setIsRunning(false)
      setLoadingRuntime(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent showCloseButton className="flex max-h-[88vh] flex-col gap-3 overflow-y-auto sm:max-w-xl">
        <div className="flex flex-col gap-1">
          <DialogTitle className="text-lg font-bold text-text-primary dark:text-dark-text-primary">
            Drive the Canvas With Your Python Code
          </DialogTitle>
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
            Write any Python algorithm that reads and mutates <span className="font-mono">arr</span> (starting from{' '}
            <span className="font-mono">[{initialArray.join(', ')}]</span>). Every comparison and swap is recorded in a
            sandboxed Web Worker and animated step-by-step on the canvas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-micro text-text-muted dark:text-dark-text-secondary">Templates:</span>
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              onClick={() => {
                setCode(tpl.code)
                setErrorMessage(null)
              }}
              className="rounded border border-border bg-surface-sunk px-2 py-0.5 text-[11px] font-medium text-text-secondary transition-colors hover:border-primary/50 hover:text-text-primary dark:border-dark-border dark:text-dark-text-secondary dark:hover:text-dark-text-primary"
            >
              {tpl.label}
            </button>
          ))}
        </div>

        <div className="flex min-h-[210px] flex-col">
          <Suspense
            fallback={
              <div
                aria-busy="true"
                aria-label="Loading Python editor"
                className="min-h-[210px] flex-1 rounded-sm border border-rule bg-surface-sunk"
              />
            }
          >
            <CodeMirrorEditor
              value={code}
              onChange={(next) => {
                setCode(next)
                setErrorMessage(null)
              }}
              invalid={errorMessage !== null}
              ariaLabel="Custom Python algorithm to animate on canvas"
            />
          </Suspense>
        </div>

        {(stdout.length > 0 || stderr.length > 0) && (
          <div
            className="max-h-28 overflow-y-auto rounded-sm border border-border bg-surface-sunk px-2.5 py-1.5 font-mono text-[11px] dark:border-dark-border"
            role="log"
            aria-label="Sandbox console output"
          >
            {stdout.length > 0 && (
              <pre className="whitespace-pre-wrap text-text-primary dark:text-dark-text-primary">{stdout}</pre>
            )}
            {stderr.length > 0 && <pre className="whitespace-pre-wrap text-error">{stderr}</pre>}
          </div>
        )}

        {errorMessage && <p className="text-xs text-error">{errorMessage}</p>}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-2 text-xs font-medium text-text-secondary hover:bg-surface-sunk dark:border-dark-border dark:text-dark-text-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleRunAndAnimate()}
            disabled={isRunning || code.trim().length === 0}
            className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isRunning
              ? loadingRuntime
                ? 'Loading Python runtime...'
                : 'Tracing steps...'
              : 'Run & Animate on Canvas'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
