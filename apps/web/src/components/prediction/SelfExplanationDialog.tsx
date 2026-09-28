import { useRef, useState } from 'react'
import type { AlgorithmSnapshot, ScaffoldingLevel, SelfExplanationResponse } from '@dsa-tutor/types'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { evaluateSelfExplanation } from '@/api/predictions'
import { apiFetch } from '@/api/client'
import type { SelfExplanationPrompt } from '@/config/selfExplanationPrompts'
import { selfExplanationDisplay, selfExplanationInteraction, type SelfExplanationDisplay } from '@/utils/selfExplanation'

interface SelfExplanationDialogProps {
  prompt: SelfExplanationPrompt
  algorithmName: string
  level: ScaffoldingLevel
  sessionId: string | null
  snapshot: AlgorithmSnapshot
  onDone: () => void
}

function logInteraction(body: ReturnType<typeof selfExplanationInteraction>) {
  apiFetch('/api/v1/interactions', { method: 'POST', body: JSON.stringify(body) }).catch(() => {
    // Research logging is best-effort; it never blocks the run.
  })
}

/**
 * One short free-text "explain why" after a conceptual junction answered
 * correctly (Week 2 2B). Amber, since the system is asking something.
 * Skipping is one click; Continue is available as soon as the answer is
 * sent, and the evaluation is still logged if the learner moves on first.
 */
export default function SelfExplanationDialog({ prompt, algorithmName, level, sessionId, snapshot, onDone }: SelfExplanationDialogProps) {
  const [response, setResponse] = useState('')
  const [phase, setPhase] = useState<'asking' | 'evaluating' | 'answered'>('asking')
  const [display, setDisplay] = useState<SelfExplanationDisplay | null>(null)
  const openedAt = useRef(Date.now())

  const seconds = () => Math.round((Date.now() - openedAt.current) / 1000)

  function skip() {
    if (sessionId) {
      logInteraction(
        selfExplanationInteraction({
          sessionId, stepIndex: snapshot.stepIndex, snapshot, prompt, level,
          response: null, evaluation: null, display: null, timeSpentSeconds: seconds(),
        }),
      )
    }
    onDone()
  }

  async function submit() {
    const text = response.trim()
    if (!text) return
    setPhase('evaluating')
    const timeSpentSeconds = seconds()
    let evaluation: SelfExplanationResponse | null = null
    try {
      evaluation = await evaluateSelfExplanation({
        algorithmName, promptKey: prompt.key, question: prompt.question, rubric: prompt.rubric, studentResponse: text,
      })
    } catch {
      evaluation = null
    }
    const shown = selfExplanationDisplay(level, evaluation)
    setDisplay(shown)
    setPhase('answered')
    if (sessionId) {
      logInteraction(
        selfExplanationInteraction({
          sessionId, stepIndex: snapshot.stepIndex, snapshot, prompt, level,
          response: text, evaluation, display: shown, timeSpentSeconds,
        }),
      )
    }
  }

  return (
    <Dialog open>
      <DialogContent showCloseButton={false} onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-md">
        <div className="border-l-4 border-secondary pl-3">
          <p className="text-[10px] font-semibold tracking-wide text-secondary uppercase">Explain it in your own words</p>
          <DialogTitle className="mt-1 text-sm font-semibold text-text-primary">{prompt.question}</DialogTitle>
        </div>

        {phase !== 'answered' ? (
          <>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              disabled={phase === 'evaluating'}
              rows={4}
              maxLength={4000}
              aria-label="Your explanation"
              placeholder="A sentence or two is enough."
              className="w-full rounded-md border border-border bg-background p-2.5 text-sm text-text-primary outline-none focus:border-secondary"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={skip} disabled={phase === 'evaluating'}>
                Skip
              </Button>
              <Button onClick={() => void submit()} disabled={!response.trim() || phase === 'evaluating'}>
                {phase === 'evaluating' ? 'Reading your answer...' : 'Send'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div role="status" className="rounded-md bg-secondary-light p-3 text-sm text-text-primary">
              <p>{display?.acknowledgement}</p>
              {display?.followUpQuestion && <p className="mt-2 italic">{display.followUpQuestion}</p>}
            </div>
            <div className="flex justify-end">
              <Button onClick={onDone}>Continue</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
