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

export function getTopicStructureLabel(slug: string): string {
  if (slug.includes('linked-list')) return 'Linked List'
  if (slug === 'stack' || slug === 'monotonic-stack') return 'LIFO Stack'
  if (slug.includes('queue') || slug === 'deque') return 'FIFO Queue'
  if (slug.startsWith('hash-table')) return 'Hash Table'
  if (slug.startsWith('recursion-')) return 'Call Stack'
  if (slug.endsWith('-search') && !slug.startsWith('bst') && !slug.startsWith('trie')) return 'Search Array'
  if (slug.endsWith('-sort') && slug !== 'topological-sort') return 'Sorting Bars'
  if (slug === 'two-pointer') return 'Two Pointers'
  if (slug.startsWith('sliding-window')) return 'Sliding Window'
  if (slug === 'prefix-sum') return 'Prefix Array'
  if (slug.startsWith('dp-')) return 'DP Matrix'
  if (slug === 'backtracking') return 'Search Tree'
  if (slug === 'divide-and-conquer' || slug === 'greedy') return 'Paradigm'
  if (slug.startsWith('rb-')) return 'Red-Black Tree'
  if (slug.startsWith('avl-')) return 'AVL Tree'
  if (slug.includes('heap')) return 'Binary Heap'
  if (slug.startsWith('trie-')) return 'Prefix Trie'
  if (slug.startsWith('bst') || slug.startsWith('tree-')) return 'Binary Tree'
  if (slug.startsWith('grid-') || slug.startsWith('maze-')) return '2D Grid'
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
    return 'Graph Network'
  }
  return 'Array'
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
      <svg viewBox="0 0 240 76" className="h-full w-full" fill="none" aria-hidden="true">
        <text x="16" y="16" fill="var(--ink-2)" fontSize="8.5" fontWeight="700" className="font-mono">
          HEAD
        </text>
        <path d="M26 19v6" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round" />
        {[
          { x: 16, val: '12', fill: 'var(--surface)', stroke: 'var(--state-current)' },
          { x: 94, val: '27', fill: 'var(--tone-indigo-bg)', stroke: 'var(--brand)' },
          { x: 172, val: '45', fill: 'var(--tone-emerald-bg)', stroke: 'var(--state-sorted)' },
        ].map((n, idx) => (
          <g key={idx}>
            <rect x={n.x} y="25" width="52" height="32" rx="6" fill={n.fill} stroke={n.stroke} strokeWidth="2" />
            <line x1={n.x + 36} y1="25" x2={n.x + 36} y2="57" stroke={n.stroke} strokeWidth="1.5" opacity="0.65" />
            <text x={n.x + 18} y="45" textAnchor="middle" fill="var(--ink)" fontSize="12.5" fontWeight="700" className="font-mono">
              {n.val}
            </text>
            <circle cx={n.x + 44} cy="41" r="2.8" fill={n.stroke} />
          </g>
        ))}
        {/* Forward pointers */}
        <path d="M68 38h23m-4-3.5 4 3.5-4 3.5" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M146 38h23m-4-3.5 4 3.5-4 3.5" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        {isDoubly && (
          <>
            <path d="M91 45H68m4-3.5-4 3.5 4 3.5" stroke="var(--state-compare)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M169 45h-23m4-3.5-4 3.5 4 3.5" stroke="var(--state-compare)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {isCircular && (
          <path
            d="M224 41h7a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V45a4 4 0 0 1 4-4h3"
            stroke="var(--state-swap)"
            strokeWidth="1.7"
            strokeDasharray="4 2.5"
            strokeLinecap="round"
          />
        )}
      </svg>
    )
  }

  // 2. Stack & Monotonic Stack
  if (slug === 'stack' || slug === 'monotonic-stack') {
    return (
      <svg viewBox="0 0 240 76" className="h-full w-full" fill="none" aria-hidden="true">
        <path d="M72 10v56h96V10" stroke="var(--rule-strong)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="80" y="48" width="80" height="14" rx="3.5" fill="var(--surface)" stroke="var(--state-neutral)" strokeWidth="1.8" />
        <text x="120" y="58" textAnchor="middle" fill="var(--ink-2)" fontSize="9.5" fontWeight="600" className="font-mono">
          18
        </text>
        <rect x="80" y="31" width="80" height="14" rx="3.5" fill="var(--tone-indigo-bg)" stroke="var(--brand)" strokeWidth="1.8" />
        <text x="120" y="41" textAnchor="middle" fill="var(--ink)" fontSize="9.5" fontWeight="600" className="font-mono">
          29
        </text>
        <rect x="80" y="13" width="80" height="15" rx="3.5" fill="var(--tone-emerald-bg)" stroke="var(--state-sorted)" strokeWidth="2" />
        <text x="120" y="23.5" textAnchor="middle" fill="var(--ink)" fontSize="10" fontWeight="700" className="font-mono">
          TOP → 42
        </text>
        {/* Push/Pop labels & arrows */}
        <text x="34" y="15" textAnchor="middle" fill="var(--state-sorted)" fontSize="8.5" fontWeight="700" className="font-mono">
          PUSH
        </text>
        <path d="M34 19v6h32m-4-3.5 4 3.5-4 3.5" stroke="var(--state-sorted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="206" y="15" textAnchor="middle" fill="var(--state-swap)" fontSize="8.5" fontWeight="700" className="font-mono">
          POP
        </text>
        <path d="M174 25h32v-6m-3.5 3.5 3.5-3.5 3.5 3.5" stroke="var(--state-swap)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  // 3. Queue / Circular Queue / Deque
  if (slug.includes('queue') || slug === 'deque') {
    return (
      <svg viewBox="0 0 240 76" className="h-full w-full" fill="none" aria-hidden="true">
        <line x1="42" y1="18" x2="198" y2="18" stroke="var(--rule-strong)" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="42" y1="58" x2="198" y2="58" stroke="var(--rule-strong)" strokeWidth="2.2" strokeLinecap="round" />
        {[
          { x: 50, label: '14', sub: 'FRONT', border: 'var(--state-swap)', bg: 'var(--tone-rose-bg)' },
          { x: 100, label: '23', sub: 'idx 1', border: 'var(--brand)', bg: 'var(--surface)' },
          { x: 150, label: '38', sub: 'REAR', border: 'var(--state-sorted)', bg: 'var(--tone-emerald-bg)' },
        ].map((item, i) => (
          <g key={i}>
            <rect x={item.x} y="23" width="40" height="30" rx="5" fill={item.bg} stroke={item.border} strokeWidth="2" />
            <text x={item.x + 20} y="42" textAnchor="middle" fill="var(--ink)" fontSize="12" fontWeight="700" className="font-mono">
              {item.label}
            </text>
            <text x={item.x + 20} y="70" textAnchor="middle" fill="var(--ink-2)" fontSize="7.5" fontWeight="700" className="font-mono">
              {item.sub}
            </text>
          </g>
        ))}
        <path d="M14 38h24m-4-3.5 4 3.5-4 3.5" stroke="var(--state-sorted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M202 38h24m-4-3.5 4 3.5-4 3.5" stroke="var(--state-swap)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  // 4. Hash Table
  if (slug.startsWith('hash-table')) {
    return (
      <svg viewBox="0 0 240 76" className="h-full w-full" fill="none" aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <g key={row}>
            <rect x="28" y={10 + row * 20} width="36" height="16" rx="3" fill="var(--surface)" stroke="var(--brand)" strokeWidth="1.75" />
            <text x="46" y={21 + row * 20} textAnchor="middle" fill="var(--ink)" fontSize="9.5" fontWeight="700" className="font-mono">
              #{row}
            </text>
          </g>
        ))}
        <path d="M64 18h28m-3.5-3 3.5 3-3.5 3" stroke="var(--state-current)" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="95" y="10" width="48" height="16" rx="4" fill="var(--tone-sky-bg)" stroke="var(--state-current)" strokeWidth="1.8" />
        <text x="119" y="21" textAnchor="middle" fill="var(--ink)" fontSize="9.5" fontWeight="700" className="font-mono">
          k:42
        </text>
        <path d="M143 18h20m-3.5-3 3.5 3-3.5 3" stroke="var(--state-sorted)" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="166" y="10" width="48" height="16" rx="4" fill="var(--tone-emerald-bg)" stroke="var(--state-sorted)" strokeWidth="1.8" />
        <text x="190" y="21" textAnchor="middle" fill="var(--ink)" fontSize="9.5" fontWeight="700" className="font-mono">
          k:17
        </text>
        <path d="M64 38h28m-3.5-3 3.5 3-3.5 3" stroke="var(--state-compare)" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="95" y="30" width="48" height="16" rx="4" fill="var(--tone-amber-bg)" stroke="var(--state-compare)" strokeWidth="1.8" />
        <text x="119" y="41" textAnchor="middle" fill="var(--ink)" fontSize="9.5" fontWeight="700" className="font-mono">
          k:91
        </text>
        <path d="M64 58h28m-3.5-3 3.5 3-3.5 3" stroke="var(--rule-strong)" strokeWidth="1.6" strokeLinecap="round" />
        <text x="108" y="61" fill="var(--ink-2)" fontSize="9" className="font-mono">
          null
        </text>
      </svg>
    )
  }

  // 5. Recursion
  if (slug.startsWith('recursion-')) {
    return (
      <svg viewBox="0 0 240 76" className="h-full w-full" fill="none" aria-hidden="true">
        <rect x="20" y="8" width="72" height="19" rx="4" fill="var(--tone-indigo-bg)" stroke="var(--brand)" strokeWidth="1.8" />
        <text x="56" y="20.5" textAnchor="middle" fill="var(--ink)" fontSize="10" fontWeight="700" className="font-mono">
          call f(3)
        </text>
        <rect x="84" y="29" width="72" height="19" rx="4" fill="var(--tone-sky-bg)" stroke="var(--state-current)" strokeWidth="1.8" />
        <text x="120" y="41.5" textAnchor="middle" fill="var(--ink)" fontSize="10" fontWeight="700" className="font-mono">
          call f(2)
        </text>
        <rect x="148" y="50" width="72" height="19" rx="4" fill="var(--tone-emerald-bg)" stroke="var(--state-sorted)" strokeWidth="2" />
        <text x="184" y="62.5" textAnchor="middle" fill="var(--ink)" fontSize="10" fontWeight="700" className="font-mono">
          return 1
        </text>
        <path d="M56 27v11h25m-3-3 3 3-3 3" stroke="var(--brand)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M120 48v11h25m-3-3 3 3-3 3" stroke="var(--state-sorted)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  // 6. Searching (Linear, Binary, Jump, Interpolation, Exponential)
  if (slug.endsWith('-search') && !slug.startsWith('bst') && !slug.startsWith('trie')) {
    return (
      <svg viewBox="0 0 240 76" className="h-full w-full" fill="none" aria-hidden="true">
        {[
          { x: 16, v: '3', muted: true, tag: '' },
          { x: 52, v: '7', muted: true, tag: '' },
          { x: 88, v: '12', compare: true, tag: 'lo' },
          { x: 124, v: '19', active: true, tag: 'mid' },
          { x: 160, v: '25', compare: true, tag: '' },
          { x: 196, v: '31', compare: true, tag: 'hi' },
        ].map((cell, idx) => (
          <g key={idx}>
            <rect
              x={cell.x}
              y="16"
              width="30"
              height="30"
              rx="5"
              fill={cell.active ? 'var(--tone-emerald-bg)' : cell.compare ? 'var(--tone-sky-bg)' : 'var(--surface)'}
              stroke={cell.active ? 'var(--state-sorted)' : cell.compare ? 'var(--state-current)' : 'var(--rule-strong)'}
              strokeWidth={cell.active ? '2.2' : cell.compare ? '1.8' : '1.4'}
              opacity={cell.muted ? 0.45 : 1}
            />
            <text
              x={cell.x + 15}
              y="35"
              textAnchor="middle"
              fill="var(--ink)"
              fontSize="11.5"
              fontWeight="700"
              className="font-mono"
              opacity={cell.muted ? 0.55 : 1}
            >
              {cell.v}
            </text>
            {cell.tag && (
              <text
                x={cell.x + 15}
                y="62"
                textAnchor="middle"
                fill={cell.active ? 'var(--state-sorted)' : 'var(--state-current)'}
                fontSize="9.5"
                fontWeight="700"
                className="font-mono"
              >
                ↑ {cell.tag}
              </text>
            )}
          </g>
        ))}
      </svg>
    )
  }

  // 7. Sorting (Bubble, Selection, Insertion, Shell, Merge, Quick, Heap, Counting, Radix)
  if (slug.endsWith('-sort') && slug !== 'topological-sort') {
    const bars = [
      { h: 20, val: '2', fill: 'var(--tone-emerald-bg)', stroke: 'var(--state-sorted)' },
      { h: 30, val: '4', fill: 'var(--tone-emerald-bg)', stroke: 'var(--state-sorted)' },
      { h: 50, val: '9', fill: 'var(--tone-amber-bg)', stroke: 'var(--state-compare)' },
      { h: 36, val: '6', fill: 'var(--tone-rose-bg)', stroke: 'var(--state-swap)' },
      { h: 25, val: '3', fill: 'var(--surface)', stroke: 'var(--state-current)' },
      { h: 44, val: '8', fill: 'var(--surface)', stroke: 'var(--rule-strong)' },
      { h: 56, val: '11', fill: 'var(--tone-indigo-bg)', stroke: 'var(--brand)' },
    ]
    return (
      <svg viewBox="0 0 240 76" className="h-full w-full" fill="none" aria-hidden="true">
        {bars.map((bar, i) => {
          const x = 24 + i * 28
          const y = 68 - bar.h
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width="20"
                height={bar.h}
                rx="4"
                fill={bar.fill}
                stroke={bar.stroke}
                strokeWidth="1.8"
              />
              <text x={x + 10} y={y + 13} textAnchor="middle" fill="var(--ink)" fontSize="9" fontWeight="700" className="font-mono">
                {bar.val}
              </text>
            </g>
          )
        })}
        {/* Swap arc over bars 2 and 3 */}
        <path d="M90 12c6-7 22-7 28 0" stroke="var(--state-swap)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  // 8. Two-Pointer / Sliding Window / Prefix Sum
  if (slug === 'two-pointer' || slug.startsWith('sliding-window') || slug === 'prefix-sum') {
    return (
      <svg viewBox="0 0 240 76" className="h-full w-full" fill="none" aria-hidden="true">
        {/* Highlighted window bracket */}
        <rect
          x="52"
          y="12"
          width="104"
          height="40"
          rx="7"
          fill="var(--tone-violet-bg)"
          stroke="var(--category-3)"
          strokeWidth="2"
          strokeDasharray="5 2.5"
        />
        {[20, 56, 90, 124, 160, 194].map((x, i) => (
          <g key={i}>
            <rect
              x={x}
              y="18"
              width="28"
              height="28"
              rx="4.5"
              fill={i >= 1 && i <= 3 ? 'var(--surface)' : 'var(--surface-sunk)'}
              stroke={i >= 1 && i <= 3 ? 'var(--brand)' : 'var(--rule-strong)'}
              strokeWidth={i >= 1 && i <= 3 ? '1.8' : '1.4'}
            />
            <text x={x + 14} y="36" textAnchor="middle" fill="var(--ink)" fontSize="11" fontWeight="700" className="font-mono">
              {[2, 5, 1, 8, 3, 6][i]}
            </text>
          </g>
        ))}
        <text x="70" y="66" textAnchor="middle" fill="var(--brand)" fontSize="9.5" fontWeight="700" className="font-mono">
          ↑ L
        </text>
        <text x="138" y="66" textAnchor="middle" fill="var(--state-swap)" fontSize="9.5" fontWeight="700" className="font-mono">
          ↑ R
        </text>
      </svg>
    )
  }

  // 9. DP / Backtracking / Divide & Conquer / Greedy
  if (slug.startsWith('dp-') || slug === 'backtracking' || slug === 'divide-and-conquer' || slug === 'greedy') {
    const vals = [
      ['0', '1', '1', '2'],
      ['1', '2', '3', '5'],
      ['1', '3', '6', '11'],
    ]
    return (
      <svg viewBox="0 0 240 76" className="h-full w-full" fill="none" aria-hidden="true">
        {[0, 1, 2].map((r) =>
          [0, 1, 2, 3].map((c) => {
            const isTarget = r === 2 && c === 3
            const isDep = (r === 1 && c === 3) || (r === 2 && c === 2)
            const x = 44 + c * 38
            const y = 9 + r * 20
            return (
              <g key={`${r}-${c}`}>
                <rect
                  x={x}
                  y={y}
                  width="34"
                  height="17"
                  rx="3.5"
                  fill={isTarget ? 'var(--tone-emerald-bg)' : isDep ? 'var(--tone-violet-bg)' : 'var(--surface)'}
                  stroke={isTarget ? 'var(--state-sorted)' : isDep ? 'var(--category-3)' : 'var(--rule-strong)'}
                  strokeWidth={isTarget ? '2' : isDep ? '1.8' : '1.3'}
                />
                <text x={x + 17} y={y + 11.5} textAnchor="middle" fill="var(--ink)" fontSize="9" fontWeight="700" className="font-mono">
                  {vals[r][c]}
                </text>
              </g>
            )
          }),
        )}
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
      <svg viewBox="0 0 240 76" className="h-full w-full" fill="none" aria-hidden="true">
        {/* Edges */}
        <line x1="120" y1="16" x2="72" y2="39" stroke="var(--rule-strong)" strokeWidth="2" />
        <line x1="120" y1="16" x2="168" y2="39" stroke="var(--state-sorted)" strokeWidth="2.2" />
        <line x1="72" y1="39" x2="46" y2="62" stroke="var(--rule-strong)" strokeWidth="1.8" />
        <line x1="72" y1="39" x2="98" y2="62" stroke="var(--rule-strong)" strokeWidth="1.8" />
        <line x1="168" y1="39" x2="142" y2="62" stroke="var(--state-sorted)" strokeWidth="2" />
        <line x1="168" y1="39" x2="194" y2="62" stroke="var(--rule-strong)" strokeWidth="1.8" />

        {/* Root */}
        <circle cx="120" cy="16" r="11" fill={isRB ? 'var(--ink)' : 'var(--tone-emerald-bg)'} stroke={isRB ? 'var(--ink)' : 'var(--state-sorted)'} strokeWidth="2" />
        <text x="120" y="19.5" textAnchor="middle" fill={isRB ? 'var(--paper)' : 'var(--ink)'} fontSize="10" fontWeight="700" className="font-mono">
          20
        </text>
        {/* Level 2 */}
        <circle cx="72" cy="39" r="10.5" fill={isRB ? 'var(--tone-rose-bg)' : 'var(--surface)'} stroke={isRB ? 'var(--state-swap)' : 'var(--state-current)'} strokeWidth="2" />
        <text x="72" y="42.5" textAnchor="middle" fill="var(--ink)" fontSize="9.5" fontWeight="700" className="font-mono">
          10
        </text>
        <circle cx="168" cy="39" r="10.5" fill="var(--tone-amber-bg)" stroke="var(--state-compare)" strokeWidth="2" />
        <text x="168" y="42.5" textAnchor="middle" fill="var(--ink)" fontSize="9.5" fontWeight="700" className="font-mono">
          30
        </text>
        {/* Leaves */}
        <circle cx="46" cy="62" r="8" fill="var(--surface)" stroke="var(--rule-strong)" strokeWidth="1.6" />
        <text x="46" y="65" textAnchor="middle" fill="var(--ink-2)" fontSize="8" fontWeight="600" className="font-mono">
          5
        </text>
        <circle cx="98" cy="62" r="8" fill="var(--surface)" stroke="var(--rule-strong)" strokeWidth="1.6" />
        <text x="98" y="65" textAnchor="middle" fill="var(--ink-2)" fontSize="8" fontWeight="600" className="font-mono">
          15
        </text>
        <circle cx="142" cy="62" r="8.5" fill="var(--tone-emerald-bg)" stroke="var(--state-sorted)" strokeWidth="2" />
        <text x="142" y="65" textAnchor="middle" fill="var(--ink)" fontSize="8.5" fontWeight="700" className="font-mono">
          25
        </text>
        <circle cx="194" cy="62" r="8" fill="var(--surface)" stroke="var(--rule-strong)" strokeWidth="1.6" />
        <text x="194" y="65" textAnchor="middle" fill="var(--ink-2)" fontSize="8" fontWeight="600" className="font-mono">
          35
        </text>
      </svg>
    )
  }

  // 11. Grid Pathfinding & Maze Algorithms
  if (slug.startsWith('grid-') || slug.startsWith('maze-')) {
    const pathCells = new Set(['0-0', '0-1', '1-1', '1-2', '2-2', '2-3', '2-4'])
    const wallCells = new Set(['0-2', '1-3', '2-1', '0-4'])
    return (
      <svg viewBox="0 0 240 76" className="h-full w-full" fill="none" aria-hidden="true">
        {[0, 1, 2].map((r) =>
          [0, 1, 2, 3, 4, 5].map((c) => {
            const key = `${r}-${c}`
            const isStart = r === 0 && c === 0
            const isGoal = r === 2 && c === 4
            const isWall = wallCells.has(key)
            const isPath = pathCells.has(key)
            const x = 44 + c * 26
            const y = 8 + r * 21
            return (
              <g key={key}>
                <rect
                  x={x}
                  y={y}
                  width="22"
                  height="18"
                  rx="3.5"
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
                  strokeWidth={isStart || isGoal || isPath ? '1.8' : '1.3'}
                />
                {(isStart || isGoal) && (
                  <text x={x + 11} y={y + 12} textAnchor="middle" fill="var(--ink)" fontSize="8.5" fontWeight="700" className="font-mono">
                    {isStart ? 'S' : 'G'}
                  </text>
                )}
              </g>
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
      <svg viewBox="0 0 240 76" className="h-full w-full" fill="none" aria-hidden="true">
        {/* Graph edges */}
        <line x1="42" y1="38" x2="96" y2="16" stroke="var(--state-sorted)" strokeWidth="2.4" />
        <line x1="42" y1="38" x2="96" y2="60" stroke="var(--rule-strong)" strokeWidth="1.8" />
        <line x1="96" y1="16" x2="148" y2="38" stroke="var(--state-sorted)" strokeWidth="2.4" />
        <line x1="96" y1="60" x2="148" y2="38" stroke="var(--state-compare)" strokeWidth="2" strokeDasharray="4 2" />
        <line x1="148" y1="38" x2="198" y2="38" stroke="var(--state-sorted)" strokeWidth="2.4" />

        {/* Vertices */}
        <circle cx="42" cy="38" r="11" fill="var(--tone-sky-bg)" stroke="var(--state-current)" strokeWidth="2" />
        <text x="42" y="41.5" textAnchor="middle" fill="var(--ink)" fontSize="10" fontWeight="700" className="font-mono">
          A
        </text>
        <circle cx="96" cy="16" r="11" fill="var(--tone-emerald-bg)" stroke="var(--state-sorted)" strokeWidth="2" />
        <text x="96" y="19.5" textAnchor="middle" fill="var(--ink)" fontSize="10" fontWeight="700" className="font-mono">
          B
        </text>
        <circle cx="96" cy="60" r="10.5" fill="var(--surface)" stroke="var(--state-compare)" strokeWidth="2" />
        <text x="96" y="63.5" textAnchor="middle" fill="var(--ink)" fontSize="9.5" fontWeight="700" className="font-mono">
          C
        </text>
        <circle cx="148" cy="38" r="11" fill="var(--tone-emerald-bg)" stroke="var(--state-sorted)" strokeWidth="2" />
        <text x="148" y="41.5" textAnchor="middle" fill="var(--ink)" fontSize="10" fontWeight="700" className="font-mono">
          D
        </text>
        <circle cx="198" cy="38" r="11" fill="var(--tone-rose-bg)" stroke="var(--state-swap)" strokeWidth="2" />
        <text x="198" y="41.5" textAnchor="middle" fill="var(--ink)" fontSize="10" fontWeight="700" className="font-mono">
          E
        </text>
      </svg>
    )
  }

  // Default: Array operations (array-access, array-insert, array-delete)
  const isInsert = slug === 'array-insert'
  const isDelete = slug === 'array-delete'
  return (
    <svg viewBox="0 0 240 76" className="h-full w-full" fill="none" aria-hidden="true">
      {[
        { x: 24, val: '10', idx: '0', highlight: false },
        { x: 74, val: '24', idx: '1', highlight: false },
        { x: 124, val: isInsert ? '+18' : isDelete ? '×' : '37', idx: '2', highlight: true },
        { x: 174, val: '51', idx: '3', highlight: false },
      ].map((cell) => (
        <g key={cell.idx}>
          <rect
            x={cell.x}
            y="14"
            width="42"
            height="34"
            rx="5.5"
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
            strokeWidth={cell.highlight ? '2.2' : '1.6'}
          />
          <text x={cell.x + 21} y="35.5" textAnchor="middle" fill="var(--ink)" fontSize="12" fontWeight="700" className="font-mono">
            {cell.val}
          </text>
          <text x={cell.x + 21} y="62" textAnchor="middle" fill="var(--ink-2)" fontSize="9" fontWeight="600" className="font-mono">
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
        'relative flex h-24 w-full items-center justify-center overflow-hidden rounded-sm border bg-surface-sunk px-3',
        className,
      )}
      style={{
        borderColor: theme.border,
        backgroundColor: 'color-mix(in srgb, ' + theme.bg + ' 60%, var(--surface-sunk))',
        backgroundImage:
          'radial-gradient(color-mix(in srgb, ' + theme.accent + ' 22%, transparent) 1px, transparent 1px)',
        backgroundSize: '14px 14px',
      }}
    >
      <div className="h-full w-full max-w-[260px] py-1">{renderTopicSvg(slug)}</div>
    </div>
  )
}
