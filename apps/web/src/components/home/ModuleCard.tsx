import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { moduleLabel } from '@/config/curriculum'
import { unmetLabel } from '@/utils/moduleStatus'
import type { SyllabusModule, SyllabusTopic } from '@/utils/syllabus'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

// One of Home's module cards: the way into the curriculum from Home. The
// whole card is the link (a single tab stop), so it lifts on hover.
// A locked module's requirement is stated once per screen: from 1024px the
// curriculum rail beside the cards already states it, so the card shows the
// module's open preview topic instead; below that (the rail is a closed
// drawer) the card states the requirement itself.
export function ModuleCard({
  entry,
  next,
}: {
  entry: SyllabusModule
  /** This module's next topic, from the shared learning plan (planNext). */
  next: SyllabusTopic | null
}) {
  const { module, status } = entry
  const locked = status.state === 'locked'
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
          {locked && status.unmet ? (
            <>
              <span className="lg:hidden">{unmetLabel(status.unmet)}</span>
              {next && (
                <span className="hidden lg:inline">
                  Preview: <span className="text-mono-sm">{next.number}</span> <span className="font-medium text-ink">{next.topic.displayName}</span>
                </span>
              )}
            </>
          ) : next ? (
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
