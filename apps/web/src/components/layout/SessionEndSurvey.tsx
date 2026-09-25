import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SessionEndSurveyProps {
  onSubmit: (mentalEffort: number, confidence: number) => void
  onSkip: () => void
  isSubmitting: boolean
  error: string | null
}

const MENTAL_EFFORT_SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const CONFIDENCE_SCALE = [1, 2, 3, 4, 5]

function ScaleButtons({
  values,
  selected,
  onSelect,
  lowLabel,
  highLabel,
}: {
  values: number[]
  selected: number | null
  onSelect: (value: number) => void
  lowLabel: string
  highLabel: string
}) {
  return (
    <div>
      <div className="flex gap-1.5">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            aria-pressed={selected === value}
            className={cn(
              'flex h-9 flex-1 items-center justify-center rounded-md border text-sm font-medium transition-colors',
              selected === value
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-background text-text-primary hover:border-primary',
            )}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-text-muted">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  )
}

// A single Paas-style mental-effort item plus a confidence item, shown once
// when the student chooses to leave a session - never mid-prediction, since
// this only fires from an explicit exit action, not on a timer. Skippable:
// this is self-report data for the study, not something a student can be
// forced to give.
export default function SessionEndSurvey({ onSubmit, onSkip, isSubmitting, error }: SessionEndSurveyProps) {
  const [mentalEffort, setMentalEffort] = useState<number | null>(null)
  const [confidence, setConfidence] = useState<number | null>(null)

  const canSubmit = mentalEffort !== null && confidence !== null

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        className="sm:max-w-md"
      >
        <div className="flex flex-col gap-6 py-2">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Before you go</h2>
            <p className="text-sm text-text-secondary">Two quick questions about this session.</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-text-primary">How much mental effort did this session take?</p>
            <ScaleButtons
              values={MENTAL_EFFORT_SCALE}
              selected={mentalEffort}
              onSelect={setMentalEffort}
              lowLabel="Very, very low effort"
              highLabel="Very, very high effort"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-text-primary">
              How confident are you that you could trace this algorithm by hand now?
            </p>
            <ScaleButtons
              values={CONFIDENCE_SCALE}
              selected={confidence}
              onSelect={setConfidence}
              lowLabel="Not at all confident"
              highLabel="Very confident"
            />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <div className="flex gap-3">
            <Button variant="ghost" onClick={onSkip} disabled={isSubmitting} className="flex-1">
              Skip
            </Button>
            <Button
              onClick={() => canSubmit && onSubmit(mentalEffort, confidence)}
              disabled={!canSubmit || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : error ? 'Retry' : 'Submit'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
