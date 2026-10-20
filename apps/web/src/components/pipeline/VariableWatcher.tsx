import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { watchedVariables } from '@/utils/variableWatch'
import { cn } from '@/lib/utils'

/**
 * The working variables of the current step, as a debugger's watch window.
 *
 * Monospace, because every value here is data. No brand colour: a changed
 * row is marked with the canvas's own "current" state token, so the meaning
 * matches what the canvas is doing rather than reading as "clickable".
 *
 * Variables that moved on this step sort to the top and are marked. That is
 * the educational content: a list of values says what is true, while the
 * mark says what the step just did, which is the thing a student is being
 * asked to predict.
 */
export default function VariableWatcher() {
  const snapshot = useAlgorithmStore((state) => state.snapshotArray[state.stepIndex] ?? null)
  const previous = useAlgorithmStore((state) =>
    state.stepIndex > 0 ? (state.snapshotArray[state.stepIndex - 1] ?? null) : null,
  )

  const rows = watchedVariables(snapshot, previous)
  if (rows.length === 0) return null

  return (
    <section className="flex flex-col gap-1.5 border-t-[0.5px] border-border pt-2.5" aria-label="Variables">
      <h3 className="text-micro text-text-muted dark:text-dark-text-secondary">Variables</h3>
      <dl className="flex flex-col gap-0.5">
        {rows.map((row) => (
          <div key={row.name} className="flex items-baseline justify-between gap-2">
            <dt
              className={cn(
                'truncate text-micro font-normal',
                row.changed ? 'text-ink' : 'text-ink-2',
              )}
              title={row.label}
            >
              {row.label}
            </dt>
            <dd className="flex shrink-0 items-center gap-1">
              {/* A dot rather than a colour change on the number itself:
                  the value must stay legible, and the mark must not read
                  as an error. */}
              <span
                aria-hidden="true"
                className={cn('size-1 rounded-full', row.changed ? 'bg-state-current' : 'bg-transparent')}
              />
              <span className={cn('text-mono-sm', row.changed ? 'text-ink' : 'text-ink-2')}>{row.value}</span>
              {row.changed && <span className="sr-only">changed this step</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
