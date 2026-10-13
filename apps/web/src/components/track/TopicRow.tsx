import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { topicPath } from '@/data/tracks'
import { isTopicComplete, topicAction } from '@/utils/curriculum'
import { TOPIC_STATE_LABEL } from '@/utils/moduleStatus'
import type { SyllabusTopic } from '@/utils/syllabus'
import { buttonVariants } from '@/components/ui/button'
import { ProgressRing } from '@/components/ui/progress'
import DifficultyTag from '@/components/ui/DifficultyTag'
import { StatusMarker } from '@/components/curriculum/StatusMarker'

// One numbered row of a module page, numbered and marked exactly as the
// curriculum rail shows it (3.1, 3.2 ...). The action link (Start, Continue
// or Review) is the row's only interactive element; its hit area is
// stretched over the whole row, so the row is the click target while the
// keyboard meets one tab stop per topic and nothing is nested in a link.
// A soft-locked topic keeps its action and says what it builds on; only a
// hard lock (the API's, or hardLocks) replaces the action.
//
// Columns: marker, number, name, then (from md) difficulty, minutes,
// mastery, action. On a phone the details wrap under the name.

export function TopicRow({
  entry,
  isNext,
  revealFocus = false,
}: {
  entry: SyllabusTopic
  /** The module's next topic: the list's one primary action. */
  isNext: boolean
  /** The first topic "Show all" revealed: focus moves to its action. */
  revealFocus?: boolean
}) {
  const { topic, number, state, openable, reason } = entry
  const action = topicAction(topic)
  const muted = state === 'locked'

  return (
    <li
      className={cn(
        'relative grid grid-cols-[1rem_2.75rem_1fr_auto] items-center gap-x-3 gap-y-2 px-card py-row md:grid-cols-[1rem_2.75rem_1fr_auto_4.5rem_2.75rem_6.5rem]',
        muted ? 'bg-surface-sunk' : 'transition-colors duration-quick hover:bg-surface-sunk'
      )}
    >
      <StatusMarker state={state} pulse={isNext && !muted} />
      <span className={cn('text-mono-sm', muted ? 'text-ink-3' : 'text-ink-2')} aria-hidden="true">
        {number}
      </span>

      <div className="min-w-0">
        <h3 className={cn('truncate text-small font-medium', muted ? 'text-ink-2' : 'text-ink')}>
          <span className="sr-only">{number} </span>
          {topic.displayName}
          <span className="sr-only">, {TOPIC_STATE_LABEL[state]}</span>
        </h3>
        {/* A soft lock is explained once, in the module's note above the list;
            only a hard lock (which cannot be opened) states its reason here. */}
        <p className="truncate text-micro font-normal text-ink-2">{!openable && reason ? reason : topic.description}</p>
      </div>

      {/* Lock dimming sits on each item: opacity has no effect on a
          display:contents box. */}
      <div className="col-span-2 col-start-3 row-start-2 flex flex-wrap items-center gap-3 md:contents">
        <span className={cn('md:col-start-4 md:row-start-1', muted && 'opacity-70')}>
          <DifficultyTag difficulty={topic.difficulty} />
        </span>
        <span className={cn('text-mono-sm text-ink-2 md:col-start-5 md:row-start-1 md:text-right', muted && 'opacity-70')}>
          {topic.estimatedMinutes} min
        </span>
        <span className={cn('md:col-start-6 md:row-start-1', muted && 'opacity-70')}>
          <ProgressRing value={topic.masteryPercent} size={32} strokeWidth={3} showPercentSign={false} tone={isTopicComplete(topic) ? 'success' : 'brand'} ariaLabel={`${topic.displayName} mastery`} />
        </span>
      </div>

      <div className="col-start-4 row-start-1 justify-self-end md:col-start-7">
        {openable ? (
          <Link
            to={topicPath(topic.name)}
            data-reveal-focus={revealFocus ? topic.name : undefined}
            aria-label={`${action} ${number} ${topic.displayName}`}
            className={cn(
              // One primary button per list, on the next topic.
              buttonVariants({ variant: isNext ? 'primary' : 'secondary', size: 'sm' }),
              // The stretched hit area: the whole row opens the topic. static
              // (over the button's relative) so ::after spans the row.
              'static md:w-24 after:absolute after:inset-0 after:content-[""] hover:translate-y-0'
            )}
          >
            {action}
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-micro text-ink-2">Locked</span>
        )}
      </div>
    </li>
  )
}
