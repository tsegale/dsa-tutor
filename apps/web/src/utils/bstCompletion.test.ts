import { describe, expect, it } from 'vitest'
import { JunctionDifficulty, ScaffoldingLevel } from '@dsa-tutor/types'
import { bstInsertEngine } from '@/engine/bst'
import { getTilesForSnapshot } from './tileBuilder'
import { getPromptForSnapshot } from './junctionPrompt'
import { selfExplanationPromptFor } from '@/config/selfExplanationPrompts'
import { isWorkedStep } from './workedSteps'

const run = bstInsertEngine([8, 4, 12, 2, 6], { withCompletionCheck: true })
const checkIndex = run.findIndex((s) => s.criticalJunctionType === 'ALGORITHM_COMPLETE')
const check = run[checkIndex]

describe('BST study completion junction', () => {
  it('asks which traversal lists the values in sorted order', () => {
    expect(getPromptForSnapshot(check, 'Binary Search Tree')).toBe(
      'The tree is built. Which traversal would list its values in sorted order?',
    )
  })

  it('offers in-order as the correct tile, and labels every wrong tile with a misconception', () => {
    const tiles = getTilesForSnapshot(check, 'Binary Search Tree')
    expect(tiles).toHaveLength(4)
    expect(tiles.find((t) => t.id === 'correct')?.label).toMatch(/^In-order/)
    expect(tiles.filter((t) => t.id !== 'correct').every((t) => t.misconception !== null)).toBe(true)
  })

  it('gives the BST study topic a conceptual junction that fading always asks', () => {
    expect(check.junctionDifficulty).toBe(JunctionDifficulty.CONCEPTUAL)
    expect(isWorkedStep(run, checkIndex, ScaffoldingLevel.HIGH)).toBe(false)
  })

  it('has an authored self-explanation prompt', () => {
    expect(selfExplanationPromptFor('bst', check)?.key).toBe('bst.in-order-sorted')
  })
})
