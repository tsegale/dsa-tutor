import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { moduleLabel } from '@/config/curriculum'
import { unmetLabel } from '@/utils/moduleStatus'
import type { SyllabusModule } from '@/utils/syllabus'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

// One of Home's module cards: the way into the curriculum from Home. The
// whole card is the link (a single tab stop), so it lifts on hover. A locked
// module names what it builds on in place of the next topic.
export function ModuleCard({ entry }: { entry: SyllabusModule }) {
  const { module, status, topics } = entry
  const locked = status.state === 'locked'
  const next = topics.find((t) => t.openable && t.state !== 'complete' && t.topic.masteryPercent === 0) ?? topics.find((t) => t.openable && t.state !== 'complete')
  const percent = status.total ? (status.complete / status.total) * 100 : 0
  const footer = locked && status.unmet ? unmetLabel(status.unmet) : next ? `Next: ${next.number} ${next.topic.displayName}` : 'All topics complete'

  return (
    <Link to={`/module/${module.number}`} aria-label={`${moduleLabel(module)}: ${status.complete} of ${status.total} complete. ${footer}`} className="group block h-full rounded-md">
      <Card interactive className="h-full gap-3 px-card">
        <div className="min-w-0">
          <p className="text-mono-sm text-ink-2">Module {module.number}</p>
          <h3 className={cn('mt-0.5 text-h3', locked ? 'text-ink-2' : 'text-ink')}>{module.title}</h3>
        </div>
        <p className="line-clamp-2 text-small text-ink-2">{module.subtitle}</p>
        <div className="flex items-center gap-3">
          <Progress value={percent} tone={status.state === 'complete' ? 'success' : 'brand'} className="h-1 flex-1" aria-hidden="true" />
          <span className="shrink-0 text-mono-sm text-ink-2">
            {status.complete}/{status.total} complete
          </span>
        </div>
        <p className="mt-auto truncate border-t border-rule pt-3 text-small text-ink-2">
          {next && !locked ? (
            <>
              Next: <span className="text-mono-sm">{next.number}</span> <span className="font-medium text-ink">{next.topic.displayName}</span>
            </>
          ) : (
            footer
          )}
        </p>
      </Card>
    </Link>
  )
}
