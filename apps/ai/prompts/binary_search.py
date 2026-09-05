BINARY_SEARCH_CONTEXT = """
Binary Search requires a sorted array. It finds the midpoint of the search
space, compares the midpoint value to the target, and eliminates half the
remaining elements on each step.

Key properties:
- Time complexity: O(log n)
- REQUIRES a sorted array - will give wrong results on unsorted input
- Eliminates half the search space on every step

Common misconceptions:
- MIDPOINT_DECISION: Student picks the wrong half because they compare
  incorrectly. Address by asking: Is the target larger or smaller than the
  midpoint value? Which half of the remaining array could possibly contain
  the target?
- Students sometimes expect Binary Search to check every element like
  Linear Search. Emphasise that eliminated indices will never contain the
  target.
- Students sometimes recompute the midpoint incorrectly, forgetting that it
  must be the floor of (low + high) / 2 over the CURRENT low/high, not the
  original array bounds.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "MIDPOINT_DECISION": (
        "The student was asked whether to search the left half, the "
        "right half, or whether the midpoint itself is the target. "
        "Ground the feedback in the exact midpoint index, its value, "
        "and the target, and in the current low/high bounds."
    ),
    "ALGORITHM_COMPLETE": (
        "The student was asked what proves the search is complete. If "
        "the target was found, the invariant is that the midpoint was "
        "confirmed equal to the target. If it was not found, the "
        "invariant is that the entire valid search space (low > high) "
        "was eliminated without a match."
    ),
}

BINARY_SEARCH_PSEUDOCODE = """
low = 0, high = n-1
while low <= high:
  mid = (low + high) / 2
  if arr[mid] == target: return mid
  if arr[mid] < target: low = mid + 1
  else: high = mid - 1
return -1
"""
