import { AnimatePresence, motion } from 'framer-motion'
import { useParams } from 'react-router-dom'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAlgorithmStore, selectCurrentSnapshot } from '@/store/useAlgorithmStore'
import { cn } from '@/lib/utils'

// Each array's line order matches that algorithm's own PSEUDOCODE_LINE
// constants in its engine file exactly (index-for-index), since the
// active snapshot's `pseudocodeLine` is generated against those
// constants and used directly as an index here - a couple of engines
// declare a PSEUDOCODE_LINE value that's never actually emitted (e.g.
// Selection Sort's inner-loop-start, BST's GO_LEFT/GO_RIGHT); those
// still get a plausible line of text, they just never highlight.
const PSEUDOCODE: Record<string, string[]> = {
  'bubble-sort': [
    'for i from 0 to n-1 do',
    '  for j from 0 to n-i-2 do',
    '    if arr[j] > arr[j+1] then',
    '      swap arr[j] and arr[j+1]',
    '  end for',
    'end for',
    'array is sorted',
  ],
  'linear-search': [
    'for i from 0 to n-1 do',
    '  if arr[i] == target then',
    '    return i',
    '  end if',
    'return -1 (not found)',
  ],
  'binary-search': [
    'low = 0, high = n-1',
    'while low <= high do',
    '  mid = (low + high) / 2',
    '  if arr[mid] == target: return mid; else narrow low/high',
    'return -1 (not found)',
  ],
  'selection-sort': [
    'for i from 0 to n-1 do',
    '  min_idx = i; for j from i+1 to n-1 do',
    '    if arr[j] < arr[min_idx]:',
    '      min_idx = j',
    '  end for',
    '  swap arr[i] and arr[min_idx]',
    'array is sorted',
  ],
  'insertion-sort': [
    'for i from 1 to n-1 do',
    '  key = arr[i]',
    '  while j >= 0 and arr[j] > key:',
    '    arr[j+1] = arr[j]; j = j - 1',
    '  arr[j+1] = key',
    'array is sorted',
  ],
  'merge-sort': [
    'for passSize = 1, 2, 4, ... while passSize < n do',
    '  for each adjacent pair of runs of size passSize',
    '    compare front elements of left and right runs',
    '    place the smaller into the merged result',
    '  end for',
    'array is sorted',
  ],
  'quick-sort': [
    'partition(low, high):',
    '  pivot = arr[high]; i = low - 1',
    '  for j from low to high-1: if arr[j] < pivot:',
    '    i++; swap arr[i] and arr[j]',
    '  swap arr[i+1] and arr[high]',
    'array is sorted',
  ],
  bst: [
    'insert(root, value):',
    '  if root is null: create node',
    '  if value < root.value:',
    '    insert(root.left, value)',
    '  else if value > root.value:',
    '    insert(root.right, value)',
    '  else: duplicate, ignore',
  ],
  bfs: [
    'enqueue startNode',
    'mark startNode visited',
    'while queue not empty:',
    '  node = dequeue()',
    '  if node == target: found',
    '  for each neighbour of node:',
    '    if not visited: enqueue',
  ],
}

function ComingSoonLabel({ label }: { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-not-allowed text-text-muted dark:text-dark-text-secondary">{label}</span>
      </TooltipTrigger>
      <TooltipContent>Coming soon</TooltipContent>
    </Tooltip>
  )
}

export default function PseudocodePanel() {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const { algorithmName: algorithmSlug } = useParams<{ algorithmName: string }>()
  const activeLine = snapshot?.pseudocodeLine
  const lines = PSEUDOCODE[algorithmSlug ?? ''] ?? PSEUDOCODE['bubble-sort']

  return (
    <div
      className="flex h-full flex-col overflow-x-hidden rounded-md border border-border bg-white dark:bg-dark-surface"
      style={{ width: '100%' }}
    >
      <div className="border-b border-border px-4 py-2">
        <span className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">Pseudocode</span>
      </div>
      <div
        className="flex items-center gap-3 px-4 py-1.5 text-[11px]"
        style={{ borderBottom: '0.5px solid var(--border)' }}
      >
        <span className="font-medium text-primary">Pseudocode</span>
        <span className="text-text-muted dark:text-dark-text-secondary">|</span>
        <ComingSoonLabel label="Python" />
        <span className="text-text-muted dark:text-dark-text-secondary">|</span>
        <ComingSoonLabel label="Java" />
      </div>
      <div className="flex-1 overflow-x-hidden overflow-y-auto p-2 font-mono">
        {lines.map((line, index) => {
          const isActive = index === activeLine
          return (
            <div key={index} className="relative flex py-1" style={{ lineHeight: 1.7 }}>
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 border-l-[3px] border-[#378add] bg-[rgba(55,138,221,0.1)]"
                  />
                )}
              </AnimatePresence>
              <span className="relative w-5 shrink-0 pl-2 text-right text-[10px] text-text-muted select-none">
                {index + 1}
              </span>
              <span
                className={cn(
                  'relative min-w-0 flex-1 pl-2 text-[11px]',
                  isActive ? 'font-medium text-text-accent' : 'font-normal text-text-primary dark:text-dark-text-primary',
                )}
                style={
                  isActive
                    ? { whiteSpace: 'nowrap', overflow: 'visible' }
                    : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
                }
              >
                {line}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
