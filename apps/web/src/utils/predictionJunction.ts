import type { CriticalJunctionType, TileOptionSpec } from '@dsa-tutor/types'
import { CRITICAL_JUNCTION_TILE_OPTIONS } from '@dsa-tutor/types'

/**
 * The TILE_GRID options for a Critical Junction, as set by the snapshot
 * engine. Only the three CONCEPTUAL junction types have a static option
 * set here; SWAP_DECISION resolves through CANVAS_CLICK instead.
 */
export function getCriticalJunctionTileOptions(junctionType: CriticalJunctionType | null): TileOptionSpec[] | null {
  if (!junctionType) return null
  return CRITICAL_JUNCTION_TILE_OPTIONS[junctionType] ?? null
}

/**
 * For HIGH-scaffolding tile priming only: the option id to lightly
 * highlight after inactivity. Never used for grading, which stays
 * server-side.
 */
export function getCorrectTileOptionId(junctionType: CriticalJunctionType | null): string | null {
  const options = getCriticalJunctionTileOptions(junctionType)
  return options?.find((option) => option.correct)?.id ?? null
}

/** LOW scaffolding shows a one-sentence mistake analysis only. */
export function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]*[.!?]/)
  return match ? match[0].trim() : text.trim()
}
