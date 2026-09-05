MERGE_SORT_CONTEXT = """
Merge Sort (implemented bottom-up) treats the array as n sub-arrays of size 1
and repeatedly merges adjacent sorted sub-arrays into progressively larger
sorted runs, until the whole array is one sorted run. Each merge step takes
the smaller of the two runs' current front elements into the result.

Key properties:
- Time complexity: O(n log n) always - NOT adaptive to input order, since
  the merge structure depends only on n, never on the data
- Stable: on a tie, the LEFT run's element is always taken first, so equal
  elements preserve their original relative order
- Requires O(n) auxiliary space for the merge buffers

Common misconceptions:
- MERGE_DECISION: Student picks the wrong run because they compare the
  values backwards, or forget that only the CURRENT front element of each
  run (not the whole run) is being compared. Address by asking: Which of
  the two highlighted front values is smaller?
- Students sometimes think Merge Sort is adaptive (faster on already-sorted
  input) like Bubble or Insertion Sort. It always performs the same number
  of merge operations for a given array length.
- Students sometimes think a run must be fully consumed before the other
  run can contribute anything. Elements interleave one at a time based on
  which front value is smaller at each step.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "MERGE_DECISION": (
        "The student was asked which of two runs' current front "
        "elements should go into the merged result first. Ground the "
        "feedback in those two exact values and which run they came "
        "from."
    ),
    "PASS_COMPLETE": (
        "The student was asked what is now guaranteed once a pass of "
        "merges completes. The invariant being tested is that each "
        "merged segment is sorted within itself - not that the whole "
        "array is sorted yet, since later passes still need to merge "
        "those segments together. Ground the feedback in this "
        "invariant, not in any single comparison."
    ),
    "ALGORITHM_COMPLETE": (
        "The student was asked to identify the invariant that proves "
        "sorting is complete. The correct invariant is that no adjacent "
        "pair is out of order. Ground the feedback in this invariant, "
        "not in any single comparison."
    ),
}

MERGE_SORT_PSEUDOCODE = """
passSize = 1
while passSize < n:
  for start from 0 to n step 2*passSize:
    left = [start, start+passSize)
    right = [start+passSize, start+2*passSize)
    merge(left, right) into array[start .. start+2*passSize)
  passSize = passSize * 2
"""
