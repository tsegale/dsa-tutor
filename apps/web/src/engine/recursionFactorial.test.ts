import { describe, it, expect } from 'vitest'
import { factorialEngine, type CallStackState } from './recursionFactorial'

function lastState(snapshots: ReturnType<typeof factorialEngine>): CallStackState {
  return snapshots[snapshots.length - 1].dataStructureState as CallStackState
}

describe('factorialEngine', () => {
  it('computes factorial(5) = 120', () => {
    const snapshots = factorialEngine(5)
    const topFrame = lastState(snapshots).frames.find((f) => f.argument === 5)!
    expect(topFrame.returnValue).toBe(120)
  })

  it('computes factorial(1) = 1', () => {
    const snapshots = factorialEngine(1)
    const topFrame = lastState(snapshots).frames.find((f) => f.argument === 1)!
    expect(topFrame.returnValue).toBe(1)
  })

  it('computes factorial(0) as the base case directly', () => {
    const snapshots = factorialEngine(0)
    const state = lastState(snapshots)
    // clamped to a minimum of 1, so factorial(0) becomes factorial(1)
    expect(state.frames.find((f) => f.argument === 0)!.returnValue).toBe(1)
  })

  it('clamps n above 10 down to 10', () => {
    const snapshots = factorialEngine(15)
    const state = lastState(snapshots)
    expect(Math.max(...state.frames.map((f) => f.argument))).toBe(10)
  })

  it('pushes exactly n+1 frames (n, n-1, ..., 0)', () => {
    const snapshots = factorialEngine(6)
    expect(lastState(snapshots).frames.length).toBe(7)
  })

  it('flags exactly one BASE_CASE critical junction', () => {
    const snapshots = factorialEngine(5)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'BASE_CASE')
    expect(junctions.length).toBe(1)
  })

  it('flags one RETURN_VALUE critical junction per non-base frame', () => {
    const snapshots = factorialEngine(5)
    const junctions = snapshots.filter((s) => s.criticalJunctionType === 'RETURN_VALUE')
    expect(junctions.length).toBe(5)
  })

  it('every frame ends with status "returned"', () => {
    const snapshots = factorialEngine(4)
    const state = lastState(snapshots)
    expect(state.frames.every((f) => f.status === 'returned')).toBe(true)
  })

  it('has sequential stepIndex values', () => {
    const snapshots = factorialEngine(4)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = factorialEngine(4)
    snapshots.forEach((s, i) => expect(s.isFinalStep).toBe(i === snapshots.length - 1))
  })
})
