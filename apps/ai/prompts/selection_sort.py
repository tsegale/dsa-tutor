SELECTION_SORT_CONTEXT = """
Selection Sort divides the array into a sorted region (left) and an
unsorted region (right). On each pass it finds the minimum element in the
unsorted region and swaps it to the front of that region.

Key properties:
- Time complexity: O(n^2) always - same number of comparisons regardless of
  input
- Always performs exactly n-1 swap operations (one per pass, even when the
  minimum is already in place and the swap is a no-op)
- Not stable - equal elements may be reordered

Common misconceptions:
- NEW_MINIMUM: Student fails to recognise when a smaller element has been
  found. Address by asking: Compare the value at the current scan index
  with the current minimum. Which is smaller?
- Students confuse Selection Sort with Bubble Sort - Selection Sort does
  not swap on every comparison, only once per pass, and it always finds
  the true minimum of the remaining unsorted region before swapping.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "NEW_MINIMUM": (
        "The student was asked whether the value at the scan index is "
        "smaller than the current minimum. Ground the feedback in "
        "those two exact values and indices."
    ),
    "PASS_COMPLETE": (
        "The student was asked what happens when the scan pass "
        "completes. The invariant being tested is that the minimum of "
        "the remaining unsorted region is now in its correct final "
        "position at the front of that region. Ground the feedback in "
        "this invariant, not in any single comparison."
    ),
    "ALGORITHM_COMPLETE": (
        "The student was asked to identify the invariant that proves "
        "sorting is complete. The correct invariant is that no adjacent "
        "pair is out of order. Ground the feedback in this invariant, "
        "not in any single comparison."
    ),
}

SELECTION_SORT_PSEUDOCODE = """
for i from 0 to n-1:
  min_idx = i
  for j from i+1 to n-1:
    if arr[j] < arr[min_idx]:
      min_idx = j
  swap arr[i] and arr[min_idx]
"""
