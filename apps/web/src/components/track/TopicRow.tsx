import { Link } from 'react-router-dom'
import type { TopicDto } from '@dsa-tutor/types'
import { cn } from '@/lib/utils'
import { topicPath } from '@/data/tracks'
import { isTopicComplete, topicAction } from '@/utils/curriculum'
import { buttonVariants } from '@/components/ui/button'
import { ProgressRing } from '@/components/ui/progress'
import DifficultyTag from '@/components/ui/DifficultyTag'

// One numbered row of a track page. The action link (Start, Continue or
// Review) is the row's only interactive element; its hit area is stretched
// over the whole row, so the row is the click target while the keyboard
// meets one tab stop per topic and nothing is nested inside a link.

function LockIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function TopicRow({
  topic,
  index,
  trackName,
  isNext,
}: {
  topic: TopicDto
  index: number
  trackName: string
  /** The track's next topic (as Home's card names it): the one primary action. */
  isNext: boolean
}) {
  const action = topicAction(topic)
  const number = String(index + 1).padStart(2, '0')

  return (
    <li
      className={cn(
        'relative grid grid-cols-[2.25rem_1fr_auto] items-center gap-x-3 gap-y-2 px-card py-row md:grid-cols-[2.25rem_1fr_auto_4.5rem_2.75rem_6.5rem]',
        topic.isLocked ? 'bg-surface-sunk' : 'transition-colors duration-quick hover:bg-surface-sunk'
      )}
    >
      <span className="text-mono-sm text-ink-2" aria-hidden="true">
        {number}
      </span>

      <div className={cn('min-w-0', topic.isLocked && 'opacity-60')}>
        <h3 className="truncate text-small font-medium text-ink">{topic.displayName}</h3>
        <p className="truncate text-micro font-normal text-ink-2">
          {topic.isLocked ? `Locked: complete the earlier ${trackName} topics to open this one` : topic.description}
        </p>
      </div>

      {/* Difficulty, time and mastery: their own columns from md, a wrapped
          line under the name on a phone. Lock dimming sits on each item
          because opacity has no effect on a display:contents box. */}
      <div className="col-span-2 col-start-2 row-start-2 flex flex-wrap items-center gap-3 md:contents">
        <span className={cn('md:col-start-3 md:row-start-1', topic.isLocked && 'opacity-60')}>
          <DifficultyTag difficulty={topic.difficulty} />
        </span>
        <span className={cn('text-mono-sm text-ink-2 md:col-start-4 md:row-start-1 md:text-right', topic.isLocked && 'opacity-60')}>
          {topic.estimatedMinutes} min
        </span>
        <span className={cn('md:col-start-5 md:row-start-1', topic.isLocked && 'opacity-60')}>
          <ProgressRing value={topic.masteryPercent} size={32} strokeWidth={3} showPercentSign={false} tone={isTopicComplete(topic) ? 'success' : 'brand'} ariaLabel={`${topic.displayName} mastery`} />
        </span>
      </div>

      <div className="col-start-3 row-start-1 justify-self-end md:col-start-6">
        {topic.isLocked ? (
          <span className="inline-flex items-center gap-1.5 text-micro text-ink-2">
            <LockIcon />
            Locked
          </span>
        ) : (
          <Link
            to={topicPath(topic.name)}
            aria-label={`${action} ${topic.displayName}`}
            className={cn(
              // One primary button per list, on the next topic; eighteen brand
              // buttons would make the list a wall again.
              buttonVariants({ variant: isNext ? 'primary' : 'secondary', size: 'sm' }),
              // The stretched hit area: the whole row opens the topic. static
              // (over the button's relative) so ::after spans the row, not the button.
              'static md:w-24 after:absolute after:inset-0 after:content-[""] hover:translate-y-0'
            )}
          >
            {action}
          </Link>
        )}
      </div>
    </li>
  )
}
