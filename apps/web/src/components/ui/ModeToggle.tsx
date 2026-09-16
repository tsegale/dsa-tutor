import { motion } from 'framer-motion'
import { useParams } from 'react-router-dom'
import { AlgorithmMode } from '@dsa-tutor/types'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const OPTIONS: { label: string; value: AlgorithmMode }[] = [
  { label: 'Demo', value: AlgorithmMode.DEMO },
  { label: 'Practice', value: AlgorithmMode.PRACTICE },
  { label: 'Hands-On', value: AlgorithmMode.HANDS_ON },
]

// Hands-On mode's drag canvas interaction exists for all five sorting
// algorithms (Bubble, Insertion, Selection, Merge, Quick Sort) via
// ArrayCanvas's getHandsOnDragTarget. Three distinct situations for
// every other algorithm, rather than one blanket "disabled" tab:
//
// 1. NO_HANDS_ON - no physical drag interaction makes sense (pointer
//    movement or recursion, not element reordering) - tab isn't shown.
//    Judgment call: two-pointer and both sliding-window algorithms are
//    grouped here with the other pointer-based (non-swap) algorithms,
//    not with the sorting algorithms below - dragging a pointer isn't
//    the same interaction as dragging a bar to swap it.
// 2. BUTTONS_ARE_HANDS_ON - the left panel's operation buttons (push,
//    enqueue, insert, search...) already ARE the hands-on interaction
//    for these data structures - tab isn't shown.
// 3. array-insert/array-delete DO have the same drag-based interaction
//    model in mind, just not built yet - tab is shown, disabled, with
//    a "coming soon" tooltip instead of a dead end.
const NO_HANDS_ON = new Set([
  'recursion-factorial',
  'recursion-fibonacci',
  'bfs',
  'binary-search',
  'linear-search',
  'jump-search',
  'interpolation-search',
  'exponential-search',
  'array-access',
  'two-pointer',
  'sliding-window-fixed',
  'sliding-window-variable',
])

const BUTTONS_ARE_HANDS_ON = new Set([
  'stack',
  'queue',
  'circular-queue',
  'deque',
  'singly-linked-list',
  'doubly-linked-list',
  'circular-linked-list',
  'hash-table-chaining',
  'hash-table-probing',
  'bst',
  'bst-search',
  'bst-delete',
])

const HANDS_ON_COMING_SOON = new Set([
  'array-insert',
  'array-delete',
  'counting-sort',
  'radix-sort',
  'tree-inorder',
  'tree-preorder',
  'tree-postorder',
  'tree-level-order',
])

const HANDS_ON_ACTIVE = new Set([
  'bubble-sort',
  'insertion-sort',
  'selection-sort',
  'merge-sort',
  'quick-sort',
  'shell-sort',
  'heap-sort',
])

export default function ModeToggle() {
  const mode = useAlgorithmStore((state) => state.mode)
  const setMode = useAlgorithmStore((state) => state.setMode)
  const { algorithmName: algorithmSlug } = useParams<{ algorithmName: string }>()
  const slug = algorithmSlug ?? ''
  const handsOnHidden = NO_HANDS_ON.has(slug) || BUTTONS_ARE_HANDS_ON.has(slug)
  const handsOnComingSoon = HANDS_ON_COMING_SOON.has(slug)
  const handsOnAvailable = HANDS_ON_ACTIVE.has(slug)

  const visibleOptions = OPTIONS.filter((option) => option.value !== AlgorithmMode.HANDS_ON || !handsOnHidden)

  return (
    <div id="mode-toggle" className="relative inline-flex rounded-md bg-surface p-1 dark:bg-dark-border">
      {visibleOptions.map((option) => {
        const isActive = mode === option.value
        const isDisabled = option.value === AlgorithmMode.HANDS_ON && !handsOnAvailable

        const button = (
          <button
            key={option.value}
            type="button"
            disabled={isDisabled}
            onClick={() => !isDisabled && setMode(option.value)}
            className={`relative z-10 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              isDisabled
                ? 'cursor-default text-text-muted opacity-50 dark:text-dark-text-secondary'
                : isActive
                  ? 'text-white'
                  : 'text-text-muted hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary'
            }`}
          >
            {isActive && !isDisabled && (
              <motion.span
                layoutId="mode-toggle-indicator"
                className="absolute inset-0 -z-10 rounded-md bg-primary"
                transition={{ duration: 0.15 }}
              />
            )}
            {option.label}
          </button>
        )

        if (!isDisabled) return button

        return (
          <Tooltip key={option.value}>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent>{handsOnComingSoon ? 'Drag interaction coming soon' : 'Not available for this algorithm'}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
