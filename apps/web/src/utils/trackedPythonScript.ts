import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { PredictionType } from '@dsa-tutor/types'

export interface RawPythonTraceEvent {
  kind: 'compare' | 'write' | 'swap'
  indices: number[]
  array: number[]
  description: string
}

/**
 * Builds the Python harness that wraps `arr` in a trace-recording list whose
 * elements carry their source index through comparisons and writes.
 * Executing arbitrary learner loops on `arr` records up to `maxEvents`
 * visual steps without requiring the learner to call custom helper APIs.
 */
export function buildTrackedArrayHarness(userCode: string, maxEvents = 300): string {
  const encodedUserCode = JSON.stringify(userCode)
  return `
import sys as _sys
import io as _io

_trace_events = []
_MAX_EVENTS = ${maxEvents}
_truncated = False

class _TrackedInt(int):
    def __new__(cls, val, idx, owner):
        inst = super().__new__(cls, int(val))
        inst._idx = idx
        inst._owner = owner
        return inst

    def _record_cmp(self, other, op):
        global _truncated
        if len(_trace_events) >= _MAX_EVENTS:
            _truncated = True
            return
        other_idx = getattr(other, '_idx', None)
        other_owner = getattr(other, '_owner', None)
        n = len(self._owner)
        idxs = []
        if 0 <= self._idx < n:
            idxs.append(self._idx)
        if other_owner is self._owner and other_idx is not None and 0 <= other_idx < n and other_idx != self._idx:
            idxs.append(other_idx)
        other_val = int(other) if isinstance(other, (int, float)) else other
        desc = f"Compared arr[{self._idx}] ({int(self)}) {op} " + (
            f"arr[{other_idx}] ({other_val})" if other_owner is self._owner and other_idx is not None else f"{other_val}"
        )
        _trace_events.append({
            "kind": "compare",
            "indices": idxs,
            "array": [int(x) for x in list.__iter__(self._owner)],
            "description": desc,
        })

    def __lt__(self, other):
        self._record_cmp(other, "<")
        return int.__lt__(int(self), other)

    def __le__(self, other):
        self._record_cmp(other, "<=")
        return int.__le__(int(self), other)

    def __gt__(self, other):
        self._record_cmp(other, ">")
        return int.__gt__(int(self), other)

    def __ge__(self, other):
        self._record_cmp(other, ">=")
        return int.__ge__(int(self), other)

    def __eq__(self, other):
        self._record_cmp(other, "==")
        return int.__eq__(int(self), other)

    def __ne__(self, other):
        self._record_cmp(other, "!=")
        return int.__ne__(int(self), other)

class _TrackedList(list):
    def __getitem__(self, key):
        if isinstance(key, slice):
            raw = super().__getitem__(key)
            start, stop, step = key.indices(len(self))
            indices = list(range(start, stop, step))
            return [_TrackedInt(v, idx, self) for v, idx in zip(raw, indices)]
        idx = key if key >= 0 else len(self) + key
        val = super().__getitem__(key)
        return _TrackedInt(val, idx, self)

    def __setitem__(self, key, value):
        global _truncated
        if isinstance(key, slice):
            clean = [int(v) for v in value]
            super().__setitem__(key, clean)
            if len(_trace_events) < _MAX_EVENTS:
                start, stop, step = key.indices(len(self))
                idxs = list(range(start, stop, step))[:4]
                _trace_events.append({
                    "kind": "write",
                    "indices": idxs,
                    "array": [int(x) for x in list.__iter__(self)],
                    "description": f"Updated slice {start}:{stop}.",
                })
            else:
                _truncated = True
            return

        idx = key if key >= 0 else len(self) + key
        old_val = int(super().__getitem__(idx))
        new_val = int(value)
        super().__setitem__(idx, new_val)
        cur_arr = [int(x) for x in list.__iter__(self)]

        # Coalesce Python tuple swap: arr[a], arr[b] = arr[b], arr[a]
        if _trace_events and _trace_events[-1]["kind"] == "write" and len(_trace_events[-1]["indices"]) == 1:
            prev = _trace_events[-1]
            prev_idx = prev["indices"][0]
            if prev_idx != idx and prev.get("_old") == new_val and prev.get("_new") == old_val:
                _trace_events[-1] = {
                    "kind": "swap",
                    "indices": [prev_idx, idx],
                    "array": cur_arr,
                    "description": f"Swapped arr[{prev_idx}] and arr[{idx}] -> [{new_val}, {old_val}].",
                }
                return

        if len(_trace_events) < _MAX_EVENTS:
            _trace_events.append({
                "kind": "write",
                "indices": [idx],
                "array": cur_arr,
                "description": f"Wrote arr[{idx}] = {new_val}.",
                "_old": old_val,
                "_new": new_val,
            })
        else:
            _truncated = True

arr = _TrackedList([int(x) for x in _initial_arr])
_stdout_buf = _io.StringIO()
_stderr_buf = _io.StringIO()
_old_out, _old_err = _sys.stdout, _sys.stderr
_sys.stdout, _sys.stderr = _stdout_buf, _stderr_buf
_exec_error = None
try:
    _ns = {"arr": arr}
    exec(compile(${encodedUserCode}, "<sandbox>", "exec"), _ns, _ns)
    if isinstance(_ns.get("arr"), list) and _ns["arr"] is not arr:
        arr = _TrackedList([int(x) for x in _ns["arr"]])
except Exception as _exc:
    import traceback as _tb
    _exec_error = f"{type(_exc).__name__}: {_exc}"
    _stderr_buf.write(_tb.format_exc())
finally:
    _sys.stdout, _sys.stderr = _old_out, _old_err

_trace_result = {
    "events": [
        {
            "kind": e["kind"],
            "indices": e["indices"],
            "array": e["array"],
            "description": e["description"],
        }
        for e in _trace_events
    ],
    "finalArray": [int(x) for x in list.__iter__(arr)],
    "truncated": _truncated,
    "stdout": _stdout_buf.getvalue(),
    "stderr": _stderr_buf.getvalue(),
    "error": _exec_error,
}
`
}

