import { describe, expect, it } from 'vitest'
import { operationLabelFor } from '@/utils/operationLabel'
import { runFor } from '@/engine/runFor'

/**
 * The array operation topics must say what they are doing.
 *
 * Array Insertion drew the bars sliding and a 99 appearing at index 2 with
 * nothing anywhere stating that 99 was being inserted there, so the value
 * arrived from nowhere. Array Access highlighted a bar without saying what
 * was being accessed. The engines carried the operation, the index and the
 * value the whole time and nothing read them.
 *
 * Driven from real runs: a label that cannot be built from a topic's own
 * state is a label that will be missing on screen.
 */

const INPUT = [12, 3, 14, 1, 7]

describe('the array operation topics', () => {
  for (const slug of ['array-access', 'array-insert', 'array-delete']) {
    it(`${slug} says what it is doing, at every step of its run`, () => {
      const run = runFor(slug, INPUT)
      expect(run.length).toBeGreaterThan(1)
      for (const snapshot of run) {
        const label = operationLabelFor(snapshot.dataStructureState)
        expect(label, `step ${snapshot.stepIndex} of ${slug}`).not.toBeNull()
        expect(label!.headline.length).toBeGreaterThan(10)
        expect(label!.detail.length).toBeGreaterThan(10)
      }
    })
  }

  it('names the value being inserted, not just the index', () => {
    // "Inserting at index 2" would still leave 99 arriving from nowhere.
    const run = runFor('array-insert', INPUT)
    const label = operationLabelFor(run[0].dataStructureState)!
    expect(label.headline).toMatch(/Inserting \d+ at index \d+/)
  })

  it('names the value being deleted', () => {
    const run = runFor('array-delete', INPUT)
    const label = operationLabelFor(run[0].dataStructureState)!
    expect(label.headline).toMatch(/Deleting \d+ from index \d+/)
  })

  it('explains the shift, which is what the complexity is counting', () => {
    for (const slug of ['array-insert', 'array-delete']) {
      const label = operationLabelFor(runFor(slug, INPUT)[0].dataStructureState)!
      expect(label.detail, slug).toMatch(/shift/i)
    }
  })

  it('explains why access is the cheap one', () => {
    const label = operationLabelFor(runFor('array-access', INPUT)[0].dataStructureState)!
    expect(label.detail).toMatch(/O\(1\)/)
  })
})

describe('every other topic', () => {
  it('gets no operation label, because a sort is not an operation on one index', () => {
    for (const slug of ['bubble-sort', 'binary-search', 'insertion-sort', 'two-pointer']) {
      const run = runFor(slug, INPUT)
      expect(operationLabelFor(run[0].dataStructureState), slug).toBeNull()
    }
  })

  it('survives a state shape it does not recognise', () => {
    expect(operationLabelFor(null)).toBeNull()
    expect(operationLabelFor([1, 2, 3])).toBeNull()
    expect(operationLabelFor({ operation: 'access' })).toBeNull()
    expect(operationLabelFor({ targetIndex: 2, operation: 'rotate' })).toBeNull()
  })

  it('still labels an operation whose value the engine did not record', () => {
    const label = operationLabelFor({ operation: 'insert', targetIndex: 2, operationValue: null })
    expect(label?.headline).toBe('Inserting a value at index 2')
  })
})
