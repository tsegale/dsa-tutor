import type { TopicMastery } from '@dsa-tutor/types'
import { cn } from '@/lib/utils'
import { CRITERION_LABEL } from '@/utils/mastery'

/**
 * Four small segments, one per mastery criterion, in rubric order: filled
 * when met, grey when not, a dashed outline when the topic does not offer
 * it (it then does not count toward Mastered).
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
            'h-1 flex-1 rounded-full',
            !criterion.applicable ? 'border border-dashed border-rule-strong' : criterion.met ? 'bg-state-sorted' : 'bg-rule',
          )}
        />
      ))}
    </span>
  )
}