export function traceEventsToSnapshots(
  initialArray: number[],
  events: RawPythonTraceEvent[],
  finalArray: number[],
  truncated: boolean,
): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = [
    {
      stepIndex: 0,
      dataStructureState: [...initialArray],
      activeIndices: [],
      highlightIndices: [],
      comparedIndices: [],
      swappedIndices: [],
      pseudocodeLine: 0,
      description: `Starting your Python code on [${initialArray.join(', ')}].`,
      isPredictionRequired: false,
      predictionType: PredictionType.TILE_GRID,
      criticalJunctionType: null,
      junctionDifficulty: null,
      isFinalStep: false,
      metrics: { n: initialArray.length, comparisons: 0, swaps: 0 },
    },
  ]

  let comparisons = 0
  let swaps = 0

  for (const event of events) {
    if (event.kind === 'compare') comparisons += 1
    if (event.kind === 'swap' || event.kind === 'write') swaps += 1

    snapshots.push({
      stepIndex: snapshots.length,
      dataStructureState: [...event.array],
      activeIndices: [...event.indices],
      highlightIndices: [],
      comparedIndices: event.kind === 'compare' ? [...event.indices] : [],
      swappedIndices: event.kind === 'swap' || event.kind === 'write' ? [...event.indices] : [],
      pseudocodeLine: 0,
      description: event.description,
      isPredictionRequired: false,
      predictionType: PredictionType.TILE_GRID,
      criticalJunctionType: null,
      junctionDifficulty: null,
      isFinalStep: false,
      metrics: { n: event.array.length, comparisons, swaps },
    })
  }

  const isSortedAscending = finalArray.every((val, idx) => idx === 0 || finalArray[idx - 1] <= val)
  const finalNote = truncated
    ? `Execution completed (visual trace capped at ${events.length} steps). Final array: [${finalArray.join(', ')}].`
    : `Execution finished after ${comparisons} comparisons and ${swaps} writes. Final array: [${finalArray.join(', ')}].`

  snapshots.push({
    stepIndex: snapshots.length,
    dataStructureState: [...finalArray],
    activeIndices: [],
    highlightIndices: isSortedAscending ? finalArray.map((_, idx) => idx) : [],
    comparedIndices: [],
    swappedIndices: [],
    pseudocodeLine: 0,
    description: finalNote,
    isPredictionRequired: false,
    predictionType: PredictionType.TILE_GRID,
    criticalJunctionType: null,
    junctionDifficulty: null,
    isFinalStep: true,
    metrics: { n: finalArray.length, comparisons, swaps },
  })

  return snapshots
}
