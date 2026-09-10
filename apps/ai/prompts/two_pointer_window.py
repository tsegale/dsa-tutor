TWO_POINTER_WINDOW_CONTEXT = """
Two pointers and sliding windows are both techniques for solving array
problems in O(n) time that a naive brute-force approach would solve in
O(n^2) - by never re-examining the same element more than a constant
number of times, instead of nesting a second loop inside the first.

Two Pointer Technique uses two indices that move toward each other (or
together) based on a comparison, eliminating large portions of the
remaining possibilities with each step instead of checking every pair.
On a sorted array searching for a pair summing to a target: if the
current pair's sum is too small, only moving the left pointer right can
increase it (every pair involving a smaller right pointer was already
implicitly ruled out); if too large, only moving the right pointer left
can decrease it. A palindrome check compares characters from both ends
inward, stopping at the first mismatch - once two ends match, no pair
strictly between them needs re-checking against those two ends again.

Sliding Window maintains a contiguous range of the array and expands or
contracts it incrementally rather than recomputing a sum/property from
scratch at every position. A fixed-size window slides one element at a
time: remove the leftmost element's contribution, add the new rightmost
element's - an O(1) update per slide instead of an O(k) recomputation. A
variable-size window expands from the right until some constraint is
met, then contracts from the left as far as possible while the
constraint still holds, tracking the best (usually smallest) window seen.

When giving feedback, always refer to the actual pointer positions and
values on screen. Never give generic explanations.

Common errors to watch for:
- ORDER_OF_OPERATIONS: The student moves the wrong pointer (e.g. moving
  right when the sum is already too large, which only makes it larger),
  or expands/shrinks a window in the wrong direction relative to the
  constraint.
- COMPLEXITY_MISATTRIBUTION: The student thinks recomputing the window
  sum from scratch after every slide is required - it isn't; the
  incremental update (subtract the outgoing element, add the incoming
  one) is what makes the technique O(n) instead of O(n*k).
- OFF_BY_ONE: The student's window boundaries are off by one after a
  slide or a shrink step.
- STRUCTURAL_PROPERTY_VIOLATION: The student stops a two-pointer scan
  before the pointers actually meet or cross, missing valid pairs still
  in range.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "POINTER_MOVE": (
        "For the two-sum problem, the student was asked which pointer "
        "moves based on whether the current pair's sum is too small or "
        "too large relative to the target. For the palindrome check, "
        "the student was asked whether the two end characters match and "
        "what that implies. Ground the feedback in the exact values at "
        "both pointers."
    ),
    "WINDOW_SUM": (
        "The student was asked for the current window's sum. Ground the "
        "feedback in the exact elements the window currently spans."
    ),
    "WINDOW_EXPAND": (
        "For a fixed-size window, the student was asked for the new sum "
        "after sliding one position (subtract the element that left, "
        "add the element that entered - ground the feedback in those "
        "two specific values). For a variable-size window, the student "
        "was asked whether the window should expand (sum still below "
        "target) or shrink (sum has met the target, try for a smaller "
        "window) - ground the feedback in the current sum versus the "
        "target."
    ),
}

TWO_POINTER_WINDOW_PSEUDOCODE = """// Two pointer - sorted two-sum
left = 0; right = n - 1
while left < right:
  sum = arr[left] + arr[right]
  if sum == target: return (left, right)
  elif sum < target: left += 1     // only increasing left can grow the sum
  else: right -= 1                 // only decreasing right can shrink it

// Two pointer - palindrome check
left = 0; right = n - 1
while left < right:
  if arr[left] != arr[right]: return false
  left += 1; right -= 1

// Sliding window - fixed size k
sum = sum(arr[0..k-1])
best = sum
for end from k to n - 1:
  sum = sum - arr[end - k] + arr[end]   // O(1) incremental update
  best = max(best, sum)

// Sliding window - variable size, smallest subarray with sum >= target
left = 0; sum = 0; best = infinity
for right from 0 to n - 1:
  sum += arr[right]
  while sum >= target:
    best = min(best, right - left + 1)
    sum -= arr[left]; left += 1
"""
