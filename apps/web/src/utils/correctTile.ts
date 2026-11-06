import { CriticalJunctionType, type AlgorithmSnapshot } from '@dsa-tutor/types'

/**
 * The frontier cell key (`"row,col"`) that a grid pathfinder dequeues next,
 * before checking whether the tile builder collapses a 1-option or all-tied
 * frontier into the conceptual `'rule-correct'` question.
 */
export function gridNextCellKeyFor(snapshot: AlgorithmSnapshot): string | null {
  const s = snapshot.dataStructureState as {
    frontierCells?: [number, number][]
    grid?: { gScore?: number; hScore?: number }[][]
    algorithmType?: string
  } | null
  const frontier = s?.frontierCells ?? []
  if (frontier.length === 0) return null
  const priority = ([row, col]: [number, number]) => {
    const cell = s?.grid?.[row]?.[col]
    const g = cell?.gScore ?? 0
    return s?.algorithmType === 'astar' ? g + (cell?.hScore ?? 0) : g
  }
  if (s?.algorithmType === 'bfs') return `${frontier[0][0]},${frontier[0][1]}`
  if (s?.algorithmType === 'dfs') {
    const last = frontier[frontier.length - 1]
    return `${last[0]},${last[1]}`
  }
  const best = frontier.reduce((a, b) => (priority(b) < priority(a) ? b : a))
  return `${best[0]},${best[1]}`
}

/**
 * The id of the right tile at a junction, worked out from the snapshot's own
 * state with the same rules the AI service's `evaluate_answer` uses. Covers all
 * 75 `CriticalJunctionType` values so answer-leak scrubbing, "Show me the
 * answer" tile reveals, and Hands-On canvas selection work uniformly across
 * the entire 73-topic curriculum.
 */
