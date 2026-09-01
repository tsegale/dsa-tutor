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

# What each Critical Junction type is actually testing, so the feedback
# prompt can stay targeted instead of defaulting to per-comparison
# language for a conceptual question. Keys mirror CriticalJunctionType.
CRITICAL_JUNCTION_GUIDANCE: dict[str, str] = {
    "SWAP_DECISION": (
        "The student was asked whether two specific adjacent elements "
        "should be swapped. Ground the feedback in those two exact "
        "values and indices."
    ),
    "PASS_COMPLETE": (
        "The student was asked what is now guaranteed about the array "
        "after this pass completed. The invariant being tested is that "
        "the largest unsorted element is now in its correct final "
        "position. Ground the feedback in this invariant, not in any "
        "single comparison."
    ),
    "EARLY_TERMINATION": (
        "The student was asked why the algorithm stopped early. The "
        "concept being tested is the no-swaps optimisation: if a full "
        "pass makes no swaps, the array is already sorted from that "
        "point on. Ground the feedback in this optimisation, not in "
        "any single comparison."
    ),
    "ALGORITHM_COMPLETE": (
        "The student was asked to identify the invariant that proves "
        "sorting is complete. The correct invariant is that no adjacent "
        "pair is out of order. Ground the feedback in this invariant, "
        "not in any single comparison."
    ),
}

# Mirrors CRITICAL_JUNCTION_TILE_OPTIONS in packages/types/index.ts: the
# fixed, data-independent correct option id for each CONCEPTUAL junction
# type. Keep in sync.
CONCEPTUAL_JUNCTION_CORRECT_OPTION_IDS: dict[str, str] = {
    "PASS_COMPLETE": "largest-in-place",
    "EARLY_TERMINATION": "no-swaps-needed",
    "ALGORITHM_COMPLETE": "no-adjacent-out-of-order",
}

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
