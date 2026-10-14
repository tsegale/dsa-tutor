import type { TopicMastery } from '@dsa-tutor/types'
import { cn } from '@/lib/utils'
import { CRITERION_LABEL } from '@/utils/mastery'

/**
 * Four small segments, one per mastery criterion, in rubric order: filled
 * when met, grey when not, faded to 40% when the topic does not offer it
 * (it then does not count toward Mastered).
 */
export function CriteriaSegments({ mastery, className }: { mastery: TopicMastery; className?: string }) {
  const applicable = mastery.criteria.filter((criterion) => criterion.applicable)
  const met = applicable.filter((criterion) => criterion.met).length
  return (
    <span
      role="img"
      aria-label={`${met} of ${applicable.length} mastery criteria met`}
      className={cn('flex gap-0.5', className)}
    >
      {mastery.criteria.map((criterion) => (
        <span
          key={criterion.id}
          title={`${CRITERION_LABEL[criterion.id]}: ${!criterion.applicable ? 'not offered for this topic' : criterion.met ? 'met' : 'not met'}`}
          className={cn(
            'h-1.5 flex-1 rounded-full',
            !criterion.applicable ? 'bg-rule opacity-40' : criterion.met ? 'bg-state-sorted' : 'bg-rule-strong',
          )}
        />
      ))}
    </span>
  )
}
