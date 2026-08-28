BUBBLE_SORT_CONTEXT = """
Bubble Sort works by repeatedly comparing adjacent elements and swapping them
if they are in the wrong order. After each full pass, the largest unsorted
element is guaranteed to be in its correct final position at the right end
of the unsorted portion.

When giving feedback, always refer to the actual index numbers and values
currently in the array. Never give generic explanations.

Common errors to watch for:
- ORDER_OF_OPERATIONS: The student swapped when they should not have, or
  skipped a swap that was needed. Address this by asking them to re-examine
  which value is larger.
- OFF_BY_ONE: The student selected a boundary index that is one position off.
  Ask them to count the indices again from zero.
- STRUCTURAL_PROPERTY_VIOLATION: The student swapped equal elements.
  Remind them that equal values are already in a valid relative order.
"""

BUBBLE_SORT_PSEUDOCODE = """1  procedure bubbleSort(A: list)
2      n = length(A)
3      repeat
4          swapped = false
5          for i = 1 to n - 1 inclusive do
6              if A[i - 1] > A[i] then
7                  swap(A[i - 1], A[i])
8                  swapped = true
9              end if
10         end for
11         n = n - 1
12     until not swapped
13 end procedure
"""
