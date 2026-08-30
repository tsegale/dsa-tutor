import { useQuery } from '@tanstack/react-query'
import type { TopicDto } from '@dsa-tutor/types'
import { apiFetch } from '@/api/client'
import MasteryRing from '@/components/ui/MasteryRing'

interface SessionDto {
  topic: {
    name: string
    displayName: string
  }
}

interface ContinueSectionProps {
  topics: TopicDto[]
  onContinue: (topicName: string) => void
}

export default function ContinueSection({ topics, onContinue }: ContinueSectionProps) {
  const { data: latestSession } = useQuery({
    queryKey: ['sessions', 'latest'],
    queryFn: () => apiFetch<SessionDto | null>('/api/v1/sessions?latest=true&completed=false'),
  })

  if (!latestSession) return null

  const topic = topics.find((t) => t.name === latestSession.topic.name)
  if (!topic) return null

  return (
    <section className="flex items-center gap-4 rounded-md border border-border bg-white p-4">
      <MasteryRing progress={topic.masteryPercent / 100} size={48} />
      <div className="flex-1">
        <div className="text-xs font-semibold tracking-wide text-text-muted uppercase">
          Continue where you left off
        </div>
        <div className="text-base font-bold text-text-primary">{topic.displayName}</div>
        <div className="text-xs text-text-muted">{topic.masteryPercent}% mastery</div>
      </div>
      <button
        type="button"
        onClick={() => onContinue(topic.name)}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
      >
        Continue
      </button>
    </section>
  )
}
