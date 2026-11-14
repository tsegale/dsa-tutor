import { cn } from '@/lib/utils'
import { placeOfTopic } from '@/config/curriculum'

export interface ModuleVisualTheme {
  bg: string
  fg: string
  border: string
  accent: string
  badgeLabel: string
}

export const MODULE_THEMES: Record<number, ModuleVisualTheme> = {
  1: {
    bg: 'var(--tone-indigo-bg)',
    fg: 'var(--tone-indigo-fg)',
    border: 'var(--tone-indigo-border)',
    accent: 'var(--brand)',
    badgeLabel: 'Foundations',
  },
  2: {
    bg: 'var(--tone-sky-bg)',
    fg: 'var(--tone-sky-fg)',
    border: 'var(--tone-sky-border)',
    accent: 'var(--state-current)',
    badgeLabel: 'Searching',
  },
  3: {
    bg: 'var(--tone-amber-bg)',
    fg: 'var(--tone-amber-fg)',
    border: 'var(--tone-amber-border)',
    accent: 'var(--state-compare)',
    badgeLabel: 'Sorting',
  },
  4: {
    bg: 'var(--tone-violet-bg)',
    fg: 'var(--tone-violet-fg)',
    border: 'var(--tone-violet-border)',
    accent: 'var(--category-3)',
    badgeLabel: 'Techniques',
  },
  5: {
    bg: 'var(--tone-emerald-bg)',
    fg: 'var(--tone-emerald-fg)',
    border: 'var(--tone-emerald-border)',
    accent: 'var(--state-sorted)',
    badgeLabel: 'Trees & Heaps',
  },
  6: {
    bg: 'var(--tone-rose-bg)',
    fg: 'var(--tone-rose-fg)',
    border: 'var(--tone-rose-border)',
    accent: 'var(--state-swap)',
    badgeLabel: 'Graphs & Grids',
  },
}

export function getModuleTheme(moduleNumber: number): ModuleVisualTheme {
  return MODULE_THEMES[moduleNumber] ?? MODULE_THEMES[1]
}

export function getTopicTheme(slug: string): ModuleVisualTheme {
  const place = placeOfTopic(slug)
  return getModuleTheme(place?.module.number ?? 1)
}

export function ModuleIcon({ moduleNumber, className }: { moduleNumber: number; className?: string }) {
  const theme = getModuleTheme(moduleNumber)
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex size-9 shrink-0 items-center justify-center rounded-md border', className)}
      style={{
        backgroundColor: theme.bg,
        borderColor: theme.border,
        color: theme.fg,
      }}
    >
      {moduleNumber === 1 && (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="6" width="5" height="12" rx="1" fill="currentColor" fillOpacity="0.18" />
          <rect x="9.5" y="6" width="5" height="12" rx="1" />
          <rect x="16" y="6" width="5" height="12" rx="1" fill="currentColor" fillOpacity="0.18" />
        </svg>
      )}
      {moduleNumber === 2 && (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10.5" cy="10.5" r="6.5" fill="currentColor" fillOpacity="0.18" />
          <path d="m15.5 15.5 5 5" />
          <path d="M8 10.5h5M10.5 8v5" />
        </svg>
      )}
      {moduleNumber === 3 && (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="13" width="4" height="7" rx="1" fill="currentColor" fillOpacity="0.2" />
          <rect x="10" y="9" width="4" height="11" rx="1" fill="currentColor" fillOpacity="0.35" />
          <rect x="17" y="4" width="4" height="16" rx="1" fill="currentColor" fillOpacity="0.15" />
        </svg>
      )}
      {moduleNumber === 4 && (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.2" />
          <rect x="14" y="4" width="7" height="7" rx="1.5" />
          <rect x="3" y="13" width="7" height="7" rx="1.5" />
          <rect x="14" y="13" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.2" />
        </svg>
      )}
      {moduleNumber === 5 && (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="8" x2="6.5" y2="15" />
          <line x1="12" y1="8" x2="17.5" y2="15" />
          <circle cx="12" cy="5.5" r="2.8" fill="currentColor" fillOpacity="0.25" />
          <circle cx="6" cy="17.5" r="2.8" />
          <circle cx="18" cy="17.5" r="2.8" />
        </svg>
      )}
      {moduleNumber === 6 && (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="6" y1="6" x2="18" y2="8" />
          <line x1="6" y1="6" x2="9" y2="18" />
          <line x1="18" y1="8" x2="9" y2="18" />
          <circle cx="6" cy="6" r="2.8" fill="currentColor" fillOpacity="0.25" />
          <circle cx="18" cy="8" r="2.8" />
          <circle cx="9" cy="18" r="2.8" fill="currentColor" fillOpacity="0.25" />
        </svg>
      )}
    </span>
  )
}

