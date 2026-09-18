import { CriticalJunctionType } from '@dsa-tutor/types'

/**
 * Per-junction Hands-On drag instructions. Shown persistently in
 * PredictionZone whenever a drag junction is active, replacing what used
 * to be a one-time canvas tooltip gated on a localStorage flag - that
 * meant a returning student who had seen it once, ever, on any step,
 * never got instructions again.
 */
export function getHandsOnInstructionText(criticalJunctionType: CriticalJunctionType | null | undefined): string {
  switch (criticalJunctionType) {
    case CriticalJunctionType.MERGE_DECISION:
      return 'Drag whichever bar is smaller down into the merged result.'
    case CriticalJunctionType.NEW_MINIMUM:
      return 'Drag the compared bar onto the current minimum if it is smaller, or leave it in place if not.'
    case CriticalJunctionType.PARTITION_DECISION:
      return 'Drag the bar past the pivot if it belongs on the pivot’s side, or leave it if it belongs left of the pivot.'
    case CriticalJunctionType.GAP_COMPARISON:
      return 'Drag the key bar across the gap if it should shift left, or leave it in place if not.'
    case CriticalJunctionType.HEAP_COMPARE:
      return 'Drag the larger child onto the parent if it should sift down, or leave it in place if not.'
    default:
      return 'Drag the bars to swap them, or leave them in place if no swap is needed.'
  }
}
