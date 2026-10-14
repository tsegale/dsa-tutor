import type { TopicMastery } from '@dsa-tutor/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CRITERION_LABEL, MASTERY_STATUS_LABEL, criterionView, nextMasteryOffer, type MasteryOfferKind } from '@/utils/mastery'
import { MasteryMark } from './MasteryMark'

function MetIcon({ met }: { met: boolean }) {
  return met ? (
    <svg viewBox="0 0 16 16" className="mt-0.5 size-3.5 shrink-0 text-state-sorted" aria-hidden="true">
      <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    // An open circle, not an error mark: an unmet criterion is work to do, not a mistake.
    <svg viewBox="0 0 16 16" className="mt-0.5 size-3.5 shrink-0 text-ink-3" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

/**
 * What each remediation offer does, or a reason it cannot run right now
 * (a string). Absent for an active participant: their mastery is read-only
 * and nothing on it may change what they are asked (Phase 7F).
 */
export type MasteryOfferHandlers = Record<MasteryOfferKind, (() => void) | string>

/**
 * The topic page's mastery panel (Phase 7D): each criterion the topic offers,
 * with its current value, what meets it, and, while unmet, the one action
 * that would meet it. Criteria the topic does not offer are named once at the
 * foot. Hints per step is shown as information; it is never a criterion.
 */
export function MasteryPanel({ mastery, handlers }: { mastery: TopicMastery; handlers?: MasteryOfferHandlers }) {
  const offered = mastery.criteria.filter((criterion) => criterion.applicable)
  // One offer at a time (Phase 7E), never a list of what failed.
  const offer = handlers ? nextMasteryOffer(mastery) : null
  const run = offer && handlers ? handlers[offer.kind] : null
  const notOffered = mastery.criteria.filter((criterion) => !criterion.applicable)

  return (
    <section aria-labelledby="mastery-panel-title" className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 id="mastery-panel-title" className="text-micro text-text-muted dark:text-dark-text-secondary">
          Mastery
        </h3>
        <span className="flex items-center gap-1 text-micro text-ink-2">
          <MasteryMark status={mastery.status} className="size-3.5" />
          {MASTERY_STATUS_LABEL[mastery.status]}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {offered.map((criterion) => {
          const view = criterionView(criterion)
          return (
            <li key={view.id} className="flex gap-1.5">
              <MetIcon met={view.met} />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline justify-between gap-2 text-small text-ink">
                  <span>{view.label}</span>
                  <span className="shrink-0 text-mono-sm text-ink-2">
                    <span className={cn(view.met && 'text-state-sorted-ink')}>{view.value}</span> / {view.threshold}
                  </span>
                </p>
                <span className="sr-only">{view.met ? 'Met.' : 'Not met.'}</span>
                {view.action && <p className="mt-0.5 text-micro text-ink-2">{view.action}</p>}
              </div>
            </li>
          )
        })}
      </ul>

      {offer && run && (
        <div className="flex flex-col gap-1.5 rounded-md bg-surface-sunk p-2">
          <p className="text-micro text-ink-2">Next step for mastery</p>
          {typeof run === 'function' ? (
            <Button variant="secondary" size="sm" onClick={run} className="w-full">
              {offer.label}
            </Button>
          ) : (
            <p className="text-small text-ink">{offer.label}</p>
          )}
          <p className="text-micro text-ink-2">{typeof run === 'function' ? offer.detail : run}</p>
        </div>
      )}

      {notOffered.length > 0 && (
        <p className="text-micro text-ink-2">
          {notOffered.map((criterion) => CRITERION_LABEL[criterion.id]).join(' and ')}{' '}
          {notOffered.length === 1 ? 'is' : 'are'} not offered for this topic yet, so Mastered needs the {offered.length} above.
        </p>
      )}

      <p className="flex items-baseline justify-between gap-2 text-micro text-ink-2">
        <span>Hints per step, for your reference</span>
        <span className="text-mono-sm">{mastery.hintsPerStep === null ? '-' : mastery.hintsPerStep.toFixed(1)}</span>
      </p>
    </section>
  )
}
