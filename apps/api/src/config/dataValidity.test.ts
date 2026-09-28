import { describe, expect, it } from 'vitest'
import { comparePromptVersions, hasPreLabelFixFeedback } from './dataValidity'

describe('data validity windows', () => {
  it('orders prompt versions by date then sequence number', () => {
    expect(comparePromptVersions('2026-09-28.5', '2026-09-28.6')).toBeLessThan(0)
    expect(comparePromptVersions('2026-09-28.10', '2026-09-28.9')).toBeGreaterThan(0)
    expect(comparePromptVersions('2026-09-25.2', '2026-09-28.1')).toBeLessThan(0)
  })

  it('marks feedback written before the model saw the chosen option, and unversioned feedback', () => {
    expect(hasPreLabelFixFeedback({ feedbackText: 'x', promptVersion: '2026-09-28.5' })).toBe(true)
    expect(hasPreLabelFixFeedback({ feedbackText: 'x', promptVersion: null })).toBe(true)
    expect(hasPreLabelFixFeedback({ feedbackText: 'x', promptVersion: '2026-09-28.6' })).toBe(false)
    expect(hasPreLabelFixFeedback({ feedbackText: 'x', promptVersion: '2026-09-28.7' })).toBe(false)
  })

  it('leaves rows without feedback alone', () => {
    expect(hasPreLabelFixFeedback({ feedbackText: null, promptVersion: null })).toBe(false)
  })
})
