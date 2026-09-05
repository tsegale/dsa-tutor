INSERTION_SORT_CONTEXT = """
Insertion Sort builds a sorted region from left to right. It takes each new
element (the key) and shifts elements in the sorted region rightward until
it finds the correct position for the key.

Key properties:
- Time complexity: O(n^2) worst, O(n) best (already sorted)
- Stable sort - equal elements preserve their original order
- Efficient for small or nearly-sorted arrays

Common misconceptions:
- SWAP_DECISION: Student says to stop when they should shift, or shift when
  they should stop. Address by asking: Is the key smaller than the element
  to its left? If so, the left element has not found its place yet and
  must move right.
- Students sometimes think Insertion Sort always makes n shifts per pass.
  It stops as soon as the key finds its correct position, which may be
  after zero shifts.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "SWAP_DECISION": (
        "The student was asked whether the key should shift past the "
        "compared element, or whether it has found its correct "
        "position and should stop. Ground the feedback in the exact "
        "key value and the compared element's value and index."
    ),
    "PASS_COMPLETE": (
        "The student was asked what is now guaranteed once the key "
        "reaches its final position. The invariant being tested is "
        "that the sorted region has grown by one element and remains "
        "fully sorted. Ground the feedback in this invariant, not in "
        "any single comparison."
    ),
    "ALGORITHM_COMPLETE": (
        "The student was asked to identify the invariant that proves "
        "sorting is complete. The correct invariant is that no adjacent "
        "pair is out of order. Ground the feedback in this invariant, "
        "not in any single comparison."
    ),
}

INSERTION_SORT_PSEUDOCODE = """
for i from 1 to n-1:
  key = arr[i]
  j = i - 1
  while j >= 0 and arr[j] > key:
    arr[j+1] = arr[j]
    j = j - 1
  arr[j+1] = key
"""
