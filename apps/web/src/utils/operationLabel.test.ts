import { describe, expect, it } from 'vitest'
import { operationLabelFor } from '@/utils/operationLabel'
import { runFor } from '@/engine/runFor'

/**
 * Every Linear structures topic must say what it is doing.
 *
 * The canvases drew the structure and its counters and never named the
 * operation or the property that makes the structure what it is. Driven
 * from real runs of every topic, so a label that cannot be built from a
 * topic's own state fails here rather than being missing on screen.
 */

const INPUT = [12, 3, 14, 1, 7]

const LABELLED = [
  'array-access',
  'array-insert',
  'array-delete',
  'stack',
  'queue',
  'circular-queue',
  'deque',
  'singly-linked-list',
  'doubly-linked-list',
  'circular-linked-list',
  'hash-table-chaining',
  'hash-table-probing',
]

const labelsOf = (slug: string) =>
  runFor(slug, INPUT).map((snapshot) => ({ step: snapshot.stepIndex, label: operationLabelFor(snapshot.dataStructureState) }))

describe('every structure topic', () => {
  for (const slug of LABELLED) {
    it(`${slug} is labelled at every step of its run`, () => {
      const labels = labelsOf(slug)
      expect(labels.length).toBeGreaterThan(1)
      for (const { step, label } of labels) {
        expect(label, `${slug} step ${step}`).not.toBeNull()
        expect(label!.headline.length, `${slug} step ${step} headline`).toBeGreaterThan(8)
        expect(label!.detail.length, `${slug} step ${step} detail`).toBeGreaterThan(20)
      }
    })
  }

  it('tells each structure apart by its defining property', () => {
    // The complaint this answers: a doubly linked list that reads exactly
    // like a singly one teaches nothing about why both exist.
    const detail = (slug: string) => operationLabelFor(runFor(slug, INPUT)[0].dataStructureState)!.detail
    expect(detail('singly-linked-list')).toMatch(/only the next one/i)
    expect(detail('doubly-linked-list')).toMatch(/both of its neighbours/i)
    expect(detail('stack')).toMatch(/last in, first out/i)
    expect(detail('queue')).toMatch(/first in, first out/i)
    expect(detail('circular-queue')).toMatch(/wraps round/i)
    expect(detail('deque')).toMatch(/both ends/i)
    expect(detail('hash-table-chaining')).toMatch(/chained/i)
    expect(detail('hash-table-probing')).toMatch(/stepped past/i)
  })

  it('gives the three queue variants three different explanations', () => {
    const details = ['queue', 'circular-queue', 'deque'].map(
      (slug) => operationLabelFor(runFor(slug, INPUT)[0].dataStructureState)!.detail,
    )
    expect(new Set(details).size).toBe(3)
  })

  it('names the value an operation acted on, once the engine records one', () => {
    const withValue = (slug: string) =>
      labelsOf(slug)
        .map((entry) => entry.label!.headline)
        .filter((headline) => /\d/.test(headline))
    for (const slug of ['stack', 'queue', 'deque', 'singly-linked-list']) {
      expect(withValue(slug).length, `${slug} never names a value`).toBeGreaterThan(0)
    }
  })
})

describe('a step that names no operation', () => {
  it('describes the structure rather than carrying the last operation forward', () => {
    // The deque sets lastOperation only on the step that completes one.
    // Repeating the previous operation on the question step before the
    // next one would state an operation that is not the one in progress.
    const label = operationLabelFor({
      variant: 'deque',
      frontIndex: 0,
      rearIndex: 1,
      capacity: 5,
      size: 2,
      lastOperation: null,
      lastOperationValue: null,
    })!
    expect(label.headline).toBe('A deque holding up to 5 values')
  })

  it('does not claim an end a deque never recorded', () => {
    // lastOperation is 'enqueue' for both pushFront and pushBack, so
    // "at the rear" there would be a guess presented as fact.
    const label = operationLabelFor({
      variant: 'deque',
      frontIndex: 0,
      rearIndex: 1,
      capacity: 5,
      size: 2,
      lastOperation: 'enqueue',
      lastOperationValue: 8,
    })!
    expect(label.headline).toBe('Added 8 to the deque')
    expect(label.headline).not.toMatch(/rear|front|back/i)
  })

  it('does say which end for a plain queue, where the engine only has one', () => {
    const label = operationLabelFor({
      variant: 'linear',
      frontIndex: 0,
      rearIndex: 1,
      capacity: 6,
      size: 2,
      lastOperation: 'enqueue',
      lastOperationValue: 8,
    })!
    expect(label.headline).toMatch(/at the rear/)
  })
})

describe('topics with nothing to label', () => {
  it('gets no label for a sort, a search or recursion', () => {
    for (const slug of ['bubble-sort', 'binary-search', 'insertion-sort', 'recursion-factorial']) {
      const run = runFor(slug, INPUT)
      expect(operationLabelFor(run[0].dataStructureState), slug).toBeNull()
    }
  })

  it('survives a state shape it does not recognise', () => {
    expect(operationLabelFor(null)).toBeNull()
    expect(operationLabelFor([1, 2, 3])).toBeNull()
    expect(operationLabelFor({})).toBeNull()
    expect(operationLabelFor({ operation: 'insert' })).toBeNull()
  })
})
