import { useMemo } from 'react'
import { CriticalJunctionType, type AlgorithmSnapshot } from '@dsa-tutor/types'
import { useAlgorithmStore, selectIsUnansweredJunction } from '@/store/useAlgorithmStore'
import { cn } from '@/lib/utils'

export interface WatchedVariable {
  /** Pseudocode / code identifier token used for hover cross-highlighting. */
  token: string
  /** Compact display label. */
  label: string
  /** Formatted live value. */
  value: string
}

const SCALAR_WATCH_KEYS: ReadonlyArray<{ key: string; label: string; token: string }> = [
  { key: 'i', label: 'i', token: 'i' },
  { key: 'j', label: 'j', token: 'j' },
  { key: 'k', label: 'k', token: 'k' },
  { key: 'low', label: 'low', token: 'low' },
  { key: 'high', label: 'high', token: 'high' },
  { key: 'mid', label: 'mid', token: 'mid' },
  { key: 'lo', label: 'lo', token: 'lo' },
  { key: 'hi', label: 'hi', token: 'hi' },
  { key: 'left', label: 'left', token: 'left' },
  { key: 'right', label: 'right', token: 'right' },
  { key: 'target', label: 'target', token: 'target' },
  { key: 'targetValue', label: 'target', token: 'value' },
  { key: 'gap', label: 'gap', token: 'gap' },
  { key: 'bound', label: 'bound', token: 'bound' },
  { key: 'blockStart', label: 'blockStart', token: 'step' },
  { key: 'blockEnd', label: 'blockEnd', token: 'step' },
  { key: 'pos', label: 'pos', token: 'pos' },
  { key: 'sum', label: 'sum', token: 'sum' },
  { key: 'windowSum', label: 'windowSum', token: 'windowSum' },
  { key: 'bestSum', label: 'bestSum', token: 'best' },
  { key: 'top', label: 'top', token: 'top' },
  { key: 'front', label: 'front', token: 'front' },
  { key: 'rear', label: 'rear', token: 'rear' },
  { key: 'size', label: 'size', token: 'size' },
  { key: 'capacity', label: 'cap', token: 'capacity' },
  { key: 'currentNode', label: 'curr', token: 'node' },
  { key: 'pass', label: 'pass', token: 'pass' },
  { key: 'mstWeight', label: 'mstWeight', token: 'weight' },
  { key: 'componentCount', label: 'components', token: 'count' },
  { key: 'lastFinish', label: 'lastFinish', token: 'lastFinish' },
  { key: 'currentTotal', label: 'total', token: 'total' },
  { key: 'digitPosition', label: 'digitPos', token: 'digitPos' },
  { key: 'hashIndex', label: 'hash', token: 'index' },
  { key: 'charIndex', label: 'charIdx', token: 'char' },
]

function isLeakKeyAtJunction(key: string, junction: CriticalJunctionType | null, unanswered: boolean): boolean {
  if (!unanswered || !junction) return false
  if (key === 'hashIndex' && junction === CriticalJunctionType.HASH_BUCKET) return true
  if (key === 'pos' && junction === CriticalJunctionType.PROBE_POSITION) return true
  if (key === 'mid' && junction === CriticalJunctionType.MIDPOINT_DECISION) return true
  return false
}

