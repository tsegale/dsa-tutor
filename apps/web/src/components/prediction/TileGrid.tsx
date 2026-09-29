import { useEffect } from 'react'
import { motion } from 'framer-motion'
import type { AlgorithmSnapshot, MisconceptionCategory } from '@dsa-tutor/types'
import { correctTileIdFor } from '@/utils/correctTile'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'
import { CANVAS_SPRING } from '@/utils/motion'

export interface TileOption {
  id: string
  label: string
  /** The misconception this tile represents if picked when it's wrong -
   * the ground truth for the study's misconception-detection research
   * question (see remediation doc 4.2). Null for a tile that is always
   * the correct answer regardless of runtime state. */
  misconception?: MisconceptionCategory | null
}

interface TileGridProps {
  prompt: string
  options: TileOption[]
  onSelect: (optionId: string) => void
  selectedId: string | null
  submissionState: 'idle' | 'correct' | 'incorrect'
  snapshot: AlgorithmSnapshot
  /** True only once the attempt cap is reached or the learner explicitly
   * asked to see the answer - an incorrect submission alone must never
   * reveal it, or the retry that follows has nothing left to attempt. */
  revealAnswer: boolean
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Which tile is the correct answer, used only to reveal it once the caller
 * has decided the answer should be shown (attempt cap reached, or the
 * learner explicitly asked) - never merely because the submission was
 * wrong. See correctTileIdFor: state-dependent for swap, midpoint and BST
 * direction junctions, id 'correct' for conceptual ones.
 */
function isCorrectTile(
  tileId: string,
  snapshot: AlgorithmSnapshot,
  submissionState: 'idle' | 'correct' | 'incorrect',
  revealAnswer: boolean,
): boolean {
  if (submissionState !== 'incorrect' || !revealAnswer) return false
  return tileId === (correctTileIdFor(snapshot) ?? 'correct')
}

/** Number keys that pick a tile: 1-4, top row or numpad. */
const MAX_KEYED_TILES = 4

function tileIndexForKey(event: KeyboardEvent): number | null {
  const match = /^(?:Digit|Numpad)([1-9])$/.exec(event.code)
  if (!match) return null
  const index = Number(match[1]) - 1
  return index < MAX_KEYED_TILES ? index : null
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable)
}

export default function TileGrid({ prompt, options, onSelect, selectedId, submissionState, snapshot, revealAnswer }: TileGridProps) {
  const prefersReducedMotion = useReducedMotion()
  const locked = submissionState !== 'idle'

  // Number keys pick a tile while the grid is answerable (4B.3). Captured on
  // window before useKeyboardShortcuts, whose 1-3 switch the right-panel
  // tabs, so a keypress here selects an answer instead of changing tabs.
  // Selecting only: submitting still takes the Submit button.
  useEffect(() => {
    if (locked) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) return
      if (document.querySelector('[role="dialog"]')) return
      const index = tileIndexForKey(event)
      if (index === null || index >= options.length) return
      event.preventDefault()
      event.stopPropagation()
      onSelect(options[index].id)
    }
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [locked, options, onSelect])

  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <p className="font-sans text-[15px] font-medium text-text-primary dark:text-dark-text-primary">{prompt}</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option, index) => {
          const isSelected = option.id === selectedId
          const isSelectedCorrect = isSelected && submissionState === 'correct'
          const isSelectedIncorrect = isSelected && submissionState === 'incorrect'
          // Revealed only when this tile is the correct one and the
          // learner picked something else - never before submission.
          const isRevealedCorrect = !isSelected && isCorrectTile(option.id, snapshot, submissionState, revealAnswer)

          return (
            <motion.button
              key={option.id}
              type="button"
              disabled={locked}
              onClick={() => onSelect(option.id)}
              aria-keyshortcuts={index < MAX_KEYED_TILES ? String(index + 1) : undefined}
              // A wrong pick shakes briefly (160ms, 3px); nothing moves
              // under reduced motion.
              animate={
                isSelectedIncorrect && !prefersReducedMotion ? { x: [0, -3, 3, -3, 3, 0] } : { x: 0 }
              }
              transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
              className={cn(
                'flex min-h-[48px] items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-[13px] transition-[color,background-color,border-color,transform] duration-200',
                !locked && 'hover:-translate-y-px active:translate-y-0 motion-reduce:hover:translate-y-0',
                isSelectedCorrect || isRevealedCorrect
                  ? 'border-success bg-success-light text-success'
                  : isSelectedIncorrect
                    ? 'border-error bg-error-light text-error'
                    : isSelected
                      ? 'border-secondary bg-secondary-light text-text-primary dark:bg-secondary/20 dark:text-dark-text-primary'
                      : 'border-border bg-background text-text-primary dark:text-dark-text-primary',
              )}
            >
              <span className="flex items-center gap-2">
                {index < MAX_KEYED_TILES && (
                  <kbd
                    aria-hidden="true"
                    className="flex size-5 shrink-0 items-center justify-center rounded border border-border bg-surface font-mono text-[10px] text-text-muted dark:border-dark-border dark:bg-dark-border dark:text-dark-text-secondary"
                  >
                    {index + 1}
                  </kbd>
                )}
                <span className="font-medium">{option.label}</span>
              </span>
              {(isSelectedCorrect || isRevealedCorrect) && (
                <motion.span
                  initial={prefersReducedMotion ? false : { scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={prefersReducedMotion ? { duration: 0 } : CANVAS_SPRING}
                  className="flex"
                >
                  <CheckIcon />
                </motion.span>
              )}
              {isSelectedIncorrect && <XIcon />}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
