import type { TopicDto } from '@dsa-tutor/types'

interface AILearningPathBannerProps {
  topics: TopicDto[]
  onStart: (topicName: string, mode: 'DEMO' | 'PRACTICE') => void
}

function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 13.8 9.2 21 11l-7.2 1.8L12 20l-1.8-7.2L3 11l7.2-1.8L12 2Z" />
    </svg>
  )
}

export default function AILearningPathBanner({ topics, onStart }: AILearningPathBannerProps) {
  const masteredTopic = [...topics]
    .filter((t) => t.masteryPercent > 0)
    .sort((a, b) => b.masteryPercent - a.masteryPercent)[0]
  const nextTopic = topics.find((t) => !t.isLocked && t.masteryPercent === 0 && t.name !== masteredTopic?.name)
  // Topics arrive ordered by track then curriculum order (see
  // topic.service.ts), so the first unlocked one is always the same card
  // the dashboard itself shows first - this must never hardcode a
  // specific topic, or it silently drifts out of sync the moment the
  // curriculum's starting point changes (see remediation doc 9.1).
  const firstTopic = topics.find((t) => !t.isLocked)

  const bodyText = masteredTopic
    ? `Based on your last session, you've made progress on ${masteredTopic.displayName}. ${
        nextTopic
          ? `Recommended next step: ${nextTopic.displayName}, begin the AI diagnostic to establish your baseline.`
          : ''
      }`
    : `Welcome. Start with ${firstTopic?.displayName ?? 'the first topic'} to begin your adaptive learning path.`

  const ctaLabel = masteredTopic ? `Continue ${masteredTopic.displayName}` : `Begin ${firstTopic?.displayName ?? 'learning'}`

  function handleClick() {
    const topicName = masteredTopic?.name ?? firstTopic?.name
    if (topicName) onStart(topicName, 'PRACTICE')
  }

  return (
    <section
      className="flex items-center gap-3 rounded-[10px] p-3.5"
      style={{ backgroundColor: '#eef2ff', border: '0.5px solid #c7d2fe' }}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#3730a3] text-white">
        <SparklesIcon />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium tracking-wide text-[#4338ca] uppercase">
          AI learning path recommendation
        </p>
        <p className="mt-0.5 text-xs leading-[1.6] text-[#3730a3]">{bodyText}</p>
      </div>
      <button
        type="button"
        onClick={handleClick}
        className="shrink-0 rounded-md bg-[#3730a3] px-4 py-2 text-xs font-medium text-white hover:opacity-90"
      >
        {ctaLabel}
      </button>
    </section>
  )
}
