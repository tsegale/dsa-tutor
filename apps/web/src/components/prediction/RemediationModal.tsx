import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { RemediationPayload } from '@/utils/remediationTasks'

interface RemediationModalProps {
  payload: RemediationPayload
  onComplete: (outcome: { correct: boolean | null; skipped: boolean }) => void
}

// One remediation task at a time, presented at the end of the current
// junction (this modal only ever mounts after AlgorithmPage has already
// processed a prediction result, never mid-prediction). Skippable per the
// remediation doc - skipping still moves the state machine into probing.
export default function RemediationModal({ payload, onComplete }: RemediationModalProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [freeResponseText, setFreeResponseText] = useState('')
  const [revealed, setRevealed] = useState(false)

  function handleSkip() {
    onComplete({ correct: null, skipped: true })
  }

  function handleSubmit() {
    if (payload.freeResponse) {
      // Self-explanation is never auto-graded by the model or by string
      // matching - completion itself is the signal, correctness stays null.
      onComplete({ correct: null, skipped: false })
      return
    }
    if (!revealed) {
      setRevealed(true)
      return
    }
    const correct = selectedOptionId === payload.correctOptionId
    onComplete({ correct, skipped: false })
  }

  const canSubmit = payload.freeResponse ? freeResponseText.trim().length > 0 : selectedOptionId !== null

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-lg">
        <div className="flex flex-col gap-4 py-2">
          <div>
            <p className="text-xs font-semibold tracking-wide text-secondary uppercase">Quick check</p>
            <h2 className="mt-1 text-base font-semibold text-text-primary">{payload.prompt}</h2>
          </div>

          {payload.scaffold && (
            <p className="rounded-md bg-primary-light p-3 text-sm text-text-primary">{payload.scaffold}</p>
          )}

          {payload.array && (
            <div className="flex justify-center gap-2">
              {payload.array.map((value, index) => (
                <div
                  key={index}
                  className={`flex size-10 items-center justify-center rounded-md border text-sm font-semibold ${
                    payload.highlightIndices?.includes(index)
                      ? 'border-primary bg-primary-light text-primary'
                      : 'border-border bg-white text-text-primary'
                  }`}
                >
                  {value}
                </div>
              ))}
            </div>
          )}

          {payload.freeResponse ? (
            <textarea
              value={freeResponseText}
              onChange={(e) => setFreeResponseText(e.target.value)}
              placeholder="Type your explanation"
              aria-label="Your explanation"
              rows={3}
              className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
          ) : (
            <div className="flex flex-col gap-2">
              {payload.options?.map((option) => {
                const isCorrectOption = option.id === payload.correctOptionId
                const isSelected = option.id === selectedOptionId
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => !revealed && setSelectedOptionId(option.id)}
                    disabled={revealed}
                    className={`rounded-md border p-3 text-left text-sm ${
                      revealed && isCorrectOption
                        ? 'border-success bg-success/10 text-text-primary'
                        : revealed && isSelected
                          ? 'border-error bg-error/10 text-text-primary'
                          : isSelected
                            ? 'border-primary bg-primary-light text-text-primary'
                            : 'border-border bg-white text-text-primary hover:border-primary'
                    }`}
                  >
                    {option.text}
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="ghost" onClick={handleSkip} className="flex-1">
              Skip
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
              {revealed ? 'Continue' : 'Submit'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
