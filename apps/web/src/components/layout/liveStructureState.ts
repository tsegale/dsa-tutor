// Readers for the state a data-structure canvas is showing right now. The
// operation controls (Push, Insert, Delete, ...) continue from what these
// return, so the visualisation and the next operation always agree. Each one
// returns null when the state is not that structure, so callers can fall back.
import type { CircularQueueStart } from '@/engine/queue'
import type { BSTNode } from '@/engine/bst'
import type { TrieNode } from '@/engine/trie'

export function extractLiveStackItems(raw: unknown): number[] | null {
  if (!raw || typeof raw !== 'object') return null
  const items = (raw as { items?: Array<{ value: number | string }> }).items
  if (!Array.isArray(items)) return null
  return items.map((it) => Number(it.value)).filter((n) => !Number.isNaN(n))
}

export function extractLiveLinearQueueItems(raw: unknown): number[] | null {
  if (!raw || typeof raw !== 'object') return null
  const q = raw as { items?: Array<{ value: number | string; index: number }>; variant?: string }
  if (!Array.isArray(q.items)) return null
  return [...q.items]
    .sort((a, b) => a.index - b.index)
    .map((it) => Number(it.value))
    .filter((n) => !Number.isNaN(n))
}

export function extractLiveCircularStart(raw: unknown): CircularQueueStart | null {
  if (!raw || typeof raw !== 'object') return null
  const q = raw as {
    items?: Array<{ value: number | string; index: number }>
    frontIndex?: number
    rearIndex?: number
    variant?: string
  }
  if (q.variant !== 'circular' || !Array.isArray(q.items)) return null
  return {
    items: q.items
      .map((it) => ({ value: Number(it.value), index: it.index }))
      .filter((it) => !Number.isNaN(it.value)),
    frontIndex: q.frontIndex ?? -1,
    rearIndex: q.rearIndex ?? -1,
  }
}

export function extractLiveLinkedListItems(raw: unknown): number[] | null {
  if (!raw || typeof raw !== 'object') return null
  const ll = raw as {
    // The engines store the link as `next` (see LinkedListNode). Reading a
    // field that does not exist stopped the walk at the head, so every
    // insert or delete kept only the first node.
    nodes?: Array<{ id: string; value: number | string; next: string | null }>
    headId?: string | null
  }
  if (!Array.isArray(ll.nodes)) return null
  if (ll.nodes.length === 0 || !ll.headId) return []
  const byId = new Map(ll.nodes.map((n) => [n.id, n]))
  const ordered: number[] = []
  const visited = new Set<string>()
  let cur: string | null = ll.headId
  while (cur && !visited.has(cur)) {
    visited.add(cur)
    const node = byId.get(cur)
    if (!node) break
    const num = Number(node.value)
    if (!Number.isNaN(num)) ordered.push(num)
    cur = node.next
  }
  return ordered
}

export function extractLiveHashKeys(raw: unknown): number[] | null {
  if (!raw || typeof raw !== 'object') return null
  const ht = raw as {
    buckets?: Array<{ chain: Array<{ id: string; key: number | string }> }>
  }
  if (!Array.isArray(ht.buckets)) return null
  const entries = ht.buckets.flatMap((b) => b.chain)
  return entries
    .slice()
    .sort((a, b) => {
      const seqA = Number(String(a.id).split('-').pop()) || 0
      const seqB = Number(String(b.id).split('-').pop()) || 0
      return seqA - seqB
    })
    .map((e) => Number(e.key))
    .filter((n) => !Number.isNaN(n))
}

export function extractLiveTreeValues(raw: unknown): number[] | null {
  if (!raw || typeof raw !== 'object' || !('root' in raw)) return null
  const root = (raw as { root: BSTNode | null }).root
  if (!root) return []
  const result: number[] = []
  const queue: BSTNode[] = [root]
  while (queue.length > 0) {
    const node = queue.shift()!
    result.push(node.value)
    if (node.left) queue.push(node.left)
    if (node.right) queue.push(node.right)
  }
  return result
}

export function extractLiveHeapItems(raw: unknown): number[] | null {
  if (!raw || typeof raw !== 'object') return null
  const arr = (raw as { array?: number[] }).array
  return Array.isArray(arr) ? arr : null
}

function collectTrieWords(node: TrieNode | undefined, prefix = ''): string[] {
  if (!node || !(node.children instanceof Map)) return []
  const words: string[] = []
  const nextPrefix = prefix + (node.char || '')
  if (node.isTerminal && nextPrefix.length > 0) words.push(nextPrefix)
  for (const [, child] of node.children) {
    words.push(...collectTrieWords(child, nextPrefix))
  }
  return words
}

export function extractLiveTrieState(raw: unknown): { words: string[]; root: TrieNode } | null {
  if (!raw || typeof raw !== 'object') return null
  const root = (raw as { root?: TrieNode }).root
  if (!root || !(root.children instanceof Map)) return null
  return { words: collectTrieWords(root), root }
}
