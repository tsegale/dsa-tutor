import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getStudentLanguageLabel } from '@/utils/misconceptionProbes'
import { generateRemediationTask } from '@/utils/remediationTasks'

interface BottomOutModalProps {
  category: string
  algorithmTopicSlug: string
  onAcknowledge: () => void
}

// After three failed remediation attempts, stop asking and just explain -
// reuses the level-3 worked-reasoning text (see remediationTasks.ts)
// rather than authoring a second copy of the same explanation.
export default function BottomOutModal({ category, algorithmTopicSlug, onAcknowledge }: BottomOutModalProps) {
  const explanation = generateRemediationTask(category, algorithmTopicSlug, 3)?.scaffold

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-lg">
        <div className="flex flex-col gap-4 py-2">
          <div>
            <p className="text-xs font-semibold tracking-wide text-secondary uppercase">Here's how it works</p>
            <h2 className="mt-1 text-base font-semibold text-text-primary">
              Let's settle {getStudentLanguageLabel(category)} before moving on.
            </h2>
          </div>
          <p className="rounded-md bg-primary-light p-3 text-sm text-text-primary">
            {explanation ?? 'Take a moment to review this step before continuing - it will come up again.'}
          </p>
          <Button onClick={onAcknowledge}>Got it</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
