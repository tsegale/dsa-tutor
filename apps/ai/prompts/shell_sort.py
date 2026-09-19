SHELL_SORT_CONTEXT = """
Shell Sort generalises Insertion Sort by comparing and shifting elements
that are `gap` positions apart instead of only adjacent neighbours. The gap
starts at floor(n/2) and halves after each full pass until it reaches 1,
at which point the final pass is exactly a normal Insertion Sort pass over
the whole array.

Within a single gap pass, each element (the key) is compared against the
element `gap` positions to its left; if the key is smaller, that left
element shifts right by `gap` and the comparison repeats against the next
element `gap` further left, until the key finds its correct position in
its gap sequence or runs out of room.

When giving feedback, always refer to the actual index numbers, values and
the current gap - never a generic "left" and "right" without the gap
distance, since the two compared elements are not adjacent.

Key properties:
- Time complexity depends heavily on the gap sequence; the halving
  sequence used here is O(n^2) worst case but performs much better than
  plain Insertion Sort in practice.
- Not stable - elements can jump past equal elements that are gap
  positions away.
- As the gap shrinks toward 1, the array becomes "mostly sorted" within
  each gap sequence, which is what makes the final gap-1 pass fast.

Common errors to watch for:
- ORDER_OF_OPERATIONS: The student shifted when the key was not actually
  smaller than the compared element, or stopped shifting too early. Ask
  them to compare the two exact values again.
- STRUCTURAL_PROPERTY_VIOLATION: The student reasoned about adjacent
  elements instead of elements `gap` positions apart. Remind them which
  two indices are actually being compared at this gap.
"""

CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "GAP_COMPARISON": (
        "The student was asked whether the key should shift past the "
        "element being compared, at the current gap distance. Ground "
        "the feedback in the exact key value, the compared value, "
        "their indices, and the current gap - the two elements are "
        "gap positions apart, not adjacent."
    ),
    "ALGORITHM_COMPLETE": (
        "The student was asked to identify the invariant that proves "
        "sorting is complete. The correct invariant is that no "
        "adjacent pair is out of order (the gap has reached 1 and that "
        "final pass finished). Ground the feedback in this invariant, "
        "not in any single comparison."
    ),
}

SHELL_SORT_PSEUDOCODE = """1  procedure shellSort(A: list)
2      gap = floor(length(A) / 2)
3      while gap > 0 do
4          for i = gap to length(A) - 1 do
5              key = A[i]
6              j = i - gap
7              while j >= 0 and A[j] > key do
8                  A[j + gap] = A[j]
9                  j = j - gap
10             end while
11             A[j + gap] = key
12         end for
13         gap = floor(gap / 2)
14     end while
15 end procedure
"""
