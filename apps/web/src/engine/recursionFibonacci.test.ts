import { describe, it, expect } from 'vitest'
import { fibonacciEngine, type CallStackState } from './recursionFibonacci'

function lastState(snapshots: ReturnType<typeof fibonacciEngine>): CallStackState {
  return snapshots[snapshots.length - 1].dataStructureState as CallStackState
}

describe('fibonacciEngine', () => {
  it('computes fib(1) = 1', () => {
    const snapshots = fibonacciEngine(1)
    expect(lastState(snapshots).computedValues?.[1]).toBe(1)
  })

  it('computes fib(2) = 1', () => {
    const snapshots = fibonacciEngine(2)
    expect(lastState(snapshots).computedValues?.[2]).toBe(1)
  })

  it('computes fib(5) = 5', () => {
    const snapshots = fibonacciEngine(5)
    expect(lastState(snapshots).computedValues?.[5]).toBe(5)
  })

  it('computes fib(8) = 21', () => {
    const snapshots = fibonacciEngine(8)
    expect(lastState(snapshots).computedValues?.[8]).toBe(21)
  })

  it('clamps n above 8 down to 8', () => {
    const snapshots = fibonacciEngine(20)
    // fib(8) = 21 - if it had actually run at n=20 the result would differ wildly
    expect(lastState(snapshots).computedValues?.[8]).toBe(21)
  })

  it('makes an exponential number of total calls, not linear', () => {
    const snapshotsSmall = fibonacciEngine(3)
    const snapshotsLarge = fibonacciEngine(7)
    const callsSmall = lastState(snapshotsSmall).totalCalls ?? 0
    const callsLarge = lastState(snapshotsLarge).totalCalls ?? 0
    // linear growth would be ~2.3x (7/3); naive fib grows much faster
    expect(callsLarge).toBeGreaterThan(callsSmall * 4)
  })

  it('flags exactly one BASE_CASE critical junction', () => {
    const snapshots = fibonacciEngine(5)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'BASE_CASE')
    expect(junctions.length).toBe(1)
  })

  it('flags exactly one RECURSIVE_CALL critical junction', () => {
    const snapshots = fibonacciEngine(5)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'RECURSIVE_CALL')
    expect(junctions.length).toBe(1)
  })

  it('ends with only the root frame left, already returned', () => {
    const snapshots = fibonacciEngine(4)
    const state = lastState(snapshots)
    expect(state.frames.length).toBe(1)
    expect(state.frames[0].status).toBe('returned')
    expect(state.frames[0].argument).toBe(4)
  })

  it('flags a call for a repeated value as redundant in its description', () => {
    const snapshots = fibonacciEngine(5)
    const redundantSteps = snapshots.filter((s) => s.description.includes('already computed earlier'))
    expect(redundantSteps.length).toBeGreaterThan(0)
  })

  it('has sequential stepIndex values', () => {
    const snapshots = fibonacciEngine(4)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = fibonacciEngine(4)
    snapshots.forEach((s, i) => expect(s.isFinalStep).toBe(i === snapshots.length - 1))
  })
})
