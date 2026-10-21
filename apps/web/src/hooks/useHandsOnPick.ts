import { useCallback } from 'react'
import { AlgorithmMode } from '@dsa-tutor/types'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { useAlgorithmStore, selectIsLiveJunction } from '@/store/useAlgorithmStore'
import { HANDS_ON_ANSWER_EVENT } from '@/components/prediction/PredictionZone'
import { handsOnSelectionFor, type HandsOnSelection } from '@/utils/handsOnSelection'

/**
 * The selection interaction, for a canvas that draws things to point at.
 *
 * One hook rather than three copies of the same four conditions. It
 * answers two questions for the canvas - is this thing clickable, and
 * what happens when it is clicked - and keeps the rules about WHEN
 * hands-on applies in a single place:
 *
 * - only in Hands-on mode, so Demo and Practice are untouched;
 * - only at a live junction, never at a worked step the learner is
 *   watching (Week 2 2A) and never while a mistake path is playing;
 * - only where handsOnSelectionFor found a real choice.
 *
 * The click submits a tile id, so a pointed answer and a clicked tile
 * reach the same grading path. There is no second answer key.
 */
export interface HandsOnPick {
  selection: HandsOnSelection | null
  /** Whether this key is one of the things the learner may choose. */
  selectable: (key: string) => boolean
  /** Submit the choice behind this key. */
  pick: (key: string) => void
}

const INERT: HandsOnPick = { selection: null, selectable: () => false, pick: () => {} }

export function useHandsOnPick(snapshot: AlgorithmSnapshot | null | undefined, active = true): HandsOnPick {
  const mode = useAlgorithmStore((state) => state.mode)
  const isLiveJunction = useAlgorithmStore(selectIsLiveJunction)

  const enabled = active && mode === AlgorithmMode.HANDS_ON && isLiveJunction
  const selection = enabled ? handsOnSelectionFor(snapshot) : null

  const pick = useCallback(
    (key: string) => {
      const answer = selection?.choices[key]
      if (answer === undefined) return
      window.dispatchEvent(new CustomEvent(HANDS_ON_ANSWER_EVENT, { detail: answer }))
    },
    [selection],
  )

  if (!selection) return INERT
  return {
    selection,
    selectable: (key: string) => key in selection.choices,
    pick,
  }
}
