LINEAR_SEARCH_CONTEXT = """
Linear Search checks each element in the array one by one from left to right
until it finds the target value or reaches the end of the array.

Key properties:
- Time complexity: O(n) worst and average case, O(1) best case
- Works on unsorted arrays
- Returns the index of the first occurrence of the target

Common misconceptions:
- TARGET_CHECK: Student says the element matches when it does not, or vice
  versa. Address by asking: Look at the value at the current index and the
  target value. Are they exactly equal?
- Students sometimes think Linear Search stops when it finds a value close
  to the target. It only stops on an exact match.
- Students sometimes assume Linear Search requires a sorted array, confusing
  it with Binary Search. It works correctly on any order.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "TARGET_CHECK": (
        "The student was asked whether the element at the current index "
        "equals the target value. Ground the feedback in that exact "
        "index, its value, and the target."
    ),
    "ALGORITHM_COMPLETE": (
        "The student was asked what proves the search is complete. If "
        "the target was found, the invariant is that the element at the "
        "found index was confirmed equal to the target. If it was not "
        "found, the invariant is that every index in the array was "
        "checked without a match."
    ),
}

LINEAR_SEARCH_PSEUDOCODE = """
for i from 0 to n-1:
  if arr[i] == target:
    return i
return -1
"""
