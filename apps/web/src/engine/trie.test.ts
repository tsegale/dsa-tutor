import { describe, it, expect } from 'vitest'
import { trieInsertEngine, trieSearchEngine, trieDeleteEngine, type TrieNode, type TrieState } from './trie'

function lastState(snapshots: ReturnType<typeof trieInsertEngine>): TrieState {
  return snapshots[snapshots.length - 1].dataStructureState as TrieState
}

function buildTrie(words: string[]): TrieNode {
  return lastState(trieInsertEngine(words)).root
}

/** Walks the trie and returns every word it actually contains (terminal
 * node reached), for a strong structural equivalence check. */
function allWords(node: TrieNode, prefix = ''): string[] {
  const words: string[] = []
  if (node.isTerminal) words.push(prefix)
  for (const [char, child] of node.children) {
    words.push(...allWords(child, prefix + char))
  }
  return words
}

describe('trieInsertEngine', () => {
  it('inserts a single word', () => {
    const root = buildTrie(['cat'])
    expect(allWords(root).sort()).toEqual(['cat'])
  })

  it('shares prefixes across words', () => {
    const root = buildTrie(['apple', 'app', 'apt'])
    expect(allWords(root).sort()).toEqual(['app', 'apple', 'apt'])
    // 'a' -> 'p' shared by all three; only one node per shared prefix character.
    const a = root.children.get('a')!
    const ap = a.children.get('p')!
    expect(ap.children.size).toBe(2) // 'p' (-> apple) and 't' (-> apt)
  })

  it('marks intermediate prefix nodes as non-terminal unless they are also full words', () => {
    const root = buildTrie(['apple', 'app'])
    const path = 'app'.split('').reduce((node, c) => node.children.get(c)!, root)
    expect(path.isTerminal).toBe(true) // "app" is itself a word
    const applePath = 'apple'.split('').reduce((node, c) => node.children.get(c)!, root)
    expect(applePath.isTerminal).toBe(true)
  })

  it('handles the full default demo word list correctly', () => {
    const words = ['apple', 'app', 'apt', 'bat', 'ball', 'band']
    const root = buildTrie(words)
    expect(allWords(root).sort()).toEqual([...words].sort())
  })

  it('emits a TRIE_INSERT_NEW prediction for every character examined', () => {
    const snapshots = trieInsertEngine(['cat'])
    const predictions = snapshots.filter((s) => s.isPredictionRequired)
    expect(predictions.length).toBe(3)
    predictions.forEach((s) => expect(s.criticalJunctionType).toBe('TRIE_INSERT_NEW'))
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = trieInsertEngine(['apple', 'app'])
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})

describe('trieSearchEngine', () => {
  const words = ['apple', 'app', 'apt', 'bat', 'ball', 'band']

  it('finds a word that exists', () => {
    const root = buildTrie(words)
    const snapshots = trieSearchEngine(root, 'apple')
    expect(lastState(snapshots).found).toBe(true)
  })

  it('reports a prefix that is not itself a word as not found', () => {
    const root = buildTrie(['apple'])
    const snapshots = trieSearchEngine(root, 'app')
    expect(lastState(snapshots).found).toBe(false)
  })

  it('reports a completely absent word as not found', () => {
    const root = buildTrie(words)
    const snapshots = trieSearchEngine(root, 'cat')
    expect(lastState(snapshots).found).toBe(false)
  })

  it('is case-insensitive', () => {
    const root = buildTrie(words)
    const snapshots = trieSearchEngine(root, 'APPLE')
    expect(lastState(snapshots).found).toBe(true)
  })
})

describe('trieDeleteEngine', () => {
  const words = ['apple', 'app', 'apt', 'bat', 'ball', 'band']

  it('deletes a word without affecting words sharing its prefix', () => {
    const root = buildTrie(words)
    const snapshots = trieDeleteEngine(root, 'apple')
    const state = lastState(snapshots)
    expect(state.found).toBe(true)
    const remaining = allWords(state.root).sort()
    expect(remaining).toEqual(['app', 'apt', 'ball', 'band', 'bat'])
  })

  it('prunes now-unneeded nodes after deleting a word with no shared suffix users', () => {
    const root = buildTrie(['bat', 'ball'])
    const snapshots = trieDeleteEngine(root, 'bat')
    const state = lastState(snapshots)
    expect(allWords(state.root).sort()).toEqual(['ball'])
    // 't' node (unique to "bat") should be pruned; 'b'/'a' survive since "ball" still needs them.
    const b = state.root.children.get('b')!
    const ba = b.children.get('a')!
    expect(ba.children.has('t')).toBe(false)
  })

  it('does not prune a node that is still a word ending itself', () => {
    const root = buildTrie(['app', 'apple'])
    const snapshots = trieDeleteEngine(root, 'apple')
    const state = lastState(snapshots)
    expect(allWords(state.root).sort()).toEqual(['app'])
  })

  it('reports nothing to delete for a word absent from the trie, tree unchanged', () => {
    const root = buildTrie(words)
    const before = allWords(root).sort()
    const snapshots = trieDeleteEngine(root, 'zzz')
    expect(lastState(snapshots).found).toBe(false)
    expect(allWords(lastState(snapshots).root).sort()).toEqual(before)
  })

  it('reports nothing to delete for a prefix that is not itself a word', () => {
    const root = buildTrie(['apple'])
    const snapshots = trieDeleteEngine(root, 'app')
    expect(lastState(snapshots).found).toBe(false)
    expect(allWords(lastState(snapshots).root)).toEqual(['apple'])
  })

  it('never mutates the tree passed in', () => {
    const root = buildTrie(words)
    const before = allWords(root).sort()
    trieDeleteEngine(root, 'apple')
    expect(allWords(root).sort()).toEqual(before)
  })

  it('has sequential stepIndex values with no gaps', () => {
    const root = buildTrie(words)
    const snapshots = trieDeleteEngine(root, 'apple')
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})