export function correctTileIdFor(snapshot: AlgorithmSnapshot): string | null {
  const ds = snapshot.dataStructureState
  switch (snapshot.criticalJunctionType) {
    case CriticalJunctionType.PASS_COMPLETE:
    case CriticalJunctionType.EARLY_TERMINATION:
    case CriticalJunctionType.ALGORITHM_COMPLETE:
    case CriticalJunctionType.COMPLEXITY_PREDICTION:
    case CriticalJunctionType.PIVOT_SELECTION:
      return 'correct'

    case CriticalJunctionType.SWAP_DECISION: {
      if (isInsertionState(ds)) {
        const compare = ds.array[ds.compareIndex]
        return compare === undefined ? null : ds.currentKey < compare ? 'shift' : 'stop'
      }
      if (!Array.isArray(ds)) return null
      const array = ds as number[]
      const [i, j] = snapshot.activeIndices
      if (array[i] === undefined || array[j] === undefined) return null
      return array[i] > array[j] ? 'swap' : 'no-swap'
    }

    case CriticalJunctionType.TARGET_CHECK: {
      if (!isObj(ds)) return null
      const array = Array.isArray(ds.array) ? (ds.array as number[]) : null
      const idx = typeof ds.currentIndex === 'number' ? ds.currentIndex : -1
      if (!array || idx < 0 || idx >= array.length || ds.target === undefined) return null
      return array[idx] === ds.target ? 'match' : 'no-match'
    }

    case CriticalJunctionType.MIDPOINT_DECISION: {
      if (!isObj(ds)) return null
      const array = Array.isArray(ds.array) ? (ds.array as number[]) : null
      const mid = typeof ds.mid === 'number' ? ds.mid : typeof ds.blockEnd === 'number' ? ds.blockEnd : null
      if (!array || mid === null || mid < 0 || mid >= array.length || typeof ds.target !== 'number') return null
      const value = array[mid]
      return value === ds.target ? 'found' : ds.target < value ? 'search-left' : 'search-right'
    }

    case CriticalJunctionType.NEW_MINIMUM: {
      if (!isObj(ds) || !Array.isArray(ds.array)) return null
      const array = ds.array as number[]
      const scanIdx = typeof ds.scanIndex === 'number' ? ds.scanIndex : -1
      const minIdx = typeof ds.currentMin === 'number' ? ds.currentMin : -1
      if (scanIdx < 0 || minIdx < 0 || scanIdx >= array.length || minIdx >= array.length) return null
      return array[scanIdx] < array[minIdx] ? 'update' : 'keep'
    }

    case CriticalJunctionType.MERGE_DECISION: {
      if (!isObj(ds) || !Array.isArray(ds.array) || !Array.isArray(ds.leftRegion) || !Array.isArray(ds.rightRegion)) return null
      const array = ds.array as number[]
      const leftIdx = ds.leftRegion[0] as number
      const rightIdx = ds.rightRegion[0] as number
      if (array[leftIdx] === undefined || array[rightIdx] === undefined) return null
      return array[leftIdx] <= array[rightIdx] ? 'take-left' : 'take-right'
    }

    case CriticalJunctionType.PARTITION_DECISION: {
      if (!isObj(ds) || !Array.isArray(ds.array) || typeof ds.leftPointer !== 'number' || typeof ds.pivotValue !== 'number') return null
      const val = (ds.array as number[])[ds.leftPointer]
      if (val === undefined) return null
      return val < ds.pivotValue ? 'swap' : 'skip'
    }

    case CriticalJunctionType.GAP_COMPARISON: {
      if (!isObj(ds) || !Array.isArray(ds.array) || typeof ds.keyIndex !== 'number' || typeof ds.compareIndex !== 'number') return null
      const array = ds.array as number[]
      if (array[ds.keyIndex] === undefined || array[ds.compareIndex] === undefined) return null
      return array[ds.keyIndex] < array[ds.compareIndex] ? 'shift' : 'no-shift'
    }

    case CriticalJunctionType.HEAP_COMPARE: {
      if (!isObj(ds) || !Array.isArray(ds.array) || snapshot.activeIndices.length !== 2) return null
      const array = ds.array as number[]
      const [parent, child] = snapshot.activeIndices
      if (array[parent] === undefined || array[child] === undefined) return null
      return array[child] > array[parent] ? 'sift' : 'stay'
    }

    case CriticalJunctionType.HEAP_EXTRACT:
      return isObj(ds) && Array.isArray(ds.array) && ds.array.length > 0 ? 'extract-root' : null

    case CriticalJunctionType.COUNT_INCREMENT: {
      if (!isObj(ds) || !Array.isArray(ds.input) || typeof ds.currentInputIndex !== 'number') return null
      const val = (ds.input as number[])[ds.currentInputIndex]
      return val === undefined ? null : String(val)
    }

    case CriticalJunctionType.PREFIX_ACCUMULATE: {
      if (!isObj(ds) || !Array.isArray(ds.count) || typeof ds.currentCountIndex !== 'number') return null
      const count = ds.count as number[]
      const i = ds.currentCountIndex
      if (i <= 0 || i >= count.length) return null
      return String(count[i] + count[i - 1])
    }

    case CriticalJunctionType.PLACE_ELEMENT: {
      if (!isObj(ds) || !Array.isArray(ds.input) || !Array.isArray(ds.count) || typeof ds.currentInputIndex !== 'number') return null
      const val = (ds.input as number[])[ds.currentInputIndex]
      const count = ds.count as number[]
      if (val === undefined || val < 0 || val >= count.length) return null
      return String(count[val] - 1)
    }

    case CriticalJunctionType.DIGIT_BUCKET: {
      if (!isObj(ds) || typeof ds.currentDigit !== 'number') return null
      return String(ds.currentDigit)
    }

    case CriticalJunctionType.BST_DIRECTION: {
      if (!isObj(ds)) return null
      const s = ds as {
        currentNode?: { value: number } | null
        targetValue?: number
        insertionParentValue?: number | null
        deleteCase?: string
      }
      if (s.deleteCase) return 'correct'
      if (typeof s.targetValue !== 'number') return null
      if (s.currentNode === null || s.currentNode === undefined) {
        if (s.currentNode === undefined) return null
        if (s.insertionParentValue == null) return 'becomes-root'
        return s.targetValue < s.insertionParentValue ? 'attach-left' : 'attach-right'
      }
      return s.targetValue < s.currentNode.value ? 'go-left' : 'go-right'
    }

    case CriticalJunctionType.VISIT_NODE: {
      if (!isObj(ds)) return null
      const s = ds as { nextVisitValue?: number | null }
      return s.nextVisitValue === null || s.nextVisitValue === undefined ? null : String(s.nextVisitValue)
    }

    case CriticalJunctionType.NEXT_NODE_SELECTION: {
      if (!isObj(ds)) return null
      const s = ds as { queue?: string[]; frontier?: string[]; discoveryTime?: Record<string, number> }
      const list = s.queue ?? s.frontier ?? []
      if (list.length === 0) return null
      return s.discoveryTime !== undefined ? list[list.length - 1] : list[0]
    }

    case CriticalJunctionType.AVL_BALANCE_CHECK: {
      if (!isObj(ds) || typeof ds.balanceFactor !== 'number') return null
      return ds.balanceFactor >= -1 && ds.balanceFactor <= 1 ? 'balanced' : 'unbalanced'
    }

    case CriticalJunctionType.AVL_ROTATION_TYPE: {
      if (!isObj(ds) || typeof ds.rotationType !== 'string') return null
      return ds.rotationType
    }

    case CriticalJunctionType.RB_COLOR_DECISION: {
      if (!isObj(ds) || typeof ds.uncleColor !== 'string') return null
      return ds.uncleColor === 'RED' ? 'recolor' : 'rotate'
    }

    case CriticalJunctionType.RB_ROTATION_RECOLOR: {
      if (!isObj(ds) || typeof ds.fixupOperation !== 'string') return null
      return ds.fixupOperation
    }

    case CriticalJunctionType.HEAP_SIFT_UP: {
      if (!isObj(ds) || !Array.isArray(ds.array) || typeof ds.currentIdx !== 'number' || typeof ds.parentIdx !== 'number') return null
      const array = ds.array as number[]
      if (array[ds.currentIdx] === undefined || array[ds.parentIdx] === undefined) return null
      const shouldSwap = ds.heapType === 'max' ? array[ds.currentIdx] > array[ds.parentIdx] : array[ds.currentIdx] < array[ds.parentIdx]
      return shouldSwap ? 'swap' : 'stay'
    }

    case CriticalJunctionType.HEAP_SIFT_DOWN: {
      if (!isObj(ds) || !Array.isArray(ds.array) || typeof ds.currentIdx !== 'number') return null
      const array = ds.array as number[]
      const curr = ds.currentIdx
      if (array[curr] === undefined) return null
      const left = typeof ds.leftChildIdx === 'number' ? ds.leftChildIdx : null
      const right = typeof ds.rightChildIdx === 'number' ? ds.rightChildIdx : null
      const hasPriority = (a: number, b: number) => (ds.heapType === 'max' ? array[a] > array[b] : array[a] < array[b])
      let target = curr
      if (left !== null && left < array.length && hasPriority(left, target)) target = left
      if (right !== null && right < array.length && hasPriority(right, target)) target = right
      if (target === curr) return 'stay'
      return target === left ? 'left' : 'right'
    }

    case CriticalJunctionType.TRIE_CHARACTER_MATCH: {
      if (!isObj(ds) || typeof ds.charExists !== 'boolean') return null
      return ds.charExists ? 'exists' : 'missing'
    }

    case CriticalJunctionType.TRIE_INSERT_NEW: {
      if (!isObj(ds) || typeof ds.needsNewNode !== 'boolean') return null
      return ds.needsNewNode ? 'new' : 'existing'
    }

    case CriticalJunctionType.EDGE_RELAX: {
      if (!isObj(ds) || typeof ds.newDist !== 'number') return null
      const currentDist = typeof ds.currentDist === 'number' ? ds.currentDist : Infinity
      return ds.newDist < currentDist ? 'relax' : 'skip'
    }

    case CriticalJunctionType.BELLMAN_PASS_COMPLETE: {
      if (!isObj(ds) || typeof ds.anyChanged !== 'boolean') return null
      return ds.anyChanged ? 'continue' : 'done'
    }

    case CriticalJunctionType.MATRIX_UPDATE: {
      if (!isObj(ds) || typeof ds.i !== 'number' || typeof ds.j !== 'number' || typeof ds.k !== 'number' || !Array.isArray(ds.dist)) {
        return null
      }
      const dist = ds.dist as (number | null)[][]
      const cell = (r: number, c: number) => {
        const v = dist[r]?.[c]
        return v === null || v === undefined ? Infinity : v
      }
      return cell(ds.i, ds.k) + cell(ds.k, ds.j) < cell(ds.i, ds.j) ? 'update' : 'keep'
    }

    case CriticalJunctionType.UNION_FIND_CHECK: {
      if (!isObj(ds) || typeof ds.sameComponent !== 'boolean') return null
      return ds.sameComponent ? 'skip' : 'add'
    }

    case CriticalJunctionType.MST_EDGE_SELECT: {
      if (!isObj(ds) || !Array.isArray(ds.candidateEdges) || ds.candidateEdges.length === 0) return null
      const candidates = ds.candidateEdges as [string, string, number][]
      const minWeight = Math.min(...candidates.map(([, , w]) => w))
      const best = candidates.find(([, , w]) => w === minWeight)
      return best ? `${best[0]}-${best[1]}` : null
    }

    case CriticalJunctionType.CYCLE_FOUND: {
      if (!isObj(ds) || typeof ds.isBackEdge !== 'boolean') return null
      return ds.isBackEdge ? 'cycle' : 'no-cycle'
    }

    case CriticalJunctionType.NEW_COMPONENT: {
      if (!isObj(ds) || typeof ds.totalComponents !== 'number') return null
      return String(ds.totalComponents)
    }

    case CriticalJunctionType.TOPOLOGICAL_ORDER: {
      if (!isObj(ds)) return null
      const s = ds as { currentNode?: string | null }
      return s.currentNode ?? null
    }

    case CriticalJunctionType.GRID_NEXT_CELL: {
      if (!isObj(ds)) return null
      const s = ds as {
        frontierCells?: [number, number][]
        grid?: { gScore?: number; hScore?: number }[][]
        algorithmType?: string
      }
      const key = gridNextCellKeyFor(snapshot)
      if (!key) return null
      const frontier = s.frontierCells ?? []
      const weighted = s.algorithmType === 'astar' || s.algorithmType === 'dijkstra'
      const isAStar = s.algorithmType === 'astar'
      const scored = frontier.map(([r, c]) => {
        const cell = s.grid?.[r]?.[c]
        const g = cell?.gScore ?? 0
        const h = cell?.hScore ?? 0
        return { key: `${r},${c}`, f: isAStar ? g + h : g }
      })
      const right = scored.find((cell) => cell.key === key)
      if (!right) return null
      const hasDistinctDistractor = weighted
        ? scored.some((cell) => cell !== right && cell.f !== right.f)
        : scored.some((cell) => cell !== right)
      return hasDistinctDistractor ? key : 'rule-correct'
    }

    case CriticalJunctionType.INDEX_ACCESS: {
      if (!isObj(ds) || typeof ds.targetIndex !== 'number') return null
      return `idx-${ds.targetIndex}`
    }

    case CriticalJunctionType.INSERT_POSITION: {
      if (!isObj(ds) || typeof ds.targetIndex !== 'number') return null
      return `idx-${ds.targetIndex + 2}`
    }

    case CriticalJunctionType.DELETE_SHIFT: {
      if (!isObj(ds) || !Array.isArray(ds.array) || typeof ds.targetIndex !== 'number') return null
      return ds.targetIndex < ds.array.length ? `idx-${ds.targetIndex}` : 'end-of-array'
    }

    case CriticalJunctionType.NULL_CHECK: {
      if (!isObj(ds) || !Array.isArray(ds.nodes)) return null
      const s = ds as {
        nodes: Array<{ id: string; next: string | null }>
        currentId?: string | null
        headId?: string | null
        operation?: string
      }
      if (s.operation === 'traverse') return 'when-head-again'
      const current = s.nodes.find((n) => n.id === s.currentId)
      if (current) return current.next === null ? 'yes-last' : 'no-more'
      return s.headId ? 'current-head' : 'null'
    }

    case CriticalJunctionType.INSERT_BETWEEN: {
      if (!isObj(ds) || !Array.isArray(ds.nodes)) return null
      const nodes = ds.nodes as Array<{ prev?: string | null }>
      const isDLL = nodes.some((n) => n.prev !== undefined)
      const pos = ds.insertPosition
      const insertCase = pos === 0 ? 'front' : typeof pos === 'number' && pos >= nodes.length ? 'append' : 'between'
      if (insertCase === 'append' || (insertCase === 'front' && isDLL)) return 'correct'
      return isDLL ? 'all-four' : 'new-then-prev'
    }

    case CriticalJunctionType.DELETE_RELINK: {
      if (!isObj(ds) || !Array.isArray(ds.nodes)) return null
      const nodes = ds.nodes as Array<{ prev?: string | null }>
      return nodes.some((n) => n.prev !== undefined) ? 'two' : 'prev-next-eq-x-next'
    }

    case CriticalJunctionType.POINTER_FOLLOW:
    case CriticalJunctionType.TRAVERSE_DIRECTION: {
      if (!isObj(ds) || !Array.isArray(ds.nodes)) return null
      const s = ds as {
        nodes: Array<{ id: string; next: string | null; prev?: string | null }>
        currentId?: string | null
        activePointer?: 'next' | 'prev' | null
        operation?: string
      }
      const current = s.nodes.find((n) => n.id === s.currentId)
      if (!current) return null
      if (s.operation === 'reverse') return 'the-previous-node'
      const targetId = s.activePointer === 'prev' ? current.prev : current.next
      return targetId ?? 'null'
    }

    case CriticalJunctionType.WRAP_CHECK:
      return isObj(ds) ? 'the-head-node' : null

    case CriticalJunctionType.STACK_PUSH_RESULT:
      return isObj(ds) ? 'pushed-value' : null

    case CriticalJunctionType.STACK_POP_RESULT:
      return isObj(ds) ? 'top-value' : null

    case CriticalJunctionType.OVERFLOW_CHECK:
      return isObj(ds) ? 'no-overflow' : null

    case CriticalJunctionType.UNDERFLOW_CHECK:
      return isObj(ds) ? 'error-underflow' : null

    case CriticalJunctionType.QUEUE_REAR: {
      if (!isObj(ds) || typeof ds.rearIndex !== 'number') return null
      return `idx-${ds.rearIndex}`
    }

    case CriticalJunctionType.QUEUE_FRONT:
      return isObj(ds) ? 'front-value' : null

    case CriticalJunctionType.CIRCULAR_WRAP:
      return isObj(ds) ? 'idx-0' : null

    case CriticalJunctionType.DEQUE_END: {
      if (!isObj(ds) || typeof snapshot.description !== 'string') return null
      return snapshot.description.toLowerCase().includes('front') ? 'front' : 'back'
    }

    case CriticalJunctionType.LOAD_FACTOR: {
      if (!isObj(ds)) return null
      if (typeof ds.frontIndex === 'number') return `wasted-${ds.frontIndex}`
      return 'yes-too-high'
    }

    case CriticalJunctionType.HASH_BUCKET: {
      if (!isObj(ds) || typeof ds.hashResult !== 'number') return null
      return `bucket-${ds.hashResult}`
    }

    case CriticalJunctionType.COLLISION_RESOLVE:
      return isObj(ds) ? 'back-of-chain' : null

    case CriticalJunctionType.PROBE_NEXT:
      return isObj(ds) ? 'i-plus-1-mod' : null

    case CriticalJunctionType.JUMP_SIZE: {
      if (!isObj(ds)) return null
      if (typeof ds.jumpSize === 'number') return `size-${ds.jumpSize}`
      if (Array.isArray(ds.array) && ds.array.length > 0) {
        return `size-${Math.max(1, Math.round(Math.sqrt(ds.array.length)))}`
      }
      return null
    }

    case CriticalJunctionType.PROBE_POSITION: {
      if (!isObj(ds)) return null
      const idx = typeof ds.probedIndex === 'number' ? ds.probedIndex : typeof ds.low === 'number' ? ds.low : null
      return idx === null ? null : `idx-${idx}`
    }

    case CriticalJunctionType.RANGE_DOUBLE: {
      if (!isObj(ds) || !Array.isArray(ds.array) || typeof ds.bound !== 'number' || typeof ds.target !== 'number') return null
      const val = (ds.array as number[])[ds.bound]
      if (val === undefined) return null
      return val < ds.target ? 'yes-too-small' : 'no-large-enough'
    }

    case CriticalJunctionType.BASE_CASE:
      return isObj(ds) ? 'one' : null

    case CriticalJunctionType.RETURN_VALUE: {
      const desc = snapshot.description ?? ''
      const fibMatch = desc.match(/returned (\d+) and (\d+)/)
      if (fibMatch) {
        const left = Number(fibMatch[1])
        const right = Number(fibMatch[2])
        if (!Number.isFinite(left) || !Number.isFinite(right)) return null
        return `sum-${left + right}`
      }
      const n = Number(desc.match(/factorial\((\d+)\)/)?.[1])
      const prev = Number(desc.match(/returned (\d+)/)?.[1])
      if (!Number.isFinite(n) || !Number.isFinite(prev)) return null
      return `mult-${n * prev}`
    }

    case CriticalJunctionType.RECURSIVE_CALL: {
      if (!isObj(ds) || !Array.isArray(ds.frames)) return null
      const frames = ds.frames as Array<{ argument: number }>
      if (typeof ds.totalCalls === 'number') {
        const n = Math.max(...frames.map((f) => f.argument), 1)
        return `exp-${2 ** n}`
      }
      const remaining = frames.length > 0 ? Math.min(...frames.map((f) => f.argument)) : 0
      return `remaining-${remaining}`
    }

    case CriticalJunctionType.POINTER_MOVE: {
      if (!isObj(ds) || !Array.isArray(ds.array) || typeof ds.leftPointerIndex !== 'number' || typeof ds.rightPointerIndex !== 'number') {
        return null
      }
      const array = ds.array as (number | string)[]
      const leftVal = array[ds.leftPointerIndex]
      const rightVal = array[ds.rightPointerIndex]
      if (leftVal === undefined || rightVal === undefined) return null
      if (typeof ds.target === 'number') {
        const sum = Number(leftVal) + Number(rightVal)
        return sum === ds.target ? 'found' : sum < ds.target ? 'move-left' : 'move-right'
      }
      return leftVal === rightVal ? 'match-inward' : 'no-match'
    }

    case CriticalJunctionType.WINDOW_SUM: {
      if (!isObj(ds) || typeof ds.windowSum !== 'number') return null
      return `sum-${ds.windowSum}`
    }

    case CriticalJunctionType.WINDOW_EXPAND: {
      if (!isObj(ds) || typeof ds.windowSum !== 'number') return null
      if (typeof ds.targetSum === 'number') {
        return ds.windowSum < ds.targetSum ? 'expand' : 'shrink'
      }
      if (!Array.isArray(ds.array) || typeof ds.windowStart !== 'number' || typeof ds.windowEnd !== 'number') return null
      const array = ds.array as number[]
      if (array[ds.windowStart] === undefined || array[ds.windowEnd + 1] === undefined) return null
      return `sum-${ds.windowSum - array[ds.windowStart] + array[ds.windowEnd + 1]}`
    }

    case CriticalJunctionType.PREFIX_CELL: {
      if (!isObj(ds) || !Array.isArray(ds.table) || !Array.isArray(ds.input) || !Array.isArray(ds.current)) return null
      const col = ds.current[1] as number
      const previous = ((ds.table as (number | null)[][])[0]?.[col - 1] as number) ?? 0
      const element = ((ds.input as number[])[col - 1] as number) ?? 0
      return `prefix-${previous + element}`
    }

    case CriticalJunctionType.RANGE_QUERY:
      return isObj(ds) && Array.isArray(ds.dependsOn) ? 'range-correct' : null

    case CriticalJunctionType.STACK_DISCHARGE: {
      if (!isObj(ds) || !Array.isArray(ds.input) || !Array.isArray(ds.marked) || !Array.isArray(ds.current)) return null
      const col = ds.current[1] as number
      const input = ds.input as number[]
      const marked = ds.marked as number[]
      const incoming = input[col] ?? 0
      const waiting = marked[marked.length - 1] ?? 0
      const top = input[waiting] ?? 0
      return top < incoming ? 'discharge-yes' : 'discharge-no'
    }

    case CriticalJunctionType.COMBINE_RESULT: {
      const desc = snapshot.description ?? ''
      const candidates = [...desc.matchAll(/(?:left|right|crossing) (-?\d+)/g)].map((m) => Number(m[1]))
      if (candidates.length < 3) return null
      const [left, right, cross] = candidates
      const best = Math.max(left, right, cross)
      return best === cross ? 'combine-cross' : best === left ? 'combine-left' : 'combine-right'
    }

    case CriticalJunctionType.GREEDY_CHOICE: {
      if (!isObj(ds)) return null
      const working = typeof ds.working === 'string' ? ds.working : ''
      const fits = /(-?\d+) >= (-?\d+|-inf)/.exec(working)
      const compatible = fits ? fits[2] === '-inf' || Number(fits[1]) >= Number(fits[2]) : true
      return compatible ? 'greedy-take' : 'greedy-skip'
    }

    case CriticalJunctionType.DP_CELL: {
      if (!isObj(ds) || !Array.isArray(ds.dependsOn) || !Array.isArray(ds.table) || !Array.isArray(ds.current)) return null
      const table = ds.table as (number | null)[][]
      const dependsOn = ds.dependsOn as [number, number][]
      if (dependsOn.length === 0) return null
      const reads = dependsOn.map(([r, c]) => (table[r]?.[c] as number) ?? 0)
      if (dependsOn.length === 1) {
        const col = ds.current[1] as number
        const element = Array.isArray(ds.input) ? (((ds.input as number[])[col] as number) ?? 0) : 0
        const extend = reads[0] + element
        return `dp1-${Math.max(extend, element)}`
      }
      return `dp2-${1 + Math.min(...reads)}`
    }

    case CriticalJunctionType.PRUNE_BRANCH: {
      if (!isObj(ds) || typeof ds.total !== 'number' || typeof ds.target !== 'number') return null
      return ds.total > ds.target ? 'prune-yes' : 'prune-no'
    }

    default:
      return null
  }
}

function isObj(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isInsertionState(ds: unknown): ds is { array: number[]; compareIndex: number; currentKey: number } {
  return isObj(ds) && Array.isArray(ds.array) && typeof ds.currentKey === 'number' && typeof ds.compareIndex === 'number'
}