function renderTopicSvg(slug: string) {
  // 1. Linked Lists
  if (slug.includes('linked-list')) {
    const isCircular = slug.includes('circular')
    const isDoubly = slug.includes('doubly')
    return (
      <svg viewBox="0 0 180 56" className="h-full w-full" fill="none" aria-hidden="true">
        {/* Nodes */}
        {[
          { x: 16, val: '12', fill: 'var(--surface)', stroke: 'var(--state-current)' },
          { x: 72, val: '27', fill: 'var(--tone-indigo-bg)', stroke: 'var(--brand)' },
          { x: 128, val: '45', fill: 'var(--surface)', stroke: 'var(--state-sorted)' },
        ].map((n, idx) => (
          <g key={idx}>
            <rect x={n.x} y="15" width="36" height="24" rx="5" fill={n.fill} stroke={n.stroke} strokeWidth="1.75" />
            <line x1={n.x + 25} y1="15" x2={n.x + 25} y2="39" stroke={n.stroke} strokeWidth="1.2" opacity="0.6" />
            <text x={n.x + 12.5} y="31" textAnchor="middle" fill="var(--ink)" fontSize="10" fontWeight="600" className="font-mono">
              {n.val}
            </text>
            <circle cx={n.x + 30.5} cy="27" r="2" fill={n.stroke} />
          </g>
        ))}
        {/* Forward pointers */}
        <path d="M52 25h17m-3-3 3 3-3 3" stroke="var(--ink-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M108 25h17m-3-3 3 3-3 3" stroke="var(--ink-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {isDoubly && (
          <>
            <path d="M69 31H52m3-3-3 3 3 3" stroke="var(--state-compare)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M125 31h-17m3-3-3 3 3 3" stroke="var(--state-compare)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {isCircular && (
          <path
            d="M164 27h6a4 4 0 0 1 4 4v13a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V31a4 4 0 0 1 4-4h3"
            stroke="var(--state-swap)"
            strokeWidth="1.4"
            strokeDasharray="3 2"
            strokeLinecap="round"
          />
        )}
      </svg>
    )
  }

  // 2. Stack & Monotonic Stack
  if (slug === 'stack' || slug === 'monotonic-stack') {
    return (
      <svg viewBox="0 0 180 56" className="h-full w-full" fill="none" aria-hidden="true">
        {/* Stack well */}
        <path d="M58 10v38h64V10" stroke="var(--rule-strong)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="63" y="35" width="54" height="10" rx="2.5" fill="var(--surface)" stroke="var(--state-neutral)" strokeWidth="1.5" />
        <rect x="63" y="23" width="54" height="10" rx="2.5" fill="var(--tone-indigo-bg)" stroke="var(--brand)" strokeWidth="1.5" />
        <rect x="63" y="10" width="54" height="10" rx="2.5" fill="var(--tone-emerald-bg)" stroke="var(--state-sorted)" strokeWidth="1.75" />
        <text x="90" y="17.5" textAnchor="middle" fill="var(--ink)" fontSize="8.5" fontWeight="600" className="font-mono">
          TOP: 42
        </text>
        {/* Push/Pop arrows */}
        <path d="M36 22V12h16m-3-3 3 3-3 3" stroke="var(--state-sorted)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M128 12h16v10m-3-3 3 3 3-3" stroke="var(--state-swap)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  // 3. Queue / Circular Queue / Deque
  if (slug.includes('queue') || slug === 'deque') {
    return (
      <svg viewBox="0 0 180 56" className="h-full w-full" fill="none" aria-hidden="true">
        <line x1="34" y1="14" x2="146" y2="14" stroke="var(--rule-strong)" strokeWidth="2" strokeLinecap="round" />
        <line x1="34" y1="42" x2="146" y2="42" stroke="var(--rule-strong)" strokeWidth="2" strokeLinecap="round" />
        {[
          { x: 42, label: '14', border: 'var(--state-swap)', bg: 'var(--tone-rose-bg)' },
          { x: 76, label: '23', border: 'var(--brand)', bg: 'var(--surface)' },
          { x: 110, label: '38', border: 'var(--state-sorted)', bg: 'var(--tone-emerald-bg)' },
        ].map((item, i) => (
          <g key={i}>
            <rect x={item.x} y="18" width="28" height="20" rx="4" fill={item.bg} stroke={item.border} strokeWidth="1.6" />
            <text x={item.x + 14} y="31.5" textAnchor="middle" fill="var(--ink)" fontSize="10" fontWeight="600" className="font-mono">
              {item.label}
            </text>
          </g>
        ))}
        <path d="M14 28h18m-3-3 3 3-3 3" stroke="var(--state-sorted)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M148 28h18m-3-3 3 3-3 3" stroke="var(--state-swap)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  // 4. Hash Table
  if (slug.startsWith('hash-table')) {
    return (
      <svg viewBox="0 0 180 56" className="h-full w-full" fill="none" aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <g key={row}>
            <rect x="28" y={9 + row * 13} width="24" height="11" rx="2" fill="var(--surface)" stroke="var(--brand)" strokeWidth="1.4" />
            <text x="40" y={17 + row * 13} textAnchor="middle" fill="var(--ink-2)" fontSize="8" className="font-mono">
              [{row}]
            </text>
          </g>
        ))}
        <path d="M52 14.5h22m-3-2.5 3 2.5-3 2.5" stroke="var(--state-current)" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="76" y="8" width="32" height="13" rx="3" fill="var(--tone-sky-bg)" stroke="var(--state-current)" strokeWidth="1.5" />
        <text x="92" y="17" textAnchor="middle" fill="var(--ink)" fontSize="8.5" fontWeight="600" className="font-mono">
          k:42
        </text>
        <path d="M108 14.5h14m-2.5-2.5 2.5 2.5-2.5 2.5" stroke="var(--state-sorted)" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="124" y="8" width="32" height="13" rx="3" fill="var(--tone-emerald-bg)" stroke="var(--state-sorted)" strokeWidth="1.5" />
        <text x="140" y="17" textAnchor="middle" fill="var(--ink)" fontSize="8.5" fontWeight="600" className="font-mono">
          k:17
        </text>
        <path d="M52 27.5h22m-3-2.5 3 2.5-3 2.5" stroke="var(--state-compare)" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="76" y="22" width="32" height="13" rx="3" fill="var(--tone-amber-bg)" stroke="var(--state-compare)" strokeWidth="1.5" />
        <text x="92" y="31" textAnchor="middle" fill="var(--ink)" fontSize="8.5" fontWeight="600" className="font-mono">
          k:91
        </text>
      </svg>
    )
  }

  // 5. Recursion
  if (slug.startsWith('recursion-')) {
    return (
      <svg viewBox="0 0 180 56" className="h-full w-full" fill="none" aria-hidden="true">
        <rect x="20" y="8" width="52" height="14" rx="3" fill="var(--tone-indigo-bg)" stroke="var(--brand)" strokeWidth="1.5" />
        <text x="46" y="18" textAnchor="middle" fill="var(--ink)" fontSize="8.5" fontWeight="600" className="font-mono">
          f(3)
        </text>
        <rect x="64" y="21" width="52" height="14" rx="3" fill="var(--tone-sky-bg)" stroke="var(--state-current)" strokeWidth="1.5" />
        <text x="90" y="31" textAnchor="middle" fill="var(--ink)" fontSize="8.5" fontWeight="600" className="font-mono">
          f(2)
        </text>
        <rect x="108" y="34" width="52" height="14" rx="3" fill="var(--tone-emerald-bg)" stroke="var(--state-sorted)" strokeWidth="1.5" />
        <text x="134" y="44" textAnchor="middle" fill="var(--ink)" fontSize="8.5" fontWeight="600" className="font-mono">
          base: 1
        </text>
        <path d="M54 22v6h10" stroke="var(--ink-2)" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M98 35v6h10" stroke="var(--ink-2)" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    )
  }

  // 6. Searching (Linear, Binary, Jump, Interpolation, Exponential)
  if (slug.endsWith('-search') && !slug.startsWith('bst') && !slug.startsWith('trie')) {
    return (
      <svg viewBox="0 0 180 56" className="h-full w-full" fill="none" aria-hidden="true">
        {[
          { x: 16, v: '3', muted: true },
          { x: 44, v: '7', muted: true },
          { x: 72, v: '12', active: true },
          { x: 100, v: '19', compare: true },
          { x: 128, v: '25', muted: false },
        ].map((cell, idx) => (
          <g key={idx}>
            <rect
              x={cell.x}
              y="14"
              width="24"
              height="22"
              rx="4"
              fill={cell.active ? 'var(--tone-emerald-bg)' : cell.compare ? 'var(--tone-sky-bg)' : 'var(--surface)'}
              stroke={cell.active ? 'var(--state-sorted)' : cell.compare ? 'var(--state-current)' : 'var(--rule-strong)'}
              strokeWidth={cell.active || cell.compare ? '1.8' : '1.3'}
              opacity={cell.muted ? 0.55 : 1}
            />
            <text x={cell.x + 12} y="28.5" textAnchor="middle" fill="var(--ink)" fontSize="9.5" fontWeight="600" className="font-mono" opacity={cell.muted ? 0.6 : 1}>
              {cell.v}
            </text>
          </g>
        ))}
        {/* Mid pointer indicator */}
        <path d="M84 46v-7m-3 3 3-3 3 3" stroke="var(--state-sorted)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <text x="84" y="53" textAnchor="middle" fill="var(--state-sorted)" fontSize="8" fontWeight="700" className="font-mono">
          mid
        </text>
      </svg>
    )
  }

  // 7. Sorting (Bubble, Selection, Insertion, Shell, Merge, Quick, Heap, Counting, Radix)
  if (slug.endsWith('-sort') && slug !== 'topological-sort') {
    const bars = [
      { h: 16, fill: 'var(--state-sorted)', stroke: 'var(--state-sorted)' },
      { h: 24, fill: 'var(--state-sorted)', stroke: 'var(--state-sorted)' },
      { h: 38, fill: 'var(--state-compare)', stroke: 'var(--state-compare)' },
      { h: 28, fill: 'var(--state-swap)', stroke: 'var(--state-swap)' },
      { h: 20, fill: 'var(--surface)', stroke: 'var(--state-current)' },
      { h: 34, fill: 'var(--surface)', stroke: 'var(--rule-strong)' },
      { h: 42, fill: 'var(--tone-indigo-bg)', stroke: 'var(--brand)' },
    ]
    return (
      <svg viewBox="0 0 180 56" className="h-full w-full" fill="none" aria-hidden="true">
        {bars.map((bar, i) => {
          const x = 22 + i * 20
          const y = 48 - bar.h
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width="14"
              height={bar.h}
              rx="3"
              fill={bar.fill}
              stroke={bar.stroke}
              strokeWidth="1.5"
            />
          )
        })}
        {/* Swap arc over bars 2 and 3 */}
        <path d="M69 8c4-5 16-5 20 0" stroke="var(--state-swap)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }

  // 8. Two-Pointer / Sliding Window / Prefix Sum
  if (slug === 'two-pointer' || slug.startsWith('sliding-window') || slug === 'prefix-sum') {
    return (
      <svg viewBox="0 0 180 56" className="h-full w-full" fill="none" aria-hidden="true">
        {/* Highlighted window bracket */}
        <rect x="42" y="11" width="76" height="28" rx="6" fill="var(--tone-violet-bg)" stroke="var(--category-3)" strokeWidth="1.6" strokeDasharray="4 2" />
        {[18, 46, 72, 98, 126].map((x, i) => (
          <g key={i}>
            <rect
              x={x}
              y="15"
              width="20"
              height="20"
              rx="3.5"
              fill={i >= 1 && i <= 3 ? 'var(--surface)' : 'var(--surface-sunk)'}
              stroke={i >= 1 && i <= 3 ? 'var(--brand)' : 'var(--rule-strong)'}
              strokeWidth="1.4"
            />
            <text x={x + 10} y="28.5" textAnchor="middle" fill="var(--ink)" fontSize="9" fontWeight="600" className="font-mono">
              {[2, 5, 1, 8, 3][i]}
            </text>
          </g>
        ))}
        <text x="56" y="50" textAnchor="middle" fill="var(--brand)" fontSize="8.5" fontWeight="700" className="font-mono">
          L
        </text>
        <text x="108" y="50" textAnchor="middle" fill="var(--state-swap)" fontSize="8.5" fontWeight="700" className="font-mono">
          R
        </text>
      </svg>
    )
  }

  // 9. DP / Backtracking / Divide & Conquer / Greedy
  if (slug.startsWith('dp-') || slug === 'backtracking' || slug === 'divide-and-conquer' || slug === 'greedy') {
    return (
      <svg viewBox="0 0 180 56" className="h-full w-full" fill="none" aria-hidden="true">
        {[0, 1, 2].map((r) =>
          [0, 1, 2, 3].map((c) => {
            const isTarget = r === 2 && c === 3
            const isDep = (r === 1 && c === 3) || (r === 2 && c === 2)
            return (
              <rect
                key={`${r}-${c}`}
                x={38 + c * 26}
                y={7 + r * 14}
                width="23"
                height="12"
                rx="2.5"
                fill={isTarget ? 'var(--tone-emerald-bg)' : isDep ? 'var(--tone-violet-bg)' : 'var(--surface)'}
                stroke={isTarget ? 'var(--state-sorted)' : isDep ? 'var(--category-3)' : 'var(--rule-strong)'}
                strokeWidth={isTarget || isDep ? '1.6' : '1.2'}
              />
            )
          }),
        )}
        <path d="M106 41h8" stroke="var(--state-sorted)" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M127 31v4" stroke="var(--state-sorted)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }

  // 10. Trees, BST, AVL, Red-Black, Heaps, Tries
  if (
    slug.startsWith('bst') ||
    slug.startsWith('tree-') ||
    slug.startsWith('avl-') ||
    slug.startsWith('rb-') ||
    slug.includes('heap') ||
    slug.startsWith('trie-')
  ) {
    const isRB = slug.startsWith('rb-')
    return (
      <svg viewBox="0 0 180 56" className="h-full w-full" fill="none" aria-hidden="true">
        {/* Edges */}
        <line x1="90" y1="13" x2="54" y2="29" stroke="var(--rule-strong)" strokeWidth="1.75" />
        <line x1="90" y1="13" x2="126" y2="29" stroke="var(--state-sorted)" strokeWidth="1.75" />
        <line x1="54" y1="29" x2="36" y2="45" stroke="var(--rule-strong)" strokeWidth="1.5" />
        <line x1="54" y1="29" x2="72" y2="45" stroke="var(--rule-strong)" strokeWidth="1.5" />
        <line x1="126" y1="29" x2="108" y2="45" stroke="var(--state-sorted)" strokeWidth="1.5" />
        <line x1="126" y1="29" x2="144" y2="45" stroke="var(--rule-strong)" strokeWidth="1.5" />

        {/* Root */}
        <circle cx="90" cy="13" r="8" fill={isRB ? 'var(--ink)' : 'var(--tone-emerald-bg)'} stroke={isRB ? 'var(--ink)' : 'var(--state-sorted)'} strokeWidth="1.75" />
        <text x="90" y="16" textAnchor="middle" fill={isRB ? 'var(--paper)' : 'var(--ink)'} fontSize="8.5" fontWeight="700" className="font-mono">
          20
        </text>
        {/* Level 2 */}
        <circle cx="54" cy="29" r="7.5" fill={isRB ? 'var(--tone-rose-bg)' : 'var(--surface)'} stroke={isRB ? 'var(--state-swap)' : 'var(--state-current)'} strokeWidth="1.6" />
        <text x="54" y="32" textAnchor="middle" fill="var(--ink)" fontSize="8" fontWeight="600" className="font-mono">
          10
        </text>
        <circle cx="126" cy="29" r="7.5" fill="var(--tone-amber-bg)" stroke="var(--state-compare)" strokeWidth="1.6" />
        <text x="126" y="32" textAnchor="middle" fill="var(--ink)" fontSize="8" fontWeight="600" className="font-mono">
          30
        </text>
        {/* Leaves */}
        <circle cx="36" cy="45" r="5.5" fill="var(--surface)" stroke="var(--rule-strong)" strokeWidth="1.4" />
        <circle cx="72" cy="45" r="5.5" fill="var(--surface)" stroke="var(--rule-strong)" strokeWidth="1.4" />
        <circle cx="108" cy="45" r="6" fill="var(--tone-emerald-bg)" stroke="var(--state-sorted)" strokeWidth="1.6" />
        <circle cx="144" cy="45" r="5.5" fill="var(--surface)" stroke="var(--rule-strong)" strokeWidth="1.4" />
      </svg>
    )
  }

  // 11. Grid Pathfinding & Maze Algorithms
  if (slug.startsWith('grid-') || slug.startsWith('maze-')) {
    const pathCells = new Set(['0-0', '0-1', '1-1', '1-2', '2-2', '2-4'])
    const wallCells = new Set(['0-2', '1-3', '2-1'])
    return (
      <svg viewBox="0 0 180 56" className="h-full w-full" fill="none" aria-hidden="true">
        {[0, 1, 2].map((r) =>
          [0, 1, 2, 3, 4].map((c) => {
            const key = `${r}-${c}`
            const isStart = r === 0 && c === 0
            const isGoal = r === 2 && c === 4
            const isWall = wallCells.has(key)
            const isPath = pathCells.has(key)
            return (
              <rect
                key={key}
                x={44 + c * 18}
                y={6 + r * 15}
                width="15"
                height="13"
                rx="2.5"
                fill={
                  isStart
                    ? 'var(--tone-sky-bg)'
                    : isGoal
                      ? 'var(--tone-emerald-bg)'
                      : isWall
                        ? 'var(--state-neutral)'
                        : isPath
                          ? 'var(--tone-amber-bg)'
                          : 'var(--surface)'
                }
                stroke={
                  isStart
                    ? 'var(--state-current)'
                    : isGoal
                      ? 'var(--state-sorted)'
                      : isPath
                        ? 'var(--state-compare)'
                        : 'var(--rule-strong)'
                }
                strokeWidth="1.3"
              />
            )
          }),
        )}
      </svg>
    )
  }

  // 12. Graphs (BFS, DFS, Dijkstra, Bellman-Ford, Floyd-Warshall, Kruskal, Prim, Topological Sort, etc.)
  if (
    slug === 'bfs' ||
    slug === 'dfs' ||
    slug === 'dijkstra' ||
    slug === 'bellman-ford' ||
    slug === 'floyd-warshall' ||
    slug === 'kruskal' ||
    slug === 'prim' ||
    slug === 'cycle-detection' ||
    slug === 'connected-components' ||
    slug === 'topological-sort'
  ) {
    return (
      <svg viewBox="0 0 180 56" className="h-full w-full" fill="none" aria-hidden="true">
        {/* Graph edges */}
        <line x1="36" y1="28" x2="76" y2="13" stroke="var(--state-sorted)" strokeWidth="2" />
        <line x1="36" y1="28" x2="76" y2="43" stroke="var(--rule-strong)" strokeWidth="1.5" />
        <line x1="76" y1="13" x2="112" y2="28" stroke="var(--state-sorted)" strokeWidth="2" />
        <line x1="76" y1="43" x2="112" y2="28" stroke="var(--state-compare)" strokeWidth="1.75" />
        <line x1="112" y1="28" x2="146" y2="28" stroke="var(--state-sorted)" strokeWidth="2" />

        {/* Vertices */}
        <circle cx="36" cy="28" r="8" fill="var(--tone-sky-bg)" stroke="var(--state-current)" strokeWidth="1.75" />
        <text x="36" y="31" textAnchor="middle" fill="var(--ink)" fontSize="8.5" fontWeight="700" className="font-mono">
          A
        </text>
        <circle cx="76" cy="13" r="8" fill="var(--tone-emerald-bg)" stroke="var(--state-sorted)" strokeWidth="1.75" />
        <text x="76" y="16" textAnchor="middle" fill="var(--ink)" fontSize="8.5" fontWeight="700" className="font-mono">
          B
        </text>
        <circle cx="76" cy="43" r="7.5" fill="var(--surface)" stroke="var(--state-compare)" strokeWidth="1.6" />
        <text x="76" y="46" textAnchor="middle" fill="var(--ink)" fontSize="8" fontWeight="600" className="font-mono">
          C
        </text>
        <circle cx="112" cy="28" r="8" fill="var(--tone-emerald-bg)" stroke="var(--state-sorted)" strokeWidth="1.75" />
        <text x="112" y="31" textAnchor="middle" fill="var(--ink)" fontSize="8.5" fontWeight="700" className="font-mono">
          D
        </text>
        <circle cx="146" cy="28" r="8" fill="var(--tone-rose-bg)" stroke="var(--state-swap)" strokeWidth="1.75" />
        <text x="146" y="31" textAnchor="middle" fill="var(--ink)" fontSize="8.5" fontWeight="700" className="font-mono">
          E
        </text>
      </svg>
    )
  }

  // Default: Array operations (array-access, array-insert, array-delete)
  const isInsert = slug === 'array-insert'
  const isDelete = slug === 'array-delete'
  return (
    <svg viewBox="0 0 180 56" className="h-full w-full" fill="none" aria-hidden="true">
      {[
        { x: 20, val: '10', idx: '0', highlight: false },
        { x: 54, val: '24', idx: '1', highlight: false },
        { x: 88, val: isInsert ? '+18' : isDelete ? '×' : '37', idx: '2', highlight: true },
        { x: 122, val: '51', idx: '3', highlight: false },
      ].map((cell) => (
        <g key={cell.idx}>
          <rect
            x={cell.x}
            y="12"
            width="30"
            height="24"
            rx="4"
            fill={
              cell.highlight
                ? isDelete
                  ? 'var(--tone-rose-bg)'
                  : isInsert
                    ? 'var(--tone-emerald-bg)'
                    : 'var(--tone-indigo-bg)'
                : 'var(--surface)'
            }
            stroke={
              cell.highlight
                ? isDelete
                  ? 'var(--state-swap)'
                  : isInsert
                    ? 'var(--state-sorted)'
                    : 'var(--brand)'
                : 'var(--rule-strong)'
            }
            strokeWidth={cell.highlight ? '1.8' : '1.4'}
          />
          <text x={cell.x + 15} y="27.5" textAnchor="middle" fill="var(--ink)" fontSize="9.5" fontWeight="600" className="font-mono">
            {cell.val}
          </text>
          <text x={cell.x + 15} y="47" textAnchor="middle" fill="var(--ink-2)" fontSize="8" className="font-mono">
            [{cell.idx}]
          </text>
        </g>
      ))}
    </svg>
  )
}

export function TopicArtwork({
  slug,
  className,
}: {
  slug: string
  className?: string
}) {
  const theme = getTopicTheme(slug)
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative flex h-14 w-full items-center justify-center overflow-hidden rounded-sm border bg-surface-sunk px-2',
        className,
      )}
      style={{
        borderColor: theme.border,
        backgroundColor: 'color-mix(in srgb, ' + theme.bg + ' 45%, var(--surface-sunk))',
      }}
    >
      {renderTopicSvg(slug)}
    </div>
  )
}
