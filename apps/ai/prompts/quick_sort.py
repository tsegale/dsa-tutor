QUICK_SORT_CONTEXT = """
Quick Sort (implemented iteratively with an explicit stack) partitions the
array around a pivot - the last element of the current range, using the
Lomuto scheme. Every element less than the pivot is moved to its left;
everything else stays to its right. The pivot is then placed at the
boundary between the two groups, which is its final sorted position.

Key properties:
- Time complexity: O(n log n) average case, O(n^2) worst case
- Worst case is triggered by already-sorted or reverse-sorted input when the
  pivot is always the last element: each partition only removes one
  element from consideration instead of roughly halving the range
- Not stable: equal elements may be reordered during partitioning
- In-place: no auxiliary array is needed, only pointer bookkeeping

Common misconceptions:
- PIVOT_SELECTION: Student names the first element, the median of three or
  a random element. Those are real strategies, but not this
  implementation's: Lomuto as written here always takes the last element of
  the current range. Address by asking: which element does this code read
  as the pivot, and what does that choice cost on sorted input?
- PARTITION_DECISION: Student swaps an element that should stay right of
  the pivot, or leaves one that should move left. Address by asking:
  Is this element smaller than the pivot? Where does it belong relative to
  the pivot?
- Students sometimes think the pivot moves during partitioning. It stays
  fixed at the end of the range until the final swap places it at its
  boundary position - only elements around it move.
- Students sometimes expect a partition to fully sort a sub-array in one
  step. It only separates elements into "less than pivot" and "greater or
  equal to pivot" - the resulting sub-arrays still need their own passes.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "PIVOT_SELECTION": (
        "The student was asked which element of the current range becomes "
        "the pivot and why. The correct answer is the last element of the "
        "range: this Lomuto implementation always reads array[high]. If the "
        "student chose the first element, the median of three or a random "
        "element, say that it is a real strategy but not the one this code "
        "uses, and point to the pseudocode line that reads the pivot; do not "
        "name the correct element, its index or its value. At low or no "
        "support, name the invariant the choice governs: after partitioning "
        "the pivot sits at its final sorted index, and how evenly it splits "
        "the range is decided entirely by the pivot strategy."
    ),
    "PARTITION_DECISION": (
        "The student was asked whether the element at the left pointer "
        "should move to the left of the pivot or stay where it is. "
        "Ground the feedback in the exact compared value and the "
        "pivot's value."
    ),
    "ALGORITHM_COMPLETE": (
        "The student was asked to identify the invariant that proves "
        "sorting is complete. The correct invariant is that no adjacent "
        "pair is out of order. Ground the feedback in this invariant, "
        "not in any single comparison."
    ),
}

QUICK_SORT_PSEUDOCODE = """
procedure quickSort(low, high):
  if low < high:
    pivot = array[high]
    boundary = low - 1
    for j from low to high - 1:
      if array[j] < pivot:
        boundary = boundary + 1
        swap(array[boundary], array[j])
    swap(array[boundary + 1], array[high])
    pivotIndex = boundary + 1
    quickSort(low, pivotIndex - 1)
    quickSort(pivotIndex + 1, high)
"""
