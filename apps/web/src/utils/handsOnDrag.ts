import { CriticalJunctionType } from '@dsa-tutor/types'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'

/**
 * Hands-On drag targets for every sorting junction that has one. Two
 * interaction shapes:
 * - 'threshold': one bar is dragged toward the other; crossing the
 *   midpoint between them fires answerA, staying put fires answerB.
 *   Both bars are draggable (dragging either one toward the other
 *   works, matching Bubble Sort's existing feel).
 * - 'pick-one': the two bars are peers, not a "should this cross"
 *   comparison - Merge Sort's front-of-left-run vs front-of-right-run.
 *   Dragging either bar any perceptible distance answers for that bar,
 *   regardless of direction.
 *
 * Returns null when the current snapshot has no drag interaction (every
 * junction type this doesn't recognise, and the two purely conceptual
 * junctions PASS_COMPLETE/ALGORITHM_COMPLETE/EARLY_TERMINATION which
 * still use the tile grid even in Hands-On mode).
 */
export interface HandsOnDragTarget {
  indexA: number
  indexB: number
  kind: 'threshold' | 'pick-one'
  answerA: string
  answerB: string
}

export function getHandsOnDragTarget(snapshot: AlgorithmSnapshot | null): HandsOnDragTarget | null {
  if (!snapshot || !snapshot.isPredictionRequired) return null
  const state = snapshot.dataStructureState

  if (snapshot.criticalJunctionType === CriticalJunctionType.SWAP_DECISION) {
    if (state && typeof state === 'object' && 'currentKey' in state) {
      const s = state as unknown as { keyIndex: number; compareIndex: number }
      return { indexA: s.keyIndex, indexB: s.compareIndex, kind: 'threshold', answerA: 'shift', answerB: 'stop' }
    }
    if (snapshot.activeIndices.length === 2) {
      const [a, b] = snapshot.activeIndices
      return { indexA: a, indexB: b, kind: 'threshold', answerA: 'swap', answerB: 'no-swap' }
    }
    return null
  }

  if (snapshot.criticalJunctionType === CriticalJunctionType.NEW_MINIMUM) {
    const s = state as { currentMin: number; scanIndex: number }
    return { indexA: s.scanIndex, indexB: s.currentMin, kind: 'threshold', answerA: 'update', answerB: 'keep' }
  }

  if (snapshot.criticalJunctionType === CriticalJunctionType.PARTITION_DECISION) {
    // Unlike the other three, leftPointer (indexA) always starts strictly
    // to the LEFT of the pivot (indexB) - the Lomuto scheme never lets it
    // reach the pivot's own slot. So "crossing" here means dragging it
    // rightward PAST the pivot, which represents "this belongs on the
    // pivot's side, not the smaller-elements side" - the opposite polarity
    // from Bubble/Insertion/Selection, where the compared element starts
    // on the side that "crossing" moves it away from.
    const s = state as { leftPointer: number; pivotIndex: number }
    return { indexA: s.leftPointer, indexB: s.pivotIndex, kind: 'threshold', answerA: 'skip', answerB: 'swap' }
  }

  if (snapshot.criticalJunctionType === CriticalJunctionType.MERGE_DECISION) {
    const s = state as { leftRegion: [number, number]; rightRegion: [number, number] }
    return { indexA: s.leftRegion[0], indexB: s.rightRegion[0], kind: 'pick-one', answerA: 'take-left', answerB: 'take-right' }
  }

  if (snapshot.criticalJunctionType === CriticalJunctionType.GAP_COMPARISON) {
    const s = state as { keyIndex: number; compareIndex: number }
    return { indexA: s.keyIndex, indexB: s.compareIndex, kind: 'threshold', answerA: 'shift', answerB: 'no-shift' }
  }

  if (snapshot.criticalJunctionType === CriticalJunctionType.HEAP_COMPARE) {
    if (snapshot.activeIndices.length === 2) {
      const [parent, child] = snapshot.activeIndices
      return { indexA: child, indexB: parent, kind: 'threshold', answerA: 'sift', answerB: 'stay' }
    }
    return null
  }

  return null
}

/**
 * A threshold drag has two answers but only one visible gesture: dragging
 * past the midpoint. The other - leave them where they are - was expressed
 * by picking a bar up and putting it back, which nothing on screen said,
 * so on an already-ordered pair the hint read "Drag to answer" over a
 * question the learner could see no way to answer.
 *
 * This is the answer id for that case, so the prediction zone can offer it
 * as a control rather than leaving it to a gesture nobody would guess.
 */
export function handsOnStayAnswer(snapshot: AlgorithmSnapshot | null): string | null {
  const target = getHandsOnDragTarget(snapshot)
  return target && target.kind === 'threshold' ? target.answerB : null
}