export function extractWatchedVariables(
  snapshot: AlgorithmSnapshot | null,
  unansweredJunction: boolean,
): WatchedVariable[] {
  if (!snapshot) return []
  const ds = snapshot.dataStructureState
  const vars: WatchedVariable[] = []

  if (Array.isArray(ds)) {
    vars.push({ token: 'n', label: 'n', value: String(ds.length) })
    if (snapshot.comparedIndices.length >= 2) {
      const [a, b] = snapshot.comparedIndices
      vars.push({ token: 'j', label: 'compare', value: `[${a}, ${b}]` })
      if (ds[a] !== undefined && ds[b] !== undefined) {
        vars.push({ token: 'arr', label: 'vals', value: `(${String(ds[a])}, ${String(ds[b])})` })
      }
    } else if (snapshot.activeIndices.length > 0) {
      vars.push({ token: 'i', label: 'active', value: snapshot.activeIndices.join(', ') })
    }
    if (snapshot.swappedIndices.length >= 2) {
      vars.push({ token: 'swap', label: 'swapped', value: `[${snapshot.swappedIndices.join(', ')}]` })
    }
    if (snapshot.highlightIndices.length > 0) {
      vars.push({ token: 'sorted', label: 'sorted', value: `${snapshot.highlightIndices.length}/${ds.length}` })
    }
    return vars.slice(0, 7)
  }

  if (typeof ds === 'object' && ds !== null) {
    const rec = ds as Record<string, unknown>

    // Array length when nested array exists
    if (Array.isArray(rec.array)) {
      vars.push({ token: 'n', label: 'n', value: String(rec.array.length) })
    } else if (Array.isArray(rec.values)) {
      vars.push({ token: 'n', label: 'n', value: String(rec.values.length) })
    }

    for (const spec of SCALAR_WATCH_KEYS) {
      if (isLeakKeyAtJunction(spec.key, snapshot.criticalJunctionType, unansweredJunction)) continue
      const raw = rec[spec.key]
      if (typeof raw === 'number' || typeof raw === 'string') {
        vars.push({ token: spec.token, label: spec.label, value: String(raw) })
      }
    }

    // Call stack depth & active frame
    if (Array.isArray(rec.frames)) {
      vars.push({ token: 'factorial', label: 'depth', value: String(rec.frames.length) })
      const topFrame = rec.frames[rec.frames.length - 1] as Record<string, unknown> | undefined
      if (topFrame && typeof topFrame.label === 'string') {
        vars.push({ token: 'n', label: 'frame', value: topFrame.label })
      }
    }

    // Graph / Tree auxiliary queue or stack
    if (Array.isArray(rec.queue)) {
      const preview = rec.queue.slice(0, 5).map(String).join(', ')
      vars.push({
        token: 'queue',
        label: 'queue',
        value: `[${preview}${rec.queue.length > 5 ? ', ...' : ''}]`,
      })
    }
    if (Array.isArray(rec.stack) && !('top' in rec)) {
      const preview = rec.stack.slice(0, 5).map(String).join(', ')
      vars.push({
        token: 'stack',
        label: 'stack',
        value: `[${preview}${rec.stack.length > 5 ? ', ...' : ''}]`,
      })
    }
    if (Array.isArray(rec.visitedOrder) && rec.visitedOrder.length > 0) {
      const preview = rec.visitedOrder.slice(-5).map(String).join(', ')
      vars.push({
        token: 'visit',
        label: 'visited',
        value: `[${rec.visitedOrder.length > 5 ? '..., ' : ''}${preview}]`,
      })
    }
    if (typeof rec.row === 'number' && typeof rec.col === 'number') {
      vars.push({ token: 'i', label: '(r, c)', value: `(${rec.row}, ${rec.col})` })
    }
  }

  return vars.slice(0, 7)
}

export default function VariableWatchStrip() {
  const snapshotArray = useAlgorithmStore((state) => state.snapshotArray)
  const stepIndex = useAlgorithmStore((state) => state.stepIndex)
  const focusModeActive = useAlgorithmStore((state) => state.focusModeActive)
  const hoveredVar = useAlgorithmStore((state) => state.hoveredVar)
  const setHoveredVar = useAlgorithmStore((state) => state.setHoveredVar)
  const unansweredJunction = useAlgorithmStore(selectIsUnansweredJunction)

  const currentSnapshot = snapshotArray[stepIndex] ?? null
  const prevSnapshot = stepIndex > 0 ? (snapshotArray[stepIndex - 1] ?? null) : null

  const currentVars = useMemo(
    () => extractWatchedVariables(currentSnapshot, unansweredJunction),
    [currentSnapshot, unansweredJunction],
  )
  const prevMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const v of extractWatchedVariables(prevSnapshot, false)) {
      map.set(v.label, v.value)
    }
    return map
  }, [prevSnapshot])

  if (focusModeActive || currentVars.length === 0) return null

  return (
    <div
      role="region"
      aria-label="Live variable watch"
      className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-border bg-surface-sunk/60 px-3 py-1.5 font-mono text-[11px] dark:border-dark-border"
    >
      <span className="shrink-0 text-[10px] font-semibold tracking-wider text-text-muted uppercase select-none dark:text-dark-text-secondary">
        Watch
      </span>
      <span aria-hidden="true" className="h-3.5 w-px shrink-0 bg-border dark:bg-dark-border" />
      {currentVars.map((v) => {
        const prevVal = prevMap.get(v.label)
        const changed = stepIndex > 0 && prevVal !== undefined && prevVal !== v.value
        const isHovered = hoveredVar === v.token
        return (
          <button
            key={v.label}
            type="button"
            onMouseEnter={() => setHoveredVar(v.token)}
            onMouseLeave={() => setHoveredVar(null)}
            onFocus={() => setHoveredVar(v.token)}
            onBlur={() => setHoveredVar(null)}
            title="Hover to highlight in Pseudocode / Code tab"
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 transition-colors',
              changed
                ? 'bg-[color-mix(in_srgb,var(--state-current)_14%,transparent)] font-semibold text-ink ring-1 ring-state-current/45'
                : 'bg-card text-text-primary ring-1 ring-border dark:border-dark-border dark:text-dark-text-primary',
              isHovered && 'ring-2 ring-state-current',
            )}
          >
            <span className="text-text-muted dark:text-dark-text-secondary">{v.label}</span>
            <span className="text-text-muted dark:text-dark-text-secondary">=</span>
            <span className="tabular-nums">{v.value}</span>
          </button>
        )
      })}
    </div>
  )
}
